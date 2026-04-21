/**
 * Individual Organization API Routes
 *
 * GET /api/orgs/[orgId] - Get organization details
 * PATCH /api/orgs/[orgId] - Update organization
 * DELETE /api/orgs/[orgId] - Delete organization (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { hasPermission } from "@/lib/org-types";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/orgs/[orgId]
 * Get organization details with current user's role.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Get project count
  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  return NextResponse.json({
    organization: orgContext.org,
    role: orgContext.role,
    membership: orgContext.membership,
    stats: {
      member_count: memberCount || 0,
      project_count: projectCount || 0,
    },
  });
}

/**
 * PATCH /api/orgs/[orgId]
 * Update organization settings. Requires org:update permission.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "org:update")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Slug is server-managed (generated on create, never exposed in the
  // UI) so any attempt to PATCH it is silently ignored — future-proofs
  // against stale clients.
  const { name, logo_url, settings } = body;
  const updates: Record<string, any> = {};

  // Validate and prepare updates
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Organization name must be at least 2 characters" }, { status: 400 });
    }
    updates.name = name.trim();
  }

  if (logo_url !== undefined) {
    updates.logo_url = logo_url || null;
  }

  if (settings !== undefined) {
    if (typeof settings !== "object") {
      return NextResponse.json({ error: "Settings must be an object" }, { status: 400 });
    }
    // Merge with existing settings
    updates.settings = { ...((orgContext.org.settings as object) || {}), ...settings };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Perform update
  const { data: updatedOrg, error } = await (supabase
    .from("organizations") as any)
    .update(updates)
    .eq("id", orgId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }

  return NextResponse.json({ organization: updatedOrg });
}

/**
 * DELETE /api/orgs/[orgId]
 * Soft-delete organization. Owner only.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "org:delete")) {
    return NextResponse.json({ error: "Only the organization owner can delete it" }, { status: 403 });
  }

  // Check if user has other orgs to switch to
  const { data: otherMemberships } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", orgContext.membership.user_id)
    .neq("org_id", orgId)
    .limit(1);

  // Soft delete the organization
  const { error } = await (supabase
    .from("organizations") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to delete organization:", error);
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
  }

  // If this was user's active org, switch to another
  const { data: userData } = await supabase
    .from("users")
    .select("active_org_id")
    .eq("id", orgContext.membership.user_id)
    .single();

  const userDataTyped = userData as { active_org_id: string | null } | null;
  const otherMembershipsTyped = otherMemberships as { org_id: string }[] | null;

  if (userDataTyped?.active_org_id === orgId && otherMembershipsTyped && otherMembershipsTyped.length > 0) {
    await (supabase.from("users") as any)
      .update({ active_org_id: otherMembershipsTyped[0].org_id })
      .eq("id", orgContext.membership.user_id);
  } else if (userDataTyped?.active_org_id === orgId) {
    await (supabase.from("users") as any)
      .update({ active_org_id: null })
      .eq("id", orgContext.membership.user_id);
  }

  return NextResponse.json({ success: true, message: "Organization deleted" });
}
