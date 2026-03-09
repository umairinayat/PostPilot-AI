import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostAccess } from "@/lib/post-access";
import { publishToLinkedIn } from "@/lib/linkedin";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type PublishBody = {
  postId?: string;
  content?: string;
};

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit({
      userId: currentUser.id,
      routeKey: "linkedin_publish",
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit reached for LinkedIn publishing. Please wait and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = (await req.json()) as PublishBody;
    let content = body.content?.trim() ?? "";

    if (body.postId) {
      const access = await getPostAccess(currentUser.id, body.postId);

      if (!access.post || !access.role) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      content = access.post.content;
    }

    if (!content) {
      return NextResponse.json({ error: "Post content is required" }, { status: 400 });
    }

    if (content.length > 3000) {
      return NextResponse.json(
        { error: "Post content is too long for LinkedIn publishing." },
        { status: 400 }
      );
    }

    const result = await publishToLinkedIn({
      userId: currentUser.id,
      content,
    });

    if (body.postId) {
      const supabase = getServiceSupabase();
      await supabase
        .from("posts")
        .update({
          status: "published",
          linkedin_post_id: result.linkedInPostId,
          published_url: result.postUrl,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.postId);
    }

    return NextResponse.json({
      success: true,
      linkedInPostId: result.linkedInPostId,
      postUrl: result.postUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to publish to LinkedIn") },
      { status: 500 }
    );
  }
}
