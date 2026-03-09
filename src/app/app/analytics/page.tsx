"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Eye,
  LineChart,
  Loader2,
  MessageSquare,
  RefreshCw,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toaster";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import type { AnalyticsSummary } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const emptySummary: AnalyticsSummary = {
  totalPosts: 0,
  totalPublishedPosts: 0,
  syncedPosts: 0,
  totalReactions: 0,
  totalComments: 0,
  totalImpressions: 0,
  averageEngagementRate: 0,
  topTone: "None yet",
  topPost: null,
  toneDistribution: [],
  statusDistribution: [],
  recentSnapshots: [],
  suggestions: [],
  lastImportedAt: null,
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const loadSummary = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/analytics/summary");
      const data = (await response.json()) as {
        error?: string;
        summary?: AnalyticsSummary;
      };

      if (!response.ok || !data.summary) {
        throw new Error(data.error || "Failed to load analytics summary.");
      }

      setSummary(data.summary);
    } catch (error) {
      showToast({
        title: "Analytics unavailable",
        description: getErrorMessage(error, "Please refresh and try again."),
        variant: "destructive",
      });
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const response = await fetch("/api/analytics/import", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        importedCount?: number;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to import analytics.");
      }

      await loadSummary({ silent: true });
      showToast({
        title: "Analytics imported",
        description: `Updated LinkedIn metrics for ${data.importedCount ?? 0} published posts.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Import failed",
        description: getErrorMessage(error, "Connect LinkedIn and try again."),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Pull real engagement signals from LinkedIn for posts published through PostPilot and compare them against your content mix.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary.lastImportedAt && (
            <Badge variant="outline">Last import: {formatDateTime(summary.lastImportedAt)}</Badge>
          )}
          <Button variant="outline" onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Import LinkedIn analytics
              </>
            )}
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Published posts", value: summary.totalPublishedPosts, icon: BarChart3 },
          { label: "Synced posts", value: summary.syncedPosts, icon: Activity },
          { label: "Total reactions", value: summary.totalReactions, icon: ThumbsUp },
          {
            label: "Avg engagement %",
            value: summary.averageEngagementRate.toFixed(2),
            icon: LineChart,
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {isLoading ? "--" : item.value}
                  </p>
                </div>
                <div className="rounded-lg bg-electric-500/10 p-3">
                  <item.icon className="h-5 w-5 text-electric-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
            </CardContent>
          </Card>
        </div>
      ) : summary.totalPosts > 0 ? (
        <>
          <motion.div variants={fadeInUp} className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Real engagement overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ThumbsUp className="h-4 w-4" />
                    Reactions
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {summary.totalReactions.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Comments
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {summary.totalComments.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    Impressions
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {summary.totalImpressions.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top performer</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.topPost ? (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-foreground">{summary.topPost.topic || "Untitled post"}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ThumbsUp className="h-4 w-4" />
                        {summary.topPost.reactions}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        {summary.topPost.comments}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-sm text-muted-foreground">
                    Publish a post and import metrics to reveal a top performer.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tone distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary.toneDistribution.length > 0 ? (
                  summary.toneDistribution.map((item) => {
                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{item.label}</span>
                          <span className="text-muted-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-electric-500 transition-all duration-300"
                            style={{ width: `${(item.count / summary.totalPosts) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No tone distribution yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent imported snapshots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.recentSnapshots.length > 0 ? (
                  summary.recentSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{formatDateTime(snapshot.captured_at)}</Badge>
                        {snapshot.engagement_rate !== null && (
                          <Badge variant="outline">{snapshot.engagement_rate}% engagement</Badge>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <ThumbsUp className="h-4 w-4" />
                          {snapshot.reactions}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4" />
                          {snapshot.comments}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" />
                          {snapshot.impressions ?? 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-sm text-muted-foreground">
                    No imported snapshots yet. Publish through PostPilot, then import LinkedIn analytics.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pattern signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top tone</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{summary.topTone}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Published coverage</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {summary.syncedPosts} of {summary.totalPublishedPosts} published posts synced
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {summary.suggestions.map((suggestion) => (
                  <div
                    key={suggestion}
                    className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-400" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </>
      ) : (
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium text-foreground">No analytics yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Publish a post through PostPilot, then import LinkedIn analytics to start building a real performance dashboard.
              </p>
              <Link href="/app/generate">
                <Button>
                  Create your first draft
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
