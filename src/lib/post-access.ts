import { getServiceSupabase } from "@/lib/supabase";
import type { GeneratedPost } from "@/types";

type PostRole = "owner" | "collaborator" | null;

type AccessiblePostFilters = {
  userId: string;
  tone?: string | null;
  status?: string | null;
  sort?: "newest" | "oldest";
};

async function getCollaboratorPostIds(userId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("post_collaborators")
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.post_id as string);
}

export async function listAccessiblePosts({
  userId,
  tone,
  status,
  sort = "newest",
}: AccessiblePostFilters) {
  const supabase = getServiceSupabase();
  let ownQuery = supabase.from("posts").select("*").eq("user_id", userId);

  if (tone && tone !== "all") {
    ownQuery = ownQuery.eq("tone", tone);
  }

  if (status && status !== "all") {
    ownQuery = ownQuery.eq("status", status);
  }

  ownQuery = ownQuery.order("created_at", { ascending: sort === "oldest" });

  const [{ data: ownedPosts, error: ownedPostsError }, collaboratorPostIds] =
    await Promise.all([ownQuery, getCollaboratorPostIds(userId)]);

  if (ownedPostsError) {
    throw new Error(ownedPostsError.message);
  }

  let sharedPosts: GeneratedPost[] = [];

  if (collaboratorPostIds.length > 0) {
    let sharedQuery = supabase
      .from("posts")
      .select("*")
      .in("id", collaboratorPostIds);

    if (tone && tone !== "all") {
      sharedQuery = sharedQuery.eq("tone", tone);
    }

    if (status && status !== "all") {
      sharedQuery = sharedQuery.eq("status", status);
    }

    sharedQuery = sharedQuery.order("created_at", { ascending: sort === "oldest" });

    const { data, error } = await sharedQuery;

    if (error) {
      throw new Error(error.message);
    }

    sharedPosts = (data as GeneratedPost[] | null) ?? [];
  }

  const mergedPosts = [...((ownedPosts as GeneratedPost[] | null) ?? []), ...sharedPosts];
  const uniquePosts = Array.from(new Map(mergedPosts.map((post) => [post.id, post])).values());

  return uniquePosts.sort((left, right) => {
    const leftDate = new Date(left.created_at).getTime();
    const rightDate = new Date(right.created_at).getTime();
    return sort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
  });
}

export async function getPostAccess(userId: string, postId: string) {
  const supabase = getServiceSupabase();
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  const typedPost = (post as GeneratedPost | null) ?? null;

  if (!typedPost) {
    return { role: null as PostRole, post: null };
  }

  if (typedPost.user_id === userId) {
    return { role: "owner" as PostRole, post: typedPost };
  }

  const { data: collaboration, error: collaborationError } = await supabase
    .from("post_collaborators")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (collaborationError) {
    throw new Error(collaborationError.message);
  }

  return {
    role: collaboration ? ("collaborator" as PostRole) : null,
    post: typedPost,
  };
}

export async function createPostVersion({
  postId,
  editorUserId,
  content,
  topic,
  tone,
  versionLabel,
}: {
  postId: string;
  editorUserId: string;
  content: string;
  topic?: string | null;
  tone?: string | null;
  versionLabel?: string | null;
}) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("post_versions").insert({
    post_id: postId,
    editor_user_id: editorUserId,
    snapshot_content: content,
    snapshot_topic: topic ?? null,
    snapshot_tone: tone ?? null,
    version_label: versionLabel ?? "manual_save",
  });

  if (error) {
    throw new Error(error.message);
  }
}
