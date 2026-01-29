"use client";

/**
 * Members Table
 *
 * Displays organization members with role management and removal actions.
 */

import { useState } from "react";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MoreHorizontal, Trash2, Shield, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type OrgRole,
  type OrganizationMemberWithUser,
  getRoleLabel,
  canManageRole,
} from "@/lib/org-types";

interface MembersTableProps {
  members: OrganizationMemberWithUser[];
  currentUserId: string;
  onMemberUpdated?: () => void;
}

export function MembersTable({
  members,
  currentUserId,
  onMemberUpdated,
}: MembersTableProps) {
  const { org, role: currentRole } = useOrg();
  const [updating, setUpdating] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<OrganizationMemberWithUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, userId: string, newRole: OrgRole) => {
    if (!org) return;

    try {
      setUpdating(memberId);
      setError(null);

      const response = await fetch(`/api/orgs/${org.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      onMemberUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!org || !removingMember) return;

    try {
      setUpdating(removingMember.id);
      setError(null);

      const response = await fetch(`/api/orgs/${org.id}/members/${removingMember.user_id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setRemovingMember(null);
      onMemberUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setUpdating(null);
    }
  };

  const canManage = (targetRole: OrgRole) => {
    if (!currentRole) return false;
    return canManageRole(currentRole, targetRole);
  };

  const getAvailableRoles = (): OrgRole[] => {
    if (currentRole === "owner") {
      return ["owner", "admin", "member", "viewer"];
    }
    if (currentRole === "admin") {
      return ["member", "viewer"];
    }
    return [];
  };

  // Filter out members with null users
  const validMembers = members.filter((m) => m.user !== null);

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="border rounded-lg divide-y">
        {validMembers.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const canModify = !isCurrentUser && canManage(member.role as OrgRole);
          const user = member.user!; // Safe after filter

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-neutral-600">
                      {(user.full_name || user.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">
                    {user.full_name || "Unnamed User"}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-neutral-500">(You)</span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-500">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {updating === member.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                ) : canModify ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.id, member.user_id, value as OrgRole)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles().map((r) => (
                        <SelectItem key={r} value={r}>
                          {getRoleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-100">
                    {member.role === "owner" && (
                      <Shield className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-sm font-medium">
                      {getRoleLabel(member.role as OrgRole)}
                    </span>
                  </div>
                )}

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setRemovingMember(member)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from organization
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}

        {validMembers.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No members found
          </div>
        )}
      </div>

      {/* Remove member confirmation dialog */}
      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {removingMember?.user?.full_name || removingMember?.user?.email || "this member"}
              </strong>{" "}
              from {org?.name}? They will lose access to all organization
              projects and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={updating === removingMember?.id}
            >
              {updating === removingMember?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
