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
  ChevronDown,
  Plus,
  Settings,
  Users,
  Loader2,
} from "lucide-react";
import { getRoleLabel } from "@/lib/org-types";

interface OrgSwitcherProps {
  className?: string;
  showCreateOption?: boolean;
}

export function OrgSwitcher({ className, showCreateOption = true }: OrgSwitcherProps) {
  const router = useRouter();
  const { org, organizations, loading, switchOrg, isAdmin } = useOrg();
  const [switching, setSwitching] = useState(false);

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === org?.id) return;

    try {
      setSwitching(true);
      await switchOrg(orgId);
      // Refresh the page to load new org data
      router.refresh();
    } catch (error) {
      console.error("Failed to switch org:", error);
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateOrg = () => {
    router.push("/onboarding?action=create");
  };

  const handleManageMembers = () => {
    if (org) {
      router.push(`/org/${org.id}/members`);
    }
  };

  const handleOrgSettings = () => {
    if (org) {
      router.push(`/org/${org.id}/settings`);
    }
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
          <span className="max-w-[120px] truncate font-medium">{org.name}</span>
          <ChevronDown className="h-4 w-4 text-neutral-400" />
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

        {isAdmin() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wider">
              Manage
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleManageMembers}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Users className="h-4 w-4 text-neutral-500" />
              <span>Members</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleOrgSettings}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-neutral-500" />
              <span>Organization Settings</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
