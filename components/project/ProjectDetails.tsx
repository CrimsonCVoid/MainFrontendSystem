"use client";

import { useState } from "react";
import { Calendar, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/database.types";

type ProjectRow = Tables<"projects">;

interface ProjectDetailsProps {
  project: ProjectRow;
  onUpdate: (updates: Partial<ProjectRow>) => Promise<void>;
  isUpdating?: boolean;
}

/**
 * ProjectDetails Component
 *
 * Beautiful, Apple-style project information panel.
 * Features:
 * - Inline editing for project name and description
 * - Displays creation and update timestamps
 * - Smooth animations and transitions
 * - Real-time save status indicators
 *
 * @param project - Current project data
 * @param onUpdate - Callback when project details are updated
 * @param isUpdating - Loading state during updates
 */
export default function ProjectDetails({
  project,
  onUpdate,
  isUpdating = false,
}: ProjectDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedDescription, setEditedDescription] = useState(
    project.description || ""
  );

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    if (!editedName.trim()) {
      alert("Project name cannot be empty");
      return;
    }

    await onUpdate({
      name: editedName.trim(),
      description: editedDescription.trim() || null,
    });

    setIsEditing(false);
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    setEditedName(project.name);
    setEditedDescription(project.description || "");
    setIsEditing(false);
  };

  /**
   * Format date to readable string
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-neutral-200">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-name" className="text-xs text-neutral-600">
                  Project Name
                </Label>
                <Input
                  id="edit-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="mt-1 text-lg font-semibold"
                  placeholder="Enter project name..."
                  autoFocus
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-description"
                  className="text-xs text-neutral-600"
                >
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Add project details..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  <Save className="mr-2 h-3 w-3" />
                  {isUpdating ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="mr-2 h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-neutral-900">
                {project.name}
              </h2>
              {project.description && (
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {project.description}
                </p>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex-shrink-0"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Metadata */}
      {!isEditing && (
        <div className="space-y-3 border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {formatDate(project.created_at)}</span>
          </div>
          {project.updated_at !== project.created_at && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>Updated {formatDate(project.updated_at)}</span>
            </div>
          )}

          {/* Project ID (for developers) */}
          <div className="mt-4 rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-600 mb-1">
              Project ID
            </p>
            <code className="text-xs font-mono text-neutral-900 break-all">
              {project.id}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
