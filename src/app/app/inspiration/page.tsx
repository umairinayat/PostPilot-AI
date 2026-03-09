"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toaster";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import { INSPIRATION_NICHES, type InspirationPost } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type InspirationMeta = {
  count: number;
  lastSyncedAt: string | null;
  source: string | null;
};

export default function InspirationPage() {
  const [posts, setPosts] = useState<InspirationPost[]>([]);
  const [meta, setMeta] = useState<InspirationMeta>({
    count: 0,
    lastSyncedAt: null,
    source: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [niche, setNiche] = useState<(typeof INSPIRATION_NICHES)[number]>("All");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const loadPosts = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();

      if (niche !== "All") {
        params.set("niche", niche);
      }

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const response = await fetch(`/api/inspiration/list?${params.toString()}`);
      const data = (await response.json()) as {
        error?: string;
        posts?: InspirationPost[];
        meta?: InspirationMeta;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load inspiration feed.");
      }

      setPosts(data.posts ?? []);
      setMeta(data.meta ?? { count: 0, lastSyncedAt: null, source: null });
    } catch (error) {
      setPosts([]);
      showToast({
        title: "Feed unavailable",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [niche, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) {
        return;
      }

      await loadPosts();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadPosts]);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const response = await fetch("/api/inspiration/sync", { method: "POST" });
      const data = (await response.json()) as { error?: string; source?: string; count?: number };

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync inspiration feed.");
      }

      await loadPosts({ silent: true });
      showToast({
        title: "Feed synced",
        description:
          data.source === "external"
            ? "Pulled fresh inspiration posts from the configured external source."
            : "Refreshed the built-in curated inspiration set.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Sync failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const summary = useMemo(() => {
    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);

    return {
      totalLikes,
      totalComments,
    };
  }, [posts]);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-4 py-1.5 text-sm text-electric-300">
          <Sparkles className="h-4 w-4" />
          Inspiration feed with database sync support
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inspiration Feed</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Explore high-performing post patterns across founders, operators, marketers, and career storytellers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {meta.lastSyncedAt && (
              <Badge variant="outline">
                <Clock3 className="mr-1 h-3 w-3" />
                {formatDateTime(meta.lastSyncedAt)}
              </Badge>
            )}
            {meta.source && <Badge variant="outline">Source: {meta.source}</Badge>}
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync feed
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Posts in feed</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{isLoading ? "--" : meta.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total likes</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? "--" : summary.totalLikes.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total comments</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? "--" : summary.totalComments.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1.2fr_0.5fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by topic, hook, or role"
                className="pl-10"
              />
            </div>
            <Select
              value={niche}
              onValueChange={(value) =>
                setNiche(value as (typeof INSPIRATION_NICHES)[number])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by niche" />
              </SelectTrigger>
              <SelectContent>
                {INSPIRATION_NICHES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <motion.div variants={fadeInUp} className="grid gap-4 xl:grid-cols-2">
          {posts.map((post) => {
            const generatedTopic = `${post.hook}\n\nUse this angle: ${post.topic}`;
            const generateHref = `/app/generate?topic=${encodeURIComponent(generatedTopic)}&tone=${encodeURIComponent(post.tone)}&source=${encodeURIComponent(post.author_name)}`;

            return (
              <Card key={post.id} className="h-full">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{post.niche}</Badge>
                    <Badge variant="outline">{post.format}</Badge>
                    <Badge variant="outline">Reach: {post.estimated_reach}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {post.author_name} · {post.author_role}
                    </p>
                    <CardTitle className="mt-2 text-xl leading-tight">{post.hook}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-5">
                  <p className="text-sm leading-relaxed text-foreground/80">{post.excerpt}</p>

                  <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Why it works
                    </p>
                    {post.takeaways.map((takeaway) => (
                      <div key={takeaway} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-400" />
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-white/[0.08] pt-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ThumbsUp className="h-4 w-4" />
                        {post.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        {post.comments}
                      </span>
                    </div>
                    <Button asChild>
                      <Link href={generateHref}>
                        Write like this
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium text-foreground">No inspiration matches</h3>
              <p className="text-sm text-muted-foreground">
                Try a broader keyword or switch back to all niches.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
