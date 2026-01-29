"use client";

import { cn } from "@/lib/utils";

interface OwnershipBadgeProps {
  isOwn: boolean;
  creatorName?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * OwnershipBadge - Visual indicator for project ownership
 *
 * Displays "Mine" for user's own projects or "Team" for others' projects.
 * Subtle styling to complement existing payment badges.
 */
export function OwnershipBadge({
  isOwn,
  creatorName,
  size = "sm",
  className
}: OwnershipBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  if (isOwn) {
    return (
      <span
        className={cn(
          "inline-flex items-center font-medium rounded-full border",
          "bg-blue-50 text-blue-700 border-blue-200",
          sizeClasses[size],
          className
        )}
      >
        Mine
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        "bg-neutral-50 text-neutral-600 border-neutral-200",
        sizeClasses[size],
        className
      )}
      title={creatorName ? `Created by ${creatorName}` : undefined}
    >
      Team
    </span>
  );
}
