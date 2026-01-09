// /app/subscription/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Zap,
  Ruler,
  Crown,
  Shield,
  Info,
  HelpCircle,
  Star,
  TrendingUp,
} from "lucide-react";

type Tier = {
  id: string;
  name: string;
  range: string;
  min: number;
  max: number | null;
  price: number; // monthly USD
  anchorPrice?: number; // crossed-out anchor for psychology
  blurb: string;
  highlights: string[];
  popular?: boolean;
  bestValue?: boolean; // visually emphasize for “maximize profits”
};

const TIERS: Tier[] = [
  {
    id: "t1",
    name: "Starter",
    range: "0–1500 SF",
    min: 0,
    max: 1500,
    price: 50,
    anchorPrice: 59,
    blurb: "For quick quotes & small roofs.",
    highlights: ["Up to 1.5k SF", "Viewer + PDF export", "Email support"],
  },
  {
    id: "t2",
    name: "Standard",
    range: "1501–3000 SF",
    min: 1501,
    max: 3000,
    price: 60,
    anchorPrice: 69,
    blurb: "Perfect for most single-family homes.",
    highlights: ["Up to 3k SF", "3D roof planes", "Priority support"],
    popular: true,
    bestValue: true, // <-- default recommended (high conversion)
  },
  {
    id: "t3",
    name: "Plus",
    range: "3001–4500 SF",
    min: 3001,
    max: 4500,
    price: 70,
    anchorPrice: 85,
    blurb: "Great for larger & more complex roofs.",
    highlights: ["Up to 4.5k SF", "Advanced editor", "Team sharing"],
  },
  {
    id: "t4",
    name: "Pro",
    range: "4501–6000 SF",
    min: 4501,
    max: 6000,
    price: 80,
    anchorPrice: 99,
    blurb: "For spacious footprints and batches.",
    highlights: ["Up to 6k SF", "Batch estimates", "Priority chat + email"],
  },
  {
    id: "t5",
    name: "Enterprise",
    range: "6001+ SF",
    min: 6001,
    max: null,
    price: 100,
    anchorPrice: 129,
    blurb: "For large/complex & light commercial.",
    highlights: ["6k+ SF", "API access", "SLA & onboarding"],
  },
];

function cents(n: number) {
  return Math.round(n * 100);
}
function pickTierBySqft(sf: number | null): Tier | null {
  if (sf == null || Number.isNaN(sf)) return null;
  for (const t of TIERS) {
    if (t.max === null) {
      if (sf >= t.min) return t;
    } else {
      if (sf >= t.min && sf <= t.max) return t;
    }
  }
  return null;
}

export default function SubscriptionPage() {
  // Square footage input state for pricing calculation
  const [sf, setSf] = useState<string>("");

  // Promotional banner visibility toggle
  const [showPromo, setShowPromo] = useState(true);

  const inferred = useMemo(() => {
    const v = parseInt(sf, 10);
    if (!sf || Number.isNaN(v) || v < 0) return null;
    return pickTierBySqft(v);
  }, [sf]);

  // Manual selection overrides inference
  const [selectedTierId, setSelectedTierId] = useState<string | null>("t2"); // default to Standard (best converter)
  useEffect(() => {
    setSelectedTierId(null);
  }, [sf]);

  const selected =
    TIERS.find((t) => t.id === (selectedTierId || "")) || inferred || TIERS[1]; // fallback: Standard

  const handleSubscribe = async (tier: Tier) => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: tier.id,
        name: `${tier.name} — ${tier.range}`,
        priceCents: cents(tier.price),
      }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
    else alert("Unable to start checkout. Please try again.");
  };

  return (
    <div
      className="
        min-h-[100dvh]
        bg-[conic-gradient(at_30%_10%,_rgba(255,255,255,.8),_rgba(230,232,235,.8)_25%,_rgba(214,218,223,.9)_50%,_rgba(235,237,240,.9)_75%,_rgba(255,255,255,.8))]
        dark:bg-[radial-gradient(1200px_500px_at_20%_-10%,_rgba(80,85,95,.5),_transparent),linear-gradient(to_bottom,_#0b0e13,_#0d1016)]
      "
    >
      {/* URGENCY / OFFER STRIP */}
      {showPromo && (
        <div className="sticky top-0 z-40 border-b bg-amber-50/90 px-4 py-2 text-center text-sm backdrop-blur">
          <span className="font-medium">Limited offer:</span> Upgrade to{" "}
          <span className="font-semibold">Standard</span> today and get{" "}
          <span className="font-semibold">Priority Support</span> included.
          <button
            className="ml-3 text-xs underline opacity-70 hover:opacity-100"
            onClick={() => setShowPromo(false)}
            aria-label="Dismiss offer"
          >
            dismiss
          </button>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background:radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.2),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,.35),transparent_40%)]" />
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Shield className="h-3.5 w-3.5" />
            Secure Stripe Payments
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Choose the plan built for precise roofing work
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Pricing follows your <span className="font-medium">SF Strategy</span>. Start small and scale as projects grow.
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

      {/* PRICING GRID */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {/* Tiny comparison strip (value communication) */}
        <div className="mb-5 grid gap-2 rounded-xl border bg-card/80 px-4 py-3 text-sm backdrop-blur sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span><strong>Standard</strong> maximizes value for typical homes.</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Priority support included during promo.</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-600" />
            <span>Enterprise for 6k+ SF & teams.</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier) => {
            // selection logic (inferred or manual)
            const isSelected = (selected?.id || "") === tier.id;
            const isPopular = tier.popular;
            const best = tier.bestValue;

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedTierId(tier.id)}
                aria-label={`Select ${tier.name} plan`}
                className={[
                  "group relative cursor-pointer rounded-2xl border bg-card/90 backdrop-blur transition-all",
                  isSelected
                    ? "ring-2 ring-emerald-500 shadow-[0_0_40px_-10px_rgba(16,185,129,.35)] -translate-y-0.5"
                    : "hover:shadow-lg hover:-translate-y-0.5",
                ].join(" ")}
              >
                {/* gradient sheen on hover */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity [background:linear-gradient(120deg,rgba(16,185,129,.18),rgba(59,130,246,.18))] mix-blend-overlay" />

                {/* best value corner flag */}
                {best && (
                  <div className="absolute -top-3 left-3">
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Best Value</Badge>
                  </div>
                )}

                <Card className="border-0 shadow-none bg-transparent">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        <CardDescription>{tier.range}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isPopular && (
                          <Badge className="bg-blue-600 hover:bg-blue-600 animate-[pulse_2.5s_ease-in-out_infinite]">
                            Most Popular
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {tier.anchorPrice && (
                        <div className="text-xs text-muted-foreground line-through">${tier.anchorPrice}/mo</div>
                      )}
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-extrabold">${tier.price}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{tier.blurb}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {tier.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe(tier);
                      }}
                      aria-label={`Subscribe to ${tier.name} for $${tier.price} per month`}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Subscribe
                    </Button>

                    {/* Risk reversal */}
                    <p className="text-[11px] text-muted-foreground text-center">
                      7-day money-back guarantee. Cancel anytime.
                    </p>
                  </CardContent>

                  {tier.id === "t5" && (
                    <div className="absolute -top-3 -right-3">
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3.5 w-3.5" /> Premium
                      </Badge>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>

        {/* Trust row / Guarantees */}
        <div className="mt-8 grid gap-3 rounded-xl border bg-card/80 p-4 text-sm backdrop-blur md:grid-cols-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Bank-grade checkout via Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Cancel anytime in settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>99.9% uptime SLA on Enterprise</span>
          </div>
        </div>

        {/* Custom pricing card */}
        <div className="mt-8">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Need custom pricing?</CardTitle>
              <CardDescription>
                For multi-property portfolios, commercial work, or volume discounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Talk to us about SLAs, onboarding, and API usage.
              </p>
              <Button asChild variant="outline">
                <a href="/contact">Contact sales</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ (native details, no extra deps) */}
      <section className="mx-auto max-w-4xl px-4 pb-28 md:pb-10">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Frequently asked questions</h2>
        <div className="space-y-3">
          <details className="border rounded-md p-3 bg-background/60">
            <summary className="font-medium cursor-pointer flex justify-between items-center">
              How am I billed?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Subscriptions are billed monthly via Stripe. You can update or cancel anytime from your account.
            </p>
          </details>
          <details className="border rounded-md p-3 bg-background/60">
            <summary className="font-medium cursor-pointer flex justify-between items-center">
              Can I switch tiers later?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Yes. You can upgrade or downgrade tiers at any time. Changes take effect on the next billing cycle.
            </p>
          </details>
          <details className="border rounded-md p-3 bg-background/60">
            <summary className="font-medium cursor-pointer flex justify-between items-center">
              How does the SF Strategy work?
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Pricing is based on roof square footage. We auto-suggest a tier when we detect SF from your roof model; you can still override manually.
            </p>
          </details>
        </div>
      </section>

      {/* Mobile Sticky CTA */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 backdrop-blur px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-muted-foreground">Selected plan</span>
              <div className="truncate font-semibold">
                {selected.name} — ${selected.price}/mo
              </div>
            </div>
            <Button
              onClick={() => handleSubscribe(selected)}
              aria-label={`Subscribe to ${selected.name} for $${selected.price} per month`}
            >
              <Zap className="mr-2 h-4 w-4" />
              Subscribe
            </Button>
          </div>
        </div>
      )}

      {/* Floating Help (glassmorphism) */}
      <a
        href="/support"
        className="
          fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-2
          rounded-full border bg-background/60 px-3 py-2 text-sm backdrop-blur
          shadow-[0_10px_30px_-10px_rgba(0,0,0,.25)] hover:bg-background/80 transition-colors
        "
        aria-label="Need Help?"
      >
        <HelpCircle className="h-4 w-4" />
        Need Help?
      </a>
    </div>
  );
}
