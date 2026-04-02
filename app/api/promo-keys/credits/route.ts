import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data } = await (supabase
    .from("users") as any)
    .select("promo_project_credits")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ success: true, credits: (data as any)?.promo_project_credits || 0 });
}
