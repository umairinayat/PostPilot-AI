"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  CreditCard,
  ExternalLink,
  Link as LinkIcon,
  Mail,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { showToast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/utils";
import { PLANS } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [linkedInMessage, setLinkedInMessage] = useState<string | null>(null);
  const [linkedInStatus, setLinkedInStatus] = useState({
    connected: false,
    profileName: null as string | null,
    autoPublishEnabled: false,
  });
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(true);
  const [isDisconnectingLinkedIn, setIsDisconnectingLinkedIn] = useState(false);
  const [isUpdatingLinkedInPrefs, setIsUpdatingLinkedInPrefs] = useState(false);

  const loadLinkedInStatus = useCallback(async () => {
    setIsLoadingLinkedIn(true);

    try {
      const response = await fetch("/api/linkedin/status");
      const data = (await response.json()) as {
        error?: string;
        connected?: boolean;
        profileName?: string | null;
        autoPublishEnabled?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load LinkedIn status.");
      }

      setLinkedInStatus({
        connected: Boolean(data.connected),
        profileName: data.profileName ?? null,
        autoPublishEnabled: Boolean(data.autoPublishEnabled),
      });
    } catch (error) {
      showToast({
        title: "LinkedIn unavailable",
        description: getErrorMessage(error, "Please refresh and try again."),
        variant: "destructive",
      });
    } finally {
      setIsLoadingLinkedIn(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setShowUpgradeSuccess(params.get("success") === "true");
    if (params.get("linkedin") === "connected") {
      setLinkedInMessage("LinkedIn connected. Scheduled posts can now auto-publish.");
    } else if (params.get("linkedin_error")) {
      setLinkedInMessage(params.get("linkedin_error"));
    }

    void loadLinkedInStatus();
  }, [loadLinkedInStatus]);

  const user = {
    name: session?.user.name ?? "PostPilot User",
    email: session?.user.email ?? "",
    plan: session?.user.plan ?? "free",
    credits: session?.user.credits ?? 5,
  };

  const currentPlan = PLANS[user.plan];

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to open billing portal.");
      }

      window.location.href = data.url;
    } catch (error) {
      showToast({
        title: "Billing portal unavailable",
        description: getErrorMessage(error, "Please try again in a moment."),
        variant: "destructive",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleConnectLinkedIn = () => {
    window.location.href = "/api/linkedin/connect";
  };

  const handleDisconnectLinkedIn = async () => {
    setIsDisconnectingLinkedIn(true);

    try {
      const response = await fetch("/api/linkedin/disconnect", { method: "POST" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect LinkedIn.");
      }

      setLinkedInStatus({ connected: false, profileName: null, autoPublishEnabled: false });
      showToast({
        title: "LinkedIn disconnected",
        description: "Auto-publishing has been turned off for this account.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Disconnect failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsDisconnectingLinkedIn(false);
    }
  };

  const handleToggleAutoPublish = async () => {
    setIsUpdatingLinkedInPrefs(true);

    try {
      const nextValue = !linkedInStatus.autoPublishEnabled;
      const response = await fetch("/api/linkedin/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPublishEnabled: nextValue }),
      });
      const data = (await response.json()) as {
        error?: string;
        autoPublishEnabled?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update LinkedIn preferences.");
      }

      setLinkedInStatus((currentStatus) => ({
        ...currentStatus,
        autoPublishEnabled: Boolean(data.autoPublishEnabled),
      }));
    } catch (error) {
      showToast({
        title: "Preference update failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLinkedInPrefs(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
      className="max-w-3xl space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account details, plan, and billing context.
        </p>
      </motion.div>

      {showUpgradeSuccess && (
        <motion.div variants={fadeInUp}>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="rounded-full bg-green-500/10 p-2">
                <Zap className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Upgrade successful</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription details have been refreshed. Enjoy the extra capacity.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {linkedInMessage && (
        <motion.div variants={fadeInUp}>
          <Card className="border-electric-500/20 bg-electric-500/5">
            <CardContent className="p-5 text-sm text-foreground/85">
              {linkedInMessage}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-muted-foreground" />
              Account
            </CardTitle>
            <CardDescription>Your personal account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Name</p>
                <p className="text-sm font-medium text-foreground">{user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{user.email}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Current Plan
              </p>
              <Badge
                variant={user.plan === "free" ? "outline" : "default"}
                className="text-sm"
              >
                {currentPlan.name}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your plan and monthly usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{currentPlan.name} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan.price === 0 ? "Free forever" : `$${currentPlan.price}/month`}
                  </p>
                </div>
                <Badge
                  variant={user.plan === "free" ? "outline" : "default"}
                  className="text-sm"
                >
                  Active
                </Badge>
              </div>
              <Separator />
              <ul className="space-y-2">
                {currentPlan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-electric-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Credits Remaining</p>
                  <p className="text-xs text-muted-foreground">
                    {user.credits} of {currentPlan.postsPerMonth === Infinity ? "unlimited" : currentPlan.postsPerMonth} posts this month
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground">{user.credits}</span>
            </div>

            {user.plan === "free" && (
              <Link href="/pricing">
                <Button className="w-full" size="lg">
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade Plan
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}

            {user.plan !== "free" && (
              <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Self-serve billing</p>
                  <p className="text-xs text-muted-foreground">
                    Update payment details, switch plans, or cancel from the Stripe customer portal.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleOpenPortal}
                  disabled={isOpeningPortal}
                >
                  {isOpeningPortal ? (
                    <>
                      <Zap className="mr-2 h-4 w-4 animate-pulse" />
                      Opening portal...
                    </>
                  ) : (
                    <>
                      Manage billing in Stripe
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
              LinkedIn Publishing
            </CardTitle>
            <CardDescription>
              Connect a LinkedIn profile to publish scheduled posts automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isLoadingLinkedIn
                      ? "Loading LinkedIn status..."
                      : linkedInStatus.connected
                        ? linkedInStatus.profileName || "LinkedIn account connected"
                        : "No LinkedIn account connected"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {linkedInStatus.connected
                      ? "Connected accounts can publish immediately from the schedule queue and via cron runs."
                      : "Connect LinkedIn to unlock API publishing and scheduled auto-posting."}
                  </p>
                </div>
                <Badge variant={linkedInStatus.connected ? "success" : "outline"}>
                  {linkedInStatus.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={handleConnectLinkedIn} disabled={isLoadingLinkedIn}>
                Connect LinkedIn
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnectLinkedIn}
                disabled={!linkedInStatus.connected || isDisconnectingLinkedIn}
              >
                {isDisconnectingLinkedIn ? "Disconnecting..." : "Disconnect LinkedIn"}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-publish scheduled posts</p>
                <p className="text-xs text-muted-foreground">
                  Due scheduled posts will be published by the cron endpoint while this stays enabled.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleToggleAutoPublish}
                disabled={!linkedInStatus.connected || isUpdatingLinkedInPrefs}
              >
                {isUpdatingLinkedInPrefs
                  ? "Updating..."
                  : linkedInStatus.autoPublishEnabled
                    ? "Enabled"
                    : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-400">
              <Shield className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all imported profile data.
                </p>
              </div>
              <Button variant="destructive" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
