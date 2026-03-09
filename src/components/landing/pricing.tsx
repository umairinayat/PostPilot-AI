"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLANS } from "@/types";

const pricingData = [
  {
    key: "free" as const,
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Get Started",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    key: "pro" as const,
    monthlyPrice: 19,
    annualPrice: 15,
    cta: "Start Pro Trial",
    ctaVariant: "default" as const,
    highlighted: true,
    badge: "Most Popular",
  },
  {
    key: "agency" as const,
    monthlyPrice: 49,
    annualPrice: 39,
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-electric-500 text-sm font-semibold uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="font-heading mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
            Start free. Upgrade when you need more power.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                !annual
                  ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                  : "text-white/50 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                annual
                  ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                  : "text-white/50 hover:text-white"
              )}
            >
              Annual
              <span className="ml-1.5 text-xs text-electric-300 font-semibold">-20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {pricingData.map((tier) => {
            const plan = PLANS[tier.key];
            const price = annual ? tier.annualPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.key}
                className={cn(
                  "relative rounded-2xl border p-8 flex flex-col",
                  tier.highlighted
                    ? "border-electric-500/40 bg-electric-500/[0.05] shadow-lg shadow-electric-500/10"
                    : "border-white/[0.06] bg-white/[0.02]"
                )}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-electric-500 text-white border-0 px-3 py-1">
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                {/* Plan name */}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-white/40 text-sm">/month</span>
                  )}
                </div>
                {annual && price > 0 && (
                  <p className="mt-1 text-xs text-white/30">
                    Billed annually (${price * 12}/year)
                  </p>
                )}

                {/* Divider */}
                <div className="my-6 h-px bg-white/[0.06]" />

                {/* Features */}
                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-electric-400 shrink-0 mt-0.5" />
                      <span className="text-white/60">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-8">
                  <Button
                    variant={tier.ctaVariant}
                    size="lg"
                    className="w-full"
                    asChild
                  >
                      <Link href="/pricing">{tier.cta}</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
