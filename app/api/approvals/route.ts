import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

  if (!orgId) {
    return NextResponse.json([]);
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
