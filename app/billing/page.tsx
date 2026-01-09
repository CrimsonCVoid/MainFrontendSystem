"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  Loader2,
  CheckCircle2,
  Shield,
  ArrowLeft,
  Home,
  Settings,
  DollarSign,
  BarChart3,
  FileText,
  CreditCard,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
}

/**
 * REDESIGNED BILLING PAGE - PER-USE ONLY MODEL
 *
 * Clean, professional design with sidebar navigation
 * - Toned down colors, focus on content
 * - Sidebar for navigation consistency
 * - Per-use pricing display ($85 base + $5 per 500 SF)
 * - Stripe Checkout integration for individual projects
 */
export default function BillingPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);

  // Load user data
  useEffect(() => {
    async function loadUserData() {
      try {
        const session = await getCurrentSession();
        if (!session?.user) {
          router.replace("/signin");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (userData) setUser(userData as UserData);
      } catch (err) {
        console.error("Failed to load user data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-neutral-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-16 items-center border-b border-neutral-200 px-6">
          <h2 className="text-lg font-semibold text-neutral-900">My Metal Roofer</h2>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/billing"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-neutral-100 text-neutral-900"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        <div className="border-t border-neutral-200 p-4">
          <div className="rounded-lg bg-neutral-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-neutral-600" />
              <span className="text-xs font-medium text-neutral-900">Payment Model</span>
            </div>
            <p className="text-xs text-neutral-600">
              Pay per project
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-neutral-200 bg-white">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5 text-neutral-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">Billing & Payments</h1>
                <p className="text-sm text-neutral-600">View pricing and payment history</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Pricing Overview Card */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="rounded-lg bg-orange-100 p-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Per-Use Pricing</h2>
                  <p className="text-sm text-neutral-600">Simple, transparent pricing - pay only for what you need</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Pricing Info */}
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 p-4 border border-orange-200">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-orange-600">$85</span>
                    <span className="text-neutral-700">base price</span>
                  </div>
                  <p className="text-sm text-neutral-700">
                    For projects 0-1,500 SF • +$5 per 500 SF increment above 1,500 SF
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-900">Every project includes:</p>
                  <ul className="space-y-2">
                    {[
                      "Advanced 3D roof visualization",
                      "50+ premium paint colors",
                      "Material cost calculator",
                      "Bill of materials (BOM)",
                      "Professional quote generator",
                      "CSV/PDF exports",
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
                        <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Info Box */}
                <div className="pt-4 border-t border-neutral-200">
                  <div className="rounded-lg bg-neutral-50 p-3 text-center">
                    <p className="text-sm text-neutral-700">
                      <span className="font-medium">No subscriptions.</span> No monthly fees. No commitments.
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Pay once per project when you're ready to create
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-neutral-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Pricing Tiers</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                Projects are priced based on square footage • Each 500 SF increment adds $5
              </p>

              <div className="space-y-2">
                {[
                  { range: "0 - 1,500 SF", price: "$85" },
                  { range: "1,501 - 2,000 SF", price: "$90" },
                  { range: "2,001 - 2,500 SF", price: "$95" },
                  { range: "2,501 - 3,000 SF", price: "$100" },
                  { range: "3,001 - 3,500 SF", price: "$105" },
                  { range: "3,501 - 4,000 SF", price: "$110" },
                  { range: "4,001 - 4,500 SF", price: "$115" },
                  { range: "4,501 - 5,000 SF", price: "$120" },
                ].map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-neutral-900">{tier.range}</span>
                    <span className="text-sm font-semibold text-orange-600">{tier.price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs text-neutral-700 text-center">
                  Formula: <span className="font-mono font-medium">$85 + ($5 × increments above 1,500 SF)</span>
                </p>
              </div>
            </div>

            {/* Help Card */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-neutral-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Need Help?</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                Questions about pricing or payments?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:support@example.com">Contact Support</a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href="/dashboard">View Projects</a>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
