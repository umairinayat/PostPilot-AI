import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostAccess } from "@/lib/post-access";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { PostPresenceSession } from "@/types";

type PresenceBody = {
  sessionId?: string;
  currentField?: string | null;
  cursorPosition?: number | null;
};

const PRESENCE_TTL_MS = 45 * 1000;

export async function GET(
  _req: NextRequest,
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
    const cutoff = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();

    await supabase.from("post_presence_sessions").delete().lt("last_seen_at", cutoff);

    const { data, error } = await supabase
      .from("post_presence_sessions")
      .select(
        "session_id, post_id, user_id, current_field, cursor_position, last_seen_at, users:user_id(name, email)"
      )
      .eq("post_id", id)
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const sessions = (data ?? []).map((session) => ({
        session_id: session.session_id,
        post_id: session.post_id,
      user_id: session.user_id,
      current_field: session.current_field,
      cursor_position: session.cursor_position,
      last_seen_at: session.last_seen_at,
      name: Array.isArray(session.users) ? session.users[0]?.name ?? null : null,
      email: Array.isArray(session.users) ? session.users[0]?.email ?? "" : "",
    })) as PostPresenceSession[];

    return NextResponse.json({
      sessions,
      latestUpdatedAt: access.post.updated_at ?? access.post.created_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load presence sessions") },
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

    const body = (await req.json()) as PresenceBody;

    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("post_presence_sessions").upsert(
      {
        post_id: id,
        user_id: currentUser.id,
        session_id: body.sessionId,
        current_field: body.currentField ?? null,
        cursor_position:
          typeof body.cursorPosition === "number" ? body.cursorPosition : null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "post_id,user_id,session_id" }
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update presence") },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const body = (await req.json().catch(() => ({}))) as PresenceBody;
    const supabase = getServiceSupabase();
    let query = supabase
      .from("post_presence_sessions")
      .delete()
      .eq("post_id", id)
      .eq("user_id", currentUser.id);

    if (body.sessionId) {
      query = query.eq("session_id", body.sessionId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to clear presence") },
      { status: 500 }
    );
  }
}
