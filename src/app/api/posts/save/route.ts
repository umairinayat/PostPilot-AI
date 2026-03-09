import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPostVersion, getPostAccess } from "@/lib/post-access";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { GeneratedPost } from "@/types";

const VALID_STATUSES = new Set(["draft", "scheduled", "published"]);

type SavePostBody = {
  id?: string;
  content?: string;
  topic?: string;
  tone?: string;
  model_used?: string;
  profile_id?: string | null;
  status?: GeneratedPost["status"];
  scheduled_at?: string | null;
  create_version?: boolean;
  version_label?: string | null;
  expected_updated_at?: string | null;
};

async function getAuthorizedUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return null;
  }

  return currentUser;
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthorizedUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SavePostBody;

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("posts")

      .insert({
        user_id: currentUser.id,
        profile_id: body.profile_id || null,
        topic: body.topic || "",
        tone: body.tone || "",
        model_used: body.model_used || "",
        content: body.content.trim(),
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const post = data as unknown as GeneratedPost;
    await createPostVersion({
      postId: post.id,
      editorUserId: currentUser.id,
      content: post.content,
      topic: post.topic ?? null,
      tone: post.tone ?? null,
      versionLabel: "initial_save",
    });

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to save post") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getAuthorizedUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SavePostBody;

    if (!body.id) {
      return NextResponse.json(
        { error: "Post id is required" },
        { status: 400 }
      );
    }

    const access = await getPostAccess(currentUser.id, body.id);

    if (!access.post || !access.role) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const currentUpdatedAt = access.post.updated_at ?? access.post.created_at;

    if (
      body.expected_updated_at &&
      currentUpdatedAt &&
      body.expected_updated_at !== currentUpdatedAt
    ) {
      return NextResponse.json(
        {
          error: "This post was updated by another collaborator. Reload the latest version before saving.",
          conflict: true,
          post: access.post,
        },
        { status: 409 }
      );
    }

    const updates: Partial<GeneratedPost> = {};

    if (typeof body.content === "string") {
      if (!body.content.trim()) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }

      updates.content = body.content.trim();
    }

    if (typeof body.topic === "string") {
      updates.topic = body.topic.trim();
    }

    if (typeof body.tone === "string") {
      updates.tone = body.tone.trim();
    }

    if (body.status) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be draft, scheduled, or published." },
          { status: 400 }
        );
      }

      if (access.role === "collaborator" && body.status !== "draft") {
        return NextResponse.json(
          { error: "Collaborators can only set posts to draft status." },
          { status: 403 }
        );
      }

      updates.status = body.status;
    }

    if (body.scheduled_at !== undefined) {
      updates.scheduled_at = body.scheduled_at;
    }

    updates.updated_at = new Date().toISOString() as GeneratedPost["updated_at"];

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates were provided" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("posts")

      .update(updates)
      .eq("id", body.id)
      .eq("user_id", currentUser.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updatedPost = data as unknown as GeneratedPost;
    if (body.create_version) {
      await createPostVersion({
        postId: updatedPost.id,
        editorUserId: currentUser.id,
        content: updatedPost.content,
        topic: updatedPost.topic ?? null,
        tone: updatedPost.tone ?? null,
        versionLabel: body.version_label ?? "manual_save",
      });
    }

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update post") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getAuthorizedUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Pick<SavePostBody, "id">;

    if (!body.id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    const access = await getPostAccess(currentUser.id, body.id);

    if (!access.post || access.role !== "owner") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", body.id)
      .eq("user_id", currentUser.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete post") },
      { status: 500 }
    );
  }
}
