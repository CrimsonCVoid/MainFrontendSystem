import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureUserRecord } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) {
    redirect("/signin");
  }

  try {
    await ensureUserRecord(user, supabase);
  } catch (err) {
    console.warn("ensureUserRecord failed inside protected layout:", err);
  }

  return <MainLayout>{children}</MainLayout>;
}
