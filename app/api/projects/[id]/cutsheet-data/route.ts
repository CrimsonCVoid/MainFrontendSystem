/**
 * GET /api/projects/[id]/cutsheet-data
 *
 * Auth-gates and proxies to the sidecar's cutsheet JSON endpoint
 * (mirrors /generate-pdf but returns structured panel data instead of
 * a rendered PDF). Response shape in the sidecar code comment.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Resolve the sidecar base URL. Falls back through:
 *   1. ALGORITHM_API_URL (production/internal route)
 *   2. NEXT_PUBLIC_API_URL (same URL the browser uses for hillshade/labels)
 *   3. http://127.0.0.1:8000 (local dev default; avoids Node's IPv6-first
 *      DNS resolution of "localhost" which fails fast on IPv4-only servers)
 */
function resolveSidecarUrl(): string {
  const raw =
    process.env.ALGORITHM_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";
  // Normalize: strip trailing slash and rewrite "localhost" to 127.0.0.1 to
  // dodge the IPv6 fetch-failure on macOS + Node 18+.
  return raw.replace(/\/$/, "").replace(/^http:\/\/localhost(:\d+)?/, "http://127.0.0.1$1");
}

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const sidecarUrl = resolveSidecarUrl();
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

  const target = `${sidecarUrl}/api/pipeline/cutsheet-data/${projectId}`;
  try {
    const res = await fetch(target);
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
    console.error(
      `[cutsheet-data] sidecar unreachable at ${target}: ${message}`,
    );
    return NextResponse.json(
      { error: "Pipeline service unreachable", target, cause: message },
      { status: 502 },
    );
  }
}
