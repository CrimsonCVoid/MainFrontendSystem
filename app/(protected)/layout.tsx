import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureUserRecord } from "@/lib/auth";
import { OrgProvider } from "@/components/providers/org-provider";
<<<<<<< HEAD
=======
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
import { ensureUserHasOrg } from "@/lib/org-auth";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();

  // Use getUser() for secure server-side auth validation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  if (user) {
    try {
      await ensureUserRecord(user, supabase);
    } catch (err) {
      console.warn("ensureUserRecord failed inside protected layout:", err);
    }

    // Ensure user has at least one organization (if org tables exist)
    if (user.email) {
      try {
        const { error: tableCheck } = await supabase
          .from("organizations")
          .select("id")
          .limit(1);

        if (!tableCheck || !tableCheck.message?.includes("does not exist")) {
          await ensureUserHasOrg(supabase, user.id, user.email);
        }
      } catch (err) {
        // Silently ignore - org tables may not exist yet
      }
    }
  }

<<<<<<< HEAD
  // Ensure user has at least one organization (if org tables exist)
  if (user.email) {
    try {
      // Check if organizations table exists before trying to create org
      const { error: tableCheck } = await supabase
        .from("organizations")
        .select("id")
        .limit(1);

      // Only create org if table exists (migrations have been run)
      if (!tableCheck || !tableCheck.message?.includes("does not exist")) {
        await ensureUserHasOrg(supabase, user.id, user.email);
      }
    } catch (err) {
      // Silently ignore - org tables may not exist yet
    }
  }

  return (
    <OrgProvider>
      <MainLayout>{children}</MainLayout>
=======
  return (
    <OrgProvider>
      <TutorialProvider>
        <MainLayout>{children}</MainLayout>
      </TutorialProvider>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
    </OrgProvider>
  );
}
