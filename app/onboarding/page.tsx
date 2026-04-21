"use client";

/**
 * Onboarding page — Create Organization / Accept Invite.
 *
 * Visual language matches the Create Project modal on the dashboard:
 * slate gradient header, rounded-2xl cards, clear "numbered step"
 * affordance, primary gradient submit button. No URL-slug field —
 * slugs are auto-generated server-side and aren't user-editable.
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ArrowRight,
  Loader2,
  Users,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface PendingInvite {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const inviteToken = searchParams.get("invite");

  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(
    null,
  );
  const [orgName, setOrgName] = useState("");

  // Check for pending invites by email on mount.
  useEffect(() => {
    const checkInvites = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/");
          return;
        }

        const orgsRes = await fetch("/api/orgs");
        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          if (orgsData.organizations?.length > 0 && action !== "create") {
            router.push("/dashboard");
            return;
          }
        }

        if (inviteToken) {
          const inviteRes = await fetch(`/api/invites/${inviteToken}`);
          if (inviteRes.ok) {
            const inviteData = await inviteRes.json();
            if (inviteData.valid) {
              setPendingInvite({
                id: inviteData.invite.id,
                role: inviteData.invite.role,
                organization: inviteData.organization,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error checking invites:", err);
      } finally {
        setLoading(false);
      }
    };

    checkInvites();
  }, [supabase, router, inviteToken, action]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization",
      );
      setSubmitting(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteToken) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/invites/${inviteToken}/accept`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invite",
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-xl space-y-4">
        {/* Headline */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Welcome to My Metal Roofer
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            {pendingInvite
              ? "You've been invited to join an organization."
              : "Create your organization to get started."}
          </p>
        </div>

        {/* Pending invite card */}
        {pendingInvite && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <div className="flex items-center gap-3">
                {pendingInvite.organization.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingInvite.organization.logo_url}
                    alt={pendingInvite.organization.name}
                    className="h-12 w-12 rounded-lg object-cover flex-shrink-0 border border-white shadow-sm"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-emerald-100">
                    <Building2 className="h-6 w-6 text-emerald-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Invitation
                  </div>
                  <div className="text-base font-semibold text-neutral-900 truncate">
                    {pendingInvite.organization.name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Join as{" "}
                    <span className="font-medium text-neutral-700">
                      {pendingInvite.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <Button
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
                onClick={handleAcceptInvite}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Join organization
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Create org card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-slate-50 to-neutral-50 border-b border-neutral-100">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900">
                  {pendingInvite
                    ? "Or create your own"
                    : "Create your organization"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  You can invite teammates and customize branding later.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateOrg} className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                  1
                </div>
                <label
                  htmlFor="orgName"
                  className="text-sm font-semibold text-neutral-800"
                >
                  Organization name
                </label>
                <span className="text-red-500">*</span>
              </div>
              <Input
                id="orgName"
                placeholder="Acme Metal Roofing Co."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={submitting}
                className="h-11 text-base"
                autoFocus
              />
              <p className="text-xs text-neutral-500">
                Shown on proposals, shop drawings, and the app header. You can
                rename it any time from settings.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {action === "create" && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => router.push("/dashboard")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 h-11 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg"
                disabled={submitting || !orgName.trim()}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create organization
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
