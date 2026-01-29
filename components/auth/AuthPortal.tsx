"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureUserRecord, signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

const MIN_PASSWORD_LENGTH = 8;

type AuthPortalProps = {
  initialMode?: Mode;
};

export default function AuthPortal({ initialMode = "signin" }: AuthPortalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const modeCopy = useMemo(
    () =>
      mode === "signin"
        ? {
            title: "Welcome back",
            subtitle: "Sign in to access your dashboard.",
            action: "Sign in",
            switchCopy: "Need an account?",
            switchTarget: "signup" as Mode,
            icon: <LogIn className="h-4 w-4" />,
          }
        : {
            title: "Create your account",
            subtitle: "Start managing your projects in minutes.",
            action: "Create account",
            switchCopy: "Already registered?",
            switchTarget: "signin" as Mode,
            icon: <UserPlus className="h-4 w-4" />,
          },
    [mode]
  );

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.length >= MIN_PASSWORD_LENGTH, [password]);
  const passwordsMatch = useMemo(() => mode === "signin" || password === confirmPassword, [
    mode,
    password,
    confirmPassword,
  ]);
  const canSubmit = emailValid && passwordValid && passwordsMatch;

  const resetFeedback = useCallback(() => {
    setError(null);
    setMessage(null);
  }, []);

  const completeAuth = useCallback(
    async (user: User) => {
      try {
        await ensureUserRecord(user);
      } catch (err) {
        console.warn("ensureUserRecord failed:", err);
      }
      router.replace("/dashboard");
    },
    [router]
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      // Use getUser() for secure auth validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        await completeAuth(user);
      }
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        await completeAuth(session.user);
      }
      if (event === "SIGNED_OUT") {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [completeAuth]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || busy) return;

    resetFeedback();
    setBusy(true);

    try {
      if (mode === "signin") {
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        const user = data.session?.user;
        if (user) {
          await completeAuth(user);
        }
        return;
      }

      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/callback?redirect=/dashboard` },
      });
      if (signUpError) throw signUpError;
      if (user) {
        await completeAuth(user);
        return;
      }
      setMessage("Check your email to confirm your address before signing in.");
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (googleBusy) return;
    resetFeedback();
    setGoogleBusy(true);
    try {
      await signInWithGoogle("/callback?redirect=/dashboard");
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
      setGoogleBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    resetFeedback();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-neutral-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-lg shadow-slate-500/40 ring-2 ring-slate-400/20 group-hover:shadow-xl group-hover:scale-105 transition-all">
                <span className="text-white text-sm font-bold drop-shadow-lg">MMR</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-neutral-900">My Metal Roofer</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/#pricing"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors hidden sm:block"
              >
                Pricing
              </Link>
              {mode === "signin" ? (
                <button
                  onClick={() => switchMode("signup")}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-slate-500 to-slate-500 text-white hover:from-slate-600 hover:to-slate-600 transition-all shadow-sm hover:shadow-md"
                >
                  Sign Up
                </button>
              ) : (
                <button
                  onClick={() => switchMode("signin")}
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16 min-h-screen bg-gradient-to-br from-neutral-50 via-slate-50/20 to-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left Side - Hero Content */}
            <div className="space-y-8 order-2 lg:order-1">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Professional Roofing Platform
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight">
                  {mode === "signin" ? "Welcome Back" : "Get Started Today"}
                </h1>

                <p className="text-lg text-neutral-600 leading-relaxed">
                  {mode === "signin"
                    ? "Sign in to access your projects, 3D visualizations, and professional estimating tools."
                    : "Create your account and start designing metal roof projects with advanced 3D visualization tools."}
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    ),
                    title: "3D Visualization",
                    desc: "Interactive roof modeling"
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ),
                    title: "Cost Calculator",
                    desc: "Instant pricing estimates"
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    ),
                    title: "50+ Colors",
                    desc: "Premium paint colors"
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ),
                    title: "Export Options",
                    desc: "PDF and CSV reports"
                  },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-neutral-200 hover:border-slate-300 hover:shadow-sm transition-all">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 text-sm">{feature.title}</h3>
                      <p className="text-xs text-neutral-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-neutral-600 font-medium">Secure & Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-neutral-600 font-medium">Industry Trusted</span>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="order-1 lg:order-2">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl p-8 lg:p-10 space-y-6">
                {/* Form Header */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-neutral-900">
                    {mode === "signin" ? "Sign in to your account" : "Create your account"}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {mode === "signin"
                      ? "Enter your credentials to access your dashboard"
                      : "Get started with a free account in seconds"}
                  </p>
                </div>

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-3 border-2 hover:border-neutral-300 hover:bg-neutral-50 transition-all h-12"
                  onClick={handleGoogle}
                  disabled={googleBusy}
                >
                  {googleBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span className="font-medium text-neutral-700">
                    {googleBusy ? "Connecting…" : "Continue with Google"}
                  </span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-neutral-500 font-medium">Or continue with email</span>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                {message && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>{message}</span>
                  </div>
                )}

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-neutral-900">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      className="h-11 border-neutral-300 focus:border-slate-500 focus:ring-slate-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-neutral-900">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="h-11 border-neutral-300 focus:border-slate-500 focus:ring-slate-500/20"
                    />
                    {mode === "signup" && (
                      <p className="text-xs text-neutral-500">Must be at least {MIN_PASSWORD_LENGTH} characters</p>
                    )}
                  </div>

                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm" className="text-sm font-medium text-neutral-900">
                        Confirm password
                      </Label>
                      <Input
                        id="confirm"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="••••••••"
                        className="h-11 border-neutral-300 focus:border-slate-500 focus:ring-slate-500/20"
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-slate-500 to-slate-500 hover:from-slate-600 hover:to-slate-600 text-white shadow-md hover:shadow-lg transition-all h-12 font-semibold"
                    disabled={!canSubmit || busy}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Please wait…</span>
                      </>
                    ) : (
                      <>
                        {modeCopy.icon}
                        <span>{modeCopy.action}</span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Footer */}
                <div className="text-center pt-2">
                  <p className="text-sm text-neutral-600">
                    {modeCopy.switchCopy}{" "}
                    <button
                      type="button"
                      onClick={() => switchMode(modeCopy.switchTarget)}
                      className="font-semibold text-slate-600 hover:text-slate-700 transition-colors"
                    >
                      {modeCopy.switchTarget === "signup" ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>

                {mode === "signup" && (
                  <p className="text-xs text-center text-neutral-500 pt-2">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-slate-600 hover:text-slate-700">Terms</a>
                    {" "}and{" "}
                    <a href="#" className="text-slate-600 hover:text-slate-700">Privacy Policy</a>
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
