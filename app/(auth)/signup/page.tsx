import { redirect } from "next/navigation";
import AuthPortal from "@/components/auth/AuthPortal";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function SignUpPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <AuthPortal initialMode="signup" />;
}
