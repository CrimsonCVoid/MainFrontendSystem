/**
 * SF Pool Purchase API Routes
 *
 * POST /api/orgs/[orgId]/sf-pool/purchase - Initiate SF purchase via Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { hasPermission } from "@/lib/org-types";
import { getPackageById, SF_PACKAGES } from "@/lib/sf-pool";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * POST /api/orgs/[orgId]/sf-pool/purchase
 * Initiate SF pool purchase via Stripe checkout.
 * Requires org:billing permission (owner/admin only).
 *
 * Body: { packageId: string }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  // Only billing managers can purchase
  if (!hasPermission(orgContext.role, "org:billing")) {
    return NextResponse.json(
      { error: "Only organization owners and admins can purchase square footage" },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { packageId } = body;

  if (!packageId || typeof packageId !== "string") {
    return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
  }

  // Validate package
  const pkg = getPackageById(packageId);
  if (!pkg) {
    return NextResponse.json(
      {
        error: "Invalid package ID",
        valid_packages: SF_PACKAGES.map((p) => p.id),
      },
      { status: 400 }
    );
  }

  // Get or create Stripe customer for the organization
  let stripeCustomerId = orgContext.org.stripe_customer_id;

  if (!stripeCustomerId) {
    // Create a new Stripe customer for the organization
    const customer = await stripe.customers.create({
      name: orgContext.org.name,
      metadata: {
        org_id: orgId,
        org_name: orgContext.org.name,
        created_by_user_id: orgContext.membership.user_id,
      },
    });

    stripeCustomerId = customer.id;

    // Save customer ID to organization
    await (supabase.from("organizations") as any).update({ stripe_customer_id: stripeCustomerId }).eq("id", orgId);
  }

  // Create Stripe checkout session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${pkg.label} Square Footage Package`,
              description: `Add ${pkg.sqft.toLocaleString()} SF to your organization's pool. ${pkg.description}`,
              metadata: {
                package_id: pkg.id,
                sqft: pkg.sqft.toString(),
              },
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "sf_pool_purchase",
        org_id: orgId,
        package_id: pkg.id,
        sf_amount: pkg.sqft.toString(),
        price_cents: pkg.priceCents.toString(),
        user_id: orgContext.membership.user_id,
      },
      success_url: `${baseUrl}/org/${orgId}/settings?tab=billing&sf_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/org/${orgId}/settings?tab=billing&sf_purchase=canceled`,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      package: {
        id: pkg.id,
        sqft: pkg.sqft,
        price: pkg.priceDisplay,
      },
    });
  } catch (err: any) {
    console.error("Failed to create Stripe checkout session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orgs/[orgId]/sf-pool/purchase
 * Get available SF packages for purchase.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  return NextResponse.json({
    packages: SF_PACKAGES,
    can_purchase: hasPermission(orgContext.role, "org:billing"),
    current_pool: {
      total: orgContext.org.sf_pool_total,
      used: orgContext.org.sf_pool_used,
      remaining: (orgContext.org.sf_pool_total || 0) - (orgContext.org.sf_pool_used || 0),
    },
  });
}
