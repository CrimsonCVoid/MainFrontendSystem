// /app/subscription/page.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  Zap,
  Shield,
  HelpCircle,
  Star,
} from "lucide-react";

// Single pricing tier
const PRICE = 1440; // $1,440
const MAX_SQFT = 50000; // 50,000 SF

function cents(n: number) {
  return Math.round(n * 100);
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "sf-50000",
          name: "50,000 SF Package",
          priceCents: cents(PRICE),
        }),
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert("Unable to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-[100dvh]
        bg-[conic-gradient(at_30%_10%,_rgba(255,255,255,.8),_rgba(230,232,235,.8)_25%,_rgba(214,218,223,.9)_50%,_rgba(235,237,240,.9)_75%,_rgba(255,255,255,.8))]
        dark:bg-[radial-gradient(1200px_500px_at_20%_-10%,_rgba(80,85,95,.5),_transparent),linear-gradient(to_bottom,_#0b0e13,_#0d1016)]
      "
    >
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background:radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.2),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,.35),transparent_40%)]" />
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Shield className="h-3.5 w-3.5" />
            Secure Stripe Payments
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            One price. Full access. No surprises.
          </p>

          {/* Social proof */}
          <div className="mx-auto flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              4.9/5 average rating
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Trusted by roofers across 20+ states</span>
          </div>
        </div>
      </section>

      {/* PRICING CARD */}
      <section className="mx-auto max-w-2xl px-4 py-10">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl pointer-events-none [background:linear-gradient(120deg,rgba(16,185,129,.08),rgba(59,130,246,.08))]" />

          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Full Access Package</CardTitle>
            <CardDescription>Up to 50,000 SF</CardDescription>

            <div className="mt-6">
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-extrabold">${PRICE.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">One-time payment</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3 text-sm">
              {[
                "Up to 50,000 SF coverage",
                "Advanced 3D roof visualization",
                "50+ premium paint colors",
                "Material cost calculator",
                "Bill of materials (BOM)",
                "Professional estimate generator",
                "CSV/PDF exports",
                "Priority support",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePurchase}
              disabled={loading}
            >
              <Zap className="mr-2 h-4 w-4" />
              {loading ? "Processing..." : "Get Started"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              No subscriptions. No monthly fees. No commitments.
            </p>
          </CardContent>
        </Card>

        {/* Trust row */}
        <div className="mt-8 grid gap-3 rounded-xl border bg-card/80 p-4 text-sm backdrop-blur md:grid-cols-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Bank-grade checkout via Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Instant access after payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>Dedicated support</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-28 md:pb-10">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Frequently asked questions</h2>
        <div className="space-y-3">
          <details className="border rounded-md p-3 bg-background/60">
            <summary className="font-medium cursor-pointer">
              How am I billed?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              This is a one-time payment via Stripe. No recurring charges or subscriptions.
            </p>
          </details>
          <details className="border rounded-md p-3 bg-background/60">
            <summary className="font-medium cursor-pointer">
              What does 50,000 SF cover?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              You can create projects totaling up to 50,000 square feet of roof area.
            </p>
          </details>
          <details className="border rounded-md p-3 bg-background/60">
            <summary className="font-medium cursor-pointer">
              Can I purchase more later?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Yes! You can purchase additional packages at any time from your dashboard.
            </p>
          </details>
        </div>
      </section>

      {/* Floating Help */}
      <a
        href="/support"
        className="
          fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-2
          rounded-full border bg-background/60 px-3 py-2 text-sm backdrop-blur
          shadow-[0_10px_30px_-10px_rgba(0,0,0,.25)] hover:bg-background/80 transition-colors
        "
      >
        <HelpCircle className="h-4 w-4" />
        Need Help?
      </a>
    </div>
  );
}
