"use client";

/**
 * Global Header Component
 *
 * Displays organization info, SF pool status, and user menu.
 * Shows prominently on all protected pages.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOrg, useSFPool } from "@/components/providers/org-provider";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { getRoleLabel } from "@/lib/org-types";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Building2,
  Package,
  ChevronDown,
  LogOut,
  Settings,
  CreditCard,
  Users,
  BarChart3,
  AlertTriangle,
  Zap,
  ShieldCheck,
} from "lucide-react";

interface GlobalHeaderProps {
  user?: {
    email?: string | null;
    full_name?: string | null;
  } | null;
  showTabs?: boolean;
  activeTab?: string;
}

export function GlobalHeader({ user, showTabs = false, activeTab }: GlobalHeaderProps) {
  const router = useRouter();
  const { org, role, isAdmin, canManageBilling, loading: orgLoading } = useOrg();
  const { pool, percent, statusColor, statusMessage, format } = useSFPool();
  const [showUserMenu, setShowUserMenu] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/signin");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }

  // SF Pool colors
  const poolColors = {
    green: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      fill: "bg-emerald-500",
      text: "text-emerald-700",
      icon: "text-emerald-600",
    },
    yellow: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      fill: "bg-amber-500",
      text: "text-amber-700",
      icon: "text-amber-600",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      fill: "bg-red-500",
      text: "text-red-700",
      icon: "text-red-600",
    },
  }[statusColor];

  const isLowPool = percent >= 80 || pool.remaining < 5000;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Org */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              {org?.logo_url ? (
                <Image
                  src={org.logo_url}
                  alt={org.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-lg object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-semibold text-neutral-900 leading-tight">
                  {org?.name || "MyMetalRoofer"}
                </span>
                {role && (
                  <span className="text-xs text-neutral-500 flex items-center gap-1">
                    {isAdmin() && <ShieldCheck className="w-3 h-3" />}
                    {getRoleLabel(role)}
                  </span>
                )}
              </div>
            </Link>

            {/* Org Switcher (if multiple orgs) */}
            <div className="hidden md:block">
              <OrgSwitcher />
            </div>
          </div>

          {/* Center: SF Pool Status (Prominent) */}
          {!orgLoading && pool.total > 0 && (
            <div
              className={cn(
                "hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl border",
                poolColors.bg,
                poolColors.border
              )}
            >
              <div className="flex items-center gap-2">
                <Package className={cn("h-5 w-5", poolColors.icon)} />
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-600">SF Pool</span>
                  <span className={cn("text-sm font-bold", poolColors.text)}>
                    {format(pool.remaining)}
                  </span>
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-20">
                <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", poolColors.fill)}
                    style={{ width: `${100 - percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5 text-center">
                  {100 - percent}% available
                </p>
              </div>

              {/* Low Warning & Top Up */}
              {isLowPool && canManageBilling() && (
                <Link href="/audit">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("h-7 text-xs", poolColors.text, poolColors.border)}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Top Up
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Right: User Menu & Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile SF Pool Badge */}
            {!orgLoading && pool.total > 0 && (
              <Link
                href="/audit"
                className={cn(
                  "lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  poolColors.bg,
                  poolColors.text
                )}
              >
                <Package className="h-3.5 w-3.5" />
                {format(pool.remaining)}
                {isLowPool && <AlertTriangle className="h-3 w-3" />}
              </Link>
            )}

            {/* Admin Badge */}
            {isAdmin() && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition-colors"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}

            {/* Quick Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/audit">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <CreditCard className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-neutral-500 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-neutral-200 shadow-lg z-50 py-2">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {user?.full_name || "User"}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Building2 className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/audit"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <CreditCard className="h-4 w-4" />
                        Billing
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      {isAdmin() && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-purple-700 hover:bg-purple-50"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-neutral-100 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SF Pool Alert Bar (when very low) */}
      {!orgLoading && pool.total > 0 && pool.remaining < 2000 && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Low SF Pool: Only {format(pool.remaining)} remaining
              </span>
            </div>
            {canManageBilling() && (
              <Link href="/audit">
                <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  Purchase More
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Compact SF Pool indicator for inline use
 */
export function SFPoolIndicator({ className }: { className?: string }) {
  const { pool, percent, statusColor, format } = useSFPool();

  if (pool.total === 0) return null;

  const colors = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
  }[statusColor];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border", colors, className)}>
      <Package className="h-4 w-4" />
      <span className="text-sm font-semibold">{format(pool.remaining)}</span>
      <div className="w-16 h-1.5 bg-white/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-current rounded-full opacity-60"
          style={{ width: `${100 - percent}%` }}
        />
      </div>
    </div>
  );
}
