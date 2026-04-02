/**
 * Organizations API Routes
 *
 * GET /api/orgs - List user's organizations
 * POST /api/orgs - Create a new organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateSlug, isValidSlug } from "@/lib/org-types";

/**
 * GET /api/orgs
 * Returns all organizations the authenticated user belongs to.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[API /orgs] 401 — no user. authError:", authError?.message || "none");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[API /orgs] Authenticated user:", user.id, user.email);

  // Get user's organizations with their membership info
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select(
      `
      org_id,
      role,
      joined_at,
      organizations!inner (
        id,
        name,
        slug,
        logo_url,
        plan,
        billing_status,
        created_at
      )
    `
    )
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }

  // Get user's active org
  const { data: userData } = await supabase
    .from("users")
    .select("active_org_id")
    .eq("id", user.id)
    .single();

  const userDataTyped = userData as { active_org_id: string | null } | null;

  // Transform response to include role with each org
  const organizations = (memberships || [])
    .map((m: any) => ({
      ...m.organizations,
      role: m.role,
      joined_at: m.joined_at,
      is_active: m.org_id === userDataTyped?.active_org_id,
    }))
    .filter((org: any) => org.id); // Filter out any nulls

  console.log("[API /orgs] Returning", organizations.length, "orgs, active_org_id:", userDataTyped?.active_org_id);
  const response = NextResponse.json({ organizations, active_org_id: userDataTyped?.active_org_id });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/**
 * POST /api/orgs
 * Create a new organization. User becomes the owner.
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

  const { name, slug: providedSlug, logo_url } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Organization name must be at least 2 characters" }, { status: 400 });
  }

  // Generate or validate slug
  let slug = providedSlug ? providedSlug.toLowerCase().trim() : generateSlug(name);

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Invalid slug. Must be 3-50 characters, lowercase alphanumeric with hyphens" },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .single();

  if (existing) {
    // Try to find unique slug
    let counter = 1;
    let newSlug = `${slug}-${counter}`;
    while (true) {
      const { data: check } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", newSlug)
        .limit(1)
        .single();
      if (!check) {
        slug = newSlug;
        break;
      }
      counter++;
      newSlug = `${slug}-${counter}`;
      if (counter > 100) {
        return NextResponse.json({ error: "Could not generate unique slug" }, { status: 400 });
      }
    }
  }

  // Create organization using the SECURITY DEFINER function
  // This bypasses RLS and creates org + owner membership atomically
  const { data: orgId, error: orgError } = await supabase.rpc("create_organization" as any, {
    p_user_id: user.id,
    p_name: name.trim(),
    p_slug: slug,
    p_logo_url: logo_url || null,
  } as any);

  if (orgError) {
    console.error("Failed to create organization:", orgError);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }

  // Fetch the created organization
  const { data: org, error: fetchError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (fetchError || !org) {
    console.error("Failed to fetch created organization:", fetchError);
    return NextResponse.json({ error: "Organization created but failed to fetch" }, { status: 500 });
  }

  return NextResponse.json({ organization: org, role: "owner" }, { status: 201 });
}
