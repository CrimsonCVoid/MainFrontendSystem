"use client";

import { useEffect } from "react";
import { useLabelerStore } from "@/stores/labeler-store";

/**
 * Global keyboard shortcuts for the labeling page.
 *
 * Shortcuts:
 *  - Cmd+Z / Ctrl+Z            -> Undo (via zundo temporal)
 *  - Cmd+Shift+Z / Ctrl+Shift+Z -> Redo
 *  - Escape                    -> Cancel active drawing or deselect panel
 *  - Delete / Backspace        -> Delete selected panel
 *  - D / S / E                 -> Draw / Select / Edit mode
 */
export function useKeyboardShortcuts(): void {
  const mode = useLabelerStore((s) => s.mode);
  const selectedPanelIndex = useLabelerStore((s) => s.selectedPanelIndex);
  const activeDrawing = useLabelerStore((s) => s.activeDrawing);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        useLabelerStore.temporal.getState().redo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        useLabelerStore.temporal.getState().undo();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (activeDrawing) {
          useLabelerStore.getState().cancelDrawing();
        } else {
          useLabelerStore.getState().selectPanel(null);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPanelIndex !== null) {
          e.preventDefault();
          useLabelerStore.getState().deletePanel(selectedPanelIndex);
        }
        return;
      }

      if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useLabelerStore.getState().setMode("draw");
        return;
      }

      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useLabelerStore.getState().setMode("select");
        return;
      }

      if (e.key.toLowerCase() === "e" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useLabelerStore.getState().setMode("edit");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, selectedPanelIndex, activeDrawing]);
}
