/**
 * POST /api/projects/[id]/snapshot
 *
 * Fetches aerial imagery + DSM + building mask from Google Solar API
 * (`dataLayers:get`), uploads all three GeoTIFFs to Supabase Storage,
 * and upserts a `training_samples` row so the FastAPI sidecar's
 * pipeline has everything it needs to run plane fitting + cutsheet
 * generation end-to-end.
 *
 * Fallback: if the Solar API has no coverage for the address (no
 * buildings on file, or rural area), falls back to a Google Static
 * Maps satellite PNG for RGB only — labeler still works as a 2D
 * annotation tool but heatmap + cutsheets stay disabled.
 *
 * Response:
 *   { status: "created" | "cached" | "fallback", rgbPath, dsmPath?, maskPath? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const GOOGLE_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  "";

const SNAPSHOT_BUCKET = "pipeline-outputs";

const SOLAR_RADIUS_M = 75; // ~150m diameter — covers any single residence
const SOLAR_PIXEL_SIZE_M = 0.25; // 25cm/px — Solar API's highest commonly available
const STATIC_FALLBACK_ZOOM = 20;
const STATIC_FALLBACK_SIZE_PX = 640;
const STATIC_FALLBACK_SCALE = 2;

interface SolarDataLayers {
  imageryDate?: { year: number; month: number; day: number };
  imageryProcessedDate?: { year: number; month: number; day: number };
  dsmUrl?: string;
  rgbUrl?: string;
  maskUrl?: string;
  imageryQuality?: string;
}

function googleStaticUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(STATIC_FALLBACK_ZOOM),
    size: `${STATIC_FALLBACK_SIZE_PX}x${STATIC_FALLBACK_SIZE_PX}`,
    scale: String(STATIC_FALLBACK_SCALE),
    maptype: "satellite",
    key: GOOGLE_KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function estimateStaticMetersPerPx(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  const base =
    (156543.03392 * Math.cos(latRad)) / Math.pow(2, STATIC_FALLBACK_ZOOM);
  return base / STATIC_FALLBACK_SCALE;
}

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface BuildingInsightsResponse {
  name?: string;
  center?: { latitude: number; longitude: number };
  boundingBox?: {
    sw: { latitude: number; longitude: number };
    ne: { latitude: number; longitude: number };
  };
  imageryDate?: { year: number; month: number; day: number };
  imageryQuality?: string;
}

/**
 * Snap the raw geocoded lat/lng to the centroid of the actual nearest
 * building Google has on file. This fixes the "wrong house" problem when
 * the geocoder drops the pin on the road, a sidewalk, or a lot edge — we
 * then end up fetching Solar imagery centered on a building that's within
 * a few meters of the intended one.
 *
 * Returns null if Solar has no building on file at that location (rural
 * areas, new construction, etc). Caller should fall back to the raw coords.
 */
async function findBuildingCenter(
  lat: number,
  lng: number,
): Promise<{ lat: number; lng: number; quality?: string } | null> {
  const url = new URL(
    "https://solar.googleapis.com/v1/buildingInsights:findClosest",
  );
  url.searchParams.set("location.latitude", String(lat));
  url.searchParams.set("location.longitude", String(lng));
  url.searchParams.set("requiredQuality", "LOW");
  url.searchParams.set("key", GOOGLE_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(
      `[snapshot] buildingInsights:findClosest ${res.status}: ${text.slice(0, 150)}`,
    );
    return null;
  }
  const data = (await res.json()) as BuildingInsightsResponse;
  if (data.center?.latitude == null || data.center?.longitude == null) {
    return null;
  }
  return {
    lat: data.center.latitude,
    lng: data.center.longitude,
    quality: data.imageryQuality,
  };
}

async function fetchSolarDataLayers(
  lat: number,
  lng: number,
): Promise<SolarDataLayers | null> {
  const url = new URL("https://solar.googleapis.com/v1/dataLayers:get");
  url.searchParams.set("location.latitude", String(lat));
  url.searchParams.set("location.longitude", String(lng));
  url.searchParams.set("radiusMeters", String(SOLAR_RADIUS_M));
  url.searchParams.set("view", "FULL_LAYERS");
  url.searchParams.set("requiredQuality", "LOW"); // accept LOW+ (MEDIUM/HIGH preferred when available)
  url.searchParams.set("pixelSizeMeters", String(SOLAR_PIXEL_SIZE_M));
  url.searchParams.set("key", GOOGLE_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(
      `[snapshot] Solar dataLayers:get returned ${res.status}: ${text.slice(0, 200)}`,
    );
    return null;
  }
  return (await res.json()) as SolarDataLayers;
}

async function fetchGeoTiff(url: string): Promise<Buffer | null> {
  // Solar GeoTIFF URLs are short-lived and require the API key appended.
  const withKey = url.includes("?")
    ? `${url}&key=${GOOGLE_KEY}`
    : `${url}?key=${GOOGLE_KEY}`;
  const res = await fetch(withKey);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(
      `[snapshot] GeoTIFF fetch ${res.status} at ${url.slice(0, 80)}: ${text.slice(0, 150)}`,
    );
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function uploadBuffer(
  service: SupabaseClient,
  path: string,
  buf: Buffer,
  contentType: string,
): Promise<boolean> {
  const upload = await service.storage
    .from(SNAPSHOT_BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (upload.error) {
    console.error(
      `[snapshot] upload failed (${path}): ${upload.error.message}`,
    );
    return false;
  }
  return true;
}

function imageryDateToIso(d?: { year: number; month: number; day: number }) {
  if (!d?.year || !d?.month || !d?.day) return null;
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${d.year}-${mm}-${dd}`;
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
    .select("id, latitude, longitude, address, city, state, postal_code")
    .eq("id", projectId)
    .maybeSingle();

  const project = projectData as {
    id: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
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

  // Short-circuit if both RGB and DSM are already persisted.
  const { data: existingSample } = await service
    .from("training_samples")
    .select("id, rgb_storage_path, dsm_storage_path, mask_storage_path")
    .eq("id", projectId)
    .maybeSingle();

  const existing = existingSample as {
    id: string;
    rgb_storage_path: string | null;
    dsm_storage_path: string | null;
    mask_storage_path: string | null;
  } | null;

  if (existing?.rgb_storage_path && existing.dsm_storage_path) {
    return NextResponse.json({
      status: "cached",
      rgbPath: existing.rgb_storage_path,
      dsmPath: existing.dsm_storage_path,
      maskPath: existing.mask_storage_path ?? undefined,
    });
  }

  const formattedAddress = [
    project.address,
    project.city,
    project.state,
    project.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  // Snap to the nearest building's centroid so Solar imagery is centered
  // on an actual roof, not whatever happens to be at the geocoder's pin
  // (road, sidewalk, neighbor's lot edge).
  const snapped = await findBuildingCenter(project.latitude, project.longitude);
  const centerLat = snapped?.lat ?? project.latitude;
  const centerLng = snapped?.lng ?? project.longitude;
  if (snapped) {
    const dLat = snapped.lat - project.latitude;
    const dLng = snapped.lng - project.longitude;
    const approxMeters = Math.hypot(
      dLat * 111_000,
      dLng * 111_000 * Math.cos((project.latitude * Math.PI) / 180),
    );
    console.log(
      `[snapshot] buildingInsights snap: (${project.latitude.toFixed(6)},${project.longitude.toFixed(6)}) ` +
        `-> (${snapped.lat.toFixed(6)},${snapped.lng.toFixed(6)}) ` +
        `[${approxMeters.toFixed(1)}m, quality=${snapped.quality ?? "?"}]`,
    );
  } else {
    console.log(
      `[snapshot] buildingInsights found no building at ` +
        `(${project.latitude.toFixed(6)},${project.longitude.toFixed(6)}) — using raw geocoder coords`,
    );
  }

  // Primary path: Google Solar API dataLayers:get centered on the snapped coords
  const layers = await fetchSolarDataLayers(centerLat, centerLng);

  if (layers && layers.dsmUrl && layers.rgbUrl && layers.maskUrl) {
    const [rgbBuf, dsmBuf, maskBuf] = await Promise.all([
      fetchGeoTiff(layers.rgbUrl),
      fetchGeoTiff(layers.dsmUrl),
      fetchGeoTiff(layers.maskUrl),
    ]);

    if (rgbBuf && dsmBuf && maskBuf) {
      const rgbPath = `rgb/${projectId}.tif`;
      const dsmPath = `dsm/${projectId}.tif`;
      const maskPath = `mask/${projectId}.tif`;

      const [rgbOk, dsmOk, maskOk] = await Promise.all([
        uploadBuffer(service, rgbPath, rgbBuf, "image/tiff"),
        uploadBuffer(service, dsmPath, dsmBuf, "image/tiff"),
        uploadBuffer(service, maskPath, maskBuf, "image/tiff"),
      ]);

      if (rgbOk && dsmOk && maskOk) {
        // Solar API returns GeoTIFFs with native dimensions — we don't
        // know them without reading the file. Use placeholder values
        // matching the px_size * radius envelope; the sidecar reads
        // the real dims from the GeoTIFF header.
        const estW = Math.round((SOLAR_RADIUS_M * 2) / SOLAR_PIXEL_SIZE_M);
        const estH = estW;

        const upsert = await service.from("training_samples").upsert({
          id: projectId,
          rgb_storage_path: rgbPath,
          dsm_storage_path: dsmPath,
          mask_storage_path: maskPath,
          width_px: estW,
          height_px: estH,
          meters_per_px: SOLAR_PIXEL_SIZE_M,
          lat: centerLat,
          lng: centerLng,
          source_address: formattedAddress || null,
          formatted_address: formattedAddress || null,
          imagery_date: imageryDateToIso(layers.imageryDate),
          imagery_quality: layers.imageryQuality || "google_solar",
        });
        if (upsert.error) {
          console.error(
            "[snapshot] training_samples upsert failed:",
            upsert.error.message,
          );
          return NextResponse.json(
            { error: "training_samples upsert failed" },
            { status: 502 },
          );
        }

        console.log(
          `[snapshot] solar: captured RGB+DSM+MASK for project ${projectId} ` +
            `at ${project.latitude},${project.longitude} ` +
            `(quality=${layers.imageryQuality}, imagery_date=${imageryDateToIso(layers.imageryDate)})`,
        );
        return NextResponse.json({
          status: "created",
          rgbPath,
          dsmPath,
          maskPath,
        });
      }
    }
    console.warn(
      "[snapshot] solar URLs returned but one of RGB/DSM/mask failed to download/upload — falling back to static maps",
    );
  }

  // Fallback: Google Static Maps (RGB PNG only, no DSM, no mask).
  console.log(
    `[snapshot] Solar API unavailable for ${project.latitude},${project.longitude} — using Static Maps fallback`,
  );
  const staticUrl = googleStaticUrl(project.latitude, project.longitude);
  const staticRes = await fetch(staticUrl);
  if (!staticRes.ok) {
    const text = await staticRes.text().catch(() => "");
    console.error(`[snapshot] Static Maps returned ${staticRes.status}: ${text}`);
    return NextResponse.json(
      { error: `All Google imagery sources failed` },
      { status: 502 },
    );
  }
  const staticBuf = Buffer.from(await staticRes.arrayBuffer());
  const fallbackRgbPath = `aerial/${projectId}.png`;
  const fallbackOk = await uploadBuffer(
    service,
    fallbackRgbPath,
    staticBuf,
    "image/png",
  );
  if (!fallbackOk) {
    return NextResponse.json(
      { error: "Storage upload failed" },
      { status: 502 },
    );
  }

  const fallbackWidth = STATIC_FALLBACK_SIZE_PX * STATIC_FALLBACK_SCALE;
  const fallbackHeight = STATIC_FALLBACK_SIZE_PX * STATIC_FALLBACK_SCALE;
  const fallbackMpp = estimateStaticMetersPerPx(project.latitude);

  const upsert = await service.from("training_samples").upsert({
    id: projectId,
    rgb_storage_path: fallbackRgbPath,
    dsm_storage_path: "",
    mask_storage_path: "",
    width_px: fallbackWidth,
    height_px: fallbackHeight,
    meters_per_px: fallbackMpp,
    lat: project.latitude,
    lng: project.longitude,
    source_address: formattedAddress || null,
    formatted_address: formattedAddress || null,
    imagery_quality: "google_static_maps_fallback",
  });
  if (upsert.error) {
    console.error(
      "[snapshot] training_samples upsert failed (fallback):",
      upsert.error.message,
    );
    return NextResponse.json(
      { error: "training_samples upsert failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: "fallback",
    rgbPath: fallbackRgbPath,
  });
}
