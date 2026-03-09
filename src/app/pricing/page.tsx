"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showToast } from "@/components/ui/toaster";
import { PLANS } from "@/types";
import { cn, getErrorMessage } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";
type PaidPlan = "pro" | "agency";

const priceMap: Record<PaidPlan, Record<BillingCycle, number>> = {
  pro: {
    monthly: 19,
    yearly: 15,
  },
  agency: {
    monthly: 49,
    yearly: 39,
  },
};

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlan = session?.user.plan ?? "free";

  const handlePlanSelection = async (plan: "free" | PaidPlan) => {
    if (plan === "free") {
      router.push(session ? "/app" : "/auth/signup");
      return;
    }

    if (!session) {
      router.push("/auth/signup");
      return;
    }

    setLoadingPlan(plan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      });

      const data = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      showToast({
        title: "Checkout unavailable",
        description: getErrorMessage(error, "Please try again in a moment."),
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-navy-300 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_28%)]" />
      <div className="relative z-10">
        <Navbar />

        <main className="px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <section id="pricing" className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="border-0 bg-electric-500/15 px-4 py-1.5 text-electric-300">
                Flexible billing for solo creators and teams
              </Badge>
              <h1 className="font-heading mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Choose the plan that fits your LinkedIn growth stage
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
                Start free, unlock premium AI models when you are ready, and keep
                your writing workflow in one place.
              </p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
                <button
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-medium transition-all",
                    billingCycle === "monthly"
                      ? "bg-electric-500 text-white shadow-lg shadow-electric-500/20"
                      : "text-white/55 hover:text-white"
                  )}
                  onClick={() => setBillingCycle("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-medium transition-all",
                    billingCycle === "yearly"
                      ? "bg-electric-500 text-white shadow-lg shadow-electric-500/20"
                      : "text-white/55 hover:text-white"
                  )}
                  onClick={() => setBillingCycle("yearly")}
                >
                  Yearly
                  <span className="ml-1.5 text-xs text-electric-200">save 20%</span>
                </button>
              </div>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {(["free", "pro", "agency"] as const).map((planKey) => {
                const plan = PLANS[planKey];
                const isCurrentPlan = status === "authenticated" && currentPlan === planKey;
                const displayPrice =
                  planKey === "free" ? 0 : priceMap[planKey][billingCycle];

                return (
                  <Card
                    key={planKey}
                    className={cn(
                      "relative overflow-hidden border-white/10 bg-white/[0.03]",
                      planKey === "pro" &&
                        "border-electric-500/40 bg-electric-500/[0.06] shadow-xl shadow-electric-900/30"
                    )}
                  >
                    {planKey === "pro" && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-electric-400 via-electric-300 to-electric-500" />
                    )}
                    <CardContent className="flex h-full flex-col p-8">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-heading text-2xl font-semibold text-white">
                            {plan.name}
                          </p>
                          <p className="mt-1 text-sm text-white/45">
                            {planKey === "free"
                              ? "Perfect for trying the workflow"
                              : planKey === "pro"
                                ? "For consistent personal content"
                                : "For teams and client delivery"}
                          </p>
                        </div>
                        {planKey === "pro" && <Badge>Most Popular</Badge>}
                        {isCurrentPlan && <Badge variant="success">Current</Badge>}
                      </div>

                      <div className="mt-8 flex items-end gap-2">
                        <span className="font-heading text-5xl font-bold text-white">
                          ${displayPrice}
                        </span>
                        <span className="pb-2 text-sm text-white/40">
                          {planKey === "free" ? "forever" : "/month"}
                        </span>
                      </div>

                      {planKey !== "free" && billingCycle === "yearly" && (
                        <p className="mt-2 text-xs text-electric-200">
                          Billed annually at ${displayPrice * 12}/year
                        </p>
                      )}

                      <div className="mt-8 space-y-3">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3 text-sm">
                            <div className="mt-0.5 rounded-full bg-electric-500/15 p-1">
                              <Check className="h-3.5 w-3.5 text-electric-300" />
                            </div>
                            <span className="text-white/70">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="mt-8 w-full"
                        size="lg"
                        variant={planKey === "pro" ? "default" : "outline"}
                        onClick={() => handlePlanSelection(planKey)}
                        disabled={loadingPlan !== null && loadingPlan !== planKey}
                      >
                        {loadingPlan === planKey ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting...
                          </>
                        ) : isCurrentPlan ? (
                          "Manage current plan"
                        ) : planKey === "free" ? (
                          session ? "Go to dashboard" : "Start free"
                        ) : (
                          <>
                            Upgrade to {plan.name}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-5 text-sm text-white/55 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-electric-300" />
                <span>
                  All paid plans include full post history, richer model access, and
                  faster publishing workflows.
                </span>
              </div>
              {!session && (
                <Link href="/auth/signup" className="mt-3 inline-block text-electric-300 sm:mt-0">
                  Create an account first
                </Link>
              )}
            </div>
          </section>

          <FAQ />
        </main>

        <Footer />
      </div>
    </div>
  );
}
