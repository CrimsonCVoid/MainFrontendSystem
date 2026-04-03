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

<<<<<<< HEAD
=======
  // Org switch tracking - increments each time org is switched successfully
  orgSwitchCount: number;

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
=======
  const [orgSwitchCount, setOrgSwitchCount] = useState(0);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

  const supabase = getSupabaseBrowserClient();

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
<<<<<<< HEAD
=======
    const fetchStart = performance.now();
    console.log("[OrgProvider] fetchOrganizations START", { timestamp: new Date().toISOString() });
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/orgs");
<<<<<<< HEAD

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, clear state
=======
      const fetchMs = Math.round(performance.now() - fetchStart);
      console.log(`[OrgProvider] fetchOrganizations response: ${response.status} in ${fetchMs}ms`);

      if (!response.ok) {
        if (response.status === 401) {
          console.log("[OrgProvider] 401 from /api/orgs — clearing state");
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
          setOrganizations([]);
          setActiveOrgId(null);
          return;
        }
        throw new Error("Failed to fetch organizations");
      }

      const data = await response.json();
<<<<<<< HEAD
      setOrganizations(data.organizations || []);
      setActiveOrgId(data.active_org_id || null);
    } catch (err) {
      console.error("Error fetching organizations:", err);
=======
      const totalMs = Math.round(performance.now() - fetchStart);
      console.log(`[OrgProvider] fetchOrganizations DONE in ${totalMs}ms —`, {
        orgCount: data.organizations?.length,
        activeOrgId: data.active_org_id,
      });
      setOrganizations(data.organizations || []);
      setActiveOrgId(data.active_org_id || null);
    } catch (err) {
      const totalMs = Math.round(performance.now() - fetchStart);
      console.error(`[OrgProvider] fetchOrganizations ERROR after ${totalMs}ms:`, err);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
=======

      // Increment switch count to notify consumers that data should be refreshed
      setOrgSwitchCount((prev) => prev + 1);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
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
=======
    console.log("[OrgProvider] MOUNTED — starting initial fetch", { timestamp: new Date().toISOString() });
    fetchOrganizations();

    // Subscribe to auth changes — include INITIAL_SESSION so that if
    // the mount fetch returns 401 (cookies not yet applied), the auth
    // event provides a retry once the session is resolved.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[OrgProvider] Auth event:", event, "session:", !!session, "userEmail:", session?.user?.email || "none");
      if (event === "SIGNED_OUT") {
        setOrganizations([]);
        setActiveOrgId(null);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        (event === "INITIAL_SESSION" && session)
      ) {
        console.log(`[OrgProvider] Auth event ${event} → re-fetching orgs`);
        fetchOrganizations();
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
      }
    });

    return () => {
<<<<<<< HEAD
=======
      console.log("[OrgProvider] UNMOUNTED — unsubscribing auth listener");
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
=======
    orgSwitchCount,
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
