"use client";

/**
 * Organization Switcher
 *
 * Dropdown component for switching between organizations.
 * Shows current org with logo, list of all orgs, and create new option.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/org-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Check,
  Plus,
  Loader2,
  Settings,
} from "lucide-react";
import { getRoleLabel } from "@/lib/org-types";

interface OrgSwitcherProps {
  className?: string;
  showCreateOption?: boolean;
  showSettingsButton?: boolean;
  onSettingsClick?: () => void;
}

export function OrgSwitcher({ className, showCreateOption = true, showSettingsButton = true, onSettingsClick }: OrgSwitcherProps) {
  const router = useRouter();
  const { org, organizations, loading, switchOrg } = useOrg();
  const [switching, setSwitching] = useState(false);

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === org?.id) return;

    try {
      setSwitching(true);
      await switchOrg(orgId);
      // Data refresh is handled by dashboard via orgSwitchCount dependency
      // No need for router.refresh() which causes a full page flash
    } catch (error) {
      console.error("Failed to switch org:", error);
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateOrg = () => {
    router.push("/onboarding?action=create");
  };

  if (loading) {
    return (
      <Button variant="ghost" className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-neutral-500">Loading...</span>
      </Button>
    );
  }

  if (!org) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={() => router.push("/onboarding")}
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Organization
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`flex items-center gap-2 ${className}`}
            disabled={switching}
          >
            {switching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-5 w-5 rounded object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-neutral-500" />
            )}
            <div className="flex flex-col items-start -space-y-0.5">
              <span className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Switch Organization</span>
              <span className="text-sm font-semibold text-neutral-900 max-w-[140px] truncate">{org.name}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wider">
            Organizations
          </DropdownMenuLabel>

          {organizations.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              onClick={() => handleSwitchOrg(organization.id)}
              className="flex items-center gap-3 cursor-pointer"
            >
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded bg-neutral-100 flex items-center justify-center">
                  <Building2 className="h-3 w-3 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{organization.name}</div>
                <div className="text-xs text-neutral-500">
                  {getRoleLabel(organization.role)}
                </div>
              </div>
              {organization.id === org.id && (
                <Check className="h-4 w-4 text-emerald-500" />
              )}
            </DropdownMenuItem>
          ))}

          {showCreateOption && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCreateOrg}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="h-6 w-6 rounded bg-neutral-100 flex items-center justify-center">
                  <Plus className="h-3 w-3 text-neutral-500" />
                </div>
                <span>Create Organization</span>
              </DropdownMenuItem>
            </>
          )}

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings button - calls callback or navigates to settings page */}
      {showSettingsButton && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-neutral-200 hover:bg-neutral-100"
          onClick={() => {
            if (onSettingsClick) {
              onSettingsClick();
            } else {
              router.push(`/org/${org.id}/settings`);
            }
          }}
        >
          <Settings className="h-4 w-4 text-neutral-600" />
        </Button>
      )}
    </div>
  );
}
