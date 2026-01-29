/**
 * Organization Members API Routes
 *
 * GET /api/orgs/[orgId]/members - List members
 * POST /api/orgs/[orgId]/members - Add a member directly (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { hasPermission, canManageRole, type OrgRole } from "@/lib/org-types";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/orgs/[orgId]/members
 * List all members of an organization with user details.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "members:read")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Get members with user details
  // Use explicit relationship name to disambiguate between user_id and invited_by foreign keys
  const { data: members, error } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      org_id,
      user_id,
      role,
      invited_by,
      joined_at,
      updated_at,
      users!organization_members_user_id_fkey (
        id,
        email,
        full_name,
        avatar_url
      )
    `
    )
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  // Transform to include user data inline
  const transformedMembers = (members || []).map((m: any) => ({
    id: m.id,
    org_id: m.org_id,
    user_id: m.user_id,
    role: m.role,
    invited_by: m.invited_by,
    joined_at: m.joined_at,
    updated_at: m.updated_at,
    user: m.users,
  }));

  return NextResponse.json({
    members: transformedMembers,
    current_user_role: orgContext.role,
  });
}

/**
 * POST /api/orgs/[orgId]/members
 * Add a user directly as a member (requires members:invite permission).
 * Body: { user_id: string, role: OrgRole }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "members:invite")) {
    return NextResponse.json({ error: "Insufficient permissions to add members" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { user_id, role } = body;

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const validRoles: OrgRole[] = ["admin", "member", "viewer"];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, member, or viewer" }, { status: 400 });
  }

  // Can't add someone as owner
  if (role === "owner") {
    return NextResponse.json({ error: "Cannot add members as owner" }, { status: 400 });
  }

  // Check if actor can assign this role
  if (!canManageRole(orgContext.role, role)) {
    return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 });
  }

  // Check if user exists
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", user_id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user_id)
    .single();

  if (existingMembership) {
    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
  }

  // Add membership
  const { data: membership, error } = await (supabase
    .from("organization_members") as any)
    .insert({
      org_id: orgId,
      user_id: user_id,
      role: role,
      invited_by: orgContext.membership.user_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }

  return NextResponse.json(
    {
      member: {
        ...(membership || {}),
        user: targetUser,
      },
    },
    { status: 201 }
  );
}
