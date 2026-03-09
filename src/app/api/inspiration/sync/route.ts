import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncInspirationFeed } from "@/lib/inspiration";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit({
      userId: currentUser.id,
      routeKey: "inspiration_sync",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit reached for inspiration sync. Please wait and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const result = await syncInspirationFeed();

    return NextResponse.json({
      success: true,
      source: result.source,
      count: result.count,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to sync inspiration feed") },
      { status: 500 }
    );
  }
}
