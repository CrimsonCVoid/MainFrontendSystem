/**
 * Roof Generation API Route (Proxy to Algorithm Droplet)
 *
 * POST /api/roof-generate
 * Body: { projectId, lat, lng }
 *
 * Flow:
 * 1. Authenticates user via Supabase server client
 * 2. Calls Algorithm Droplet over private VPC network
 * 3. Stores result in projects.roof_data
 * 4. Returns RoofData to the browser
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALGORITHM_URL = process.env.ALGORITHM_API_URL; // e.g. "http://10.114.0.3:4000"
const ALGORITHM_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: NextRequest) {
  if (!ALGORITHM_URL) {
    console.error("[roof-generate] ALGORITHM_API_URL not configured");
    return NextResponse.json({ error: "Algorithm service not configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  let body: { projectId?: string; address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectId, address } = body;
  if (!projectId || !address) {
    return NextResponse.json({ error: "projectId and address are required" }, { status: 400 });
  }

  console.log(`[roof-generate] User ${user.email} requesting generation for project ${projectId} — address: ${address}`);

  // Fetch project coordinates — algorithm droplet requires lat/lng
  const { data: project, error: projError } = await (supabase.from("projects") as any)
    .select("latitude, longitude")
    .eq("id", projectId)
    .single();

  if (projError || !project?.latitude || !project?.longitude) {
    console.error("[roof-generate] Project missing coordinates:", projError?.message);
    return NextResponse.json({ error: "Project coordinates not found" }, { status: 400 });
  }

  // Call Algorithm Droplet over private VPC
  let algoRes: Response;
  try {
    algoRes = await fetch(`${ALGORITHM_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALGORITHM_KEY ? { "x-api-key": ALGORITHM_KEY } : {}),
      },
      body: JSON.stringify({ lat: project.latitude, lng: project.longitude, address }),
    });
  } catch (fetchError: any) {
    console.error("[roof-generate] Failed to reach Algorithm Droplet:", fetchError.message);
    return NextResponse.json(
      { error: "Algorithm service unreachable" },
      { status: 502 }
    );
  }

  if (!algoRes.ok) {
    const errBody = await algoRes.json().catch(() => ({ error: "Algorithm processing failed" }));
    console.error(`[roof-generate] Algorithm returned ${algoRes.status}:`, errBody);
    return NextResponse.json(errBody, { status: algoRes.status });
  }

  const roofData = await algoRes.json();
  console.log(`[roof-generate] Algorithm returned data — total_area_sf: ${roofData.total_area_sf}, planes: ${roofData.planes?.length}`);
  console.log(`[roof-generate] Algorithm response keys: ${Object.keys(roofData).join(", ")}`);
  console.log(`[roof-generate] Has _google_raw: ${!!roofData._google_raw}, _google_raw keys: ${roofData._google_raw ? Object.keys(roofData._google_raw).join(", ") : "N/A"}`);

  // Normalize _google_raw structure: Google Solar API nests roofSegmentStats under
  // solarPotential, but the 3D viewer expects them at the top level of _google_raw.
  // Flatten if needed so both the area correction and the 3D rendering find the data.
  if (roofData._google_raw) {
    const raw = roofData._google_raw;
    if (!raw.roofSegmentStats && raw.solarPotential?.roofSegmentStats) {
      console.log("[roof-generate] Flattening roofSegmentStats from solarPotential to _google_raw top level");
      raw.roofSegmentStats = raw.solarPotential.roofSegmentStats;
    }
    if (!raw.wholeRoofStats && raw.solarPotential?.wholeRoofStats) {
      raw.wholeRoofStats = raw.solarPotential.wholeRoofStats;
    }
    if (!raw.center && raw.solarPotential?.center) {
      raw.center = raw.solarPotential.center;
    }
  }

  console.log(`[roof-generate] roofSegmentStats count: ${roofData._google_raw?.roofSegmentStats?.length ?? "N/A"}`);

  // Recompute total area from Google Solar's actual per-segment area metrics
  // The algorithm droplet may return inflated values from bounding-box math;
  // Google Solar's stats.areaMeters2 is the authoritative sloped surface area.
  if (roofData._google_raw?.roofSegmentStats?.length > 0) {
    const segments = roofData._google_raw.roofSegmentStats;
    const totalM2 = segments.reduce(
      (sum: number, seg: any) => sum + (seg.stats?.areaMeters2 || 0),
      0
    );
    const correctedSqFt = Math.round(totalM2 * 10.7639);
    console.log(
      `[roof-generate] Corrected area from Google Solar segments: ${correctedSqFt} sf (algorithm reported ${roofData.total_area_sf})`
    );
    roofData.total_area_sf = correctedSqFt;
  }

  // Store result in database
  // Type assertion needed due to Supabase strict type inference on Json columns
  const { error: updateError } = await (supabase.from("projects") as any)
    .update({
      roof_data: roofData,
      square_footage: roofData.total_area_sf || null,
    })
    .eq("id", projectId);

  if (updateError) {
    console.error("[roof-generate] Failed to store roof_data:", updateError.message);
    // Still return the data even if DB write fails — caller can retry storage
  }

  return NextResponse.json({ success: true, roofData });
}
