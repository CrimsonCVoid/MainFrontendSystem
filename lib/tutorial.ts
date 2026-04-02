/**
 * Tutorial System - Types and Configuration
 *
 * A full-screen, immersive onboarding system inspired by Stripe, Linear, and Notion.
 */

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string | null; // null for center/modal steps
  placement: "top" | "bottom" | "left" | "right" | "center";
  requireClick?: boolean;
  highlightPadding?: number;
  hideArrow?: boolean; // Hide arrow while still highlighting target
  route?: string; // Required route for this step
  onBeforeStep?: () => void | Promise<void>;
  onAfterStep?: () => void | Promise<void>;
}

export interface TutorialState {
  completed: boolean;
  skipped: boolean;
  completedSteps: string[];
  currentStepIndex: number;
  dismissedAt: string | null;
  startedAt: string | null;
}

// ============================================
// TUTORIAL MENU SYSTEM - Categories & Topics
// ============================================

/**
 * Prerequisites that must be satisfied before a tutorial topic can be started.
 */
export type TutorialPrerequisite =
  | "has-projects"     // User has at least 1 project
  | "has-org"          // User belongs to an organization
  | "is-admin"         // User has admin/owner role
  | "on-project-page"; // User is currently on a /projects/[id] page

/**
 * Human-readable messages for each prerequisite.
 */
export const PREREQUISITE_MESSAGES: Record<TutorialPrerequisite, string> = {
  "has-projects": "Create a project first to unlock this tutorial",
  "has-org": "Join an organization to access this tutorial",
  "is-admin": "Admin or Owner role required",
  "on-project-page": "Navigate to a project page first",
};

/**
 * Check which prerequisites are unmet for a topic given the current state.
 */
export function getUnmetPrerequisites(
  topic: TutorialTopic,
  satisfiedPrereqs: Set<TutorialPrerequisite>
): TutorialPrerequisite[] {
  if (!topic.requires || topic.requires.length === 0) return [];
  return topic.requires.filter((req) => !satisfiedPrereqs.has(req));
}

/**
 * A topic is a specific tutorial flow with one or more steps.
 * Topics can navigate users to specific routes before starting.
 */
export interface TutorialTopic {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  route?: string; // Target route (e.g., "/settings")
  steps: TutorialStep[];
  estimatedMinutes?: number;
  tags?: string[]; // For search functionality
  requires?: TutorialPrerequisite[]; // Prerequisites that must be met
  disabledMessage?: string; // Tooltip text when disabled
}

/**
 * A category groups related topics together.
 */
export interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color (e.g., "blue", "emerald")
  topics: TutorialTopic[];
  order: number;
}

/**
 * Extended tutorial state for the menu system.
 * Tracks completed topics and menu UI state.
 */
export interface TutorialMenuState extends TutorialState {
  completedTopics: string[];
  menuOpen: boolean;
  activeTopic?: string;
  searchQuery?: string;
}

export const DEFAULT_TUTORIAL_STATE: TutorialState = {
  completed: false,
  skipped: false,
  completedSteps: [],
  currentStepIndex: 0,
  dismissedAt: null,
  startedAt: null,
};

export const DEFAULT_TUTORIAL_MENU_STATE: TutorialMenuState = {
  ...DEFAULT_TUTORIAL_STATE,
  completedTopics: [],
  menuOpen: false,
  activeTopic: undefined,
  searchQuery: "",
};

// Check if user needs to see tutorial
export function shouldShowTutorial(state: TutorialState | null): boolean {
  if (!state) return true;
  if (state.completed) return false;
  if (state.skipped) return false;
  return true;
}

// Check if welcome modal should show
export function shouldShowWelcome(state: TutorialState | null): boolean {
  if (!state) return true;
  if (state.startedAt) return false;
  if (state.skipped) return false;
  if (state.completed) return false;
  return true;
}

// Calculate progress percentage
export function getTutorialProgress(currentIndex: number, totalSteps: number): number {
  if (totalSteps === 0) return 0;
  return Math.round(((currentIndex + 1) / totalSteps) * 100);
}

// Get element position and dimensions
export function getElementRect(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  return element.getBoundingClientRect();
}

// Scroll element into view smoothly
export function scrollToElement(selector: string): void {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
}

// ============================================
// MENU SYSTEM HELPERS
// ============================================

/**
 * Get progress for a specific category
 */
export function getCategoryProgress(
  category: TutorialCategory,
  completedTopics: string[]
): { completed: number; total: number; percentage: number } {
  const total = category.topics.length;
  const completed = category.topics.filter((t) =>
    completedTopics.includes(t.id)
  ).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

/**
 * Check if a topic is completed
 */
export function isTopicCompleted(
  topicId: string,
  completedTopics: string[]
): boolean {
  return completedTopics.includes(topicId);
}

/**
 * Search topics across all categories
 * Returns matching topics with their category info
 */
export function searchTopics(
  categories: TutorialCategory[],
  query: string
): Array<{ topic: TutorialTopic; category: TutorialCategory }> {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: Array<{ topic: TutorialTopic; category: TutorialCategory }> = [];

  for (const category of categories) {
    for (const topic of category.topics) {
      const matchesTitle = topic.title.toLowerCase().includes(lowerQuery);
      const matchesDescription = topic.description.toLowerCase().includes(lowerQuery);
      const matchesTags = topic.tags?.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );

      if (matchesTitle || matchesDescription || matchesTags) {
        results.push({ topic, category });
      }
    }
  }

  return results;
}

/**
 * Get total progress across all categories
 */
export function getTotalProgress(
  categories: TutorialCategory[],
  completedTopics: string[]
): { completed: number; total: number; percentage: number } {
  let total = 0;
  let completed = 0;

  for (const category of categories) {
    total += category.topics.length;
    completed += category.topics.filter((t) =>
      completedTopics.includes(t.id)
    ).length;
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}
