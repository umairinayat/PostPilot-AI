import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPostVersion, getPostAccess } from "@/lib/post-access";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { PostVersion } from "@/types";
import type { Database } from "@/types/database";

type RestoreVersionBody = {
  versionId?: string;
};

export async function GET(
  _request: NextRequest,
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

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("post_versions")
      .select("id, post_id, editor_user_id, snapshot_content, snapshot_topic, snapshot_tone, version_label, created_at, users:editor_user_id(name, email)")
      .eq("post_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    const versions = (data ?? []).map((version) => ({
      id: version.id,
      post_id: version.post_id,
      editor_user_id: version.editor_user_id,
      snapshot_content: version.snapshot_content,
      snapshot_topic: version.snapshot_topic,
      snapshot_tone: version.snapshot_tone,
      version_label: version.version_label,
      created_at: version.created_at,
      editor_name: Array.isArray(version.users) ? version.users[0]?.name ?? null : null,
      editor_email: Array.isArray(version.users) ? version.users[0]?.email ?? null : null,
    })) as PostVersion[];

    return NextResponse.json({ versions });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load version history") },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
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

    const body = (await req.json()) as RestoreVersionBody;

    if (!body.versionId) {
      return NextResponse.json({ error: "Version id is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: version, error: versionError } = await supabase
      .from("post_versions")
      .select("*")
      .eq("id", body.versionId)
      .eq("post_id", id)
      .maybeSingle();

    if (versionError) {
      throw new Error(versionError.message);
    }

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const versionRow = version as Database["public"]["Tables"]["post_versions"]["Row"];
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({
        content: versionRow.snapshot_content,
        topic: versionRow.snapshot_topic ?? undefined,
        tone: versionRow.snapshot_tone ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const postRow = updatedPost as unknown as Database["public"]["Tables"]["posts"]["Row"];
    await createPostVersion({
      postId: id,
      editorUserId: currentUser.id,
      content: postRow.content,
      topic: postRow.topic ?? null,
      tone: postRow.tone ?? null,
      versionLabel: "restore",
    });

    return NextResponse.json({ post: postRow });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to restore version") },
      { status: 500 }
    );
  }
}
