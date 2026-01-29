/**
 * Public Invite API Routes
 *
 * GET /api/invites/[token] - Get invite details (public)
 * POST /api/invites/[token]/accept - Accept an invite (requires auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/invites/[token]
 * Get invite details for the accept page.
 * This is a public endpoint - no auth required to view.
 * Uses SECURITY DEFINER function to bypass RLS for public invite access.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const supabase = await createSupabaseServerClient();

  // Use RPC function to get invite details (bypasses RLS for public access)
  const { data, error } = await supabase.rpc("get_invite_by_token" as any, {
    p_token: token,
  } as any);

  if (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  // The RPC function returns a JSON object with success, error, invite, organization
  const result = data as { success: boolean; error?: string; invite?: any; organization?: any };
  if (!result.success) {
    // Invalid invite (expired, revoked, or max uses reached)
    return NextResponse.json(
      {
        valid: false,
        error: result.error,
        organization: result.organization,
      },
      { status: 410 }
    );
  }

  return NextResponse.json({
    valid: true,
    invite: result.invite,
    organization: result.organization,
  });
}
