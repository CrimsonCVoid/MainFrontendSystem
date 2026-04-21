import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  const limitRaw = parseInt(req.nextUrl.searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, MAX_LIMIT))
    : DEFAULT_LIMIT;

  if (!orgId) {
    return NextResponse.json([]);
  }

  // IDOR fix (C-2, 2026-04-21 audit): validate org membership before
  // returning that org's approval queue. Approval shares reference
  // project/customer data — non-members must not see the list.
  const orgContext = await getOrgContext(supabase, orgId);
  if (!orgContext) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("estimate_shares")
    .select("*, projects(name, address)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ approvals: data || [] });
}
