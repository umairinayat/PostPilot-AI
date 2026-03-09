import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAccessiblePosts } from "@/lib/post-access";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { AnalyticsSnapshot, AnalyticsSummary, GeneratedPost } from "@/types";

function getDistribution(items: string[]) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    if (!item) {
      return;
    }

    counts.set(item, (counts.get(item) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

function pickTopPost(posts: GeneratedPost[]) {
  const rankedPosts = [...posts].sort((left, right) => {
    const leftScore = (left.latest_reactions ?? 0) + (left.latest_comments ?? 0);
    const rightScore = (right.latest_reactions ?? 0) + (right.latest_comments ?? 0);
    return rightScore - leftScore;
  });
  const topPost = rankedPosts[0];

  if (!topPost) {
    return null;
  }

  return {
    id: topPost.id,
    topic: topPost.topic,
    reactions: topPost.latest_reactions ?? 0,
    comments: topPost.latest_comments ?? 0,
  };
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [posts, snapshotsResponse] = await Promise.all([
      listAccessiblePosts({ userId: currentUser.id, sort: "newest" }),
      getServiceSupabase()
        .from("post_metric_snapshots")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("captured_at", { ascending: false })
        .limit(20),
    ]);

    if (snapshotsResponse.error) {
      throw new Error(snapshotsResponse.error.message);
    }

    const publishedPosts = posts.filter((post) => post.status === "published");
    const syncedPosts = publishedPosts.filter((post) => post.last_metrics_synced_at);
    const totalReactions = publishedPosts.reduce(
      (sum, post) => sum + (post.latest_reactions ?? 0),
      0
    );
    const totalComments = publishedPosts.reduce(
      (sum, post) => sum + (post.latest_comments ?? 0),
      0
    );
    const totalImpressions = publishedPosts.reduce(
      (sum, post) => sum + (post.latest_impressions ?? 0),
      0
    );
    const engagementRates = publishedPosts
      .map((post) => post.latest_engagement_rate)
      .filter((rate): rate is number => typeof rate === "number");
    const averageEngagementRate = engagementRates.length
      ? Number(
          (
            engagementRates.reduce((sum, rate) => sum + rate, 0) /
            engagementRates.length
          ).toFixed(2)
        )
      : 0;
    const toneDistribution = getDistribution(posts.map((post) => post.tone));
    const statusDistribution = getDistribution(posts.map((post) => post.status));
    const topTone = toneDistribution[0]?.label ?? "None yet";
    const topPost = pickTopPost(publishedPosts);
    const lastImportedAt = syncedPosts
      .map((post) => post.last_metrics_synced_at)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

    const suggestions = [
      syncedPosts.length === 0
        ? "Publish at least one post through the LinkedIn integration, then run analytics import to start collecting real engagement data."
        : "Keep syncing analytics after new posts publish so your dashboard reflects current performance.",
      totalImpressions > 0 && averageEngagementRate < 2
        ? "Your engagement rate is still modest. Test stronger first lines and more direct calls to response."
        : "Your current engagement signals are healthy enough to keep testing new content angles.",
      topTone !== "None yet"
        ? `Your highest-volume tone is ${topTone.toLowerCase()}. Compare it against engagement data to decide whether to double down or diversify.`
        : "Generate more posts to unlock tone-level performance patterns.",
    ];

    const summary: AnalyticsSummary = {
      totalPosts: posts.length,
      totalPublishedPosts: publishedPosts.length,
      syncedPosts: syncedPosts.length,
      totalReactions,
      totalComments,
      totalImpressions,
      averageEngagementRate,
      topTone,
      topPost,
      toneDistribution,
      statusDistribution,
      recentSnapshots: (snapshotsResponse.data as AnalyticsSnapshot[] | null) ?? [],
      suggestions,
      lastImportedAt,
    };

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load analytics summary") },
      { status: 500 }
    );
  }
}
