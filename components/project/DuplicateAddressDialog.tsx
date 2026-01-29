"use client";

/**
 * Duplicate Address Dialog
 *
 * Shows a warning when a user tries to set an address that already
 * exists on another project in the organization. Allows them to
 * proceed anyway or cancel.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, User, FileText } from "lucide-react";
import type { DuplicateProjectResult } from "@/lib/projects";

interface DuplicateAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicate: DuplicateProjectResult | null;
  address: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateAddressDialog({
  open,
  onOpenChange,
  duplicate,
  address,
  onConfirm,
  onCancel,
}: DuplicateAddressDialogProps) {
  if (!duplicate) return null;

  const creatorName = duplicate.creator.full_name || duplicate.creator.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">
            Duplicate Address Detected
          </DialogTitle>
          <DialogDescription className="text-center">
            A project already exists at this address in your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Address */}
          <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <MapPin className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-neutral-900">Address</p>
              <p className="text-sm text-neutral-600">{address}</p>
            </div>
          </div>

          {/* Existing Project Info */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800">Existing Project</p>

            <div className="flex items-center gap-2 text-sm text-amber-700">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{duplicate.project.name}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-amber-700">
              <User className="h-4 w-4 flex-shrink-0" />
              <span>Created by {creatorName}</span>
            </div>

            {duplicate.project.created_at && (
              <p className="text-xs text-amber-600">
                Created on {new Date(duplicate.project.created_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Are you sure you want to use this address? This may create a duplicate project.
          </p>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="sm:w-32"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            className="sm:w-32 bg-amber-600 hover:bg-amber-700"
          >
            Use Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
