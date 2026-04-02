import { redirect } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pass user to LandingPage so it can show appropriate nav options
  // Logged-in users can still view the landing page
  return <LandingPage user={user} />;
}
