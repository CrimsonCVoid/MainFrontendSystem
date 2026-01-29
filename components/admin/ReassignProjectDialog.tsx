"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { reassignProject, getOrgMembersForReassignment, type ProjectWithCreator } from "@/lib/projects";
import { logProjectReassigned } from "@/lib/activity-log";
import { CreatorAvatar } from "@/components/project/CreatorAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  UserCog,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface OrgMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface ReassignProjectDialogProps {
  project: ProjectWithCreator;
  orgId: string;
  currentUserId: string;
  onClose: () => void;
  onReassigned: () => void;
}

/**
 * ReassignProjectDialog - Modal for admin to transfer project ownership
 *
 * Features:
 * - Shows current owner with avatar
 * - Dropdown to select new owner from org members
 * - Visual preview of the ownership change
 * - Logs the reassignment to activity log
 */
export function ReassignProjectDialog({
  project,
  orgId,
  currentUserId,
  onClose,
  onReassigned,
}: ReassignProjectDialogProps) {
  const supabase = getSupabaseBrowserClient();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load org members
  useEffect(() => {
    async function loadMembers() {
      const orgMembers = await getOrgMembersForReassignment(orgId, supabase);
      // Filter out current owner
      const filteredMembers = orgMembers.filter((m) => m.user_id !== project.user_id);
      setMembers(filteredMembers);
      setLoading(false);
    }
    loadMembers();
  }, [orgId, project.user_id, supabase]);

  const selectedMember = members.find((m) => m.user_id === selectedMemberId);

  async function handleReassign() {
    if (!selectedMemberId || !selectedMember) return;

    setSubmitting(true);
    setError(null);

    try {
      // Perform the reassignment
      await reassignProject(project.id, selectedMemberId, supabase);

      // Log the activity
      await logProjectReassigned(supabase, {
        orgId,
        reassignedBy: currentUserId,
        projectId: project.id,
        projectName: project.name,
        previousOwnerId: project.user_id,
        previousOwnerEmail: project.creator?.email || "Unknown",
        newOwnerId: selectedMemberId,
        newOwnerEmail: selectedMember.email,
      });

      setSuccess(true);

      // Close after brief delay to show success
      setTimeout(() => {
        onReassigned();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserCog className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">Reassign Project</h2>
                <p className="text-sm text-neutral-500">Transfer ownership to another team member</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Project Info */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">Project</p>
              <p className="font-semibold text-neutral-900">{project.name}</p>
              {project.address && (
                <p className="text-sm text-neutral-600">
                  {project.city}, {project.state}
                </p>
              )}
            </div>

            {/* Transfer Preview */}
            <div className="flex items-center gap-4">
              {/* Current Owner */}
              <div className="flex-1 text-center">
                <p className="text-xs text-neutral-500 mb-2">Current Owner</p>
                <div className="flex flex-col items-center gap-2">
                  {project.creator ? (
                    <>
                      <CreatorAvatar creator={project.creator} size="lg" />
                      <div className="text-sm">
                        <p className="font-medium text-neutral-900">
                          {project.creator.full_name || project.creator.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-neutral-500">{project.creator.email}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                      <span className="text-neutral-400">?</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <ArrowRight className="h-6 w-6 text-neutral-300" />
              </div>

              {/* New Owner */}
              <div className="flex-1 text-center">
                <p className="text-xs text-neutral-500 mb-2">New Owner</p>
                <div className="flex flex-col items-center gap-2">
                  {selectedMember ? (
                    <>
                      <CreatorAvatar
                        creator={{
                          id: selectedMember.user_id,
                          full_name: selectedMember.full_name,
                          email: selectedMember.email,
                          avatar_url: null,
                        }}
                        size="lg"
                      />
                      <div className="text-sm">
                        <p className="font-medium text-neutral-900">
                          {selectedMember.full_name || selectedMember.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-neutral-500">{selectedMember.email}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center">
                      <span className="text-neutral-400 text-lg">?</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Member Selection */}
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 text-neutral-400 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-neutral-500">
                No other team members available
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select New Owner
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting || success}
                >
                  <option value="">Choose a team member...</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email.split("@")[0]} ({member.email}) - {member.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Project successfully reassigned!
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedMemberId || submitting || success}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Done!
                </>
              ) : (
                "Reassign Project"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
