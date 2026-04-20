/**
 * POST /api/pdf/proposal
 *
 * Stub until Phase 4 lands the FastAPI sidecar PDF routes.
 * Mirrors the pattern in app/api/roof-reconstruct/route.ts:
 * authenticates the user, validates the project, then proxies to the
 * algorithm droplet. Currently returns 501 because the sidecar endpoint
 * is not yet deployed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "PDF generation service is not yet deployed. This will come online in Phase 4 (FastAPI sidecar).",
    },
    { status: 501 },
  );
}
