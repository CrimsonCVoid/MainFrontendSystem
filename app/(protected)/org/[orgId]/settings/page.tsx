"use client";

/**
 * Organization Settings Page
 *
 * Comprehensive dashboard for org management:
 * - General: Organization name
 * - Members: Team management, invites, pending invitations
 * - Billing: Subscription status and management (admins only)
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useOrg, useSFPool } from "@/components/providers/org-provider";
import { MembersTable } from "@/components/org/members-table";
import { InviteDialog } from "@/components/org/invite-dialog";
import { SFPurchaseDialog } from "@/components/org/sf-purchase-dialog";
import { SFPoolDisplay } from "@/components/org/sf-pool-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Settings,
  Users,
  CreditCard,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  Link as LinkIcon,
  UserPlus,
  Mail,
  Link2,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Box,
  Plus,
  History,
  Eye,
  EyeOff,
} from "lucide-react";
import { type OrganizationMemberWithUser, type OrgPlan, type BillingStatus, type ProjectVisibility, type OrganizationSettings } from "@/lib/org-types";

interface PendingInvite {
  id: string;
  email: string | null;
  role: string;
  invite_type: string;
  expires_at: string;
  use_count: number;
  max_uses: number;
  created_at: string;
}

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const supabase = getSupabaseBrowserClient();

  const { role, hasPermission, refreshOrgs } = useOrg();
  const { pool, format: formatSF } = useSFPool();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");

  // Members state
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite link state
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  // SF Pool state
  const [sfPurchaseDialogOpen, setSfPurchaseDialogOpen] = useState(false);
  const [sfTransactions, setSfTransactions] = useState<any[]>([]);
  const [sfTransactionsLoading, setSfTransactionsLoading] = useState(false);

  // Visibility state
  const [projectVisibility, setProjectVisibility] = useState<ProjectVisibility>("all");
  const [savingVisibility, setSavingVisibility] = useState(false);

  const isAdmin = role === "owner" || role === "admin";
  const canInvite = hasPermission("members:invite");
  const canBilling = hasPermission("org:billing");

  // Load organization data
  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();

        if (error) throw error;

        const orgData = data as any;
        setOrg(orgData);
        setName(orgData.name);
        // Load visibility setting
        const settings = orgData.settings as OrganizationSettings;
        setProjectVisibility(settings?.projectVisibility || "all");
      } catch (err) {
        setError("Failed to load organization");
      } finally {
        setLoading(false);
      }
    };

    loadOrg();
  }, [orgId, supabase]);

  // Load members and invites
  const fetchMembersData = useCallback(async () => {
    try {
      setMembersLoading(true);

      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/orgs/${orgId}/members`),
        canInvite ? fetch(`/api/orgs/${orgId}/invites`) : null,
      ]);

      if (!membersRes.ok) {
        throw new Error("Failed to fetch members");
      }

      const membersData = await membersRes.json();
      setMembers(membersData.members || []);

      // Find current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      if (invitesRes && invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.pending || []);
      }
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setMembersLoading(false);
    }
  }, [orgId, canInvite, supabase]);

  useEffect(() => {
    if (orgId) {
      fetchMembersData();
    }
  }, [orgId, fetchMembersData]);

  // Check for SF purchase success from URL
  useEffect(() => {
    const sfPurchase = searchParams.get("sf_purchase");
    if (sfPurchase === "success") {
      setSuccess("Square footage purchased successfully! Your pool has been updated.");
      setTimeout(() => setSuccess(null), 5000);
      refreshOrgs();
      // Clean up URL
      router.replace(`/org/${orgId}/settings?tab=billing`);
    }
  }, [searchParams, orgId, router, refreshOrgs]);

  // Fetch SF transactions when billing tab is active
  const fetchSFTransactions = useCallback(async () => {
    if (!canBilling) return;

    try {
      setSfTransactionsLoading(true);
      const response = await fetch(`/api/orgs/${orgId}/sf-pool?limit=10`);

      if (response.ok) {
        const data = await response.json();
        setSfTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Error fetching SF transactions:", err);
    } finally {
      setSfTransactionsLoading(false);
    }
  }, [orgId, canBilling]);

  useEffect(() => {
    if (canBilling) {
      fetchSFTransactions();
    }
  }, [canBilling, fetchSFTransactions]);

  const handleSaveSettings = async () => {
    if (!isAdmin) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setOrg(data.organization);
      await refreshOrgs();
      setSuccess("Settings saved successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisibility = async (newVisibility: ProjectVisibility) => {
    if (!isAdmin || !org) return;

    setSavingVisibility(true);
    setError(null);

    try {
      const currentSettings = (org.settings as OrganizationSettings) || {};
      const newSettings: OrganizationSettings = {
        ...currentSettings,
        projectVisibility: newVisibility,
      };

      const { error } = await supabase
        .from("organizations")
        .update({ settings: newSettings })
        .eq("id", orgId);

      if (error) throw error;

      setProjectVisibility(newVisibility);
      setOrg({ ...org, settings: newSettings });
      await refreshOrgs();
      setSuccess(
        newVisibility === "own-only"
          ? "Members can now only see their own projects."
          : "All members can now see all projects."
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save visibility setting");
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleCreateInviteLink = async () => {
    if (!isAdmin) return;

    setCreatingLink(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "member",
          invite_type: "link",
          max_uses: 100,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      const link = `${window.location.origin}/invite/${data.invite.token}`;
      setInviteLink(link);
    } catch (err: any) {
      setError(err.message || "Failed to create invite link");
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/orgs/${orgId}/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke invite");
      }

      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error("Error revoking invite:", err);
    }
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPlanBadge = (plan: OrgPlan) => {
    const badges: Record<OrgPlan, { label: string; className: string }> = {
      free: { label: "Free", className: "bg-neutral-100 text-neutral-600" },
      trial: { label: "Trial", className: "bg-amber-100 text-amber-700" },
      paid: { label: "Pro", className: "bg-emerald-100 text-emerald-700" },
      enterprise: { label: "Enterprise", className: "bg-purple-100 text-purple-700" },
    };
    return badges[plan] || badges.free;
  };

  const getBillingStatusInfo = (status: BillingStatus) => {
    const info: Record<BillingStatus, { label: string; className: string }> = {
      active: { label: "Active", className: "text-emerald-600" },
      inactive: { label: "Inactive", className: "text-neutral-500" },
      past_due: { label: "Past Due", className: "text-red-600" },
      canceled: { label: "Canceled", className: "text-neutral-500" },
    };
    return info[status] || info.inactive;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Organization not found</p>
      </div>
    );
  }

  const planBadge = getPlanBadge(org.plan || "free");
  const billingStatusInfo = getBillingStatusInfo(org.billing_status || "inactive");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-900">{org.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planBadge.className}`}>
                  {planBadge.label}
                </span>
              </div>
              <p className="text-sm text-neutral-500">Organization Settings</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-neutral-200">
                {members.length}
              </span>
            </TabsTrigger>
            {canBilling && (
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
            )}
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  {isAdmin ? "Update your organization's information" : "View organization information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="My Company"
                  />
                </div>

                {isAdmin && (
                  <Button onClick={handleSaveSettings} disabled={saving || name === org.name}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Project Visibility */}
            {isAdmin && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Project Visibility</CardTitle>
                  <CardDescription>
                    Control whether team members can see all projects or only their own
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* All Projects Option */}
                    <button
                      type="button"
                      onClick={() => handleSaveVisibility("all")}
                      disabled={savingVisibility}
                      className={`relative flex flex-col items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        projectVisibility === "all"
                          ? "border-slate-900 bg-slate-50"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        projectVisibility === "all"
                          ? "bg-slate-900 text-white"
                          : "bg-neutral-100 text-neutral-600"
                      }`}>
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">All Projects Visible</p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          Every member can see and edit all projects
                        </p>
                      </div>
                      {projectVisibility === "all" && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-900" />
                      )}
                    </button>

                    {/* Own Projects Only Option */}
                    <button
                      type="button"
                      onClick={() => handleSaveVisibility("own-only")}
                      disabled={savingVisibility}
                      className={`relative flex flex-col items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        projectVisibility === "own-only"
                          ? "border-slate-900 bg-slate-50"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        projectVisibility === "own-only"
                          ? "bg-slate-900 text-white"
                          : "bg-neutral-100 text-neutral-600"
                      }`}>
                        <EyeOff className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">Own Projects Only</p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          Members only see their own projects (admins see all)
                        </p>
                      </div>
                      {projectVisibility === "own-only" && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-900" />
                      )}
                    </button>
                  </div>
                  {savingVisibility && (
                    <p className="text-sm text-neutral-500 mt-3">Saving...</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Invite Link */}
            {isAdmin && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Invite Link</CardTitle>
                  <CardDescription>
                    Share a link to let others join your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inviteLink ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input value={inviteLink} readOnly className="font-mono text-sm" />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(inviteLink, setCopiedLink)}
                        >
                          {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Anyone with this link can join as a member
                      </p>
                    </div>
                  ) : (
                    <Button onClick={handleCreateInviteLink} disabled={creatingLink} variant="outline">
                      {creatingLink ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Generate Invite Link
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Members List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {members.length} member{members.length !== 1 ? "s" : ""} in your organization
                  </CardDescription>
                </div>
                {canInvite && (
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <MembersTable
                    members={members}
                    currentUserId={currentUserId || ""}
                    onMemberUpdated={() => {
                      fetchMembersData();
                      refreshOrgs();
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Pending Invites */}
            {canInvite && pendingInvites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>
                    {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg divide-y">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center">
                            {invite.invite_type === "email" ? (
                              <Mail className="h-4 w-4 text-neutral-500" />
                            ) : (
                              <Link2 className="h-4 w-4 text-neutral-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {invite.email || "Invite Link"}
                            </div>
                            <div className="text-sm text-neutral-500">
                              {invite.invite_type === "link"
                                ? `${invite.use_count}/${invite.max_uses} uses`
                                : `Role: ${invite.role}`}
                              {" • "}
                              Expires {formatDate(invite.expires_at)}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="text-neutral-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Billing Tab */}
          {canBilling && (
            <TabsContent value="billing" className="space-y-6">
              {/* SF Pool Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-5 w-5 text-blue-600" />
                      Square Footage Pool
                    </CardTitle>
                    <CardDescription>
                      Your organization&apos;s shared pool for project measurements
                    </CardDescription>
                  </div>
                  <Button onClick={() => setSfPurchaseDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Buy SF
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pool Balance */}
                  <SFPoolDisplay />

                  {/* Recent Transactions */}
                  {sfTransactions.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-neutral-500" />
                        <span className="text-sm font-medium">Recent Activity</span>
                      </div>
                      <div className="space-y-2">
                        {sfTransactions.slice(0, 5).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  tx.transaction_type === "purchase"
                                    ? "bg-green-100 text-green-700"
                                    : tx.transaction_type === "usage"
                                    ? "bg-blue-100 text-blue-700"
                                    : tx.transaction_type === "refund"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-neutral-100 text-neutral-700"
                                }`}
                              >
                                {tx.transaction_type === "purchase"
                                  ? "Purchase"
                                  : tx.transaction_type === "usage"
                                  ? "Used"
                                  : tx.transaction_type === "refund"
                                  ? "Refund"
                                  : "Adjustment"}
                              </span>
                              <span className="text-neutral-600">
                                {tx.user?.full_name || tx.user?.email || "Unknown"}
                              </span>
                              {tx.project && (
                                <span className="text-neutral-400">
                                  • {tx.project.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`font-medium ${
                                  tx.sf_amount > 0 ? "text-green-600" : "text-neutral-600"
                                }`}
                              >
                                {tx.sf_amount > 0 ? "+" : ""}
                                {formatSF(Math.abs(tx.sf_amount))}
                              </span>
                              <span className="text-neutral-400 text-xs">
                                {formatDate(tx.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {pool.total === 0 && sfTransactions.length === 0 && (
                    <div className="text-center py-6 text-neutral-500">
                      <Box className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                      <p className="font-medium">No square footage yet</p>
                      <p className="text-sm mt-1">Purchase SF to start creating projects</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Your organization's subscription and billing details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-slate-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{planBadge.label} Plan</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planBadge.className}`}>
                            {planBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          {org.billing_status === "active" ? (
                            <CheckCircle2 className={`h-4 w-4 ${billingStatusInfo.className}`} />
                          ) : (
                            <AlertCircle className={`h-4 w-4 ${billingStatusInfo.className}`} />
                          )}
                          <span className={billingStatusInfo.className}>{billingStatusInfo.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plan Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-neutral-500 mb-1">Members</div>
                      <div className="text-2xl font-bold">{members.length}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-neutral-500 mb-1">Plan</div>
                      <div className="text-2xl font-bold capitalize">{org.plan || "Free"}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-neutral-500 mb-1">Status</div>
                      <div className="text-2xl font-bold capitalize">{org.billing_status || "Inactive"}</div>
                    </div>
                  </div>

                  {/* Trial Info */}
                  {org.plan === "trial" && org.trial_ends_at && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium">Trial Period</span>
                      </div>
                      <p className="mt-1 text-sm text-amber-600">
                        Your trial ends on {formatDate(org.trial_ends_at)}
                      </p>
                    </div>
                  )}

                  {/* Upgrade CTA */}
                  {(org.plan === "free" || org.plan === "trial") && (
                    <div className="p-6 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg border">
                      <h3 className="font-semibold text-lg mb-2">Upgrade to Pro</h3>
                      <p className="text-neutral-600 mb-4">
                        Unlock unlimited projects, priority support, and advanced features.
                      </p>
                      <Button
                        onClick={() => router.push("/subscription")}
                        className="bg-slate-800 hover:bg-slate-700"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </div>
                  )}

                  {/* Manage Subscription */}
                  {org.billing_status === "active" && org.stripe_subscription_id && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => window.open("/api/stripe/portal", "_blank")}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </Button>
                      <p className="mt-2 text-xs text-neutral-500">
                        Update payment method, view invoices, or cancel subscription
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment History Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    Recent transactions and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-neutral-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                    <p>No payment history available</p>
                    <p className="text-sm mt-1">Payments will appear here once you upgrade</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSent={fetchMembersData}
      />

      <SFPurchaseDialog
        open={sfPurchaseDialogOpen}
        onOpenChange={setSfPurchaseDialogOpen}
      />
    </div>
  );
}
