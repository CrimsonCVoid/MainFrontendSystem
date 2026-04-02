/**
 * Organization Switch API Route
 *
 * POST /api/orgs/switch - Switch user's active organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { switchActiveOrg } from "@/lib/org-auth";

/**
 * POST /api/orgs/switch
 * Switch the authenticated user's active organization.
 *
 * Body: { orgId: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { orgId } = body;

  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
  }

  const result = await switchActiveOrg(supabase, user.id, orgId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Get the new org details
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, plan")
    .eq("id", orgId)
    .single();

  return NextResponse.json({
    success: true,
    active_org: org,
  });
}
