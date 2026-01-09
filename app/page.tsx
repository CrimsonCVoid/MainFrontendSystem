import { redirect } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
