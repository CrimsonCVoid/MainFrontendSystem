import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "200");
  const category = req.nextUrl.searchParams.get("category");
  const startDate = req.nextUrl.searchParams.get("startDate");

  if (!orgId) {
    return NextResponse.json({ logs: [], members: [] });
  }

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
