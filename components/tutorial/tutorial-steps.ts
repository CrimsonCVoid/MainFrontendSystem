import type { TutorialStep } from "@/lib/tutorial";

/**
 * Tutorial Steps Configuration
 *
 * Each step targets a specific UI element using data-tutorial selectors.
 * Add data-tutorial="step-id" attributes to your components.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // Step 1: Dashboard Overview
  {
    id: "welcome",
    title: "Welcome to MyMetalRoofer!",
    description:
      "Let's take a quick tour of your dashboard. This will only take a minute, and you'll learn everything you need to get started.",
    targetSelector: null,
    placement: "center",
  },

  // Step 2: Navigation Tabs
  {
    id: "dashboard-tabs",
    title: "Navigate Your Dashboard",
    description:
      "Use these tabs to switch between different views: Overview for stats, Projects for all your work, Estimates for quotes, and Team for members.",
    targetSelector: '[data-tutorial="dashboard-tabs"]',
    placement: "bottom",
    highlightPadding: 8,
  },

  // Step 3: SF Pool Balance
  {
    id: "sf-pool",
    title: "Your Square Footage Pool",
    description:
      "This shows your available SF credits. Each project uses credits based on the roof size. Keep an eye on your balance here.",
    targetSelector: '[data-tutorial="sf-pool"]',
    placement: "bottom",
    highlightPadding: 12,
  },

  // Step 4: New Project Button
  {
    id: "new-project",
    title: "Create Your First Project",
    description:
      "Click this button to start a new roofing project. You'll enter a name, search for the property address, and select a payment method.",
    targetSelector: '[data-tutorial="new-project-btn"]',
    placement: "bottom",
    highlightPadding: 8,
  },

  // Step 5: Projects List
  {
    id: "projects-area",
    title: "Your Projects Live Here",
    description:
      "All your roofing projects appear in this area. You can switch between grid and list views, search, and filter by status.",
    targetSelector: '[data-tutorial="projects-area"]',
    placement: "top",
    highlightPadding: 16,
  },

  // Step 6: Quick Stats
  {
    id: "quick-stats",
    title: "Track Your Progress",
    description:
      "These cards show your key metrics at a glance: total projects, completed work, and square footage analyzed.",
    targetSelector: '[data-tutorial="quick-stats"]',
    placement: "bottom",
    highlightPadding: 12,
  },

  // Step 7: User Menu
  {
    id: "user-menu",
    title: "Account & Settings",
    description:
      "Access your profile, organization settings, and sign out from this menu. You can also switch between organizations if you belong to multiple.",
    targetSelector: '[data-tutorial="user-menu"]',
    placement: "left",
    highlightPadding: 8,
    hideArrow: true,
  },

  // Final Step
  {
    id: "complete",
    title: "You're All Set!",
    description:
      "That's the basics! Create your first project to get started. You can restart this tutorial anytime from Settings → Tutorial.",
    targetSelector: null,
    placement: "center",
  },
];

export const TOTAL_STEPS = TUTORIAL_STEPS.length;
