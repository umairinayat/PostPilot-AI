import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const { data: userRecord, error: userRecordError } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (userRecordError) {
      throw new Error(userRecordError.message);
    }

    let customerId = (userRecord?.stripe_customer_id as string | null) ?? null;

    if (!customerId) {
      const customers = await stripe.customers.list({
        email: currentUser.email,
        limit: 1,
      });

      const customer = customers.data[0];

      if (!customer) {
        return NextResponse.json(
          { error: "No Stripe customer record was found for this account." },
          { status: 404 }
        );
      }

      customerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", currentUser.id);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to open billing portal") },
      { status: 500 }
    );
  }
}
