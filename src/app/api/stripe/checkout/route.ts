import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import {
  getStripePriceId,
  type BillingCycle,
  type PaidPlan,
  stripe,
} from "@/lib/stripe";
import { getErrorMessage } from "@/lib/utils";

type CheckoutBody = {
  plan?: PaidPlan;
  billingCycle?: BillingCycle;
  priceId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CheckoutBody;
    const plan = body.plan ?? "pro";
    const billingCycle = body.billingCycle ?? "monthly";
    const selectedPriceId = body.priceId || getStripePriceId(plan, billingCycle);
    const supabase = getServiceSupabase();

    if (!selectedPriceId) {
      return NextResponse.json(
        { error: "This Stripe price is not configured yet." },
        { status: 400 }
      );
    }

    const { data: userRecord, error: userRecordError } = await supabase
      .from("users")
      .select("stripe_customer_id, email, name")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (userRecordError) {
      throw new Error(userRecordError.message);
    }

    let stripeCustomerId = (userRecord?.stripe_customer_id as string | null) ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: currentUser.email ?? (userRecord?.email as string | null) ?? undefined,
        name: (userRecord?.name as string | null) ?? currentUser.name ?? undefined,
        metadata: {
          userId: currentUser.id,
        },
      });

      stripeCustomerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", currentUser.id);
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer: stripeCustomerId,
      metadata: {
        userId: currentUser.id,
        plan,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: currentUser.id,
          plan,
          billingCycle,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create checkout session") },
      { status: 500 }
    );
  }
}
