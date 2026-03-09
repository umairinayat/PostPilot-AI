"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, RefreshCw, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toaster";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import type { ReadinessCheck, ReadinessReport } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const emptyReport: ReadinessReport = {
  overallStatus: "attention",
  checks: [],
  checkedAt: new Date().toISOString(),
};

function statusVariant(status: ReadinessCheck["status"]) {
  if (status === "pass") {
    return "success" as const;
  }

  if (status === "warn") {
    return "outline" as const;
  }

  return "destructive" as const;
}

export default function SystemPage() {
  const [report, setReport] = useState<ReadinessReport>(emptyReport);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReport = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/system/readiness");
      const data = (await response.json()) as { error?: string; report?: ReadinessReport };

      if (!response.ok || !data.report) {
        throw new Error(data.error || "Failed to load readiness report.");
      }

      setReport(data.report);
    } catch (error) {
      showToast({
        title: "System checks unavailable",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadReport(true);
    setIsRefreshing(false);
  };

  const groups: Array<ReadinessCheck["category"]> = [
    "environment",
    "database",
    "integration",
    "user",
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-4 py-1.5 text-sm text-electric-300">
            <ServerCog className="h-4 w-4" />
            Production readiness checks
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">System Status</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Verify environment variables, database migrations, integration wiring, and user setup before shipping to production.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={report.overallStatus === "ready" ? "success" : "destructive"}>
            {report.overallStatus === "ready" ? "Ready" : "Needs attention"}
          </Badge>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {!isLoading && (
        <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Checks passed</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {report.checks.filter((check) => check.status === "pass").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {report.checks.filter((check) => check.status === "warn").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Last checked</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatDateTime(report.checkedAt)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const checks = report.checks.filter((check) => check.category === group);

            return (
              <motion.div key={group} variants={fadeInUp}>
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{group}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {checks.map((check) => (
                      <div
                        key={check.key}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{check.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
                          </div>
                          <Badge variant={statusVariant(check.status)}>
                            {check.status === "pass" ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {check.status}
                              </span>
                            )}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
