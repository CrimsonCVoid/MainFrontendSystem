/**
 * Roof Reconstruction API Route
 *
 * POST /api/roof-reconstruct
 * Body: { projectId }
 *
 * Calls the Algorithm Droplet's /reconstruct endpoint which runs ExportData
 * on the server and returns the JSON_Output (sketch data) for client-side
 * SketchLine reconstruction.
 *
 * Flow:
 * 1. Authenticates user via Supabase
 * 2. Fetches project to verify ownership and get coordinates
 * 3. Calls Algorithm Droplet /reconstruct endpoint
 * 4. Returns sketch_json to the frontend
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALGORITHM_URL = process.env.ALGORITHM_API_URL;
const ALGORITHM_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: NextRequest) {
  if (!ALGORITHM_URL) {
    return NextResponse.json({ error: "Algorithm service not configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectId } = body;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Check if sketch_json is already cached in the project
  const { data: project, error: projError } = await (supabase.from("projects") as any)
    .select("latitude, longitude, roof_data, sketch_json")
    .eq("id", projectId)
    .single();

  if (projError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Return cached data if available
  if (project.sketch_json?.length) {
    console.log(`[roof-reconstruct] Returning cached sketch_json (${project.sketch_json.length} entries)`);
    return NextResponse.json({ sketch_json: project.sketch_json, cached: true });
  }

  if (!project.latitude || !project.longitude) {
    return NextResponse.json({ error: "Project has no coordinates" }, { status: 400 });
  }

  // Call algorithm droplet for reconstruction
  console.log(`[roof-reconstruct] Requesting reconstruction for project ${projectId}`);
  try {
    const res = await fetch(`${ALGORITHM_URL}/reconstruct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALGORITHM_KEY ? { "x-api-key": ALGORITHM_KEY } : {}),
      },
      body: JSON.stringify({
        projectId,
        lat: project.latitude,
        lng: project.longitude,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Reconstruction failed" }));
      console.error(`[roof-reconstruct] Droplet returned ${res.status}:`, err);
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    const sketchJson = data.sketch_json || [];

    console.log(`[roof-reconstruct] Got ${sketchJson.length} sketch entries, caching...`);

    // Cache in database for future requests
    if (sketchJson.length > 0) {
      await (supabase.from("projects") as any)
        .update({ sketch_json: sketchJson })
        .eq("id", projectId);
    }

    return NextResponse.json({ sketch_json: sketchJson, cached: false });
  } catch (err: any) {
    console.error("[roof-reconstruct] Failed to reach algorithm droplet:", err.message);
    return NextResponse.json({ error: "Algorithm service unreachable" }, { status: 502 });
  }
}
