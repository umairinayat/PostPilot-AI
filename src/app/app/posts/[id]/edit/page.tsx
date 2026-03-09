"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toaster";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import {
  TONES,
  type GeneratedPost,
  type ImprovePostResult,
  type PostCollaborator,
  type PostPresenceSession,
  type PostVersion,
} from "@/types";
import {
  PostSetup,
  FormattingTools,
  CollaboratorsPanel,
  VersionHistory,
  PostPreview,
} from "./components";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type PostRole = "owner" | "collaborator" | null;

type CollaboratorOwner = {
  user_id: string;
  name: string | null;
  email: string;
};

function getSaveBadge(state: SaveState) {
  switch (state) {
    case "saving":
      return { label: "Autosaving", variant: "outline" as const };
    case "saved":
      return { label: "Saved", variant: "success" as const };
    case "error":
      return { label: "Save failed", variant: "destructive" as const };
    case "dirty":
      return { label: "Unsaved changes", variant: "outline" as const };
    default:
      return { label: "Ready", variant: "outline" as const };
  }
}

export default function PostEditorPage() {
  const params = useParams<{ id: string }>();
  const postId = typeof params.id === "string" ? params.id : "";
  const { data: session } = useSession();

  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [postRole, setPostRole] = useState<PostRole>(null);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [owner, setOwner] = useState<CollaboratorOwner | null>(null);
  const [collaborators, setCollaborators] = useState<PostCollaborator[]>([]);
  const [presenceSessions, setPresenceSessions] = useState<PostPresenceSession[]>([]);
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [canManageCollaborators, setCanManageCollaborators] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImproving, setIsImproving] = useState(false);
  const [isInvitingCollaborator, setIsInvitingCollaborator] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<string | null>(null);
  const [isReloadingRemote, setIsReloadingRemote] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [activeField, setActiveField] = useState<string | null>("content");
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const hasLoadedPost = useRef(false);
  const savedSnapshotRef = useRef({ content: "", topic: "", tone: "" });
  const activeFieldRef = useRef<string | null>(activeField);
  const cursorPositionRef = useRef<number | null>(cursorPosition);
  const serverUpdatedAtRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceSessionIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Date.now()}`
  );

  useEffect(() => {
    activeFieldRef.current = activeField;
    cursorPositionRef.current = cursorPosition;
  }, [activeField, cursorPosition]);

  const hydratePost = useCallback((nextPost: GeneratedPost) => {
    setPost(nextPost);
    setTopic(nextPost.topic || "");
    setTone(nextPost.tone || TONES[0]);
    setContent(nextPost.content || "");
    serverUpdatedAtRef.current = nextPost.updated_at ?? nextPost.created_at;
    savedSnapshotRef.current = {
      content: nextPost.content || "",
      topic: nextPost.topic || "",
      tone: nextPost.tone || TONES[0],
    };
    hasLoadedPost.current = true;
    setHasRemoteUpdate(false);
    setRemoteUpdatedAt(null);
    setSaveState("saved");
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }, []);

  const loadCollaborators = useCallback(async () => {
    const response = await fetch(`/api/posts/${postId}/collaborators`);
    const data = (await response.json()) as {
      error?: string;
      owner?: CollaboratorOwner;
      collaborators?: PostCollaborator[];
      canManage?: boolean;
    };

    if (!response.ok) {
      throw new Error(data.error || "Failed to load collaborators.");
    }

    setOwner(data.owner ?? null);
    setCollaborators(data.collaborators ?? []);
    setCanManageCollaborators(Boolean(data.canManage));
  }, [postId]);

  const loadVersions = useCallback(async () => {
    const response = await fetch(`/api/posts/${postId}/versions`);
    const data = (await response.json()) as { error?: string; versions?: PostVersion[] };

    if (!response.ok) {
      throw new Error(data.error || "Failed to load versions.");
    }

    setVersions(data.versions ?? []);
  }, [postId]);

  const loadLatestPost = useCallback(async () => {
    const response = await fetch(`/api/posts/${postId}`);
    const data = (await response.json()) as {
      error?: string;
      post?: GeneratedPost;
      role?: PostRole;
    };

    if (!response.ok || !data.post) {
      throw new Error(data.error || "Failed to reload the latest post.");
    }

    hydratePost(data.post);
    setPostRole(data.role ?? null);
  }, [hydratePost, postId]);

  const syncPresenceFromChannel = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<{
      sessionId: string;
      userId: string;
      name: string | null;
      email: string;
      currentField: string | null;
      cursorPosition: number | null;
      lastSeenAt: string;
    }>();
    const sessions = Object.values(state)
      .flat()
      .map((entry) => ({
        session_id: entry.sessionId,
        post_id: postId,
        user_id: entry.userId,
        current_field: entry.currentField,
        cursor_position: entry.cursorPosition,
        last_seen_at: entry.lastSeenAt,
        name: entry.name,
        email: entry.email,
      }))
      .sort(
        (left, right) =>
          new Date(right.last_seen_at).getTime() - new Date(left.last_seen_at).getTime()
      ) as PostPresenceSession[];

    setPresenceSessions(sessions);
  }, [postId]);

  const broadcastPostUpdate = useCallback(
    (updatedAt: string | null | undefined) => {
      const channel = realtimeChannelRef.current;

      if (!channel || !updatedAt) {
        return;
      }

      void channel.send({
        type: "broadcast",
        event: "post_updated",
        payload: {
          sessionId: presenceSessionIdRef.current,
          updatedAt,
          editorName: session?.user?.name ?? session?.user?.email ?? "Collaborator",
        },
      });
    },
    [session?.user?.email, session?.user?.name]
  );

  // --- Initial load ---

  useEffect(() => {
    let cancelled = false;

    const loadEditorState = async () => {
      try {
        const [postResponse, collaboratorsResponse, versionsResponse] = await Promise.all([
          fetch(`/api/posts/${postId}`),
          fetch(`/api/posts/${postId}/collaborators`),
          fetch(`/api/posts/${postId}/versions`),
        ]);

        const postData = (await postResponse.json()) as {
          error?: string;
          post?: GeneratedPost;
          role?: PostRole;
        };
        const collaboratorsData = (await collaboratorsResponse.json()) as {
          error?: string;
          owner?: CollaboratorOwner;
          collaborators?: PostCollaborator[];
          canManage?: boolean;
        };
        const versionsData = (await versionsResponse.json()) as {
          error?: string;
          versions?: PostVersion[];
        };

        if (!postResponse.ok || !postData.post) {
          throw new Error(postData.error || "Failed to load post.");
        }

        if (!collaboratorsResponse.ok) {
          throw new Error(collaboratorsData.error || "Failed to load collaborators.");
        }

        if (!versionsResponse.ok) {
          throw new Error(versionsData.error || "Failed to load version history.");
        }

        if (!cancelled) {
          hydratePost(postData.post);
          setPostRole(postData.role ?? null);
          setOwner(collaboratorsData.owner ?? null);
          setCollaborators(collaboratorsData.collaborators ?? []);
          setCanManageCollaborators(Boolean(collaboratorsData.canManage));
          setVersions(versionsData.versions ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          showToast({
            title: "Editor unavailable",
            description: getErrorMessage(error, "Please return to the library and try again."),
            variant: "destructive",
          });
          setSaveState("error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (postId) {
      void loadEditorState();
    }

    return () => {
      cancelled = true;
    };
  }, [hydratePost, postId]);

  // --- Realtime presence ---

  useEffect(() => {
    if (!postId || !post || !session?.user?.id) {
      return;
    }

    const sessionId = presenceSessionIdRef.current;
    const supabase = getBrowserSupabase();
    const channel = supabase.channel(`post-editor:${postId}`, {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    realtimeChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        syncPresenceFromChannel(channel);
      })
      .on("presence", { event: "join" }, () => {
        syncPresenceFromChannel(channel);
      })
      .on("presence", { event: "leave" }, () => {
        syncPresenceFromChannel(channel);
      })
      .on("broadcast", { event: "post_updated" }, ({ payload }) => {
        const eventPayload = payload as {
          sessionId?: string;
          updatedAt?: string | null;
        };

        if (eventPayload.sessionId === sessionId) {
          return;
        }

        if (
          eventPayload.updatedAt &&
          serverUpdatedAtRef.current &&
          eventPayload.updatedAt !== serverUpdatedAtRef.current
        ) {
          setHasRemoteUpdate(true);
          setRemoteUpdatedAt(eventPayload.updatedAt);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
          await channel.track({
            sessionId,
            userId: session.user.id,
            name: session.user.name ?? null,
            email: session.user.email ?? "",
            currentField: activeFieldRef.current,
            cursorPosition: cursorPositionRef.current,
            lastSeenAt: new Date().toISOString(),
          });
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeConnected(false);
        }
      });

    return () => {
      setRealtimeConnected(false);
      setPresenceSessions([]);
      void channel.untrack();
      void supabase.removeChannel(channel);

      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }
    };
  }, [
    post,
    postId,
    session?.user?.email,
    session?.user?.id,
    session?.user?.name,
    syncPresenceFromChannel,
  ]);

  // --- Presence field tracking ---

  useEffect(() => {
    const channel = realtimeChannelRef.current;

    if (!channel || !realtimeConnected || !session?.user?.id) {
      return;
    }

    void channel.track({
      sessionId: presenceSessionIdRef.current,
      userId: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? "",
      currentField: activeField,
      cursorPosition,
      lastSeenAt: new Date().toISOString(),
    });
  }, [
    activeField,
    cursorPosition,
    realtimeConnected,
    session?.user?.email,
    session?.user?.id,
    session?.user?.name,
  ]);

  // --- Save / autosave ---

  const persistDraft = useCallback(
    async (
      nextValues: { content: string; topic: string; tone: string },
      options?: {
        manual?: boolean;
        createVersion?: boolean;
        versionLabel?: string;
      }
    ) => {
      if (!postId || !hasLoadedPost.current) {
        return;
      }

      const manual = options?.manual ?? false;
      setSaveState("saving");

      try {
        const response = await fetch("/api/posts/save", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: postId,
            content: nextValues.content,
            topic: nextValues.topic,
            tone: nextValues.tone,
            create_version: options?.createVersion ?? false,
            version_label: options?.versionLabel ?? null,
            expected_updated_at: serverUpdatedAtRef.current,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          post?: GeneratedPost;
          conflict?: boolean;
        };

        if (response.status === 409 && data.post) {
          setHasRemoteUpdate(true);
          setRemoteUpdatedAt(data.post.updated_at ?? data.post.created_at);
          setPost(data.post);
          throw new Error(
            data.error || "Another collaborator saved changes before you did."
          );
        }

        if (!response.ok || !data.post) {
          throw new Error(data.error || "Failed to save draft.");
        }

        setPost(data.post);
        serverUpdatedAtRef.current = data.post.updated_at ?? data.post.created_at;
        setHasRemoteUpdate(false);
        setRemoteUpdatedAt(null);
        savedSnapshotRef.current = {
          content: data.post.content,
          topic: data.post.topic,
          tone: data.post.tone,
        };
        setSaveState("saved");
        setLastSavedAt(
          new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        );

        if (options?.createVersion) {
          await loadVersions();
        }

        broadcastPostUpdate(data.post.updated_at ?? data.post.created_at);

        if (manual) {
          showToast({
            title: "Draft saved",
            description: "Your changes are stored in the post library.",
            variant: "success",
          });
        }
      } catch (error) {
        setSaveState("error");

        if (manual) {
          showToast({
            title: "Save failed",
            description: getErrorMessage(error, "Please try again."),
            variant: "destructive",
          });
        }
      }
    },
    [broadcastPostUpdate, loadVersions, postId]
  );

  useEffect(() => {
    if (!hasLoadedPost.current) {
      return;
    }

    const savedSnapshot = savedSnapshotRef.current;
    const hasChanges =
      content !== savedSnapshot.content ||
      topic !== savedSnapshot.topic ||
      tone !== savedSnapshot.tone;

    if (!hasChanges) {
      return;
    }

    setSaveState((currentState) =>
      currentState === "saving" ? currentState : "dirty"
    );

    const timeout = window.setTimeout(() => {
      void persistDraft({ content, topic, tone });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [content, persistDraft, tone, topic]);

  // --- Derived state ---

  const metrics = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const paragraphs = content.trim()
      ? content.split(/\n\s*\n/).filter((section) => section.trim()).length
      : 0;

    return {
      characters: content.length,
      words,
      paragraphs,
    };
  }, [content]);

  const saveBadge = getSaveBadge(saveState);

  // --- Handlers ---

  const appendSnippet = useCallback(
    (snippet: string, mode: "append" | "prepend" = "append") => {
      setContent((currentContent) => {
        if (!currentContent.trim()) {
          return snippet.trim();
        }

        if (mode === "prepend") {
          return `${snippet.trim()}\n\n${currentContent.trimStart()}`;
        }

        return `${currentContent.trimEnd()}\n\n${snippet.trim()}`;
      });
    },
    []
  );

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      setContent((current) => `${current}${current ? " " : ""}${emoji}`);
    },
    []
  );

  const handleImprove = useCallback(async () => {
    if (!content.trim()) {
      showToast({
        title: "Draft required",
        description: "Add some content before requesting improvements.",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);

    try {
      const response = await fetch("/api/posts/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, topic, tone }),
      });

      const data = (await response.json()) as Partial<ImprovePostResult> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to improve draft.");
      }

      if (data.improvedPost) {
        setContent(data.improvedPost);
      }

      setHashtags(data.hashtags ?? []);
      showToast({
        title: "Draft improved",
        description: "AI tightened the copy and suggested hashtags.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Improvement failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  }, [content, topic, tone]);

  const handleAddCollaborator = useCallback(async () => {
    if (!collaboratorEmail.trim()) {
      showToast({
        title: "Email required",
        description: "Enter the collaborator's email address.",
        variant: "destructive",
      });
      return;
    }

    setIsInvitingCollaborator(true);

    try {
      const response = await fetch(`/api/posts/${postId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: collaboratorEmail.trim() }),
      });
      const data = (await response.json()) as {
        error?: string;
        collaborators?: PostCollaborator[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to add collaborator.");
      }

      await loadCollaborators();
      setCollaboratorEmail("");
      showToast({
        title: "Collaborator added",
        description: "They can now edit this post from their workspace.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Invite failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsInvitingCollaborator(false);
    }
  }, [collaboratorEmail, loadCollaborators, postId]);

  const handleRemoveCollaborator = useCallback(
    async (userId: string) => {
      setRemovingCollaboratorId(userId);

      try {
        const response = await fetch(`/api/posts/${postId}/collaborators`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = (await response.json()) as {
          error?: string;
          collaborators?: PostCollaborator[];
        };

        if (!response.ok) {
          throw new Error(data.error || "Failed to remove collaborator.");
        }

        await loadCollaborators();
      } catch (error) {
        showToast({
          title: "Removal failed",
          description: getErrorMessage(error, "Please try again."),
          variant: "destructive",
        });
      } finally {
        setRemovingCollaboratorId(null);
      }
    },
    [loadCollaborators, postId]
  );

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      setRestoringVersionId(versionId);

      try {
        const response = await fetch(`/api/posts/${postId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        });
        const data = (await response.json()) as { error?: string; post?: GeneratedPost };

        if (!response.ok || !data.post) {
          throw new Error(data.error || "Failed to restore version.");
        }

        hydratePost(data.post);
        await loadVersions();
        broadcastPostUpdate(data.post.updated_at ?? data.post.created_at);
        showToast({
          title: "Version restored",
          description: "The draft has been rolled back to the selected version.",
          variant: "success",
        });
      } catch (error) {
        showToast({
          title: "Restore failed",
          description: getErrorMessage(error, "Please try again."),
          variant: "destructive",
        });
      } finally {
        setRestoringVersionId(null);
      }
    },
    [broadcastPostUpdate, hydratePost, loadVersions, postId]
  );

  const handleReloadLatest = useCallback(async () => {
    setIsReloadingRemote(true);

    try {
      await Promise.all([loadLatestPost(), loadVersions(), loadCollaborators()]);
      showToast({
        title: "Latest version loaded",
        description: "Your editor now reflects the most recent saved changes.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Reload failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsReloadingRemote(false);
    }
  }, [loadCollaborators, loadLatestPost, loadVersions]);

  // --- Render ---

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-sm text-muted-foreground">This post could not be loaded.</p>
          <Link href="/app/posts">
            <Button className="mt-4">Back to library</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/app/posts"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to library
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Full Post Editor</h1>
            {postRole && <Badge variant="outline">{postRole}</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">
            Autosave is on. Shape your hook, structure, CTA, and publish-ready copy from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={saveBadge.variant}>{saveBadge.label}</Badge>
          {lastSavedAt && (
            <span className="text-sm text-muted-foreground">Last saved at {lastSavedAt}</span>
          )}
          <Button
            onClick={() =>
              void persistDraft(
                { content, topic, tone },
                { manual: true, createVersion: true, versionLabel: "manual_save" }
              )
            }
          >
            <Save className="mr-2 h-4 w-4" />
            Save now
          </Button>
        </div>
      </div>

      {/* Remote update banner */}
      {hasRemoteUpdate && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/10 p-2">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Another collaborator saved a newer version.
                </p>
                <p className="text-xs text-muted-foreground">
                  {remoteUpdatedAt
                    ? `Remote changes were detected at ${formatDateTime(remoteUpdatedAt)}.`
                    : "Remote changes were detected for this post."}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleReloadLatest} disabled={isReloadingRemote}>
              {isReloadingRemote ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading latest...
                </>
              ) : (
                "Load latest version"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main two-column layout */}
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
        {/* Left column: Setup + Editor */}
        <div className="space-y-4">
          <PostSetup
            topic={topic}
            tone={tone}
            onTopicChange={setTopic}
            onToneChange={setTone}
            onFieldFocus={setActiveField}
            onCursorChange={setCursorPosition}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSnippet("Most people get this wrong:", "prepend")}
                >
                  Add hook
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendSnippet("- First takeaway\n- Second takeaway\n- Third takeaway")
                  }
                >
                  Add bullet block
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSnippet("What do you think?")}
                >
                  Add CTA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSnippet("Here is the part most people miss:")}
                >
                  Add pivot line
                </Button>
              </div>

              <Textarea
                value={content}
                onFocus={() => setActiveField("content")}
                onSelect={(event) =>
                  setCursorPosition(event.currentTarget.selectionStart ?? null)
                }
                onChange={(event) => {
                  setActiveField("content");
                  setCursorPosition(event.currentTarget.selectionStart ?? null);
                  setContent(event.target.value);
                }}
                className="min-h-[420px]"
                rows={18}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Tools, Collaborators, Versions, Preview */}
        <div className="space-y-4">
          <FormattingTools
            metrics={metrics}
            hashtags={hashtags}
            isImproving={isImproving}
            onInsertEmoji={handleInsertEmoji}
            onImprove={handleImprove}
            onInsertHashtag={appendSnippet}
          />

          <CollaboratorsPanel
            owner={owner}
            collaborators={collaborators}
            presenceSessions={presenceSessions}
            canManageCollaborators={canManageCollaborators}
            realtimeConnected={realtimeConnected}
            activeField={activeField}
            cursorPosition={cursorPosition}
            collaboratorEmail={collaboratorEmail}
            isInvitingCollaborator={isInvitingCollaborator}
            removingCollaboratorId={removingCollaboratorId}
            onCollaboratorEmailChange={setCollaboratorEmail}
            onAddCollaborator={handleAddCollaborator}
            onRemoveCollaborator={handleRemoveCollaborator}
          />

          <VersionHistory
            versions={versions}
            restoringVersionId={restoringVersionId}
            onRestoreVersion={handleRestoreVersion}
          />

          <PostPreview content={content} />
        </div>
      </div>
    </motion.div>
  );
}
