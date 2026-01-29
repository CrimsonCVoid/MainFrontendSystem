"use client";

/**
 * Organization Context Provider
 *
 * Provides organization context to the entire application.
 * Handles org switching, permissions, and org-scoped data.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  type Organization,
  type OrgRole,
  type OrgAction,
  hasPermission as checkPermission,
} from "@/lib/org-types";
import {
  type SFPool,
  calculatePoolState,
  getPoolUsagePercent,
  getPoolStatusColor,
  getPoolStatusMessage,
  hasEnoughSF,
  formatSF,
} from "@/lib/sf-pool";

interface OrgWithRole extends Organization {
  role: OrgRole;
  is_active: boolean;
}

interface OrgContextValue {
  // Current organization
  org: OrgWithRole | null;
  role: OrgRole | null;
  organizations: OrgWithRole[];

  // SF Pool
  pool: SFPool;
  poolPercent: number;
  poolStatusColor: "green" | "yellow" | "red";
  poolStatusMessage: string;

  // Loading state
  loading: boolean;
  error: string | null;

  // Actions
  switchOrg: (orgId: string) => Promise<void>;
  refreshOrgs: () => Promise<void>;
  hasPermission: (action: OrgAction) => boolean;
  canManageBilling: () => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;

  // SF Pool helpers
  hasEnoughSFForProject: (requiredSF: number) => boolean;
  formatPoolSF: (amount: number) => string;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

interface OrgProviderProps {
  children: React.ReactNode;
}

export function OrgProvider({ children }: OrgProviderProps) {
  const [organizations, setOrganizations] = useState<OrgWithRole[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/orgs");

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, clear state
          setOrganizations([]);
          setActiveOrgId(null);
          return;
        }
        throw new Error("Failed to fetch organizations");
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setActiveOrgId(data.active_org_id || null);
    } catch (err) {
      console.error("Error fetching organizations:", err);
      setError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch active organization
  const switchOrg = useCallback(async (orgId: string) => {
    try {
      setError(null);

      const response = await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to switch organization");
      }

      setActiveOrgId(orgId);

      // Update is_active flag in organizations list
      setOrganizations((prev) =>
        prev.map((org) => ({
          ...org,
          is_active: org.id === orgId,
        }))
      );
    } catch (err) {
      console.error("Error switching organization:", err);
      setError(err instanceof Error ? err.message : "Failed to switch organization");
      throw err;
    }
  }, []);

  // Get current organization
  const currentOrg = organizations.find((org) => org.id === activeOrgId) || null;
  const currentRole = currentOrg?.role || null;

  // Calculate SF pool state
  const pool = calculatePoolState(
    currentOrg?.sf_pool_total ?? null,
    currentOrg?.sf_pool_used ?? null,
    currentOrg?.sf_pool_updated_at ?? null
  );
  const poolPercent = getPoolUsagePercent(pool);
  const poolStatusColor = getPoolStatusColor(pool);
  const poolStatusMessage = getPoolStatusMessage(pool);

  // SF Pool helpers
  const hasEnoughSFForProject = useCallback(
    (requiredSF: number): boolean => {
      return hasEnoughSF(pool, requiredSF);
    },
    [pool]
  );

  const formatPoolSF = useCallback((amount: number): string => {
    return formatSF(amount);
  }, []);

  // Permission helpers
  const hasPermission = useCallback(
    (action: OrgAction): boolean => {
      if (!currentRole) return false;
      return checkPermission(currentRole, action);
    },
    [currentRole]
  );

  const canManageBilling = useCallback(() => {
    return hasPermission("org:billing");
  }, [hasPermission]);

  const isOwner = useCallback(() => {
    return currentRole === "owner";
  }, [currentRole]);

  const isAdmin = useCallback(() => {
    return currentRole === "owner" || currentRole === "admin";
  }, [currentRole]);

  // Fetch orgs on mount and auth changes
  useEffect(() => {
    fetchOrganizations();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchOrganizations();
      } else if (event === "SIGNED_OUT") {
        setOrganizations([]);
        setActiveOrgId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrganizations, supabase.auth]);

  const contextValue: OrgContextValue = {
    org: currentOrg,
    role: currentRole,
    organizations,
    // SF Pool
    pool,
    poolPercent,
    poolStatusColor,
    poolStatusMessage,
    // State
    loading,
    error,
    // Actions
    switchOrg,
    refreshOrgs: fetchOrganizations,
    hasPermission,
    canManageBilling,
    isOwner,
    isAdmin,
    // SF Pool helpers
    hasEnoughSFForProject,
    formatPoolSF,
  };

  return <OrgContext.Provider value={contextValue}>{children}</OrgContext.Provider>;
}

/**
 * Hook to access organization context.
 * Must be used within an OrgProvider.
 */
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);

  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }

  return context;
}

/**
 * Hook to check if user has a specific permission.
 */
export function useHasPermission(action: OrgAction): boolean {
  const { hasPermission } = useOrg();
  return hasPermission(action);
}

/**
 * Hook to get current organization ID.
 * Returns null if no org is active.
 */
export function useOrgId(): string | null {
  const { org } = useOrg();
  return org?.id || null;
}

/**
 * Hook to get SF pool data for the current organization.
 */
export function useSFPool(): {
  pool: SFPool;
  percent: number;
  statusColor: "green" | "yellow" | "red";
  statusMessage: string;
  hasEnough: (requiredSF: number) => boolean;
  format: (amount: number) => string;
} {
  const { pool, poolPercent, poolStatusColor, poolStatusMessage, hasEnoughSFForProject, formatPoolSF } =
    useOrg();
  return {
    pool,
    percent: poolPercent,
    statusColor: poolStatusColor,
    statusMessage: poolStatusMessage,
    hasEnough: hasEnoughSFForProject,
    format: formatPoolSF,
  };
}
