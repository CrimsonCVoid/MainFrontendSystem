"use client";

import { useState } from "react";
import { CreditCard, Check, X, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExamplePricingTiers, getPricingTier, formatPrice } from "@/lib/pricing";

interface PaywallModalProps {
  onClose: () => void;
  onPerProject: (squareFootage: number) => Promise<void>;
}

/**
 * Paywall Modal Component
 *
 * Displays per-use pricing before users can create projects.
 * Simple pay-per-project model:
 * - $85 base for 0-1,500 SF
 * - +$5 per 500 SF increment above 1,500 SF
 *
 * Examples:
 * - 0-1,500 SF: $85
 * - 1,501-2,000 SF: $90
 * - 2,001-2,500 SF: $95
 * - And so on...
 */
export default function PaywallModal({
  onClose,
  onPerProject,
}: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [squareFootage, setSquareFootage] = useState<string>("2000");

  const sfNumber = parseInt(squareFootage) || 0;
  const pricingTier = getPricingTier(sfNumber);
  const exampleTiers = getExamplePricingTiers();

  const handlePerProject = async () => {
    if (sfNumber < 1) {
      alert("Please enter a valid square footage");
      return;
    }

    setLoading(true);
    try {
      await onPerProject(sfNumber);
    } catch (error) {
      console.error("Per-project payment error:", error);
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
        <div className="border-b border-neutral-200 bg-gradient-to-br from-orange-50 to-amber-50 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-orange-500 p-2">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">
              Create Your Project
            </h2>
          </div>
          <p className="text-neutral-600">
            Simple per-use pricing - pay only for the projects you create
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Per-Project Option */}
            <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                Per-Use Pricing
              </h3>
              <p className="text-sm text-neutral-600 mb-6">
                One-time payment based on project size - No subscriptions required
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="square-footage" className="text-sm font-medium">
                    Project Square Footage
                  </Label>
                  <Input
                    id="square-footage"
                    type="number"
                    min="1"
                    value={squareFootage}
                    onChange={(e) => setSquareFootage(e.target.value)}
                    placeholder="Enter square footage..."
                    className="mt-1"
                  />
                </div>

                {/* Dynamic Pricing Display */}
                {sfNumber > 0 && (
                  <div className="rounded-lg bg-gradient-to-br from-white to-orange-50 p-4 border-2 border-orange-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-600">
                        {pricingTier.label}
                      </span>
                      <span className="text-3xl font-bold text-orange-600">
                        {formatPrice(pricingTier.price)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      One-time payment • Full project access • No recurring charges
                    </p>
                  </div>
                )}

                <Button
                  onClick={handlePerProject}
                  disabled={loading || sfNumber < 1}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay {sfNumber > 0 ? formatPrice(pricingTier.price) : ""} & Create Project
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Features Included */}
            <div className="rounded-lg bg-white border border-neutral-200 p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                Every project includes:
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  Advanced 3D roof visualization
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  50+ premium paint colors
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  Material cost calculator & BOM
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  Professional quote generator
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  CSV/PDF exports
                </li>
              </ul>
            </div>

            {/* Pricing Tiers Reference */}
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                Pricing Tiers
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {exampleTiers.map((tier) => (
                  <div
                    key={tier.label}
                    className="rounded-md bg-white border border-neutral-200 p-2"
                  >
                    <p className="font-medium text-orange-600">{tier.priceDisplay}</p>
                    <p className="text-neutral-500">
                      {tier.minSF.toLocaleString()}
                      {tier.maxSF ? `-${tier.maxSF.toLocaleString()}` : "+"} SF
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-3 text-center">
                Formula: $85 + ($5 × 500 SF increments above 1,500)
              </p>
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
