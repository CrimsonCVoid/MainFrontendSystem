import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { keyCode } = await req.json();

  if (!keyCode) {
    return NextResponse.json({ success: false, error: "Promo code is required" }, { status: 400 });
  }

  // Find the promo key (cast to any to avoid generated type issues)
  const { data: key, error: keyError } = await (supabase
    .from("promo_keys") as any)
    .select("*")
    .eq("key_code", keyCode.toUpperCase().trim())
    .single();

  const k = key as any;

  if (keyError || !k) {
    return NextResponse.json({ success: false, error: "Invalid promo code" }, { status: 404 });
  }

  if ((k.credits_remaining || 0) <= 0) {
    return NextResponse.json({ success: false, error: "This promo code has already been fully used" }, { status: 400 });
  }

  if (k.used_by_user_id === user.id) {
    return NextResponse.json({ success: false, error: "You have already redeemed this code" }, { status: 400 });
  }

  const creditsToAdd = k.credits_remaining;

  // Get current user credits
  const { data: userData } = await (supabase
    .from("users") as any)
    .select("promo_project_credits")
    .eq("id", user.id)
    .single();

  const currentCredits = (userData as any)?.promo_project_credits || 0;
  const newTotal = currentCredits + creditsToAdd;

  // Update user credits
  const { error: updateError } = await (supabase
    .from("users") as any)
    .update({ promo_project_credits: newTotal })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: "Failed to add credits" }, { status: 500 });
  }

  // Mark the key as used
  await (supabase
    .from("promo_keys") as any)
    .update({
      is_used: true,
      used_by_user_id: user.id,
      used_at: new Date().toISOString(),
      credits_remaining: 0,
    })
    .eq("id", k.id);

  return NextResponse.json({
    success: true,
    creditsAdded: creditsToAdd,
    totalCredits: newTotal,
  });
}
