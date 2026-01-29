/**
 * Individual Promo Key API
 *
 * DELETE /api/orgs/[orgId]/promo-keys/[keyId] - Delete unused promo key
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface RouteParams {
  params: Promise<{ orgId: string; keyId: string }>;
}

/**
 * DELETE - Delete an unused promo key
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { orgId, keyId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin of this org
  const { data: isAdmin } = await supabase.rpc("is_org_admin" as any, {
    p_org_id: orgId,
    p_user_id: user.id,
  } as any);

  if (!isAdmin) {
    return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
  }

  // Get the key to verify it belongs to this org and is unused
  const { data: keyData, error: fetchError } = await supabase
    .from("promo_keys")
    .select("*")
    .eq("id", keyId)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !keyData) {
    return NextResponse.json({ error: "Promo key not found" }, { status: 404 });
  }

  const key = keyData as { is_used: boolean };
  if (key.is_used) {
    return NextResponse.json({ error: "Cannot delete a used promo key" }, { status: 400 });
  }

  // Delete the key
  const { error: deleteError } = await supabase
    .from("promo_keys")
    .delete()
    .eq("id", keyId)
    .eq("organization_id", orgId)
    .eq("is_used", false);

  if (deleteError) {
    console.error("Failed to delete promo key:", deleteError);
    return NextResponse.json({ error: "Failed to delete promo key" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Promo key deleted" });
}
