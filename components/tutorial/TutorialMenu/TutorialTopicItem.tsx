"use client";

import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Clock,
  Lock,
  Sparkles,
  Compass,
  FolderPlus,
  Eye,
  Box,
  Calculator,
  Share2,
  User,
  Palette,
  Building2,
  Coins,
  Users,
  BarChart3,
  History,
  HelpCircle,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import type { TutorialTopic } from "@/lib/tutorial";
import { cn } from "@/lib/utils";

// Map icon names to actual components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Compass,
  FolderPlus,
  Eye,
  Box,
  Calculator,
  Share2,
  User,
  Palette,
  Building2,
  Coins,
  Users,
  BarChart3,
  History,
  HelpCircle,
  LayoutDashboard,
  Shield,
  Lock,
};

interface TutorialTopicItemProps {
  topic: TutorialTopic;
  isCompleted: boolean;
  onSelect: (topicId: string) => void;
  categoryColor: string;
  disabled?: boolean;
  disabledReason?: string;
}

// Color mapping for category colors
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  slate: {
    bg: "bg-slate-50 dark:bg-slate-900/30",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
};

/**
 * Individual topic row item within a category
 *
 * Shows:
 * - Topic icon
 * - Title and description
 * - Completion checkmark
 * - Estimated time
 * - Lock icon when disabled
 */
export function TutorialTopicItem({
  topic,
  isCompleted,
  onSelect,
  categoryColor,
  disabled = false,
  disabledReason,
}: TutorialTopicItemProps) {
  const IconComponent = iconMap[topic.icon] || HelpCircle;
  const colors = colorClasses[categoryColor] || colorClasses.slate;

  return (
    <motion.button
      onClick={() => !disabled && onSelect(topic.id)}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left",
        "transition-all duration-150",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
        "group"
      )}
      whileHover={disabled ? undefined : { x: 4 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
          colors.bg
        )}
      >
        <IconComponent className={cn("h-4 w-4", colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium text-sm text-neutral-900 dark:text-neutral-100",
              (isCompleted || disabled) && "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {topic.title}
          </span>
          {isCompleted && !disabled && (
            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
          {disabled && disabledReason ? disabledReason : topic.description}
        </p>
      </div>

      {/* Time estimate & Arrow / Lock */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {disabled ? (
          <Lock className="h-4 w-4 text-neutral-400" />
        ) : (
          <>
            {topic.estimatedMinutes && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="h-3 w-3" />
                {topic.estimatedMinutes}m
              </span>
            )}
            <ChevronRight
              className={cn(
                "h-4 w-4 text-neutral-400",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            />
          </>
        )}
      </div>
    </motion.button>
  );
}
