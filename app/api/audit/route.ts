import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext, isOrgAdmin } from "@/lib/org-auth";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ logs: [], members: [] });
  }

  // IDOR fix (C-3, 2026-04-21 audit): audit logs and member roster are the
  // most sensitive org-scoped data. Require explicit org membership, and
  // beyond that require owner/admin — mirrors the RLS SELECT policy on
  // activity_logs (migration 014). Previously any authed user could pass
  // any orgId and read the full audit trail + every member's email/name.
  const orgContext = await getOrgContext(supabase, orgId);
  if (!orgContext) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isOrgAdmin(orgContext)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const limitRaw = parseInt(req.nextUrl.searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, MAX_LIMIT))
    : DEFAULT_LIMIT;
  const category = req.nextUrl.searchParams.get("category");
  const startDateRaw = req.nextUrl.searchParams.get("startDate");
  const startDate = startDateRaw && ISO_DATE_RE.test(startDateRaw) ? startDateRaw : null;

  // Fetch activity logs
  let logsQuery = supabase
    .from("activity_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) {
    logsQuery = logsQuery.eq("action_category", category);
  }
  if (startDate) {
    logsQuery = logsQuery.gte("created_at", startDate);
  }

  // Fetch org members
  const membersQuery = supabase
    .from("organization_members")
    .select("*, users(id, email, full_name, avatar_url)")
    .eq("org_id", orgId);

  const [logsResult, membersResult] = await Promise.all([logsQuery, membersQuery]);

  return NextResponse.json({
    logs: logsResult.data || [],
    members: membersResult.data || [],
  });
}
