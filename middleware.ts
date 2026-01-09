import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Force Node.js runtime for Supabase compatibility
export const runtime = "nodejs";

const PROTECTED_PREFIXES = ["/dashboard", "/settings"];
const AUTH_PATHS = new Set(["/signin", "/signup", "/login", "/login.html"]);

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isAuthPage = AUTH_PATHS.has(path);

  // Redirect to login if accessing protected route without session
  if (isProtected && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/signin";
    if (!AUTH_PATHS.has(path)) {
      redirectUrl.searchParams.set("redirectedFrom", path);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if accessing auth pages with active session
  if (session && isAuthPage) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/signin",
    "/signup",
    "/login",
    "/login.html",
    "/callback",
  ],
};
