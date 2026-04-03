"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialSpotlightProps {
  targetSelector: string | null;
  padding?: number;
  isActive: boolean;
  onTargetClick?: () => void;
}

export function TutorialSpotlight({
  targetSelector,
  padding = 8,
  isActive,
  onTargetClick,
}: TutorialSpotlightProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Update spotlight position
  const updatePosition = useCallback(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (!element) {
      setRect(null);
      return;
    }

    const bounds = element.getBoundingClientRect();
    setRect({
      top: bounds.top - padding,
      left: bounds.left - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
    });

    // Scroll element into view
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }, [targetSelector, padding]);

  // Initial mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update position on selector change or window resize
  useEffect(() => {
    if (!isActive) return;

    // Initial update with delay for DOM to settle
    const timer = setTimeout(updatePosition, 100);

    // Listen for resize and scroll
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isActive, updatePosition]);

  // Handle clicks on the spotlight area
  const handleSpotlightClick = useCallback(() => {
    if (onTargetClick) {
      onTargetClick();
    }
  }, [onTargetClick]);

  if (!mounted || !isActive) return null;

  // Create SVG mask for spotlight effect
  const renderOverlay = () => (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998]"
          style={{ pointerEvents: "none" }}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: "none" }}
          >
            <defs>
              <mask id="spotlight-mask">
                {/* White = visible, Black = hidden */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {rect && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x={rect.left}
                    y={rect.top}
                    width={rect.width}
                    height={rect.height}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>

            {/* Dark overlay with cutout */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
              style={{ pointerEvents: "auto" }}
            />
          </svg>

          {/* Glow ring around highlighted element */}
          {rect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="absolute pointer-events-none"
              style={{
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                borderRadius: 16,
                boxShadow: `
                  0 0 0 2px rgba(59, 130, 246, 0.5),
                  0 0 20px 4px rgba(59, 130, 246, 0.3),
                  0 0 40px 8px rgba(59, 130, 246, 0.1)
                `,
              }}
            />
          )}

          {/* Clickable area over highlighted element */}
          {rect && onTargetClick && (
            <div
              className="absolute cursor-pointer"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                pointerEvents: "auto",
                borderRadius: 12,
              }}
              onClick={handleSpotlightClick}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(renderOverlay(), document.body);
}
