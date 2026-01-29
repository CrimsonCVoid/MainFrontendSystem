import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Comprehensive Stripe Webhook Handler
 *
 * Syncs all Stripe events with Supabase tables:
 * - stripe_customers
 * - stripe_subscriptions
 * - stripe_payments
 * - stripe_invoices
 * - stripe_payment_methods
 *
 * Also updates legacy users and projects tables for compatibility.
 *
 * IMPORTANT: Uses service role key to bypass RLS
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Must be set in .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature found" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    // Verify webhook signature (PRODUCTION)
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Processing: ${event.type}`);

    // Route to appropriate handler
    switch (event.type) {
      // ===== CUSTOMER EVENTS =====
      case "customer.created":
      case "customer.updated":
        await handleCustomerEvent(event);
        break;

      // ===== SUBSCRIPTION EVENTS =====
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event);
        break;

      // ===== PAYMENT EVENTS =====
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event);
        break;

      case "charge.refunded":
        await handleRefund(event);
        break;

      // ===== INVOICE EVENTS =====
      case "invoice.created":
      case "invoice.updated":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await handleInvoiceEvent(event);
        break;

      // ===== PAYMENT METHOD EVENTS =====
      case "payment_method.attached":
        await handlePaymentMethodAttached(event);
        break;

      case "payment_method.detached":
        await handlePaymentMethodDetached(event);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// =====================================================
// CUSTOMER EVENT HANDLERS
// =====================================================

async function handleCustomerEvent(event: Stripe.Event) {
  const customer = event.data.object as Stripe.Customer;

  // Find user by email or stripe customer ID
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .or(`email.eq.${customer.email},stripe_customer_id.eq.${customer.id}`)
    .single();

  if (!user) {
    console.warn(`[Webhook] No user found for customer ${customer.id}`);
    return;
  }

  // Upsert stripe_customers table
  const { error: customerError } = await supabaseAdmin
    .from("stripe_customers")
    .upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      email: customer.email!,
      name: customer.name || null,
      phone: customer.phone || null,
      metadata: customer.metadata as any,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "stripe_customer_id",
    });

  if (customerError) {
    console.error("[Webhook] Customer upsert error:", customerError);
  }

  // Update legacy users table
  await supabaseAdmin
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  console.log(`[Webhook] Customer ${event.type}: ${customer.id}`);
}

// =====================================================
// SUBSCRIPTION EVENT HANDLERS
// =====================================================

async function handleSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as any; // Using any due to API version breaking changes

  // Find user by customer ID
  const { data: customer } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", subscription.customer as string)
    .single();

  if (!customer) {
    console.warn(`[Webhook] No customer found for subscription ${subscription.id}`);
    return;
  }

  const subscriptionData = {
    user_id: customer.user_id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    price_id: subscription.items.data[0]?.price.id || null,
    product_id: subscription.items.data[0]?.price.product as string || null,
    amount: subscription.items.data[0]?.price.unit_amount || 0,
    currency: subscription.currency,
    interval: subscription.items.data[0]?.price.recurring?.interval || null,
    current_period_start: new Date((subscription.current_period_start || subscription.currentPeriodStart) * 1000).toISOString(),
    current_period_end: new Date((subscription.current_period_end || subscription.currentPeriodEnd) * 1000).toISOString(),
    trial_start: (subscription.trial_start || subscription.trialStart) ? new Date((subscription.trial_start || subscription.trialStart) * 1000).toISOString() : null,
    trial_end: (subscription.trial_end || subscription.trialEnd) ? new Date((subscription.trial_end || subscription.trialEnd) * 1000).toISOString() : null,
    cancel_at: (subscription.cancel_at || subscription.cancelAt) ? new Date((subscription.cancel_at || subscription.cancelAt) * 1000).toISOString() : null,
    canceled_at: (subscription.canceled_at || subscription.canceledAt) ? new Date((subscription.canceled_at || subscription.canceledAt) * 1000).toISOString() : null,
    ended_at: (subscription.ended_at || subscription.endedAt) ? new Date((subscription.ended_at || subscription.endedAt) * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancelAtPeriodEnd,
    cancellation_reason: subscription.cancellation_details?.reason || subscription.cancellationDetails?.reason || null,
    metadata: subscription.metadata as any,
    updated_at: new Date().toISOString(),
  };

  // Upsert subscription
  const { error: subError } = await supabaseAdmin
    .from("stripe_subscriptions")
    .upsert(subscriptionData, {
      onConflict: "stripe_subscription_id",
    });

  if (subError) {
    console.error("[Webhook] Subscription upsert error:", subError);
  }

  // Update legacy users table
  await (supabaseAdmin
    .from("users") as any)
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      subscription_current_period_end: new Date((subscription.current_period_end || subscription.currentPeriodEnd) * 1000).toISOString(),
    })
    .eq("id", customer.user_id);

  console.log(`[Webhook] Subscription ${event.type}: ${subscription.id}`);
}

// =====================================================
// PAYMENT EVENT HANDLERS
// =====================================================

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const { userId, type, projectId, squareFootage, org_id, package_id, sf_amount, price_cents, user_id } = metadata;

  // Handle SF Pool Purchase
  if (type === "sf_pool_purchase" && org_id && sf_amount) {
    await handleSFPoolPurchase(session, metadata);
    return;
  }

  if (!userId) {
    console.error("[Webhook] No userId in session metadata");
    return;
  }

  // Handle subscription checkout
  if (session.mode === "subscription" && session.subscription) {
    await supabaseAdmin
      .from("users")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_id: session.subscription as string,
        subscription_status: "active",
      })
      .eq("id", userId);
  }

  // Handle project payment
  if (projectId && session.payment_intent) {
    await supabaseAdmin
      .from("projects")
      .update({
        payment_completed: true,
        payment_required: false,
        payment_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("user_id", userId);
  }

  console.log(`[Webhook] Checkout completed: ${session.id}`);
}

/**
 * Handle SF Pool Purchase completion.
 * Adds purchased SF to the organization's pool.
 */
async function handleSFPoolPurchase(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { org_id, sf_amount, price_cents, user_id, package_id } = metadata;

  const sfAmount = parseInt(sf_amount, 10);
  const priceCents = parseInt(price_cents, 10);

  if (isNaN(sfAmount) || sfAmount <= 0) {
    console.error("[Webhook] Invalid sf_amount in SF pool purchase:", sf_amount);
    return;
  }

  console.log(`[Webhook] Processing SF pool purchase: ${sfAmount} SF for org ${org_id}`);

  // Call the add_sf_to_pool function to atomically update the pool
  const { data: result, error } = await supabaseAdmin.rpc("add_sf_to_pool", {
    p_org_id: org_id,
    p_user_id: user_id,
    p_sf_amount: sfAmount,
    p_price_cents: priceCents,
    p_stripe_session_id: session.id,
    p_stripe_payment_id: session.payment_intent as string || null,
    p_notes: `Purchased ${package_id} package via Stripe`,
  });

  if (error) {
    console.error("[Webhook] Failed to add SF to pool:", error);
    return;
  }

  const response = result as { success: boolean; message: string; new_total?: number; remaining?: number };

  if (response.success) {
    console.log(
      `[Webhook] SF pool purchase successful: ${sfAmount} SF added to org ${org_id}. ` +
      `New total: ${response.new_total}, Remaining: ${response.remaining}`
    );
  } else {
    console.error("[Webhook] SF pool purchase failed:", response.message);
  }
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as any; // Using any due to API version breaking changes

  // Get charge details
  const charge = paymentIntent.charges?.data?.[0] || (paymentIntent.latestCharge ? await stripe.charges.retrieve(paymentIntent.latestCharge as string) : null);
  if (!charge) return;

  // Find customer
  const { data: customer } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", paymentIntent.customer as string)
    .single();

  if (!customer) {
    console.warn(`[Webhook] No customer found for payment ${paymentIntent.id}`);
    return;
  }

  // Extract payment method details
  const paymentMethod = charge.payment_method_details;
  const metadata = paymentIntent.metadata;

  // Insert payment record
  const { error: paymentError } = await supabaseAdmin
    .from("stripe_payments")
    .insert({
      user_id: customer.user_id,
      project_id: metadata?.projectId || null,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: charge.id,
      stripe_customer_id: paymentIntent.customer as string,
      stripe_subscription_id: paymentIntent.invoice ? (paymentIntent.invoice as any) : null,
      stripe_invoice_id: paymentIntent.invoice as string || null,
      amount: paymentIntent.amount,
      amount_received: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      status: "succeeded",
      payment_method_type: paymentMethod?.type || null,
      payment_method_last4: (paymentMethod?.card?.last4 || paymentMethod?.us_bank_account?.last4) || null,
      payment_method_brand: paymentMethod?.card?.brand || null,
      payment_type: metadata?.type || "unknown",
      description: paymentIntent.description || null,
      receipt_url: charge.receipt_url || null,
      receipt_email: charge.receipt_email || null,
      metadata: paymentIntent.metadata as any,
    });

  if (paymentError) {
    console.error("[Webhook] Payment insert error:", paymentError);
  }

  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const { data: customer } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", paymentIntent.customer as string)
    .single();

  if (!customer) return;

  // Record failed payment
  await supabaseAdmin
    .from("stripe_payments")
    .insert({
      user_id: customer.user_id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: paymentIntent.customer as string,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: "failed",
      payment_type: paymentIntent.metadata?.type || "unknown",
      description: paymentIntent.description || null,
      failure_code: paymentIntent.last_payment_error?.code || null,
      failure_message: paymentIntent.last_payment_error?.message || null,
      metadata: paymentIntent.metadata as any,
    });

  console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);
}

async function handleRefund(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const refund = charge.refunds?.data[0];

  if (!refund) return;

  // Update payment record
  await supabaseAdmin
    .from("stripe_payments")
    .update({
      refunded: true,
      refund_amount: refund.amount,
      refund_reason: refund.reason || null,
      refunded_at: new Date(refund.created * 1000).toISOString(),
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_charge_id", charge.id);

  console.log(`[Webhook] Charge refunded: ${charge.id}`);
}

// =====================================================
// INVOICE EVENT HANDLERS
// =====================================================

async function handleInvoiceEvent(event: Stripe.Event) {
  const invoice = event.data.object as any; // Using any due to API version breaking changes

  const { data: customer } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", invoice.customer as string)
    .single();

  if (!customer) {
    console.warn(`[Webhook] No customer found for invoice ${invoice.id}`);
    return;
  }

  const invoiceData = {
    user_id: customer.user_id,
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    stripe_subscription_id: invoice.subscription as string || null,
    stripe_payment_intent_id: invoice.payment_intent as string || null,
    number: invoice.number || null,
    status: invoice.status || "draft",
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    subtotal: invoice.subtotal,
    total: invoice.total,
    tax: invoice.tax || 0,
    currency: invoice.currency,
    invoice_date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
    invoice_pdf: invoice.invoice_pdf || null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    attempted: invoice.attempted,
    attempt_count: invoice.attempt_count,
    next_payment_attempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
    description: invoice.description || null,
    metadata: invoice.metadata as any,
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin
    .from("stripe_invoices")
    .upsert(invoiceData, {
      onConflict: "stripe_invoice_id",
    });

  console.log(`[Webhook] Invoice ${event.type}: ${invoice.id}`);
}

// =====================================================
// PAYMENT METHOD EVENT HANDLERS
// =====================================================

async function handlePaymentMethodAttached(event: Stripe.Event) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;

  if (!paymentMethod.customer) return;

  const { data: customer } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", paymentMethod.customer as string)
    .single();

  if (!customer) return;

  // Check if this is the default payment method
  const stripeCustomer = await stripe.customers.retrieve(paymentMethod.customer as string);
  const isDefault = (stripeCustomer as Stripe.Customer).invoice_settings?.default_payment_method === paymentMethod.id;

  const pmData: any = {
    user_id: customer.user_id,
    stripe_customer_id: paymentMethod.customer as string,
    stripe_payment_method_id: paymentMethod.id,
    type: paymentMethod.type,
    is_default: isDefault,
    billing_name: paymentMethod.billing_details.name || null,
    billing_email: paymentMethod.billing_details.email || null,
    billing_phone: paymentMethod.billing_details.phone || null,
    billing_address_line1: paymentMethod.billing_details.address?.line1 || null,
    billing_address_line2: paymentMethod.billing_details.address?.line2 || null,
    billing_address_city: paymentMethod.billing_details.address?.city || null,
    billing_address_state: paymentMethod.billing_details.address?.state || null,
    billing_address_postal_code: paymentMethod.billing_details.address?.postal_code || null,
    billing_address_country: paymentMethod.billing_details.address?.country || null,
    metadata: paymentMethod.metadata as any,
  };

  if (paymentMethod.type === "card" && paymentMethod.card) {
    pmData.card_brand = paymentMethod.card.brand;
    pmData.card_last4 = paymentMethod.card.last4;
    pmData.card_exp_month = paymentMethod.card.exp_month;
    pmData.card_exp_year = paymentMethod.card.exp_year;
    pmData.card_country = paymentMethod.card.country;
  }

  if (paymentMethod.type === "us_bank_account" && paymentMethod.us_bank_account) {
    pmData.bank_name = paymentMethod.us_bank_account.bank_name;
    pmData.bank_last4 = paymentMethod.us_bank_account.last4;
    pmData.bank_account_type = paymentMethod.us_bank_account.account_type;
  }

  await supabaseAdmin
    .from("stripe_payment_methods")
    .upsert(pmData, {
      onConflict: "stripe_payment_method_id",
    });

  console.log(`[Webhook] Payment method attached: ${paymentMethod.id}`);
}

async function handlePaymentMethodDetached(event: Stripe.Event) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;

  await supabaseAdmin
    .from("stripe_payment_methods")
    .update({ status: "inactive" })
    .eq("stripe_payment_method_id", paymentMethod.id);

  console.log(`[Webhook] Payment method detached: ${paymentMethod.id}`);
}
