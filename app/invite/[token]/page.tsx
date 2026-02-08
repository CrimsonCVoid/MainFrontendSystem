"use client";

/**
 * Invite Acceptance Page
 *
 * Displayed when a user clicks an invite link.
 * Shows org info and allows accepting the invite.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Loader2, AlertCircle, LogIn } from "lucide-react";
import { getRoleLabel, getRoleDescription } from "@/lib/org-types";

interface InviteDetails {
  id: string;
  role: string;
  invite_type: string;
  expires_at: string;
  email: string | null;
}

interface OrgDetails {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [org, setOrg] = useState<OrgDetails | null>(null);

  useEffect(() => {
    const checkAuthAndInvite = async () => {
      try {
        // Check auth status
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);

        // Fetch invite details
        const response = await fetch(`/api/invites/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Invalid invite");
        }

        if (!data.valid) {
          throw new Error(data.error || "This invite is no longer valid");
        }

        setInvite(data.invite);
        setOrg(data.organization);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invite");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndInvite();
  }, [token, supabase]);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setError(null);
      // Use Google OAuth with redirect back to this invite page after auth
      await signInWithGoogle(`/callback?redirect=/invite/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start sign-in");
      setSigningIn(false);
    }
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      setError(null);

      const response = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
              <p className="text-neutral-500 mb-6">{error}</p>
              <Button onClick={() => router.push("/")} variant="outline">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Org Logo/Icon */}
          <div className="flex justify-center mb-4">
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>

          <CardTitle className="text-xl">
            Join {org?.name}
          </CardTitle>
          <CardDescription>
            You've been invited to join as {invite && getRoleLabel(invite.role as any)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role info */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <div className="font-medium">
                  {invite && getRoleLabel(invite.role as any)}
                </div>
                <div className="text-sm text-neutral-500">
                  {invite && getRoleDescription(invite.role as any)}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {isAuthenticated ? (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-neutral-500">
                Sign in or create an account to accept this invitation
              </p>
              <Button className="w-full" onClick={handleSignIn} disabled={signingIn}>
                {signingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting to Google...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-neutral-400">
            This invitation expires on{" "}
            {invite &&
              new Date(invite.expires_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
