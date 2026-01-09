import { redirect } from "next/navigation";
import AuthPortal from "@/components/auth/AuthPortal";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function SignUpPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <AuthPortal initialMode="signup" />;
}
