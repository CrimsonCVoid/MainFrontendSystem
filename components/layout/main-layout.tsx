"use client";

import { SFPoolIndicator } from "./global-header";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

/**
 * Floating SF Pool indicator that can be added to any page
 * Shows in bottom-right corner on mobile
 */
export function FloatingSFPool() {
  return (
    <div className="fixed bottom-4 right-4 z-40 lg:hidden">
      <SFPoolIndicator className="shadow-lg" />
    </div>
  );
}
