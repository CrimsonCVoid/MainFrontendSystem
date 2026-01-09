"use client";

import { useState } from "react";
import { CreditCard, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface StripeCheckoutProps {
  projectId: string;
  projectName: string;
  userId: string;
}

/**
 * Stripe Checkout Component - PER-USE ONLY
 *
 * Integrates Stripe payment processing for per-use project pricing.
 * Features:
 * - Per-use pricing based on square footage ($85 base + $5 per 500 SF)
 * - Secure checkout flow
 * - Real-time payment status
 * - No subscriptions
 *
 * @param projectId - Project ID to link payment
 * @param projectName - Project name for checkout description
 * @param userId - User ID for payment tracking
 */
export default function StripeCheckout({
  projectId,
  projectName,
  userId,
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  /**
   * Initiate Stripe Checkout Session
   * Creates a checkout session on the server and redirects user to Stripe
   */
  const handleCheckout = async (priceType: "estimate") => {
    setLoading(true);
    setError(null);
    setPaymentStatus("processing");

    try {
      // Call your API route to create a Stripe Checkout session
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          projectName,
          userId,
          priceType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred during checkout");
      setPaymentStatus("error");
      setLoading(false);
    }
  };

  /**
   * Check if project already has payment
   */
  const checkPaymentStatus = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      // You can add a 'payment_status' field to your projects table
      // to track whether a project has been paid for
      // For now, this is a placeholder
      return project;
    } catch (err) {
      console.error("Error checking payment status:", err);
      return null;
    }
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm border border-orange-100">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-neutral-900">
            Project Payment
          </h3>
        </div>
        <p className="text-sm text-neutral-600">
          Complete payment to unlock all features for this project.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Option */}
      <div className="rounded-lg bg-white p-4 border-2 border-orange-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-neutral-900 text-lg">
              Project Access
            </h4>
            <p className="text-sm text-neutral-600 mt-1">
              Per-use pricing based on square footage
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-orange-600">$85+</p>
            <p className="text-xs text-neutral-500">one-time</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 p-3">
          <p className="text-sm font-medium text-neutral-900 mb-1">
            Pricing: $85 base + $5 per 500 SF increment
          </p>
          <p className="text-xs text-neutral-600">
            0-1,500 SF: $85 • 1,501-2,000 SF: $90 • 2,001-2,500 SF: $95
          </p>
        </div>

        <ul className="mb-4 space-y-2 text-sm text-neutral-700">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-orange-500" />
            Advanced 3D roof visualization
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-orange-500" />
            50+ premium paint colors
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-orange-500" />
            Material cost calculator & BOM
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-orange-500" />
            Professional quote generator
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-orange-500" />
            CSV/PDF exports
          </li>
        </ul>

        <Button
          onClick={() => handleCheckout("estimate")}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Complete Payment
            </>
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 text-center">
        <p className="text-xs text-neutral-500">
          🔒 Secure checkout powered by{" "}
          <span className="font-semibold">Stripe</span> • No subscriptions • Pay once per project
        </p>
      </div>
    </div>
  );
}
