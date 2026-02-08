"use client";

/**
 * SF Pool Display Component
 *
 * Shows the organization's SF pool balance with a progress bar.
 * Used in the dashboard, org switcher, and billing tab.
 */

import { useOrg, useSFPool } from "@/components/providers/org-provider";
import { cn } from "@/lib/utils";
import { Box, AlertTriangle } from "lucide-react";

interface SFPoolDisplayProps {
  /** Compact mode for header/switcher */
  compact?: boolean;
  /** Show only the text, no progress bar */
  textOnly?: boolean;
  /** Custom class name */
  className?: string;
}

export function SFPoolDisplay({ compact = false, textOnly = false, className }: SFPoolDisplayProps) {
  const { org } = useOrg();
  const { pool, percent, statusColor, statusMessage, format } = useSFPool();

  if (!org) return null;

  // Don't show anything if no pool exists
  if (pool.total === 0 && pool.used === 0) {
    if (compact) return null;
    return (
      <div className={cn("text-sm text-neutral-500", className)}>
        No square footage purchased yet
      </div>
    );
  }

  // Determine colors based on status
  const colorClasses = {
    green: {
      bg: "bg-green-100",
      fill: "bg-green-500",
      text: "text-green-700",
      icon: "text-green-600",
    },
    yellow: {
      bg: "bg-amber-100",
      fill: "bg-amber-500",
      text: "text-amber-700",
      icon: "text-amber-600",
    },
    red: {
      bg: "bg-red-100",
      fill: "bg-red-500",
      text: "text-red-700",
      icon: "text-red-600",
    },
  }[statusColor];

  // Text-only mode
  if (textOnly) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Box className={cn("h-4 w-4", colorClasses.icon)} />
        <span className={cn("text-sm font-medium", colorClasses.text)}>
          {format(pool.remaining)} remaining
        </span>
      </div>
    );
  }

  // Compact mode (for header/switcher)
  if (compact) {
    const usagePercent = pool.total > 0 ? Math.round((pool.used / pool.total) * 100) : 0;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5">
          <Box className={cn("h-3.5 w-3.5", colorClasses.icon)} />
          <span className="text-xs font-medium text-neutral-700">
            {format(pool.remaining)}
          </span>
        </div>
        <div className={cn("w-12 h-1.5 rounded-full", colorClasses.bg)}>
          <div
            className={cn("h-full rounded-full transition-all", colorClasses.fill)}
            style={{ width: `${100 - usagePercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Full display mode
  const usagePercent = pool.total > 0 ? Math.round((pool.used / pool.total) * 100) : 0;
  const isLow = usagePercent >= 80;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className={cn("h-4 w-4", colorClasses.icon)} />
          <span className="text-sm font-medium">SF Pool</span>
        </div>
        <span className={cn("text-sm font-semibold", colorClasses.text)}>
          {format(pool.remaining)} / {format(pool.total)}
        </span>
      </div>

      {/* Progress bar */}
      <div className={cn("w-full h-2 rounded-full", colorClasses.bg)}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorClasses.fill)}
          style={{ width: `${100 - usagePercent}%` }}
        />
      </div>

      {/* Status message */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500">
          {format(pool.used)} used ({usagePercent}%)
        </span>
        {isLow && (
          <span className={cn("flex items-center gap-1", colorClasses.text)}>
            <AlertTriangle className="h-3 w-3" />
            Low balance
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Inline SF pool badge for compact displays
 */
export function SFPoolBadge({ className }: { className?: string }) {
  const { pool, statusColor, format } = useSFPool();

  if (pool.total === 0) return null;

  const colorClasses = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  }[statusColor];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        colorClasses,
        className
      )}
    >
      <Box className="h-3 w-3" />
      {format(pool.remaining)}
    </span>
  );
}
