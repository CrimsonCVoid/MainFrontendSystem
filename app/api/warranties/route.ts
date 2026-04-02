import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  const expiringSoon = req.nextUrl.searchParams.get("expiringSoonDays");

  if (!orgId) return NextResponse.json({ warranties: [] });

  let query = (supabase.from("warranties") as any)
    .select("*, projects(id, name, address, city)")
    .eq("organization_id", orgId)
    .order("expiration_date", { ascending: true });

  if (expiringSoon) {
    const future = new Date(Date.now() + Number(expiringSoon) * 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    query = query.lte("expiration_date", future).gte("expiration_date", today);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ warranties: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Compute expiration date
  if (body.start_date && body.duration_years) {
    const start = new Date(body.start_date);
    start.setFullYear(start.getFullYear() + body.duration_years);
    body.expiration_date = start.toISOString().split("T")[0];
  }

  const { data, error } = await (supabase.from("warranties") as any)
    .insert({ ...body, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ warranty: data });
}
