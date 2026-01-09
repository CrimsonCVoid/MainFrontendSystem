/**
 * GEOCODE API ROUTE - Address Autocomplete
 *
 * Proxies Geoapify API for address search autocomplete.
 * Called by AddressInput component as user types.
 *
 * KY - HOW IT WORKS:
 * 1. Receives search query via ?s= parameter
 * 2. Calls Geoapify API with search text
 * 3. Returns up to 7 address suggestions with lat/lng
 * 4. Frontend displays dropdown, user selects address
 * 5. AddressInput component returns full AddressData with coordinates
 *
 * KY - YOUR INTEGRATION:
 * After address selection, you need to create /api/roof-generate endpoint:
 * - Input: { projectId, latitude, longitude }
 * - Processing: Call your roof rendering algorithm with coordinates
 * - Output: { planes: [...], measurements: {...}, total_area_sf: number, panel_count: number }
 * - Storage: Update projects.roof_data JSONB column with results
 *
 * See dashboard-client.tsx line 237-248 for where to call your endpoint.
 */

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("s") || "").trim();
  if (!text) return NextResponse.json({ suggestions: [] });

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [] });

  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", text);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "7");
  url.searchParams.set("apiKey", key);
  url.searchParams.set("filter", "countrycode:us"); // 🇺🇸 Default to USA results
  

  try {
    const r = await fetch(url, { next: { revalidate: 0 } });
    if (!r.ok) throw new Error("Geoapify error");
    const data = await r.json() as {
      results?: Array<{
        place_id: string;
        address_line1?: string;
        address_line2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        lon?: number;
        lat?: number;
      }>;
    };

    const suggestions = (data.results || []).map((it) => {
      const street = it.address_line1 || "";
      const city = it.city || "";
      const state = it.state || "";
      const secondary =
        it.address_line2 ||
        [city, state, it.postcode, it.country].filter(Boolean).join(", ");

      return {
        id: it.place_id,
        label: street,         // street line
        secondary,             // full secondary line
        city,
        state,
        lon: it.lon,
        lat: it.lat,
      };
    });

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
