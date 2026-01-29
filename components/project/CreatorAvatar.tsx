"use client";

import { cn } from "@/lib/utils";

interface CreatorInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface CreatorAvatarProps {
  creator: CreatorInfo;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * CreatorAvatar - Displays project creator with avatar and optional name
 *
 * Features:
 * - Circular avatar with image or fallback initials
 * - Hover tooltip showing full name and email
 * - Optional inline name display
 * - Multiple size variants
 */
export function CreatorAvatar({
  creator,
  showName = false,
  size = "sm",
  className,
}: CreatorAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const nameSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Get initials from name or email
  const getInitials = () => {
    if (creator.full_name) {
      const parts = creator.full_name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return creator.email.substring(0, 2).toUpperCase();
  };

  // Get display name
  const displayName = creator.full_name || creator.email.split("@")[0];

  // Tooltip content
  const tooltipContent = creator.full_name
    ? `${creator.full_name} (${creator.email})`
    : creator.email;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-medium flex-shrink-0",
          "bg-gradient-to-br from-slate-500 to-slate-700 text-white",
          sizeClasses[size]
        )}
        title={tooltipContent}
      >
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials()
        )}
      </div>
      {showName && (
        <span
          className={cn(
            "text-neutral-600 truncate max-w-[120px]",
            nameSizeClasses[size]
          )}
          title={tooltipContent}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}

/**
 * Compact creator display for list views
 */
export function CreatorCompact({
  creator,
  className,
}: {
  creator: CreatorInfo;
  className?: string;
}) {
  const displayName = creator.full_name || creator.email.split("@")[0];
  const firstName = displayName.split(" ")[0];

  return (
    <div
      className={cn("flex items-center gap-1.5 text-neutral-500", className)}
      title={`Created by ${displayName}`}
    >
      <CreatorAvatar creator={creator} size="sm" />
      <span className="text-xs truncate max-w-[80px]">{firstName}</span>
    </div>
  );
}
