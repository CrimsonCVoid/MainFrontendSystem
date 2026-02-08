"use client";

import { useState } from "react";
import { CreditCard, Check, X, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROJECT_PRICE, MAX_SQFT } from "@/lib/pricing";

interface PaywallModalProps {
  onClose: () => void;
  onPerProject: (squareFootage: number) => Promise<void>;
}

/**
 * Paywall Modal Component
 *
 * Displays pricing before users can create projects.
 * Simple flat-rate pricing: $1,440 for up to 50,000 SF
 */
export default function PaywallModal({
  onClose,
  onPerProject,
}: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  const handlePerProject = async () => {
    setLoading(true);
    try {
      await onPerProject(MAX_SQFT);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 hover:bg-neutral-100 transition-colors z-10"
        >
          <X className="h-5 w-5 text-neutral-600" />
        </button>

        {/* Header */}
        <div className="border-b border-neutral-200 bg-gradient-to-br from-slate-50 to-slate-50 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-slate-500 p-2">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">
              Create Your Project
            </h2>
          </div>
          <p className="text-neutral-600">
            One simple price for full access
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Pricing Display */}
            <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-50 p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-neutral-600 mb-2">Full Access Package</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-slate-600">
                    ${(PROJECT_PRICE / 100).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mt-2">
                  Up to {MAX_SQFT.toLocaleString()} SF
                </p>
              </div>

              <div className="rounded-lg bg-white p-4 border border-slate-200 mb-4">
                <p className="text-xs text-neutral-500 text-center">
                  One-time payment • Full project access • No recurring charges
                </p>
              </div>

              <Button
                onClick={handlePerProject}
                disabled={loading}
                className="w-full bg-gradient-to-r from-slate-500 to-slate-500 hover:from-slate-600 hover:to-slate-600 text-white shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay ${(PROJECT_PRICE / 100).toLocaleString()} & Get Started
                  </>
                )}
              </Button>
            </div>

            {/* Features Included */}
            <div className="rounded-lg bg-white border border-neutral-200 p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                Every project includes:
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  Up to 50,000 SF coverage
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  Advanced 3D roof visualization
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  50+ premium paint colors
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  Material cost calculator & BOM
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  Professional quote generator
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  CSV/PDF exports
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 bg-neutral-50 p-6 text-center">
          <p className="text-xs text-neutral-500">
            🔒 Secure checkout powered by <strong>Stripe</strong> • No subscriptions • No commitments
          </p>
        </div>
      </div>
    </div>
  );
}
