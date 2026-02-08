"use client";

/**
 * SF Purchase Dialog
 *
 * Allows admins/owners to purchase SF packages for their organization.
 */

import { useState } from "react";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SF_PACKAGES, type SFPackage, formatSF, getBestValuePackage } from "@/lib/sf-pool";
import { Loader2, Check, Sparkles, TrendingUp } from "lucide-react";

interface SFPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SFPurchaseDialog({ open, onOpenChange }: SFPurchaseDialogProps) {
  const { org, pool, canManageBilling } = useOrg();
  const [selectedPackage, setSelectedPackage] = useState<SFPackage | null>(
    SF_PACKAGES[0] // Default to 50,000 SF
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bestValue = getBestValuePackage();

  const handlePurchase = async () => {
    if (!org || !selectedPackage) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orgs/${org.id}/sf-pool/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate purchase");
    } finally {
      setLoading(false);
    }
  };

  if (!canManageBilling()) {
    return null;
  }

  const afterPurchaseRemaining = pool.remaining + (selectedPackage?.sqft || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Buy Square Footage
          </DialogTitle>
          <DialogDescription>
            Add square footage to your organization&apos;s pool. All team members can use it for
            projects.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Package Selection */}
          <div className="space-y-2">
            {SF_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              const isBestValue = pkg.id === bestValue.id;

              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-blue-600 bg-blue-600" : "border-neutral-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pkg.label}</span>
                        {isBestValue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                            <Sparkles className="w-3 h-3" />
                            Best Value
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-neutral-500">{pkg.description}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{pkg.priceDisplay}</div>
                    <div className="text-xs text-neutral-500">
                      ${((pkg.priceCents / 100) / (pkg.sqft / 1000)).toFixed(2)}/1k SF
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pool Summary */}
          <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Current Pool</span>
              <span className="font-medium">{formatSF(pool.remaining)}</span>
            </div>
            {selectedPackage && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Adding</span>
                  <span className="font-medium text-green-600">+{formatSF(selectedPackage.sqft)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">After Purchase</span>
                  <span className="font-bold text-blue-600">{formatSF(afterPurchaseRemaining)}</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={loading || !selectedPackage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>Purchase {selectedPackage?.priceDisplay}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
