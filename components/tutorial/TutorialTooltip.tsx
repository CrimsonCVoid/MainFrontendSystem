"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import type { TutorialStep } from "@/lib/tutorial";

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

interface TutorialTooltipProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isActive: boolean;
}

const TOOLTIP_WIDTH = 380;
const TOOLTIP_MARGIN = 16;
const ARROW_SIZE = 12;

export function TutorialTooltip({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isActive,
}: TutorialTooltipProps) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;
  const isCenterStep = step.placement === "center" || !step.targetSelector;

  // Calculate tooltip position relative to target element
  const calculatePosition = useCallback(() => {
    if (isCenterStep) {
      // Center in viewport
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        arrowPosition: "top", // Not used for center
      });
      return;
    }

    if (!step.targetSelector) return;

    const element = document.querySelector(step.targetSelector);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const padding = step.highlightPadding || 8;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;

    let top = 0;
    let left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

    switch (step.placement) {
      case "bottom":
        top = rect.bottom + padding + TOOLTIP_MARGIN + ARROW_SIZE;
        left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        arrowPosition = "top";
        break;
      case "top":
        top = rect.top - padding - TOOLTIP_MARGIN - tooltipHeight - ARROW_SIZE;
        left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        arrowPosition = "bottom";
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding + TOOLTIP_MARGIN + ARROW_SIZE;
        arrowPosition = "left";
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - padding - TOOLTIP_MARGIN - TOOLTIP_WIDTH - ARROW_SIZE;
        arrowPosition = "right";
        break;
    }

    // Keep tooltip within viewport
    left = Math.max(TOOLTIP_MARGIN, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN));
    top = Math.max(TOOLTIP_MARGIN, Math.min(top, window.innerHeight - tooltipHeight - TOOLTIP_MARGIN));

    setPosition({ top, left, arrowPosition });
  }, [step, isCenterStep]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(calculatePosition, 150);

    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition, true);
    };
  }, [isActive, calculatePosition, step.id]);

  if (!mounted || !isActive) return null;

  const renderTooltip = () => (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={step.id}
          ref={tooltipRef}
          initial={{ opacity: 0, y: isCenterStep ? 20 : 0, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed z-[9999]"
          style={
            isCenterStep
              ? {
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 440,
                }
              : {
                  top: position?.top || 0,
                  left: position?.left || 0,
                  width: TOOLTIP_WIDTH,
                }
          }
        >
          {/* Arrow - hide if isCenterStep OR step.hideArrow */}
          {!isCenterStep && !step.hideArrow && position && (
            <div
              className="absolute w-0 h-0"
              style={{
                ...(position.arrowPosition === "top" && {
                  top: -ARROW_SIZE,
                  left: "50%",
                  transform: "translateX(-50%)",
                  borderLeft: `${ARROW_SIZE}px solid transparent`,
                  borderRight: `${ARROW_SIZE}px solid transparent`,
                  borderBottom: `${ARROW_SIZE}px solid white`,
                }),
                ...(position.arrowPosition === "bottom" && {
                  bottom: -ARROW_SIZE,
                  left: "50%",
                  transform: "translateX(-50%)",
                  borderLeft: `${ARROW_SIZE}px solid transparent`,
                  borderRight: `${ARROW_SIZE}px solid transparent`,
                  borderTop: `${ARROW_SIZE}px solid white`,
                }),
                ...(position.arrowPosition === "left" && {
                  left: -ARROW_SIZE,
                  top: "50%",
                  transform: "translateY(-50%)",
                  borderTop: `${ARROW_SIZE}px solid transparent`,
                  borderBottom: `${ARROW_SIZE}px solid transparent`,
                  borderRight: `${ARROW_SIZE}px solid white`,
                }),
                ...(position.arrowPosition === "right" && {
                  right: -ARROW_SIZE,
                  top: "50%",
                  transform: "translateY(-50%)",
                  borderTop: `${ARROW_SIZE}px solid transparent`,
                  borderBottom: `${ARROW_SIZE}px solid transparent`,
                  borderLeft: `${ARROW_SIZE}px solid white`,
                }),
              }}
            />
          )}

          {/* Card */}
          <div
            className={`
              bg-white rounded-2xl shadow-2xl overflow-hidden
              border border-neutral-200/50
              ${isCenterStep ? "text-center" : ""}
            `}
          >
            {/* Header gradient */}
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            <div className="p-6">
              {/* Icon for center steps */}
              {isCenterStep && (
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              )}

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  Step {currentIndex + 1} of {totalSteps}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-neutral-600 leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentIndex + 1) / totalSteps) * 100}%`,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={onSkip}
                  className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Skip tutorial
                </button>

                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPrev}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={onNext}
                    className="gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                  >
                    {isLastStep ? (
                      "Get Started"
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onSkip}
            className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors border border-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(renderTooltip(), document.body);
}
