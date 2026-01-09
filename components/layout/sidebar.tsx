// components/sidebar.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { FolderOpen, Settings, Menu, LogOut, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: FolderOpen },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasUser, setHasUser] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasUser(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasUser(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!hasUser) {
    // null while checking OR if unauthenticated -> no sidebar at all
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/signin");
    }
  };

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-xl font-bold">My Metal Roofer</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggle}
            aria-label="Close sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col">
          <nav className="space-y-2 p-4">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant={isActive(href) ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={onToggle}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-2 p-4">
            <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onToggle} />
      )}
    </>
  );
}
