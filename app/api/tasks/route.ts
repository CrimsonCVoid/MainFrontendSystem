import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  const dueSoon = req.nextUrl.searchParams.get("dueSoonDays");
  const completed = req.nextUrl.searchParams.get("completed");

  if (!orgId) return NextResponse.json({ tasks: [] });

  let query = (supabase.from("tasks") as any)
    .select("*, projects(id, name), clients(id, name)")
    .eq("organization_id", orgId)
    .order("due_date", { ascending: true });

  if (completed === "false") query = query.is("completed_at", null);
  if (completed === "true") query = query.not("completed_at", "is", null);
  if (dueSoon) {
    const future = new Date(Date.now() + Number(dueSoon) * 86400000).toISOString().split("T")[0];
    query = query.lte("due_date", future).is("completed_at", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await (supabase.from("tasks") as any)
    .insert({ ...body, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}
