"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, BookOpen, ChevronRight, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TutorialCategory, TutorialTopic } from "@/lib/tutorial";
import { searchTopics, getTotalProgress } from "@/lib/tutorial";
import { TutorialCategoryList } from "./TutorialCategoryList";
import { cn } from "@/lib/utils";

interface TutorialMenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TutorialCategory[];
  completedTopics: string[];
  onSelectTopic: (topicId: string) => void;
  isTopicDisabled?: (topicId: string) => boolean;
  getDisabledReason?: (topicId: string) => string | null;
}

/**
 * Main Tutorial Menu Panel
 *
 * Features:
 * - Search bar with fuzzy matching
 * - Category accordion
 * - Progress tracking
 * - Keyboard navigation
 * - Disabled state for prerequisites
 */
export function TutorialMenuPanel({
  isOpen,
  onClose,
  categories,
  completedTopics,
  onSelectTopic,
  isTopicDisabled,
  getDisabledReason,
}: TutorialMenuPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Search results
  const searchResults = searchQuery.trim()
    ? searchTopics(categories, searchQuery)
    : [];

  // Total progress
  const totalProgress = getTotalProgress(categories, completedTopics);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle topic selection (skip disabled topics)
  const handleSelectTopic = (topicId: string) => {
    if (isTopicDisabled?.(topicId)) return;
    onSelectTopic(topicId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[190] bg-black/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        className={cn(
          "fixed z-[199] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl",
          "border border-neutral-200 dark:border-neutral-800",
          "overflow-hidden",
          "bottom-24 right-6",
          "w-[380px] max-h-[calc(100vh-180px)]"
        )}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Help Center
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>Your progress</span>
              <span>
                {totalProgress.completed}/{totalProgress.total} completed
              </span>
            </div>
            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress.percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-9 pr-4 h-10",
                "bg-neutral-100 dark:bg-neutral-800",
                "border-transparent focus:border-blue-500",
                "placeholder:text-neutral-400"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="h-[400px] overflow-y-auto">
          <div className="p-2">
            {searchQuery.trim() ? (
              // Search Results
              <div className="space-y-1">
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-neutral-500">
                      No tutorials found for &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Try different keywords
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs text-neutral-500 font-medium">
                      {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                    </div>
                    {searchResults.map(({ topic, category }) => {
                      const disabled = isTopicDisabled?.(topic.id) ?? false;
                      const disabledReason = getDisabledReason?.(topic.id) ?? undefined;
                      return (
                        <SearchResultItem
                          key={topic.id}
                          topic={topic}
                          categoryTitle={category.title}
                          categoryColor={category.color}
                          isCompleted={completedTopics.includes(topic.id)}
                          onSelect={() => handleSelectTopic(topic.id)}
                          disabled={disabled}
                          disabledReason={disabledReason}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              // Category List
              <TutorialCategoryList
                categories={categories}
                completedTopics={completedTopics}
                onSelectTopic={handleSelectTopic}
                defaultExpanded={["getting-started"]}
                isTopicDisabled={isTopicDisabled}
                getDisabledReason={getDisabledReason}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px] font-mono">?</kbd> to toggle
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px] font-mono">Esc</kbd> to close
            </span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Search result item component
interface SearchResultItemProps {
  topic: TutorialTopic;
  categoryTitle: string;
  categoryColor: string;
  isCompleted: boolean;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function SearchResultItem({
  topic,
  categoryTitle,
  categoryColor,
  isCompleted,
  onSelect,
  disabled = false,
  disabledReason,
}: SearchResultItemProps) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    purple: "text-purple-600 dark:text-purple-400",
    slate: "text-slate-600 dark:text-slate-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  return (
    <button
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left",
        "transition-colors duration-150",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "group"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium text-sm text-neutral-900 dark:text-neutral-100",
            disabled && "text-neutral-500 dark:text-neutral-400"
          )}>
            {topic.title}
          </span>
          {isCompleted && !disabled && (
            <span className="text-xs text-emerald-500">{"\u2713"}</span>
          )}
        </div>
        <p className="text-xs mt-0.5">
          <span className={colorClasses[categoryColor] || colorClasses.slate}>
            {categoryTitle}
          </span>
          <span className="text-neutral-400 mx-1">{"\u2022"}</span>
          <span className="text-neutral-500 truncate">
            {disabled && disabledReason ? disabledReason : topic.description}
          </span>
        </p>
      </div>
      {disabled ? (
        <Lock className="h-4 w-4 text-neutral-400" />
      ) : (
        <ChevronRight
          className="h-4 w-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  );
}
