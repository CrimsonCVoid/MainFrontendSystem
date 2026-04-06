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

  // Try advanced endpoint first (satellite data + plane segmentation), fall back to simple
  let roofData: any;
  let kyxrBase64: string | null = null;

  // Attempt advanced generation (downloads GeoTIFFs, runs segmentation)
  let useAdvanced = true;
  try {
    console.log(`[roof-generate] Trying advanced endpoint...`);
    const advRes = await fetch(`${ALGORITHM_URL}/generate-advanced`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALGORITHM_KEY ? { "x-api-key": ALGORITHM_KEY } : {}),
      },
      body: JSON.stringify({ lat: project.latitude, lng: project.longitude, address, projectId }),
    });

    if (advRes.ok) {
      const advData = await advRes.json();
      kyxrBase64 = advData._kyxr_base64 || null;
      delete advData._kyxr_base64; // Don't store in roof_data JSON
      roofData = advData;
      console.log(`[roof-generate] Advanced success — ${roofData.total_area_sf} sf, ${roofData.planes?.length} planes, kyxr=${kyxrBase64 ? "yes" : "no"}`);
    } else {
      console.warn(`[roof-generate] Advanced returned ${advRes.status}, falling back to simple`);
      useAdvanced = false;
    }
  } catch (advErr: any) {
    console.warn(`[roof-generate] Advanced failed (${advErr.message}), falling back to simple`);
    useAdvanced = false;
  }

  // Fallback: simple generation (just Google Solar buildingInsights)
  if (!useAdvanced || !roofData) {
    try {
      const algoRes = await fetch(`${ALGORITHM_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ALGORITHM_KEY ? { "x-api-key": ALGORITHM_KEY } : {}),
        },
        body: JSON.stringify({ address }),
      });

      if (!algoRes.ok) {
        const errBody = await algoRes.json().catch(() => ({ error: "Algorithm processing failed" }));
        console.error(`[roof-generate] Simple algorithm returned ${algoRes.status}:`, errBody);
        return NextResponse.json(errBody, { status: algoRes.status });
      }

      roofData = await algoRes.json();
      console.log(`[roof-generate] Simple success — ${roofData.total_area_sf} sf, ${roofData.planes?.length} planes`);
    } catch (fetchError: any) {
      console.error("[roof-generate] Failed to reach Algorithm Droplet:", fetchError.message);
      return NextResponse.json({ error: "Algorithm service unreachable" }, { status: 502 });
    }
  }

  console.log(`[roof-generate] Response keys: ${Object.keys(roofData).join(", ")}`);

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
  }

  // If we have satellite data (.kyxr binary), upload to Supabase Storage
  if (kyxrBase64) {
    try {
      const kyxrBuffer = Buffer.from(kyxrBase64, "base64");
      const storagePath = `satellite-data/${projectId}.kyxr`;

      const { error: storageError } = await supabase.storage
        .from("project-data")
        .upload(storagePath, kyxrBuffer, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (storageError) {
        console.warn("[roof-generate] Failed to upload .kyxr to storage:", storageError.message);
      } else {
        console.log(`[roof-generate] Uploaded .kyxr (${kyxrBuffer.byteLength} bytes) to ${storagePath}`);
        // Save storage path reference in project
        await (supabase.from("projects") as any)
          .update({ roof_data_status: "complete" })
          .eq("id", projectId);
      }
    } catch (storageErr: any) {
      console.warn("[roof-generate] Storage upload error:", storageErr.message);
    }
  }

  return NextResponse.json({
    success: true,
    roofData,
    hasAdvancedData: !!kyxrBase64,
  });
}
