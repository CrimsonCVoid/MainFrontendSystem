import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Race fix (H-1, 2026-04-21 audit): prior code did a read-then-update with
  // no transaction. Under concurrent POSTs the user could double-spend —
  // both requests read balance=N, both write balance=N-1, both succeed,
  // net cost 1 credit for 2 project unlocks.
  //
  // consume_promo_credit() (migration 019) is a SECURITY DEFINER function
  // that does the decrement in a single UPDATE ... WHERE credits > 0
  // RETURNING credits statement. Postgres serializes the row-level lock,
  // so concurrent callers can't both win. Returns NULL when the user has
  // no credits.
  const { data: newBalance, error } = await (supabase.rpc as any)("consume_promo_credit", {
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (newBalance === null || typeof newBalance !== "number") {
    return NextResponse.json(
      { success: false, error: "No credits available" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, remaining: newBalance });
}
