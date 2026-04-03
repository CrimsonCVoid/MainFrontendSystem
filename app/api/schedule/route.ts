import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  if (!orgId) return NextResponse.json({ schedule: [] });

  let query = (supabase.from("project_schedule") as any)
    .select("*, projects(id, name, address, city, status, client_id)")
    .eq("organization_id", orgId)
    .order("start_date", { ascending: true });

  if (startDate) query = query.gte("start_date", startDate);
  if (endDate) query = query.lte("start_date", endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await (supabase.from("project_schedule") as any)
    .insert({ ...body, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
