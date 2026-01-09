import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Stripe Customer Portal Route
 *
 * Opens Stripe billing portal for existing customers to:
 * - View invoices
 * - Update payment method
 * - Cancel subscription
 *
 * ⚠️ SAFE: Only READS from Supabase to get customer ID.
 * Portal changes are synced via webhook (which updates through existing save path).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    // Create Supabase client to READ user data
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's Stripe customer ID (READ ONLY)
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .single();

    if (!userData?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // MOCK MODE
    console.log("Opening customer portal for:", {
      userId,
      customerId: userData.stripe_customer_id,
    });

    /*
    // PRODUCTION CODE (uncomment when ready):
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
    */

    // MOCK RESPONSE
    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?portal=mock`,
      message: "Mock portal. Replace with real Stripe in production.",
    });
  } catch (error: any) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
