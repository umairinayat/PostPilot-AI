import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePosts } from "@/lib/openrouter";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type GenerateRequestBody = {
  topic?: string;
  tone?: string;
  model?: string;
  profileId?: string;
};

type UserBillingState = {
  credits: number | null;
  plan: "free" | "pro" | "agency" | null;
};

type StoredProfile = {
  id: string;
  name: string | null;
  headline: string | null;
  summary: string | null;
  raw_posts: unknown;
};

function extractPostText(post: unknown) {
  if (typeof post === "string") {
    return post;
  }

  if (post && typeof post === "object") {
    if ("text" in post && typeof post.text === "string") {
      return post.text;
    }

    if ("title" in post && typeof post.title === "string") {
      return post.title;
    }

    if ("activity_status" in post && typeof post.activity_status === "string") {
      return post.activity_status;
    }
  }

  return "";
}

async function getProfileContext(userId: string, profileId?: string) {
  const supabase = getServiceSupabase();
  const baseQuery = supabase.from("profiles").select("id, name, headline, summary, raw_posts").eq("user_id", userId);

  const response = profileId
    ? await baseQuery.eq("id", profileId).maybeSingle()
    : await baseQuery.order("scraped_at", { ascending: false }).limit(1).maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data as StoredProfile | null) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as GenerateRequestBody;
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: userState, error: userStateError } = await supabase
      .from("users")
      .select("credits, plan")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (userStateError) {
      throw new Error(userStateError.message);
    }

    const plan = (userState as UserBillingState | null)?.plan ?? "free";
    const credits = (userState as UserBillingState | null)?.credits ?? 5;

    const rateLimit = await enforceRateLimit({
      userId: currentUser.id,
      routeKey: "posts_generate",
      limit: plan === "free" ? 10 : 60,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit reached for post generation. Please wait and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (plan === "free" && credits <= 0) {
      return NextResponse.json(
        { error: "No credits remaining. Upgrade your plan to keep generating posts." },
        { status: 403 }
      );
    }

    if (topic.length > 1200) {
      return NextResponse.json(
        { error: "Topic is too long. Keep it under 1200 characters." },
        { status: 400 }
      );
    }

    const profile = await getProfileContext(currentUser.id, body.profileId);
    const profileContext = profile
      ? `Name: ${profile.name ?? ""}\nHeadline: ${profile.headline ?? ""}\nSummary: ${profile.summary ?? ""}`
      : "";
    const pastPosts = Array.isArray(profile?.raw_posts)
      ? profile.raw_posts.map(extractPostText).filter(Boolean).slice(0, 5)
      : [];

    const posts = await generatePosts({
      topic,
      tone: body.tone || "Storytelling",
      profileContext,
      pastPosts,
      model: body.model,
    });

    if (plan === "free") {
      const { data: deducted, error: deductError } = await supabase
        .from("users")
        .update({ credits: Math.max(0, credits - 1) })
        .eq("id", currentUser.id)
        .gt("credits", 0)
        .select("credits")
        .maybeSingle();

      if (deductError) {
        console.error("Credit deduction failed:", deductError.message);
      }

      if (!deducted) {
        console.warn("Credit deduction returned no rows — possible race condition for user:", currentUser.id);
      }
    }

    return NextResponse.json({ posts, profileId: profile?.id ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to generate posts") },
      { status: 500 }
    );
  }
}
