import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");

  let query = supabase
    .from("projects")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (orgId) {
    // IDOR fix (C-1, 2026-04-21 audit): validate user is a member of the
    // requested org before scoping by organization_id. Prior code trusted
    // whatever orgId the caller passed, letting any authed user enumerate
    // any org's projects.
    const orgContext = await getOrgContext(supabase, orgId);
    if (!orgContext) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  // Map frontend field names to database columns
  const { orgId, ...rest } = body;

  // IDOR fix (C-1, 2026-04-21 audit): if the caller claims an org for the
  // new project, confirm they're actually a member. RLS on the projects
  // INSERT policy should also catch this, but checking here gives a clean
  // 403 instead of a vague database error.
  if (orgId) {
    const orgContext = await getOrgContext(supabase, orgId);
    if (!orgContext) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...rest,
      user_id: user.id,
      organization_id: orgId || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}
