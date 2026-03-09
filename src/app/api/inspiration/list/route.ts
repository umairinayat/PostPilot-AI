import { NextRequest, NextResponse } from "next/server";
import { ensureInspirationFeedSeeded } from "@/lib/inspiration";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { InspirationPost } from "@/types";

export async function GET(req: NextRequest) {
  try {
    await ensureInspirationFeedSeeded();

    const { searchParams } = new URL(req.url);
    const niche = searchParams.get("niche");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const supabase = getServiceSupabase();
    let query = supabase
      .from("inspiration_posts")
      .select("*", { count: "exact" })
      .order("synced_at", { ascending: false })
      .order("likes", { ascending: false });

    if (niche && niche !== "All") {
      query = query.eq("niche", niche);
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(
        `author_name.ilike.${pattern},author_role.ilike.${pattern},topic.ilike.${pattern},hook.ilike.${pattern},excerpt.ilike.${pattern}`
      );
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const posts = (data as InspirationPost[] | null) ?? [];
    const total = count ?? posts.length;
    const latestSync = posts[0]?.synced_at ?? null;

    return NextResponse.json({
      posts,
      meta: {
        count: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        lastSyncedAt: latestSync,
        source: posts[0]?.source ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load inspiration feed") },
      { status: 500 }
    );
  }
}
