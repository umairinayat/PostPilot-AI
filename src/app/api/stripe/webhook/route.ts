import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PRICE_IDS, stripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type AppPlan = "free" | "pro" | "agency";

function creditsForPlan(plan: AppPlan) {
  if (plan === "agency") {
    return 999999;
  }

  if (plan === "pro") {
    return 150;
  }

  return 5;
}

function resolvePlanFromPriceId(priceId?: string | null): Exclude<AppPlan, "free"> | null {
  if (!priceId) {
    return null;
  }

  if (priceId === PRICE_IDS.agency_monthly || priceId === PRICE_IDS.agency_yearly) {
    return "agency";
  }

  if (priceId === PRICE_IDS.pro_monthly || priceId === PRICE_IDS.pro_yearly) {
    return "pro";
  }

  return null;
}

async function updateUserBillingState({
  userId,
  plan,
  stripeCustomerId,
}: {
  userId: string;
  plan: AppPlan;
  stripeCustomerId?: string | null;
}) {
  const supabase = getServiceSupabase();
  const updates: {
    plan: AppPlan;
    credits: number;
    stripe_customer_id?: string;
  } = {
    plan,
    credits: creditsForPlan(plan),
  };

  if (stripeCustomerId) {
    updates.stripe_customer_id = stripeCustomerId;
  }

  await supabase.from("users").update(updates).eq("id", userId);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Invalid webhook signature") },
      { status: 400 }
    );
  }
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSession.metadata?.userId;
        let plan = checkoutSession.metadata?.plan as Exclude<AppPlan, "free"> | undefined;

        if (!plan && typeof checkoutSession.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription
          );
          plan = resolvePlanFromPriceId(subscription.items.data[0]?.price.id) ?? undefined;
        }

        if (userId && plan) {
          await updateUserBillingState({
            userId,
            plan,
            stripeCustomerId:
              typeof checkoutSession.customer === "string"
                ? checkoutSession.customer
                : null,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const plan =
          (subscription.metadata?.plan as Exclude<AppPlan, "free"> | undefined) ??
          resolvePlanFromPriceId(subscription.items.data[0]?.price.id) ??
          undefined;

        if (userId && plan) {
          await updateUserBillingState({
            userId,
            plan,
            stripeCustomerId:
              typeof subscription.customer === "string"
                ? subscription.customer
                : null,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateUserBillingState({
            userId,
            plan: "free",
            stripeCustomerId:
              typeof subscription.customer === "string"
                ? subscription.customer
                : null,
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Webhook handler failed") },
      { status: 500 }
    );
  }
}
