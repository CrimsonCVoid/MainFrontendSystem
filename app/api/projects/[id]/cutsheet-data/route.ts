/**
 * GET /api/projects/[id]/cutsheet-data
 *
 * Auth-gates and proxies to the sidecar's cutsheet JSON endpoint
 * (mirrors /generate-pdf but returns structured panel data instead of
 * a rendered PDF). Response shape in the sidecar code comment.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALGORITHM_URL = process.env.ALGORITHM_API_URL;

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  if (!ALGORITHM_URL) {
    return NextResponse.json(
      { error: "Pipeline service not configured" },
      { status: 503 },
    );
  }

  const { id: projectId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const res = await fetch(
      `${ALGORITHM_URL}/api/pipeline/cutsheet-data/${projectId}`,
    );
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: "Cutsheet data unavailable" }));
      return NextResponse.json(err, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cutsheet-data] sidecar unreachable:", message);
    return NextResponse.json(
      { error: "Pipeline service unreachable" },
      { status: 502 },
    );
  }
}
