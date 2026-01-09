import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureUserRecord } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirect") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/signin`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("exchangeCodeForSession failed:", exchangeError);
    return NextResponse.redirect(`${requestUrl.origin}/signin?error=oauth_exchange_failed`);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      await ensureUserRecord(session.user, supabase);
    } catch (error) {
      console.warn("ensureUserRecord failed during callback:", error);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
}
