"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DEFAULT_TUTORIAL_STATE,
  DEFAULT_TUTORIAL_MENU_STATE,
  shouldShowTutorial,
  shouldShowWelcome,
  type TutorialState,
  type TutorialMenuState,
  type TutorialTopic,
  type TutorialCategory,
  type TutorialPrerequisite,
  getCategoryProgress,
  getTotalProgress,
  getUnmetPrerequisites,
  PREREQUISITE_MESSAGES,
} from "@/lib/tutorial";
import { useOrg } from "@/components/providers/org-provider";
import { TUTORIAL_STEPS, TOTAL_STEPS } from "./tutorial-steps";
import { TUTORIAL_CATEGORIES, getTopicById, ALL_TOPICS } from "./tutorial-categories";
import { TutorialWelcome } from "./TutorialWelcome";
import { TutorialSpotlight } from "./TutorialSpotlight";
import { TutorialTooltip } from "./TutorialTooltip";
import { TutorialMenuPanel } from "./TutorialMenu/TutorialMenuPanel";

interface TutorialContextValue {
  // State
  state: TutorialState;
  isActive: boolean;
  showWelcome: boolean;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: (typeof TUTORIAL_STEPS)[number] | null;

  // Actions
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  restartTutorial: () => void;
  completeTutorial: () => void;

  // Menu State
  menuOpen: boolean;
  completedTopics: string[];
  activeTopic: TutorialTopic | null;
  categories: TutorialCategory[];

  // Menu Actions
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  startTopic: (topicId: string) => void;
  isTopicCompleted: (topicId: string) => boolean;
  getCategoryProgressInfo: (categoryId: string) => { completed: number; total: number; percentage: number };
  getTotalProgressInfo: () => { completed: number; total: number; percentage: number };

  // Prerequisite System
  registerPrerequisite: (prereq: TutorialPrerequisite) => void;
  unregisterPrerequisite: (prereq: TutorialPrerequisite) => void;
  isTopicAvailable: (topicId: string) => boolean;
  getTopicDisabledReason: (topicId: string) => string | null;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { org, isAdmin, canManageBilling } = useOrg();

  const [state, setState] = useState<TutorialState>(DEFAULT_TUTORIAL_STATE);
  const [isActive, setIsActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Prerequisite state
  const [registeredPrereqs, setRegisteredPrereqs] = useState<Set<TutorialPrerequisite>>(new Set());

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState<TutorialTopic | null>(null);
  const [activeTopicStepIndex, setActiveTopicStepIndex] = useState(0);

  // Determine current step (from legacy tutorial or active topic)
  const currentStep = isActive
    ? activeTopic
      ? activeTopic.steps[activeTopicStepIndex]
      : TUTORIAL_STEPS[state.currentStepIndex]
    : null;

  // Calculate current total steps based on active tutorial
  const currentTotalSteps = activeTopic ? activeTopic.steps.length : TOTAL_STEPS;

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Load tutorial state on mount
  useEffect(() => {
    async function loadState() {
      try {
        // Try localStorage first for faster initial load
        const localState = localStorage.getItem("tutorial_state");
        if (localState) {
          const parsed = JSON.parse(localState);
          setState(parsed);

          if (shouldShowWelcome(parsed)) {
            setShowWelcome(true);
          } else if (shouldShowTutorial(parsed)) {
            // Resume if they were in the middle
            setIsActive(true);
          }
        } else {
          // First time user - show welcome
          setShowWelcome(true);
        }

        // Also fetch from server in background
        const res = await fetch("/api/user/tutorial");
        if (res.ok) {
          const data = await res.json();
          const serverState = data.tutorialState;
          if (serverState) {
            setState(serverState);
            localStorage.setItem("tutorial_state", JSON.stringify(serverState));

            // Update UI based on server state
            if (shouldShowWelcome(serverState)) {
              setShowWelcome(true);
              setIsActive(false);
            } else if (!shouldShowTutorial(serverState)) {
              setShowWelcome(false);
              setIsActive(false);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load tutorial state:", err);
        // Default to showing welcome for new users
        setShowWelcome(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, []);

  // Keyboard navigation for tutorial
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          skipTutorial();
          break;
        case "ArrowRight":
        case "Enter":
          nextStep();
          break;
        case "ArrowLeft":
          if (state.currentStepIndex > 0) {
            prevStep();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, state.currentStepIndex]);

  // Keyboard shortcut for menu toggle (?)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger on '?' key, and not when typing in inputs
      if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setMenuOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save state helper
  const saveState = useCallback(async (newState: TutorialState) => {
    // Save to localStorage immediately
    localStorage.setItem("tutorial_state", JSON.stringify(newState));

    // Save to server in background
    try {
      await fetch("/api/user/tutorial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorialState: newState }),
      });
    } catch (err) {
      console.error("Failed to save tutorial state:", err);
    }
  }, []);

  const startTutorial = useCallback(() => {
    const newState: TutorialState = {
      ...state,
      startedAt: new Date().toISOString(),
      currentStepIndex: 0,
      skipped: false,
      completed: false,
    };
    setState(newState);
    setShowWelcome(false);
    setIsActive(true);
    saveState(newState);
  }, [state, saveState]);

  const skipTutorial = useCallback(() => {
    // If in a topic tutorial, just exit the topic
    if (activeTopic) {
      setActiveTopic(null);
      setActiveTopicStepIndex(0);
      setIsActive(false);
      return;
    }

    // Legacy tutorial skip
    const newState: TutorialState = {
      ...state,
      skipped: true,
      dismissedAt: new Date().toISOString(),
    };
    setState(newState);
    setShowWelcome(false);
    setIsActive(false);
    saveState(newState);
  }, [state, saveState, activeTopic]);

  // Complete the current topic (moved here for dependency ordering)
  const completeCurrentTopic = useCallback(() => {
    if (activeTopic && !completedTopics.includes(activeTopic.id)) {
      const newCompletedTopics = [...completedTopics, activeTopic.id];
      setCompletedTopics(newCompletedTopics);

      // Save to localStorage
      localStorage.setItem(
        "tutorial_completed_topics",
        JSON.stringify(newCompletedTopics)
      );

      // Save to server in background
      fetch("/api/user/tutorial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorialState: {
            ...state,
            completedTopics: newCompletedTopics,
          },
        }),
      }).catch((err) => console.error("Failed to save completed topics:", err));
    }

    setActiveTopic(null);
    setActiveTopicStepIndex(0);
    setIsActive(false);
  }, [activeTopic, completedTopics, state]);

  const nextStep = useCallback(() => {
    // Handle topic-based tutorial
    if (activeTopic) {
      const nextIndex = activeTopicStepIndex + 1;
      if (nextIndex >= activeTopic.steps.length) {
        // Topic complete
        completeCurrentTopic();
      } else {
        setActiveTopicStepIndex(nextIndex);
      }
      return;
    }

    // Handle legacy tutorial
    const nextIndex = state.currentStepIndex + 1;

    if (nextIndex >= TOTAL_STEPS) {
      // Tutorial complete
      const newState: TutorialState = {
        ...state,
        completed: true,
        completedSteps: TUTORIAL_STEPS.map((s) => s.id),
        currentStepIndex: TOTAL_STEPS - 1,
      };
      setState(newState);
      setIsActive(false);
      saveState(newState);
    } else {
      const newState: TutorialState = {
        ...state,
        currentStepIndex: nextIndex,
        completedSteps: [
          ...new Set([...state.completedSteps, TUTORIAL_STEPS[state.currentStepIndex].id]),
        ],
      };
      setState(newState);
      saveState(newState);
    }
  }, [state, saveState, activeTopic, activeTopicStepIndex, completeCurrentTopic]);

  const prevStep = useCallback(() => {
    // Handle topic-based tutorial
    if (activeTopic) {
      if (activeTopicStepIndex > 0) {
        setActiveTopicStepIndex(activeTopicStepIndex - 1);
      }
      return;
    }

    // Handle legacy tutorial
    if (state.currentStepIndex > 0) {
      const newState: TutorialState = {
        ...state,
        currentStepIndex: state.currentStepIndex - 1,
      };
      setState(newState);
      saveState(newState);
    }
  }, [state, saveState, activeTopic, activeTopicStepIndex]);

  const restartTutorial = useCallback(() => {
    const newState: TutorialState = {
      completed: false,
      skipped: false,
      completedSteps: [],
      currentStepIndex: 0,
      dismissedAt: null,
      startedAt: new Date().toISOString(),
    };
    setState(newState);
    setShowWelcome(false);
    setIsActive(true);
    saveState(newState);
  }, [saveState]);

  const completeTutorial = useCallback(() => {
    const newState: TutorialState = {
      ...state,
      completed: true,
      completedSteps: TUTORIAL_STEPS.map((s) => s.id),
    };
    setState(newState);
    setIsActive(false);
    saveState(newState);
  }, [state, saveState]);

  // ============================================
  // PREREQUISITE SYSTEM
  // ============================================

  const satisfiedPrerequisites = useMemo(() => {
    const prereqs = new Set(registeredPrereqs);

    // Org-derived prerequisites
    if (org) prereqs.add("has-org");
    if (isAdmin() || canManageBilling()) prereqs.add("is-admin");

    // Route-derived prerequisites
    if (pathname.startsWith("/projects/")) prereqs.add("on-project-page");

    return prereqs;
  }, [registeredPrereqs, org, isAdmin, canManageBilling, pathname]);

  const registerPrerequisite = useCallback((prereq: TutorialPrerequisite) => {
    setRegisteredPrereqs((prev) => {
      const next = new Set(prev);
      next.add(prereq);
      return next;
    });
  }, []);

  const unregisterPrerequisite = useCallback((prereq: TutorialPrerequisite) => {
    setRegisteredPrereqs((prev) => {
      const next = new Set(prev);
      next.delete(prereq);
      return next;
    });
  }, []);

  const isTopicAvailable = useCallback(
    (topicId: string) => {
      const topic = getTopicById(topicId);
      if (!topic) return false;
      return getUnmetPrerequisites(topic, satisfiedPrerequisites).length === 0;
    },
    [satisfiedPrerequisites]
  );

  const getTopicDisabledReason = useCallback(
    (topicId: string): string | null => {
      const topic = getTopicById(topicId);
      if (!topic) return null;
      const unmet = getUnmetPrerequisites(topic, satisfiedPrerequisites);
      if (unmet.length === 0) return null;
      return topic.disabledMessage || PREREQUISITE_MESSAGES[unmet[0]];
    },
    [satisfiedPrerequisites]
  );

  // ============================================
  // MENU FUNCTIONS
  // ============================================

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Start a specific topic tutorial
  const startTopic = useCallback(
    async (topicId: string) => {
      const topic = getTopicById(topicId);
      if (!topic) {
        console.error(`Topic not found: ${topicId}`);
        return;
      }

      // Check prerequisites before starting
      const unmet = getUnmetPrerequisites(topic, satisfiedPrerequisites);
      if (unmet.length > 0) {
        console.warn(`Cannot start topic "${topicId}": prerequisites not met`, unmet);
        return;
      }

      // Close menu first
      setMenuOpen(false);

      // Navigate to the topic's route if specified
      // Compare only the pathname portion (ignore query params)
      if (topic.route) {
        const targetPath = topic.route.split("?")[0];
        if (pathname !== targetPath) {
          router.push(topic.route);
          // Wait for navigation before starting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else if (topic.route.includes("?")) {
          // Same path but different query params - push to update params
          router.push(topic.route);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Set up the topic tutorial
      setActiveTopic(topic);
      setActiveTopicStepIndex(0);
      setIsActive(true);
      setShowWelcome(false);
    },
    [router, pathname, satisfiedPrerequisites]
  );

  // Check if a topic is completed
  const isTopicCompletedFn = useCallback(
    (topicId: string) => completedTopics.includes(topicId),
    [completedTopics]
  );

  // Get progress for a category
  const getCategoryProgressInfo = useCallback(
    (categoryId: string) => {
      const category = TUTORIAL_CATEGORIES.find((c) => c.id === categoryId);
      if (!category) return { completed: 0, total: 0, percentage: 0 };
      return getCategoryProgress(category, completedTopics);
    },
    [completedTopics]
  );

  // Get total progress
  const getTotalProgressInfo = useCallback(
    () => getTotalProgress(TUTORIAL_CATEGORIES, completedTopics),
    [completedTopics]
  );

  // Load completed topics from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tutorial_completed_topics");
      if (stored) {
        setCompletedTopics(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load completed topics:", err);
    }
  }, []);

  // Calculate current step index for display
  const displayStepIndex = activeTopic ? activeTopicStepIndex : state.currentStepIndex;

  const value: TutorialContextValue = {
    state,
    isActive,
    showWelcome,
    currentStepIndex: displayStepIndex,
    totalSteps: currentTotalSteps,
    currentStep,
    startTutorial,
    skipTutorial,
    nextStep,
    prevStep,
    restartTutorial,
    completeTutorial,

    // Menu state
    menuOpen,
    completedTopics,
    activeTopic,
    categories: TUTORIAL_CATEGORIES,

    // Menu actions
    toggleMenu,
    openMenu,
    closeMenu,
    startTopic,
    isTopicCompleted: isTopicCompletedFn,
    getCategoryProgressInfo,
    getTotalProgressInfo,

    // Prerequisite system
    registerPrerequisite,
    unregisterPrerequisite,
    isTopicAvailable,
    getTopicDisabledReason,
  };

  // Don't render tutorial UI while loading
  if (isLoading) {
    return (
      <TutorialContext.Provider value={value}>
        {children}
      </TutorialContext.Provider>
    );
  }

  // Calculate incomplete topics count for badge
  const incompleteTopicsCount = ALL_TOPICS.length - completedTopics.length;

  return (
    <TutorialContext.Provider value={value}>
      {children}

      {/* Welcome Modal */}
      <TutorialWelcome
        isOpen={showWelcome}
        onStart={startTutorial}
        onSkip={skipTutorial}
      />

      {/* Spotlight Overlay */}
      {isActive && currentStep && (
        <>
          <TutorialSpotlight
            targetSelector={currentStep.targetSelector}
            padding={currentStep.highlightPadding}
            isActive={isActive}
          />
          <TutorialTooltip
            step={currentStep}
            currentIndex={displayStepIndex}
            totalSteps={currentTotalSteps}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTutorial}
            isActive={isActive}
          />
        </>
      )}

      {/* Tutorial Menu Panel - only show when not in active tutorial and not showing welcome */}
      {!isActive && !showWelcome && (
        <TutorialMenuPanel
          isOpen={menuOpen}
          onClose={closeMenu}
          categories={TUTORIAL_CATEGORIES}
          completedTopics={completedTopics}
          onSelectTopic={startTopic}
          isTopicDisabled={(topicId) => !isTopicAvailable(topicId)}
          getDisabledReason={getTopicDisabledReason}
        />
      )}
    </TutorialContext.Provider>
  );
}
