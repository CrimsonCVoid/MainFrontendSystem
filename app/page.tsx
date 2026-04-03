import { redirect } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

<<<<<<< HEAD
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
=======
type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

  // If OAuth code landed here instead of /callback, redirect to callback
  // Use full canonical URL to ensure www domain matches code-verifier cookie
  if (params.code) {
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    redirect(`${siteUrl}/callback?code=${code}&redirect=/dashboard`);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pass user to LandingPage so it can show appropriate nav options
  // Logged-in users can still view the landing page
  return <LandingPage user={user} />;
}
