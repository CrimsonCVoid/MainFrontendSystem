/**
 * Individual Member API Routes
 *
 * PATCH /api/orgs/[orgId]/members/[userId] - Update member role
 * DELETE /api/orgs/[orgId]/members/[userId] - Remove member
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext, getOrgMembership } from "@/lib/org-auth";
import { hasPermission, canManageRole, type OrgRole } from "@/lib/org-types";

interface RouteContext {
  params: Promise<{ orgId: string; userId: string }>;
}

/**
 * PATCH /api/orgs/[orgId]/members/[userId]
 * Update a member's role.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { orgId, userId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "members:update")) {
    return NextResponse.json({ error: "Insufficient permissions to update members" }, { status: 403 });
  }

  // Get target membership
  const targetMembership = await getOrgMembership(supabase, orgId, userId);

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role: newRole } = body;

  const validRoles: OrgRole[] = ["owner", "admin", "member", "viewer"];
  if (!newRole || !validRoles.includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Can't modify your own role
  if (userId === orgContext.membership.user_id) {
    return NextResponse.json({ error: "You cannot modify your own role" }, { status: 400 });
  }

  // Check if actor can manage the target's current role
  if (!canManageRole(orgContext.role, targetMembership.role as OrgRole)) {
    return NextResponse.json({ error: "You cannot modify this member's role" }, { status: 403 });
  }

  // Check if actor can assign the new role
  if (!canManageRole(orgContext.role, newRole)) {
    return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 });
  }

  // Special handling for owner transfers
  if (newRole === "owner") {
    if (orgContext.role !== "owner") {
      return NextResponse.json({ error: "Only owners can transfer ownership" }, { status: 403 });
    }

    // Transfer ownership: demote current owner to admin
    const { error: demoteError } = await (supabase
      .from("organization_members") as any)
      .update({ role: "admin" })
      .eq("org_id", orgId)
      .eq("user_id", orgContext.membership.user_id);

    if (demoteError) {
      console.error("Failed to demote current owner:", demoteError);
      return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
    }

    // Update billing owner
    await (supabase
      .from("organizations") as any)
      .update({ billing_owner_id: userId })
      .eq("id", orgId);
  }

  // Update the target member's role
  const { data: updatedMembership, error } = await (supabase
    .from("organization_members") as any)
    .update({ role: newRole })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }

  return NextResponse.json({ member: updatedMembership });
}

/**
 * DELETE /api/orgs/[orgId]/members/[userId]
 * Remove a member from the organization.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { orgId, userId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  // Allow users to remove themselves (leave org)
  const isSelf = userId === orgContext.membership.user_id;

  if (!isSelf && !hasPermission(orgContext.role, "members:remove")) {
    return NextResponse.json({ error: "Insufficient permissions to remove members" }, { status: 403 });
  }

  // Get target membership
  const targetMembership = await getOrgMembership(supabase, orgId, userId);

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Owners can't leave/be removed unless there's another owner
  if (targetMembership.role === "owner") {
    // Check for other owners
    const { count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "owner");

    if (!count || count <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the only owner. Transfer ownership first." },
        { status: 400 }
      );
    }
  }

  // Non-self removal: check if actor can manage target
  if (!isSelf && !canManageRole(orgContext.role, targetMembership.role as OrgRole)) {
    return NextResponse.json({ error: "You cannot remove this member" }, { status: 403 });
  }

  // Remove membership
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  // If user left and this was their active org, clear it
  if (isSelf) {
    const { data: userData } = await supabase
      .from("users")
      .select("active_org_id")
      .eq("id", userId)
      .single();

    const userDataTyped = userData as { active_org_id: string | null } | null;
    if (userDataTyped?.active_org_id === orgId) {
      // Find another org for them
      const { data: otherMembership } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", userId)
        .limit(1)
        .single();

      const otherMembershipTyped = otherMembership as { org_id: string } | null;
      await (supabase.from("users") as any)
        .update({ active_org_id: otherMembershipTyped?.org_id || null })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ success: true, message: "Member removed" });
}
