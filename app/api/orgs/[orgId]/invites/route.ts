/**
 * Organization Invites API Routes
 *
 * GET /api/orgs/[orgId]/invites - List pending invites
 * POST /api/orgs/[orgId]/invites - Create a new invite
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { hasPermission, canManageRole, type OrgRole, type InviteType } from "@/lib/org-types";
import crypto from "crypto";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * Generate a secure random token for invites.
 */
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * GET /api/orgs/[orgId]/invites
 * List all pending invites for an organization.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "members:invite")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Get all invites (including expired/revoked for history)
  const { data: invites, error } = await supabase
    .from("org_invites")
    .select(
      `
      *,
      invited_by_user:users!org_invites_invited_by_fkey (
        id,
        email,
        full_name
      )
    `
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch invites:", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }

  // Categorize invites
  const now = new Date();
  const pendingInvites = (invites || []).filter((i: any) => {
    return !i.revoked_at && !i.accepted_at && new Date(i.expires_at) > now && i.use_count < i.max_uses;
  });

  const expiredOrUsedInvites = (invites || []).filter((i: any) => {
    return i.revoked_at || i.accepted_at || new Date(i.expires_at) <= now || i.use_count >= i.max_uses;
  });

  return NextResponse.json({
    pending: pendingInvites,
    history: expiredOrUsedInvites,
  });
}

/**
 * POST /api/orgs/[orgId]/invites
 * Create a new invite (email, link, or domain rule).
 *
 * Body: {
 *   email?: string,       // Required for email type
 *   role: OrgRole,        // Required: admin, member, or viewer
 *   invite_type: InviteType, // Required: email, link, or domain
 *   expires_in_days?: number, // Default 7
 *   max_uses?: number     // Default 1, higher for link invites
 * }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  if (!hasPermission(orgContext.role, "members:invite")) {
    return NextResponse.json({ error: "Insufficient permissions to create invites" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, role, invite_type, expires_in_days = 7, max_uses = 1 } = body;

  // Validate role
  const validRoles: OrgRole[] = ["admin", "member", "viewer"];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, member, or viewer" }, { status: 400 });
  }

  // Check if actor can assign this role
  if (!canManageRole(orgContext.role, role)) {
    return NextResponse.json({ error: "You cannot invite with this role" }, { status: 403 });
  }

  // Validate invite type
  const validTypes: InviteType[] = ["email", "link", "domain"];
  if (!invite_type || !validTypes.includes(invite_type)) {
    return NextResponse.json({ error: "Invalid invite type. Must be email, link, or domain" }, { status: 400 });
  }

  // Email-specific validation
  if (invite_type === "email") {
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required for email invites" }, { status: 400 });
    }

    // Check if already a member
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single();

    const existingUserTyped = existingUser as { id: string } | null;
    if (existingUserTyped) {
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", existingUserTyped.id)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: "This user is already a member" }, { status: 400 });
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from("org_invites")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", email)
      .is("revoked_at", null)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "An active invite already exists for this email" }, { status: 400 });
    }
  }

  // Domain type validation
  if (invite_type === "domain") {
    return NextResponse.json(
      { error: "Domain rules should be created via the domain rules endpoint" },
      { status: 400 }
    );
  }

  // Generate token and expiration
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Math.min(Math.max(expires_in_days, 1), 30)); // 1-30 days

  // Create invite
  const { data: invite, error } = await (supabase
    .from("org_invites") as any)
    .insert({
      org_id: orgId,
      email: invite_type === "email" ? email : null,
      token,
      role,
      invite_type,
      invited_by: orgContext.membership.user_id,
      expires_at: expiresAt.toISOString(),
      max_uses: invite_type === "link" ? Math.min(Math.max(max_uses, 1), 100) : 1,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  // Generate invite URL
  const baseUrl = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  return NextResponse.json(
    {
      invite: {
        ...(invite || {}),
        url: inviteUrl,
      },
    },
    { status: 201 }
  );
}
