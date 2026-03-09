import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostAccess } from "@/lib/post-access";
import { getErrorMessage } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getPostAccess(currentUser.id, id);

    if (!access.post || !access.role) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post: access.post, role: access.role });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch post") },
      { status: 500 }
    );
  }
}
