"use client";

import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function GoogleSignInCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Unable to start Google sign-in.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-3xl border border-neutral-200 dark:border-border bg-white dark:bg-card p-10 shadow-lg">
      <header className="space-y-2 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-sm font-semibold text-white shadow-xl shadow-slate-500/40 ring-2 ring-slate-400/20">
          MMR
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-foreground">
          Sign in to Metal Roofer
        </h1>
        <p className="text-sm text-neutral-500 dark:text-muted-foreground">
          Authenticate with Google to access your projects, billing, and 3-D viewers.
        </p>
      </header>

      <Button
        onClick={handleSignIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2"
        size="lg"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {busy ? "Connecting…" : "Continue with Google"}
      </Button>

      {error && (
        <p className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <p className="text-xs text-neutral-400 dark:text-muted-foreground">
        We only request your basic Google profile so we can personalise your dashboard.
        Sessions auto-refresh and stay secure via Supabase Auth.
      </p>
    </div>
  );
}
