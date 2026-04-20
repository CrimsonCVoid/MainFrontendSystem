/**
 * POST /api/projects/[id]/snapshot
 *
 * Captures a high-resolution aerial view of the project's address
 * (Google Static Maps, satellite, zoom 20, 1280x1280 @2x) and
 * persists it to Supabase Storage. Upserts a `training_samples`
 * row keyed on the project id so the FastAPI sidecar's hillshade
 * endpoint can serve it on subsequent labeler visits.
 *
 * Fire-and-forget safe: if the sample row already exists and points
 * at a stored image, we skip the Google fetch. Client can call this
 * on every labeler mount; a no-op when cached.
 *
 * Response:
 *   { status: "created" | "cached", rgbPath: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const GOOGLE_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  "";

const SNAPSHOT_BUCKET = "pipeline-outputs";
const SNAPSHOT_PATH_PREFIX = "aerial";

const STATIC_ZOOM = 20;
const STATIC_SIZE_PX = 640;
const STATIC_SCALE = 2;

function googleStaticUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(STATIC_ZOOM),
    size: `${STATIC_SIZE_PX}x${STATIC_SIZE_PX}`,
    scale: String(STATIC_SCALE),
    maptype: "satellite",
    key: GOOGLE_KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Approximate ground resolution in meters per pixel for a Google Static
 * Maps satellite tile at a given zoom and latitude. Based on the
 * Web Mercator formula: 156543.03392 * cos(lat) / 2^zoom, scaled for
 * Google's @2x retina output.
 */
function estimateMetersPerPx(lat: number, zoom: number, scale: number): number {
  const latRad = (lat * Math.PI) / 180;
  const base = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
  return base / scale;
}

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(
  _req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  if (!GOOGLE_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 503 },
    );
  }
  const service = getServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Service-role Supabase not configured" },
      { status: 503 },
    );
  }

  // Auth — user must own the project (RLS enforces on the user-scoped client).
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projectData } = await userClient
    .from("projects")
    .select("id, latitude, longitude")
    .eq("id", projectId)
    .maybeSingle();

  const project = projectData as {
    id: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.latitude == null || project.longitude == null) {
    return NextResponse.json(
      { error: "Project has no coordinates" },
      { status: 400 },
    );
  }

  // Short-circuit if we've already captured one.
  const { data: existingSample } = await service
    .from("training_samples")
    .select("id, rgb_storage_path")
    .eq("id", projectId)
    .maybeSingle();

  const existing = existingSample as {
    id: string;
    rgb_storage_path: string | null;
  } | null;

  if (existing?.rgb_storage_path) {
    return NextResponse.json({
      status: "cached",
      rgbPath: existing.rgb_storage_path,
    });
  }

  // Fetch from Google Static Maps.
  const staticUrl = googleStaticUrl(project.latitude, project.longitude);
  const gRes = await fetch(staticUrl);
  if (!gRes.ok) {
    const text = await gRes.text().catch(() => "");
    console.error(`[snapshot] Google returned ${gRes.status}: ${text}`);
    return NextResponse.json(
      { error: `Google Static Maps returned ${gRes.status}` },
      { status: 502 },
    );
  }
  const buf = Buffer.from(await gRes.arrayBuffer());

  // Upload to Supabase Storage.
  const rgbPath = `${SNAPSHOT_PATH_PREFIX}/${projectId}.png`;
  const upload = await service.storage
    .from(SNAPSHOT_BUCKET)
    .upload(rgbPath, buf, {
      contentType: "image/png",
      upsert: true,
    });
  if (upload.error) {
    console.error("[snapshot] Storage upload failed:", upload.error.message);
    return NextResponse.json(
      { error: "Storage upload failed" },
      { status: 502 },
    );
  }

  // Upsert training_samples row. Schema requires width_px, height_px,
  // meters_per_px, rgb_storage_path, dsm_storage_path, mask_storage_path
  // all NOT NULL. We provide empty strings for DSM/mask paths — the
  // sidecar's hillshade and heatmap endpoints fall through to 404 when
  // those paths are empty, which the labeler UI detects and uses to
  // disable the Heatmap button.
  const widthPx = STATIC_SIZE_PX * STATIC_SCALE;
  const heightPx = STATIC_SIZE_PX * STATIC_SCALE;
  const metersPerPx = estimateMetersPerPx(
    project.latitude,
    STATIC_ZOOM,
    STATIC_SCALE,
  );

  const upsert = await service.from("training_samples").upsert({
    id: projectId,
    rgb_storage_path: rgbPath,
    dsm_storage_path: "",
    mask_storage_path: "",
    width_px: widthPx,
    height_px: heightPx,
    meters_per_px: metersPerPx,
    lat: project.latitude,
    lng: project.longitude,
    imagery_quality: "google_static_maps",
  });
  if (upsert.error) {
    console.error("[snapshot] training_samples upsert failed:", upsert.error.message);
    return NextResponse.json(
      { error: "training_samples upsert failed" },
      { status: 502 },
    );
  }

  console.log(
    `[snapshot] captured aerial for project ${projectId} at ${project.latitude},${project.longitude} -> ${rgbPath}`,
  );
  return NextResponse.json({ status: "created", rgbPath });
}
