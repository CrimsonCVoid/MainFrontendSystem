import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, orgId, type, reason, address, metadata } = await req.json();

  const { data, error } = await (supabase.from("support_tickets") as any)
    .insert({
      user_id: user.id,
      org_id: orgId || null,
      project_id: projectId || null,
      type: type || "roof_verification_rejected",
      reason: reason || null,
      address: address || null,
      metadata: metadata || {},
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, ticket: data });
}
