import { getServiceSupabase } from "@/lib/supabase";

type RateLimitConfig = {
  userId: string;
  routeKey: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

export async function enforceRateLimit({
  userId,
  routeKey,
  limit,
  windowMs,
}: RateLimitConfig): Promise<RateLimitResult> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await supabase
    .from("api_rate_limit_events")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("route_key", routeKey)
    .gte("created_at", since);

  if (error) {
    throw new Error(error.message);
  }

  const used = count ?? 0;

  if (used >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
    };
  }

  const { error: insertError } = await supabase.from("api_rate_limit_events").insert({
    user_id: userId,
    route_key: routeKey,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - used - 1),
    retryAfter: 0,
  };
}

/**
 * Deletes rate limit events older than the given age.
 * Call this periodically (e.g., from a cron job) to prevent unbounded table growth.
 */
export async function cleanupStaleRateLimitEvents(maxAgeMs: number = 24 * 60 * 60 * 1000) {
  const supabase = getServiceSupabase();
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const { error } = await supabase
    .from("api_rate_limit_events")
    .delete()
    .lt("created_at", cutoff);

  if (error) {
    console.error("Failed to clean up stale rate limit events:", error.message);
  }
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "Retry-After": String(result.retryAfter),
  };
}
