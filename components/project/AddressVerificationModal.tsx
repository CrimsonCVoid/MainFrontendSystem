"use client";

import { useState } from "react";
import { MapPin, Check, X, Loader2, Key, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSF, type SFPool } from "@/lib/sf-pool";
import { normalizeKeyInput, isValidKeyFormat } from "@/lib/promo-keys";
import { canAccessPromoKeys } from "@/lib/promo-access";

interface AddressData {
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressVerificationModalProps {
  addressData: AddressData;
  squareFootage: number;
  sfPool: SFPool;
  projectId: string;
  userId: string;
  onConfirmWithPool: () => Promise<void>;
  onConfirmWithPromo: (promoCode: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onCancel: () => void;
}

/**
 * Address Verification Modal
 *
 * Shown when a user enters an address on an unpaid project.
 * Allows them to verify using their SF pool or a promo code.
 */
export default function AddressVerificationModal({
  addressData,
  squareFootage,
  sfPool,
  projectId,
  userId,
  onConfirmWithPool,
  onConfirmWithPromo,
  onCancel,
}: AddressVerificationModalProps) {
  const [method, setMethod] = useState<"pool" | "promo" | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasEnoughSF = sfPool.remaining >= squareFootage;
  const showPromoOption = canAccessPromoKeys(userId);
  const fullAddress = `${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`;

  const handlePoolConfirm = async () => {
    setLoading(true);
    try {
      await onConfirmWithPool();
    } catch (error) {
      console.error("Pool confirmation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoConfirm = async () => {
    setPromoError(null);

    const normalized = normalizeKeyInput(promoCode);
    if (!isValidKeyFormat(normalized)) {
      setPromoError("Invalid promo code format");
      return;
    }

    setLoading(true);
    try {
      const result = await onConfirmWithPromo(normalized);
      if (!result.success) {
        setPromoError(result.error || "Failed to apply promo code");
      }
    } catch (error: any) {
      setPromoError(error.message || "Failed to apply promo code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 rounded-full p-2 hover:bg-neutral-100 transition-colors z-10 disabled:opacity-50"
        >
          <X className="h-4 w-4 text-neutral-600" />
        </button>

        {/* Header */}
        <div className="border-b border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-blue-100 p-2">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Verify Address
            </h2>
          </div>
          <p className="text-sm text-neutral-600">
            Complete verification to save this address and unlock your project
          </p>
        </div>

        {/* Address Preview */}
        <div className="p-6 border-b border-neutral-100">
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500 mb-1">Address</p>
            <p className="font-medium text-neutral-900">{fullAddress}</p>
            {squareFootage > 0 && (
              <p className="text-sm text-neutral-600 mt-2">
                Roof size: <span className="font-medium">{formatSF(squareFootage)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Verification Options */}
        <div className="p-6 space-y-4">
          {/* Method Selection */}
          {!method && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-neutral-700">Choose verification method:</p>

              {/* SF Pool Option */}
              <button
                onClick={() => setMethod("pool")}
                disabled={!hasEnoughSF}
                className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                  hasEnoughSF
                    ? "border-neutral-200 hover:border-blue-300 hover:bg-blue-50/50"
                    : "border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className={`rounded-full p-2 ${hasEnoughSF ? "bg-blue-100" : "bg-neutral-200"}`}>
                  <Database className={`h-5 w-5 ${hasEnoughSF ? "text-blue-600" : "text-neutral-400"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">Use SF Pool</p>
                  <p className="text-sm text-neutral-600 mt-0.5">
                    Deduct {formatSF(squareFootage)} from your organization pool
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      hasEnoughSF
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {formatSF(sfPool.remaining)} available
                    </span>
                    {!hasEnoughSF && (
                      <span className="text-xs text-red-600">Insufficient balance</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Promo Code Option - only for allowed users */}
              {showPromoOption && (
                <button
                  onClick={() => setMethod("promo")}
                  className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left"
                >
                  <div className="rounded-full bg-emerald-100 p-2">
                    <Key className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">Use Promo Code</p>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      Enter a promotional code to unlock this project
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Pool Confirmation */}
          {method === "pool" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Confirm SF Deduction</p>
                    <p className="text-sm text-blue-700 mt-1">
                      This will deduct <span className="font-semibold">{formatSF(squareFootage)}</span> from your pool.
                    </p>
                    <div className="mt-2 text-sm text-blue-600">
                      <p>Current balance: {formatSF(sfPool.remaining)}</p>
                      <p>After deduction: {formatSF(Math.max(0, sfPool.remaining - squareFootage))}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMethod(null)}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePoolConfirm}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Promo Code Entry - only for allowed users */}
          {method === "promo" && showPromoOption && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Enter Promo Code
                </label>
                <Input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  maxLength={24}
                  className="font-mono text-center text-lg tracking-wider"
                  disabled={loading}
                />
                {promoError && (
                  <div className="mt-2 flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">{promoError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMethod(null);
                    setPromoCode("");
                    setPromoError(null);
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePromoConfirm}
                  disabled={loading || !promoCode.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Apply Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 p-4 bg-neutral-50 rounded-b-xl">
          <p className="text-xs text-neutral-500 text-center">
            Verification unlocks full project access including 3D visualization and exports
          </p>
        </div>
      </div>
    </div>
  );
}
