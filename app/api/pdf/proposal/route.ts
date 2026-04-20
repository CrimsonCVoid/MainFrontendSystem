/**
 * POST /api/pdf/proposal
 *
 * Authenticates the user via Supabase SSR, then forwards the request
 * to the FastAPI sidecar's /api/pdf/proposal endpoint. The sidecar
 * renders a ReportLab PDF, uploads it to Supabase Storage, and returns
 * a signed URL. This thin proxy mirrors app/api/roof-reconstruct/route.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALGORITHM_URL = process.env.ALGORITHM_API_URL;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: NextRequest) {
  if (!ALGORITHM_URL) {
    return NextResponse.json(
      { error: "PDF service not configured" },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ALGORITHM_URL}/api/pdf/proposal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(INTERNAL_KEY ? { "x-api-key": INTERNAL_KEY } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: "PDF generation failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pdf.proposal] sidecar unreachable:", message);
    return NextResponse.json(
      { error: "PDF service unreachable" },
      { status: 502 },
    );
  }
}
