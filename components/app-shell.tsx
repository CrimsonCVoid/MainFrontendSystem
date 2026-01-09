"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true); // default open on desktop; tweak as you want
  return (
    <div className="flex min-h-dvh bg-neutral-50">
      <Sidebar isOpen={open} onToggle={() => setOpen((v) => !v)} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
