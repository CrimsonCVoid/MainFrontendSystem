/**
 * Accept Invite API Route
 *
 * POST /api/invites/[token]/accept - Accept an invite and join organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/invites/[token]/accept
 * Accept an invite and join the organization.
 * Requires authentication.
 * Uses SECURITY DEFINER function to bypass RLS for membership insert.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const supabase = await createSupabaseServerClient();

  // Verify authentication first
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required to accept invite" }, { status: 401 });
  }

  // Use RPC function to accept invite (bypasses RLS for membership insert)
  const { data, error } = await supabase.rpc("accept_invite" as any, {
    p_token: token,
  } as any);

  if (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Failed to process invite" }, { status: 500 });
  }

  // Cast to expected result type
  const result = data as { success: boolean; error?: string; message?: string; organization?: any; role?: string };

  // Check if the function returned an error
  if (!result.success) {
    // Map errors to appropriate status codes
    const errorMessage = result.error || "Failed to accept invite";

    if (errorMessage.includes("Authentication required")) {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes("different email address")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    if (errorMessage.includes("expired") || errorMessage.includes("revoked") || errorMessage.includes("usage limit")) {
      return NextResponse.json({ error: errorMessage }, { status: 410 });
    }
    if (errorMessage.includes("already a member")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    organization: result.organization,
    role: result.role,
  });
}
