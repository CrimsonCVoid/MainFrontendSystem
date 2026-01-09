"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="lg:pl-64">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="p-4 lg:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
