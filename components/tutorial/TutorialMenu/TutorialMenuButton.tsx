"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TutorialMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  incompleteCount?: number;
}

/**
 * Floating Action Button for the Tutorial Menu
 *
 * - Fixed position in bottom-right corner
 * - Shows badge with incomplete tutorial count
 * - Pulse animation when tutorials are available
 * - Transforms to X icon when menu is open
 */
export function TutorialMenuButton({
  isOpen,
  onToggle,
  incompleteCount = 0,
}: TutorialMenuButtonProps) {
  const showBadge = incompleteCount > 0 && !isOpen;

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-[9999] pointer-events-auto"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
    >
      <div className="relative">
        {/* Pulse ring when tutorials available */}
        <AnimatePresence>
          {showBadge && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          )}
        </AnimatePresence>

        {/* Main button */}
        <Button
          onClick={onToggle}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
            "hover:shadow-xl hover:scale-105",
            isOpen
              ? "bg-neutral-800 hover:bg-neutral-700"
              : "bg-blue-600 hover:bg-blue-700"
          )}
          aria-label={isOpen ? "Close help menu" : "Open help menu"}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="help"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <HelpCircle className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Badge for incomplete count */}
        <AnimatePresence>
          {showBadge && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1"
            >
              <Badge
                variant="destructive"
                className="h-6 min-w-6 flex items-center justify-center rounded-full px-1.5 text-xs font-bold"
              >
                {incompleteCount > 9 ? "9+" : incompleteCount}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard shortcut hint (visible on hover) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-2 pointer-events-none"
          >
            <div className="bg-neutral-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Press <kbd className="px-1 py-0.5 bg-neutral-700 rounded">?</kbd> to open
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
