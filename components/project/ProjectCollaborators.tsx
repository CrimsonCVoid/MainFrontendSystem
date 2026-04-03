"use client";

import { useState, useEffect } from "react";
import { Users, Plus, X, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  user: User;
}

interface OrgMember {
  id: string;
  user_id: string;
  user: User;
}

interface ProjectCollaboratorsProps {
  projectId: string;
  projectOwnerId: string;
  organizationId: string;
  organizationName?: string;
  organizationPlan?: string;  // "free" | "trial" | "paid" | "enterprise"
  currentUserId: string;
}

export function ProjectCollaborators({
  projectId,
  projectOwnerId,
  organizationId,
  organizationName,
  organizationPlan,
  currentUserId,
}: ProjectCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("collaborator");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const isOwner = currentUserId === projectOwnerId;
  // Team feature: available when organization has more than 1 member
  const hasTeam = orgMembers.length > 1;
  const canUseCollaborators = hasTeam;

  // Fetch collaborators
  useEffect(() => {
    fetchCollaborators();
    fetchOrgMembers();
  }, [projectId, organizationId]);

  async function fetchCollaborators() {
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators || []);
      }
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrgMembers() {
    try {
      const res = await fetch(`/api/orgs/${organizationId}/members`);
      if (res.ok) {
        const data = await res.json();
        setOrgMembers(data.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch org members:", error);
    }
  }

  async function handleAddCollaborator() {
    if (!selectedUserId) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUserId,
          role: selectedRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCollaborators((prev) => [...prev, data.collaborator]);
        setAddDialogOpen(false);
        setSelectedUserId("");
        setSelectedRole("collaborator");
      } else {
        const error = await res.json();
        console.error("Failed to add collaborator:", error);
      }
    } catch (error) {
      console.error("Failed to add collaborator:", error);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveCollaborator(collaboratorId: string) {
    setRemoving(collaboratorId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      }
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
    } finally {
      setRemoving(null);
    }
  }

  // Get available members to add (not owner, not already collaborators)
  const availableMembers = orgMembers.filter(
    (m) =>
      m.user_id !== projectOwnerId &&
      !collaborators.some((c) => c.user_id === m.user_id)
  );

  return (
    <div className="rounded-xl border border-indigo-200/50 overflow-hidden shadow-sm relative">
      {/* Team feature overlay - shown when organization has only 1 member */}
      {!loading && !hasTeam && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Team Feature</h3>
          <p className="text-sm text-neutral-600 text-center max-w-xs mt-1 px-4">
            Project collaboration requires an organization with multiple members. Invite team members to enable this feature.
          </p>
          <Button
            className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            onClick={() => window.location.href = `/org/${organizationId}/members`}
          >
            Invite Team Members
          </Button>
        </div>
      )}

      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Collaborators</h2>
              <p className="text-sm text-indigo-100">
                {collaborators.length} team member{collaborators.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {isOwner && canUseCollaborators && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Collaborator</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Select Team Member
                    </label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-neutral-500">
                            No available team members
                          </div>
                        ) : (
                          availableMembers.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                                  {(member.user.full_name || member.user.email)?.[0]?.toUpperCase()}
                                </div>
                                <span>{member.user.full_name || member.user.email}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Role
                    </label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collaborator">
                          <div>
                            <span className="font-medium">Collaborator</span>
                            <p className="text-xs text-neutral-500">Can edit project details</p>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div>
                            <span className="font-medium">Viewer</span>
                            <p className="text-xs text-neutral-500">Read-only access</p>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleAddCollaborator}
                    disabled={!selectedUserId || adding}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Collaborator
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/30 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : !canUseCollaborators ? (
          <div className="text-center py-6 opacity-50">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-600">Team feature</p>
            <p className="text-xs text-neutral-500 mt-1">
              Invite team members to collaborate
            </p>
          </div>
        ) : collaborators.length === 0 ? (
          <div className="text-center py-6">
            <UserPlus className="w-10 h-10 text-indigo-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-600">No collaborators yet</p>
            <p className="text-xs text-neutral-500 mt-1">
              Add team members to work together on this project
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-sm font-medium text-white">
                    {(collab.user.full_name || collab.user.email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {collab.user.full_name || collab.user.email}
                    </p>
                    <p className="text-xs text-neutral-500 capitalize">{collab.role}</p>
                  </div>
                </div>

                {(isOwner || collab.user_id === currentUserId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCollaborator(collab.id)}
                    disabled={removing === collab.id}
                    className="text-neutral-400 hover:text-red-500 hover:bg-red-50"
                  >
                    {removing === collab.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
