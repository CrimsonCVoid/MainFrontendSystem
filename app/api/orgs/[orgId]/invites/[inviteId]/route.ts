/**
 * Individual Invite API Routes
 *
 * DELETE /api/orgs/[orgId]/invites/[inviteId] - Revoke an invite
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { hasPermission } from "@/lib/org-types";

interface RouteContext {
  params: Promise<{ orgId: string; inviteId: string }>;
}

/**
 * DELETE /api/orgs/[orgId]/invites/[inviteId]
 * Revoke an invite (marks it as revoked, doesn't delete).
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { orgId, inviteId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "members:invite")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Get the invite
  const { data: inviteData } = await supabase
    .from("org_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("org_id", orgId)
    .single();

  if (!inviteData) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = inviteData as { revoked_at: string | null; accepted_at: string | null };

  if (invite.revoked_at) {
    return NextResponse.json({ error: "Invite is already revoked" }, { status: 400 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: "Invite has already been accepted" }, { status: 400 });
  }

  // Revoke the invite
  const { error } = await (supabase
    .from("org_invites") as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    console.error("Failed to revoke invite:", error);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Invite revoked" });
}
