/**
 * GET /api/projects/[id]/cutsheet-data
 *
 * Auth-gated proxy to the sidecar's cutsheet JSON endpoint, with a
 * Supabase-backed cache on `projects.cutsheet_cache`.
 *
 * Cache flow:
 *   1. Read `cutsheet_cache` + `cutsheet_cache_updated_at` + the paired
 *      `training_labels.updated_at` for this project.
 *   2. If cache exists AND its timestamp is newer than the labels row,
 *      return it immediately. (X-Cache: HIT)
 *   3. Otherwise, fetch the sidecar, persist the result, return. (MISS)
 *
 * Pass `?refresh=1` to skip the cache read and force a recompute.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function resolveSidecarUrl(): string {
  const raw =
    process.env.ALGORITHM_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";
  return raw
    .replace(/\/$/, "")
    .replace(/^http:\/\/localhost(:\d+)?/, "http://127.0.0.1$1");
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const sidecarUrl = resolveSidecarUrl();
  const { id: projectId } = await context.params;
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First: confirm the project exists (small, always-safe query).
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Then: try to read the cache columns. If migration 017 hasn't been
  // applied yet, this returns an error -- treat as "no cache available"
  // and fall through to the sidecar. Keeps the app working without the
  // schema change in place.
  type CacheRow = {
    cutsheet_cache: unknown;
    cutsheet_cache_updated_at: string | null;
  };
  let cacheRow: CacheRow | null = null;
  if (!forceRefresh) {
    const { data, error: cacheColsErr } = await supabase
      .from("projects")
      .select("cutsheet_cache, cutsheet_cache_updated_at")
      .eq("id", projectId)
      .maybeSingle();
    if (cacheColsErr) {
      console.warn(
        `[cutsheet-data] cache columns unavailable (run migration 017?): ${cacheColsErr.message}`,
      );
    } else {
      cacheRow = data as CacheRow | null;
    }
  }

  if (!forceRefresh && cacheRow?.cutsheet_cache && cacheRow?.cutsheet_cache_updated_at) {
    // Compare against training_labels.updated_at. If labels were saved
    // after the cache was written, cache is stale. Serve cache only when
    // we can prove it's at least as new as the labels row.
    const { data: labels, error: labelsErr } = await supabase
      .from("training_labels")
      .select("updated_at")
      .eq("sample_id", projectId)
      .maybeSingle<{ updated_at: string | null }>();

    if (!labelsErr && labels?.updated_at) {
      const labelsTime = new Date(labels.updated_at).getTime();
      const cacheTime = new Date(cacheRow.cutsheet_cache_updated_at).getTime();
      if (cacheTime >= labelsTime) {
        return NextResponse.json(cacheRow.cutsheet_cache, {
          headers: { "X-Cache": "HIT" },
        });
      }
    }
    // else: no labels row, no updated_at column, or labels newer than
    // cache -- fall through to recompute via sidecar.
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

    // Write-through: stash the payload so the next GET skips the sidecar.
    // Done inline (not fire-and-forget) so a failed write surfaces in logs;
    // the happy path is fast so the extra round-trip is acceptable.
    const { error: cacheErr } = await supabase
      .from("projects")
      // Cache columns are added by migration 017; the generated Supabase
      // types haven't been regenerated yet, so cast past the typed client.
      .update({
        cutsheet_cache: data,
        cutsheet_cache_updated_at: new Date().toISOString(),
      } as never)
      .eq("id", projectId);
    if (cacheErr) {
      console.warn(
        `[cutsheet-data] cache write failed for ${projectId}: ${cacheErr.message}`,
      );
    }

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    });
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
