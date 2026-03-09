import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { scrapeLinkedInProfile } from "@/lib/proxycurl";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { Profile } from "@/types";
import type { Json } from "@/types/database";

type ImportProfileBody = {
  linkedinUrl?: string;
  linkedin_url?: string;
};

async function getLatestProfile(userId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Profile | null) ?? null;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getLatestProfile(currentUser.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch profile") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ImportProfileBody;
    const linkedinUrl = body.linkedinUrl ?? body.linkedin_url;

    const rateLimit = await enforceRateLimit({
      userId: currentUser.id,
      routeKey: "profile_import",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit reached for profile imports. Please wait and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
      return NextResponse.json(
        { error: "Invalid LinkedIn URL. It must contain linkedin.com/in/." },
        { status: 400 }
      );
    }

    if (linkedinUrl.length > 500) {
      return NextResponse.json(
        { error: "LinkedIn URL is too long." },
        { status: 400 }
      );
    }

    const profileData = await scrapeLinkedInProfile(linkedinUrl);
    const supabase = getServiceSupabase();

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("linkedin_url", linkedinUrl)
      .maybeSingle();

    if (existingProfileError) {
      throw new Error(existingProfileError.message);
    }

    const profileRecord = {
      user_id: currentUser.id,
      linkedin_url: linkedinUrl,
      name: profileData.full_name || "",
      headline: profileData.headline || "",
      summary: profileData.summary || "",
      experience: (profileData.experiences || []) as unknown as Json,
      skills: (profileData.skills || []) as unknown as Json,
      raw_posts: (profileData.activities || []) as unknown as Json,
      scraped_at: new Date().toISOString(),
    };

    const result = existingProfile?.id
      ? await supabase
          .from("profiles")

          .update(profileRecord)
          .eq("id", existingProfile.id)
          .select("*")
          .single()
      : await supabase
          .from("profiles")

          .insert(profileRecord)
          .select("*")
          .single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return NextResponse.json({ profile: result.data as Profile });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to import profile") },
      { status: 500 }
    );
  }
}
