import Stripe from "stripe";

export type BillingCycle = "monthly" | "yearly";
export type PaidPlan = "pro" | "agency";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID || "",
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "",
  agency_monthly: process.env.STRIPE_AGENCY_PRICE_ID || "",
  agency_yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID || "",
};

export function getStripePriceId(plan: PaidPlan, billingCycle: BillingCycle) {
  if (plan === "pro") {
    return billingCycle === "yearly"
      ? PRICE_IDS.pro_yearly
      : PRICE_IDS.pro_monthly;
  }

  return billingCycle === "yearly"
    ? PRICE_IDS.agency_yearly
    : PRICE_IDS.agency_monthly;
}
