"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Download,
  FileText,
  Sparkles,
  User,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toaster";
import { cn, formatDate, truncate } from "@/lib/utils";
import type { GeneratedPost, Profile } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [postsResponse, profileResponse] = await Promise.all([
          fetch("/api/posts/list"),
          fetch("/api/profile/import"),
        ]);

        if (!postsResponse.ok || !profileResponse.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const postsData = (await postsResponse.json()) as { posts?: GeneratedPost[] };
        const profileData = (await profileResponse.json()) as { profile?: Profile | null };

        if (!cancelled) {
          setPosts(postsData.posts ?? []);
          setProfile(profileData.profile ?? null);
        }
      } catch {
        if (!cancelled) {
          showToast({
            title: "Could not load dashboard",
            description: "Some summary data may be temporarily unavailable.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const postsThisMonth = useMemo(() => {
    const now = new Date();

    return posts.filter((post) => {
      const createdAt = new Date(post.created_at);
      return (
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [posts]);

  const stats = [
    {
      label: "Posts Generated",
      value: isLoading ? "--" : String(posts.length),
      icon: FileText,
      color: "text-electric-400",
      bg: "bg-electric-500/10",
    },
    {
      label: "Credits Remaining",
      value: String(session?.user.credits ?? 5),
      icon: Zap,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Profile Imported",
      value: profile ? "Yes" : isLoading ? "--" : "No",
      icon: User,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "This Month",
      value: isLoading ? "--" : String(postsThisMonth),
      icon: Calendar,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
  ];

  const recentPosts = posts.slice(0, 3);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Keep your LinkedIn workflow moving with profile context, saved drafts, and fresh post ideas.
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={cn("rounded-lg p-3", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/app/generate">
            <Card className="group cursor-pointer transition-all duration-300 hover:border-electric-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-electric-500/10 p-3 transition-colors group-hover:bg-electric-500/20">
                    <Wand2 className="h-6 w-6 text-electric-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Generate New Post</h3>
                    <p className="text-sm text-muted-foreground">
                      Create three on-brand LinkedIn drafts in seconds.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-electric-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/profile">
            <Card className="group cursor-pointer transition-all duration-300 hover:border-electric-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-500/10 p-3 transition-colors group-hover:bg-green-500/20">
                    <Download className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {profile ? "Refresh Profile Context" : "Import Profile"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile
                        ? "Keep your LinkedIn voice and experience current."
                        : "Bring in your profile to personalize every draft."}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-green-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/inspiration">
            <Card className="group cursor-pointer transition-all duration-300 hover:border-electric-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-amber-500/10 p-3 transition-colors group-hover:bg-amber-500/20">
                    <Sparkles className="h-6 w-6 text-amber-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Browse Inspiration</h3>
                    <p className="text-sm text-muted-foreground">
                      Swipe proven hooks and operator-style post angles.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/analytics">
            <Card className="group cursor-pointer transition-all duration-300 hover:border-electric-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-sky-500/10 p-3 transition-colors group-hover:bg-sky-500/20">
                    <BarChart3 className="h-6 w-6 text-sky-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Review Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      See tone mix, cadence, and pipeline health at a glance.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-sky-300" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Posts</h2>
        <Card>
          <CardContent className="p-6 sm:p-8">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : recentPosts.length > 0 ? (
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {post.tone && <span className="text-xs text-electric-300">{post.tone}</span>}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85">
                      {truncate(post.content, 180)}
                    </p>
                  </div>
                ))}
                <Link href="/app/posts">
                  <Button variant="outline">View all saved posts</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mb-1 font-medium text-foreground">No posts yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Generate your first post to build your draft library.
                </p>
                <Link href="/app/generate">
                  <Button>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Your First Post
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
