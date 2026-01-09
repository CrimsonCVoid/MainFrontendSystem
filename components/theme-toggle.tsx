"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-white dark:bg-black/50 border-slate-200 dark:border-orange-500/30 hover:bg-slate-50 dark:hover:bg-black/70 dark:hover:border-orange-500/50 transition-all"
        >
          {theme === "light" && <Sun className="h-4 w-4 text-orange-500" />}
          {theme === "dark" && <Moon className="h-4 w-4 text-orange-500" />}
          {theme === "system" && <Monitor className="h-4 w-4 text-slate-600 dark:text-orange-400" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer"
        >
          <Sun className="mr-2 h-4 w-4 text-orange-500" />
          <span>Light</span>
          {theme === "light" && (
            <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-bold">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer"
        >
          <Moon className="mr-2 h-4 w-4 text-orange-500 dark:text-orange-400" />
          <span>Dark</span>
          {theme === "dark" && (
            <span className="ml-auto text-xs text-orange-600 dark:text-orange-400 font-bold">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer"
        >
          <Monitor className="mr-2 h-4 w-4 text-slate-600 dark:text-orange-400" />
          <span>Auto</span>
          {theme === "system" && (
            <span className="ml-auto text-xs text-slate-600 dark:text-orange-400 font-bold">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
