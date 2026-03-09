import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostAccess } from "@/lib/post-access";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { PostCollaborator } from "@/types";

type AddCollaboratorBody = {
  email?: string;
};

type RemoveCollaboratorBody = {
  userId?: string;
};

async function listCollaborators(postId: string) {
  const supabase = getServiceSupabase();
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("user_id, users:user_id(name, email)")
    .eq("id", postId)
    .single();

  if (postError) {
    throw new Error(postError.message);
  }

  const { data, error } = await supabase
    .from("post_collaborators")
    .select("id, post_id, user_id, permission, added_at, users:user_id(name, email)")
    .eq("post_id", postId)
    .order("added_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const ownerRecord = Array.isArray(post.users) ? post.users[0] : null;
  const collaborators = (data ?? []).map((collaborator) => ({
    id: collaborator.id,
    post_id: collaborator.post_id,
    user_id: collaborator.user_id,
    permission: collaborator.permission,
    added_at: collaborator.added_at,
    name: Array.isArray(collaborator.users) ? collaborator.users[0]?.name ?? null : null,
    email: Array.isArray(collaborator.users) ? collaborator.users[0]?.email ?? "" : "",
  })) as PostCollaborator[];

  return {
    owner: {
      user_id: post.user_id as string,
      name: ownerRecord?.name ?? null,
      email: ownerRecord?.email ?? "",
    },
    collaborators,
  };
}

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

    const result = await listCollaborators(id);

    return NextResponse.json({
      owner: result.owner,
      collaborators: result.collaborators,
      canManage: access.role === "owner",
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load collaborators") },
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

    if (!access.post || access.role !== "owner") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = (await req.json()) as AddCollaboratorBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Collaborator email is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      throw new Error(userError.message);
    }

    if (!user) {
      return NextResponse.json(
        { error: "That user does not have a PostPilot account yet." },
        { status: 404 }
      );
    }

    if (user.id === access.post.user_id) {
      return NextResponse.json(
        { error: "The post owner is already the main editor." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("post_collaborators")
      .upsert(
        {
          post_id: id,
          user_id: user.id,
          permission: "edit",
        },
        { onConflict: "post_id,user_id" }
      );

    if (insertError) {
      throw new Error(insertError.message);
    }

    const result = await listCollaborators(id);
    return NextResponse.json({ collaborators: result.collaborators });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to add collaborator") },
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

    if (!access.post || access.role !== "owner") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = (await req.json()) as RemoveCollaboratorBody;

    if (!body.userId) {
      return NextResponse.json({ error: "Collaborator user id is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("post_collaborators")
      .delete()
      .eq("post_id", id)
      .eq("user_id", body.userId);

    if (error) {
      throw new Error(error.message);
    }

    const result = await listCollaborators(id);
    return NextResponse.json({ collaborators: result.collaborators });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to remove collaborator") },
      { status: 500 }
    );
  }
}
