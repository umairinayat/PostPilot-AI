"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Loader2,
  PencilLine,
  Rocket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toaster";
import { formatDateTime, getErrorMessage, toDatetimeLocalValue, truncate } from "@/lib/utils";
import type { GeneratedPost } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function SchedulePage() {
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [scheduleValues, setScheduleValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const response = await fetch("/api/posts/list?sort=newest");

        if (!response.ok) {
          throw new Error("Failed to load posts for scheduling.");
        }

        const data = (await response.json()) as { posts?: GeneratedPost[] };

        if (!cancelled) {
          const items = data.posts ?? [];
          setPosts(items);
          setScheduleValues(
            Object.fromEntries(
              items.map((post) => [
                post.id,
                post.scheduled_at ? toDatetimeLocalValue(post.scheduled_at) : "",
              ])
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          showToast({
            title: "Schedule unavailable",
            description: getErrorMessage(error, "Please refresh and try again."),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedScheduledPosts = useMemo(
    () =>
      posts
        .filter((post) => post.status === "scheduled" && post.scheduled_at)
        .sort(
          (left, right) =>
            new Date(left.scheduled_at ?? 0).getTime() -
            new Date(right.scheduled_at ?? 0).getTime()
        ),
    [posts]
  );

  const drafts = useMemo(
    () => posts.filter((post) => post.status !== "published"),
    [posts]
  );

  const upcomingThisWeek = useMemo(() => {
    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

    return sortedScheduledPosts.filter((post) => {
      const scheduledAt = new Date(post.scheduled_at ?? 0).getTime();
      return scheduledAt >= now && scheduledAt <= nextWeek;
    }).length;
  }, [sortedScheduledPosts]);

  const updatePost = async (
    postId: string,
    updates: Partial<Pick<GeneratedPost, "status" | "scheduled_at">>
  ) => {
    setUpdatingId(postId);

    try {
      const response = await fetch("/api/posts/save", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, ...updates }),
      });

      const data = (await response.json()) as { error?: string; post?: GeneratedPost };

      if (!response.ok || !data.post) {
        throw new Error(data.error || "Failed to update schedule.");
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === postId ? data.post! : post))
      );

      setScheduleValues((currentValues) => ({
        ...currentValues,
        [postId]: data.post?.scheduled_at
          ? toDatetimeLocalValue(data.post.scheduled_at)
          : "",
      }));

      const successTitle =
        updates.status === "scheduled"
          ? "Post scheduled"
          : updates.status === "published"
            ? "Marked as published"
            : "Schedule cleared";
      const successDescription =
        updates.status === "scheduled"
          ? "Your post is now in the publishing queue."
          : updates.status === "published"
            ? "This post moved out of the schedule queue into published status."
            : "This post returned to draft status.";

      showToast({
        title: successTitle,
        description: successDescription,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Update failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSchedule = async (post: GeneratedPost) => {
    const value = scheduleValues[post.id];

    if (!value) {
      showToast({
        title: "Choose a date and time",
        description: "Set a publishing slot before scheduling this post.",
        variant: "destructive",
      });
      return;
    }

    await updatePost(post.id, {
      status: "scheduled",
      scheduled_at: new Date(value).toISOString(),
    });
  };

  const handleUnschedule = async (postId: string) => {
    await updatePost(postId, {
      status: "draft",
      scheduled_at: null,
    });
  };

  const handleCopyForLinkedIn = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast({
        title: "Copied for LinkedIn",
        description: "The scheduled post is now on your clipboard.",
        variant: "success",
      });
    } catch {
      showToast({
        title: "Copy failed",
        description: "Could not copy the scheduled post.",
        variant: "destructive",
      });
    }
  };

  const handlePublishNow = async (post: GeneratedPost) => {
    setUpdatingId(post.id);

    try {
      const response = await fetch("/api/linkedin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish post.");
      }

      setPosts((currentPosts) =>
        currentPosts.map((currentPost) =>
          currentPost.id === post.id
            ? { ...currentPost, status: "published", updated_at: new Date().toISOString() }
            : currentPost
        )
      );
      showToast({
        title: "Published to LinkedIn",
        description: "The post was sent through the LinkedIn API.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Publish failed",
        description: getErrorMessage(error, "Connect LinkedIn and try again."),
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportPost = (post: GeneratedPost) => {
    const fileName = `${(post.topic || "postpilot-post")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || post.id}.txt`;
    const exportText = [
      `Topic: ${post.topic || "Untitled"}`,
      `Tone: ${post.tone || "Unspecified"}`,
      `Status: ${post.status}`,
      "",
      post.content,
    ].join("\n");
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    showToast({
      title: "Post exported",
      description: "A .txt copy of the scheduled post was downloaded.",
      variant: "success",
    });
  };

  const handleMarkPublished = async (postId: string) => {
    await updatePost(postId, { status: "published" });
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground">Schedule Queue</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Organize upcoming posts, assign publish slots, and keep a lightweight internal content calendar.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Scheduled posts</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? "--" : sortedScheduledPosts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Due this week</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? "--" : upcomingThisWeek}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Drafts ready</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? "--" : drafts.filter((post) => post.status === "draft").length}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
          <Card>
            <CardContent className="space-y-4 p-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : posts.length > 0 ? (
        <motion.div variants={fadeInUp} className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule Drafts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {drafts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant={post.status === "scheduled" ? "success" : "outline"}>
                      {post.status}
                    </Badge>
                    {post.tone && <Badge variant="outline">{post.tone}</Badge>}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {truncate(post.content, 180)}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <Input
                      type="datetime-local"
                      value={scheduleValues[post.id] ?? ""}
                      onChange={(event) =>
                        setScheduleValues((currentValues) => ({
                          ...currentValues,
                          [post.id]: event.target.value,
                        }))
                      }
                      className="lg:max-w-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleSchedule(post)}
                        disabled={updatingId === post.id}
                      >
                        {updatingId === post.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Calendar className="mr-2 h-4 w-4" />
                            {post.status === "scheduled" ? "Reschedule" : "Schedule"}
                          </>
                        )}
                      </Button>
                      {post.status === "scheduled" && (
                        <Button
                          variant="outline"
                          onClick={() => handleUnschedule(post.id)}
                          disabled={updatingId === post.id}
                        >
                          Remove slot
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedScheduledPosts.length > 0 ? (
                  sortedScheduledPosts.map((post) => (
                    <div key={post.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="success">Scheduled</Badge>
                        {post.tone && <Badge variant="outline">{post.tone}</Badge>}
                      </div>
                      <p className="text-sm text-foreground/85">{truncate(post.content, 120)}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="h-4 w-4" />
                        {post.scheduled_at ? formatDateTime(post.scheduled_at) : "No slot set"}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyForLinkedIn(post.content)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportPost(post)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePublishNow(post)}
                          disabled={updatingId === post.id}
                        >
                          {updatingId === post.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Rocket className="mr-2 h-4 w-4" />
                              Publish now
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkPublished(post.id)}
                          disabled={updatingId === post.id}
                        >
                          {updatingId === post.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark published
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/app/posts/${post.id}/edit`}>
                            <PencilLine className="mr-2 h-4 w-4" />
                            Open editor
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-muted-foreground">
                    No scheduled posts yet. Pick a draft and assign a publish time.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publishing Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Connected LinkedIn accounts can publish now from this queue, and the cron endpoint can automatically publish due scheduled posts.
                </p>
                <Link href="/app/generate">
                  <Button variant="outline" className="w-full">
                    Create another draft
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium text-foreground">Nothing to schedule yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Save a few generated drafts first, then you can build a publishing queue here.
              </p>
              <Link href="/app/generate">
                <Button>Generate your first post</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
