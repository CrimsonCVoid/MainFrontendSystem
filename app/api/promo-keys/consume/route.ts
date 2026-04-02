import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get current credits
  const { data: userData } = await (supabase
    .from("users") as any)
    .select("promo_project_credits")
    .eq("id", user.id)
    .single();

  const currentCredits = (userData as any)?.promo_project_credits || 0;

  if (currentCredits <= 0) {
    return NextResponse.json({ success: false, error: "No credits available" }, { status: 400 });
  }

  // Decrement credits
  const { error } = await (supabase
    .from("users") as any)
    .update({ promo_project_credits: currentCredits - 1 })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, remaining: currentCredits - 1 });
}
