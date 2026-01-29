/**
 * Organization Promo Keys API
 *
 * GET /api/orgs/[orgId]/promo-keys - List promo keys for org (admin only)
 * POST /api/orgs/[orgId]/promo-keys - Generate new promo keys (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * GET - List promo keys for organization
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin of this org using RPC
  const { data: isAdmin } = await supabase.rpc("is_org_admin" as any, {
    p_org_id: orgId,
    p_user_id: user.id,
  } as any);

  if (!isAdmin) {
    return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
  }

  // Get query params for filtering
  const url = new URL(req.url);
  const showUsed = url.searchParams.get("showUsed") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Fetch promo keys
  let query = supabase
    .from("promo_keys")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!showUsed) {
    query = query.eq("is_used", false);
  }

  const { data: keys, error, count } = await query;

  if (error) {
    console.error("Failed to fetch promo keys:", error);
    return NextResponse.json({ error: "Failed to fetch promo keys" }, { status: 500 });
  }

  // Get stats
  const { data: stats } = await supabase
    .from("promo_keys")
    .select("is_used")
    .eq("organization_id", orgId);

  const statsTyped = (stats as { is_used: boolean }[] | null) || [];
  const totalKeys = statsTyped.length;
  const usedKeys = statsTyped.filter((k) => k.is_used).length;
  const availableKeys = totalKeys - usedKeys;

  return NextResponse.json({
    keys: keys || [],
    total: count || 0,
    stats: {
      total: totalKeys,
      used: usedKeys,
      available: availableKeys,
    },
  });
}

/**
 * POST - Generate new promo keys for organization
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
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

  const { count = 100, notes } = body;

  // Validate count
  if (count < 1 || count > 100) {
    return NextResponse.json({ error: "Count must be between 1 and 100" }, { status: 400 });
  }

  // Generate keys using the database function
  const { data: keysGenerated, error: genError } = await supabase.rpc("generate_promo_keys" as any, {
    p_org_id: orgId,
    p_user_id: user.id,
    p_count: count,
    p_notes: notes || null,
  } as any);

  if (genError) {
    console.error("Failed to generate promo keys:", genError);
    return NextResponse.json(
      { error: genError.message || "Failed to generate promo keys" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    generated: keysGenerated,
    message: `Successfully generated ${keysGenerated} promo keys`,
  });
}
