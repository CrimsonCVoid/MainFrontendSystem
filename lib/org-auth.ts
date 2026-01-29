/**
 * Organization Authorization Utilities
 *
 * Server-side utilities for organization context and permission checking.
 * Used in API routes and server components.
 *
 * KEY CONCEPTS:
 * - getOrgContext(): Gets the authenticated user's current org membership
 * - requirePermission(): Validates user has permission for an action
 * - withOrgAuth(): Higher-order function for API route authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, type ServerClient } from "./supabase-server";
import {
  type OrgRole,
  type OrgAction,
  type OrgContext,
  type Organization,
  type OrganizationMember,
  hasPermission,
  canManageRole,
  ROLE_HIERARCHY,
} from "./org-types";

// ============================================
// CONTEXT FETCHING
// ============================================

/**
 * Get the current organization context for an authenticated request.
 * Returns org, membership, and role or null if not authenticated/no org.
 */
export async function getOrgContext(
  supabase: ServerClient,
  orgId?: string
): Promise<OrgContext | null> {
  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get user's active org if no specific org requested
  if (!orgId) {
    const { data: userData } = await supabase
      .from("users")
      .select("active_org_id")
      .eq("id", user.id)
      .single();

    orgId = (userData as { active_org_id: string | null } | null)?.active_org_id || undefined;
  }

  // If still no org, try to get user's first org
  if (!orgId) {
    const { data: firstMembership } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .limit(1)
      .single();

    orgId = (firstMembership as { org_id: string } | null)?.org_id;
  }

  if (!orgId) {
    return null;
  }

  // Get org and membership sequentially to avoid type inference issues
  const orgResult = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .is("deleted_at", null)
    .single();

  const membershipResult = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  const orgErr = (orgResult as any).error;
  const orgData = (orgResult as any).data;
  const membershipErr = (membershipResult as any).error;
  const membershipData = (membershipResult as any).data;

  if (orgErr || !orgData || membershipErr || !membershipData) {
    return null;
  }

  return {
    org: orgData as Organization,
    membership: membershipData as OrganizationMember,
    role: membershipData.role as OrgRole,
  };
}

/**
 * Get all organizations a user belongs to.
 */
export async function getUserOrganizations(supabase: ServerClient): Promise<Organization[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      `
      org_id,
      role,
      organizations!inner (*)
    `
    )
    .eq("user_id", user.id);

  if (!memberships) {
    return [];
  }

  return memberships
    .map((m: any) => m.organizations)
    .filter((org: any) => org && !org.deleted_at) as Organization[];
}

/**
 * Get user's membership for a specific organization.
 */
export async function getOrgMembership(
  supabase: ServerClient,
  orgId: string,
  userId: string
): Promise<OrganizationMember | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as OrganizationMember;
}

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Check if the current context has permission for an action.
 */
export function contextHasPermission(context: OrgContext, action: OrgAction): boolean {
  return hasPermission(context.role, action);
}

/**
 * Check if a role can manage another role (for role updates/removal).
 */
export function contextCanManageRole(context: OrgContext, targetRole: OrgRole): boolean {
  return canManageRole(context.role, targetRole);
}

/**
 * Check if user is owner of the organization.
 */
export function isOrgOwner(context: OrgContext): boolean {
  return context.role === "owner";
}

/**
 * Check if user is admin or owner of the organization.
 */
export function isOrgAdmin(context: OrgContext): boolean {
  return context.role === "owner" || context.role === "admin";
}

/**
 * Check if user can manage billing (owner or admin).
 */
export function canManageBilling(context: OrgContext): boolean {
  return hasPermission(context.role, "org:billing");
}

// ============================================
// API ROUTE HELPERS
// ============================================

export interface AuthenticatedRequest {
  req: NextRequest;
  supabase: ServerClient;
  userId: string;
}

export interface OrgAuthenticatedRequest extends AuthenticatedRequest {
  orgContext: OrgContext;
}

type AuthHandler = (params: AuthenticatedRequest) => Promise<NextResponse>;
type OrgAuthHandler = (params: OrgAuthenticatedRequest) => Promise<NextResponse>;

/**
 * Wrapper for API routes that require authentication.
 * Provides supabase client and userId to handler.
 */
export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler({ req, supabase, userId: user.id });
  };
}

/**
 * Wrapper for API routes that require org authentication and permission.
 * Provides supabase client, userId, and orgContext to handler.
 *
 * @param requiredAction - Optional action that user must have permission for
 * @param handler - The route handler function
 *
 * Usage:
 * export const GET = withOrgAuth("projects:read", async ({ req, supabase, userId, orgContext }) => {
 *   // Handler code here
 * });
 */
export function withOrgAuth(requiredAction: OrgAction | null, handler: OrgAuthHandler) {
  return async (
    req: NextRequest,
    { params }: { params?: Promise<{ orgId?: string }> } = {}
  ): Promise<NextResponse> => {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orgId from URL params, query string, or request body
    let orgId: string | undefined;

    // Try params first
    if (params) {
      const resolvedParams = await params;
      orgId = resolvedParams?.orgId;
    }

    // Try query string
    if (!orgId) {
      const url = new URL(req.url);
      orgId = url.searchParams.get("orgId") || undefined;
    }

    // Get org context
    const orgContext = await getOrgContext(supabase, orgId);

    if (!orgContext) {
      return NextResponse.json({ error: "Organization not found or access denied" }, { status: 403 });
    }

    // Check permission if required
    if (requiredAction && !hasPermission(orgContext.role, requiredAction)) {
      return NextResponse.json(
        { error: "Insufficient permissions", required: requiredAction },
        { status: 403 }
      );
    }

    return handler({ req, supabase, userId: user.id, orgContext });
  };
}

// ============================================
// ORGANIZATION SWITCHING
// ============================================

/**
 * Switch user's active organization.
 * Validates that user is a member of the target org.
 */
export async function switchActiveOrg(
  supabase: ServerClient,
  userId: string,
  newOrgId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify membership
  const membership = await getOrgMembership(supabase, newOrgId, userId);

  if (!membership) {
    return { success: false, error: "Not a member of this organization" };
  }

  // Update user's active org
  const { error } = await (supabase
    .from("users") as any)
    .update({ active_org_id: newOrgId })
    .eq("id", userId);

  if (error) {
    return { success: false, error: "Failed to switch organization" };
  }

  return { success: true };
}

// ============================================
// DEFAULT ORG CREATION
// ============================================

/**
 * Create a default organization for a new user.
 * Called during user signup/first login.
 * Uses the SECURITY DEFINER create_organization function to bypass RLS.
 */
export async function createDefaultOrg(
  supabase: ServerClient,
  userId: string,
  userEmail: string
): Promise<{ orgId: string } | { error: string }> {
  // Generate slug from email prefix
  const emailPrefix = userEmail.split("@")[0] || "user";
  let baseSlug = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (baseSlug.length < 3) {
    baseSlug = `org-${baseSlug}`;
  }

  // Find unique slug
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .single();

    if (!existing) break;

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  // Create organization using the SECURITY DEFINER function
  // This bypasses RLS and creates org + owner membership atomically
  const { data: orgId, error: orgError } = await supabase.rpc("create_organization" as any, {
    p_user_id: userId,
    p_name: "My Company",
    p_slug: slug,
    p_logo_url: null,
  } as any);

  if (orgError || !orgId) {
    return { error: orgError?.message || "Failed to create organization" };
  }

  return { orgId };
}

/**
 * Ensure user has at least one organization.
 * Creates default org if needed.
 */
export async function ensureUserHasOrg(
  supabase: ServerClient,
  userId: string,
  userEmail: string
): Promise<string | null> {
  // Check if user already has an org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const membershipData = membership as { org_id: string } | null;
  if (membershipData?.org_id) {
    // Make sure user has active_org_id set
    const { data: user } = await supabase
      .from("users")
      .select("active_org_id")
      .eq("id", userId)
      .single();

    const userData = user as { active_org_id: string | null } | null;
    if (!userData?.active_org_id) {
      await (supabase.from("users") as any).update({ active_org_id: membershipData.org_id }).eq("id", userId);
    }

    return membershipData.org_id;
  }

  // Create default org
  const result = await createDefaultOrg(supabase, userId, userEmail);

  if ("error" in result) {
    console.error("Failed to create default org:", result.error);
    return null;
  }

  return result.orgId;
}
