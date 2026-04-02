import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data } = await (supabase
    .from("users") as any)
    .select("tutorial_state")
    .eq("id", user.id)
    .single();

  return NextResponse.json((data as any)?.tutorial_state || {
    skipped: false,
    completed: false,
    startedAt: null,
    currentStep: 0,
    dismissedAt: null,
    completedSteps: [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  const { error } = await (supabase
    .from("users") as any)
    .update({ tutorial_state: body })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
