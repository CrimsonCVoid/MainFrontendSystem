"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className="flex flex-1 items-center justify-end space-x-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
