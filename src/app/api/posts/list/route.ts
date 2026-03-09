import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAccessiblePosts } from "@/lib/post-access";
import { getErrorMessage } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tone = searchParams.get("tone");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const posts = await listAccessiblePosts({
      userId: currentUser.id,
      tone,
      status,
      sort: sort === "oldest" ? "oldest" : "newest",
    });

    const total = posts.length;
    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return NextResponse.json({
      posts: paginatedPosts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch posts") },
      { status: 500 }
    );
  }
}
