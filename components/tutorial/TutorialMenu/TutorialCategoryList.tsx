"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Rocket,
  Building2,
  FileText,
  Settings,
  Map,
} from "lucide-react";
import type { TutorialCategory } from "@/lib/tutorial";
import { getCategoryProgress } from "@/lib/tutorial";
import { TutorialTopicItem } from "./TutorialTopicItem";
import { cn } from "@/lib/utils";

// Map icon names to actual components
const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Building2,
  FileText,
  Settings,
  Map,
};

// Color mapping for category colors
const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/40",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500/20",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/20",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
};

interface TutorialCategoryListProps {
  categories: TutorialCategory[];
  completedTopics: string[];
  onSelectTopic: (topicId: string) => void;
  defaultExpanded?: string[];
  isTopicDisabled?: (topicId: string) => boolean;
  getDisabledReason?: (topicId: string) => string | null;
}

/**
 * Accordion list of tutorial categories
 *
 * Each category expands to show its topics.
 * Shows progress indicator (completed/total) for each category.
 */
export function TutorialCategoryList({
  categories,
  completedTopics,
  onSelectTopic,
  defaultExpanded = [],
  isTopicDisabled,
  getDisabledReason,
}: TutorialCategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(defaultExpanded)
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.id);
        const progress = getCategoryProgress(category, completedTopics);
        const IconComponent = categoryIconMap[category.icon] || Rocket;
        const colors = colorClasses[category.color] || colorClasses.slate;
        const isComplete = progress.completed === progress.total && progress.total > 0;

        return (
          <div key={category.id} className="rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-left",
                "transition-colors duration-150",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
                isExpanded && "bg-neutral-50 dark:bg-neutral-800/50"
              )}
            >
              {/* Category Icon */}
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  colors.bg
                )}
              >
                <IconComponent className={cn("h-5 w-5", colors.text)} />
              </div>

              {/* Category Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    {category.title}
                  </span>
                  {isComplete && (
                    <span className="text-xs text-emerald-500 font-medium">
                      ✓ Complete
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {category.description}
                </p>
              </div>

              {/* Progress & Chevron */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Progress dots */}
                <div className="flex items-center gap-1">
                  {category.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        completedTopics.includes(topic.id)
                          ? "bg-emerald-500"
                          : isTopicDisabled?.(topic.id)
                            ? "bg-neutral-200 dark:bg-neutral-700"
                            : "bg-neutral-300 dark:bg-neutral-600"
                      )}
                    />
                  ))}
                </div>

                {/* Progress text */}
                <span className="text-xs text-neutral-500 min-w-[32px] text-right">
                  {progress.completed}/{progress.total}
                </span>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </motion.div>
              </div>
            </button>

            {/* Topics List */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pr-2 pb-2 space-y-0.5">
                    {category.topics.map((topic) => (
                      <TutorialTopicItem
                        key={topic.id}
                        topic={topic}
                        isCompleted={completedTopics.includes(topic.id)}
                        onSelect={onSelectTopic}
                        categoryColor={category.color}
                        disabled={isTopicDisabled?.(topic.id) ?? false}
                        disabledReason={getDisabledReason?.(topic.id) ?? undefined}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
