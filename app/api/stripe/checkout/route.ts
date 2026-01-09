import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPricingTier } from "@/lib/pricing";

/**
 * Stripe Checkout Route - PER-USE ONLY
 *
 * Creates Stripe Checkout sessions for per-use project payments.
 * Pricing: $85 base (0-1,500 SF) + $5 per 500 SF increment
 *
 * ⚠️ SAFE: Only READS from Supabase, does not modify save logic.
 * Webhook will update payment status through existing update path.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userId, type, squareFootage } = body;

    // Validate request
    if (!userId || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create Supabase client to READ user/project data
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

    // Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data (READ ONLY - no modifications)
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate project-based payment (PER-USE ONLY)
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required for per-use payment" },
        { status: 400 }
      );
    }

    // Fetch project details
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Calculate pricing based on square footage
    const sf = squareFootage || project.square_footage || 2000;
    const tier = getPricingTier(sf);

    const description = `${project.name || 'Metal Roof Project'} - Per-Use Fee`;
    const metadata: any = {
      userId,
      projectId,
      squareFootage: sf,
      type: "per_use"
    };

    // Create line items with proper unit_amount
    const lineItems = [{
      price_data: {
        currency: 'usd',
        unit_amount: tier.price, // This is in cents, e.g., 8500 = $85.00
        product_data: {
          name: `Metal Roof Project: ${project.name || 'Unnamed'}`,
          description: `${tier.label} - ${sf.toLocaleString()} SF roof (Per-use pricing: $85 base + $5 per 500 SF)`,
        },
      },
      quantity: 1,
    }];

    // Create real Stripe checkout session
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    console.log("Creating Stripe checkout session (Per-Use Model):", {
      userId,
      email: userData.email,
      projectId,
      squareFootage: sf,
      price: tier.price,
      description,
      metadata,
    });

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/projects/${projectId}?payment=success`;
    const cancelUrl = `${baseUrl}/projects/${projectId}?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      customer_email: userData.email,
      line_items: lineItems,
      mode: 'payment', // Always payment mode for per-use
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,

      // === CUSTOMIZATION OPTIONS ===

      // Collect billing address
      billing_address_collection: 'auto',

      // Collect phone number (optional)
      phone_number_collection: {
        enabled: true,
      },

      // Allow promotional codes
      allow_promotion_codes: true,

      // Automatic tax calculation (requires Stripe Tax setup)
      // automatic_tax: { enabled: true },

      // Enable customer creation
      customer_creation: 'always',

      // Custom success message
      submit_type: 'pay',

      // Set payment method types
      payment_method_types: ['card'],

      // Invoice creation
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Payment for ${description}`,
          footer: 'Thank you for your business! Visit us at mymetalroofer.com',
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
