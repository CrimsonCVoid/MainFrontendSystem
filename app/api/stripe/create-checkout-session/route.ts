import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * @deprecated Use /api/stripe/checkout instead
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { projectId, projectName, userId, priceType } = body;

    if (!projectId || !userId || !priceType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user authentication with Supabase
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Initialize Stripe (you'll need to install: npm install stripe)
    // For now, we'll create a mock response
    // In production, uncomment the Stripe code below:

    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const prices = {
      estimate: 'price_XXXXXXXXXX', // Replace with your Stripe Price ID
      subscription: 'price_YYYYYYYYYY', // Replace with your Stripe Price ID
    };

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: prices[priceType as keyof typeof prices],
          quantity: 1,
        },
      ],
      mode: priceType === 'subscription' ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/projects/${projectId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/projects/${projectId}?payment=cancelled`,
      metadata: {
        projectId,
        userId,
        projectName,
      },
    });

    return NextResponse.json({ url: session.url });
    */

    // MOCK RESPONSE FOR DEVELOPMENT
    // Replace this with actual Stripe implementation above
    console.log("Creating checkout session for:", {
      projectId,
      projectName,
      userId,
      priceType,
    });

    // Simulate Stripe checkout URL (in production, this would be the real Stripe URL)
    const mockCheckoutUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/projects/${projectId}?payment=mock-success&type=${priceType}`;

    return NextResponse.json({
      url: mockCheckoutUrl,
      message: "Mock checkout session created. In production, this would redirect to Stripe.",
    });

  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

