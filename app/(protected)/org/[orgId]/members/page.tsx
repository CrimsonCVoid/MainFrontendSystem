"use client";

/**
 * Organization Members Management Page
 *
 * Displays all members with role management and invitation capabilities.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/org-provider";
import { MembersTable } from "@/components/org/members-table";
import { InviteDialog } from "@/components/org/invite-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Mail,
  Link2,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import { type OrganizationMemberWithUser, isInviteValid } from "@/lib/org-types";

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

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { org, role, hasPermission, refreshOrgs } = useOrg();

  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const canInvite = hasPermission("members:invite");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch members and invites in parallel
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/orgs/${orgId}/members`),
        canInvite ? fetch(`/api/orgs/${orgId}/invites`) : null,
      ]);

      if (!membersRes.ok) {
        throw new Error("Failed to fetch members");
      }

      const membersData = await membersRes.json();
      setMembers(membersData.members || []);

      // Find current user from members list
      const currentMember = membersData.members?.find((m: any) => m.role === role);
      if (currentMember) {
        setCurrentUserId(currentMember.user_id);
      }

      if (invitesRes && invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.pending || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [orgId, role, canInvite]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Team Members</h1>
              <p className="text-neutral-500">{org?.name}</p>
            </div>
          </div>

          {canInvite && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            {canInvite && (
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Invites ({pendingInvites.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>
                  Manage team members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MembersTable
                  members={members}
                  currentUserId={currentUserId || ""}
                  onMemberUpdated={() => {
                    fetchData();
                    refreshOrgs();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {canInvite && (
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                  <CardDescription>
                    Manage outstanding invitations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingInvites.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Mail className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                      <p>No pending invitations</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setInviteDialogOpen(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send an Invite
                      </Button>
                    </div>
                  ) : (
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
                                  : `Invited as ${invite.role}`}
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSent={fetchData}
      />
    </div>
  );
}
