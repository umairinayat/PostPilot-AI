import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLinkedInPostAnalytics } from "@/lib/linkedin";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type PublishedPostForImport = {
  id: string;
  user_id: string;
  linkedin_post_id: string | null;
};

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit({
      userId: currentUser.id,
      routeKey: "analytics_import",
      limit: 24,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit reached for analytics imports. Please wait and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, linkedin_post_id")
      .eq("user_id", currentUser.id)
      .eq("status", "published")
      .not("linkedin_post_id", "is", null)
      .order("published_at", { ascending: false })
      .limit(25);

    if (error) {
      throw new Error(error.message);
    }

    const publishedPosts = (data as PublishedPostForImport[] | null) ?? [];
    let importedCount = 0;
    const skipped: string[] = [];

    // Process posts concurrently instead of sequentially to avoid N+1
    const results = await Promise.allSettled(
      publishedPosts.map(async (post) => {
        if (!post.linkedin_post_id) {
          return { postId: post.id, status: "skipped" as const };
        }

        const metrics = await getLinkedInPostAnalytics({
          userId: currentUser.id,
          linkedInPostId: post.linkedin_post_id,
        });
        const now = new Date().toISOString();

        await supabase
          .from("posts")

          .update({
            latest_reactions: metrics.reactions,
            latest_comments: metrics.comments,
            latest_impressions: metrics.impressions,
            latest_engagement_rate: metrics.engagementRate,
            last_metrics_synced_at: now,
            updated_at: now,
          })
          .eq("id", post.id);

        await supabase.from("post_metric_snapshots").insert({
          post_id: post.id,
          user_id: currentUser.id,
          linkedin_post_id: post.linkedin_post_id,
          reactions: metrics.reactions,
          comments: metrics.comments,
          impressions: metrics.impressions,
          engagement_rate: metrics.engagementRate,
          captured_at: now,
        });

        return { postId: post.id, status: "imported" as const };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.status === "imported") {
          importedCount += 1;
        } else {
          skipped.push(result.value.postId);
        }
      } else {
        console.error("Analytics import failed for a post:", result.reason);
        skipped.push("unknown");
      }
    }

    return NextResponse.json({ importedCount, skipped, importedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to import analytics") },
      { status: 500 }
    );
  }
}
