"use client";

/**
 * Onboarding Page
 *
 * Shown to new users without an organization.
 * Allows creating a new org or accepting a pending invite.
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowRight, Loader2, Users, Check } from "lucide-react";
import { generateSlug } from "@/lib/org-types";

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
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  // Form state
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Check for pending invites by email on mount
  useEffect(() => {
    const checkInvites = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/");
          return;
        }

        // Check if user already has an org
        const orgsRes = await fetch("/api/orgs");
        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          if (orgsData.organizations?.length > 0 && action !== "create") {
            router.push("/dashboard");
            return;
          }
        }

        // Check for invite token in URL
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

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && orgName) {
      setSlug(generateSlug(orgName));
    }
  }, [orgName, slugEdited]);

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
        body: JSON.stringify({
          name: orgName.trim(),
          slug: slug || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
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
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-600 text-white mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to MyMetalRoofer</h1>
          <p className="text-neutral-500 mt-2">
            {pendingInvite
              ? "You've been invited to join an organization"
              : "Create your organization to get started"}
          </p>
        </div>

        {/* Pending Invite Card */}
        {pendingInvite && (
          <Card className="mb-6 border-slate-200 bg-slate-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                {pendingInvite.organization.logo_url ? (
                  <img
                    src={pendingInvite.organization.logo_url}
                    alt={pendingInvite.organization.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-neutral-400" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">
                    {pendingInvite.organization.name}
                  </CardTitle>
                  <CardDescription>
                    You're invited as {pendingInvite.role}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={handleAcceptInvite}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Join Organization
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Org Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {pendingInvite ? "Or Create Your Own" : "Create Organization"}
            </CardTitle>
            <CardDescription>
              Set up your company workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="My Company"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  URL Slug{" "}
                  <span className="text-neutral-400 font-normal">(optional)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-sm">app.mymetalroofer.com/</span>
                  <Input
                    id="slug"
                    placeholder="my-company"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                      setSlugEdited(true);
                    }}
                    disabled={submitting}
                    className="flex-1"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !orgName.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Organization
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Skip option if user has orgs */}
        {action === "create" && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
