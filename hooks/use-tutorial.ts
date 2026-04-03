"use client";

import { useContext } from "react";
import { TutorialContext } from "@/components/tutorial/TutorialProvider";

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

/**
 * Safe version that returns null if not inside TutorialProvider
 * Use this in components that may be rendered outside the provider
 */
export function useTutorialSafe() {
  const context = useContext(TutorialContext);
  return context;
}
