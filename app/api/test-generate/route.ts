/**
 * TEST ONLY — unauthenticated proxy to backend for local development
 * TODO: Remove before deploying to production
 */
import { NextRequest, NextResponse } from "next/server";

const ALGORITHM_URL = process.env.ALGORITHM_API_URL || process.env.BACKEND_API_URL;
const ALGORITHM_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_API_KEY;

export async function POST(req: NextRequest) {
  if (!ALGORITHM_URL) {
    return NextResponse.json(
      { error: "ALGORITHM_API_URL not configured in .env.local" },
      { status: 503 }
    );
  }

  const { address } = await req.json();
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  console.log(`[test-generate] Calling backend with address: ${address}`);

  try {
    const res = await fetch(`${ALGORITHM_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALGORITHM_KEY ? { "x-api-key": ALGORITHM_KEY } : {}),
      },
      body: JSON.stringify({ address }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[test-generate] Backend error ${res.status}:`, errBody);
      return NextResponse.json(
        { error: `Backend returned ${res.status}`, details: errBody },
        { status: res.status }
      );
    }

    const roofData = await res.json();
    console.log(
      `[test-generate] Success — ${roofData.total_area_sf} SF, ${roofData.planes?.length} planes`
    );

    return NextResponse.json(roofData);
  } catch (err: any) {
    console.error("[test-generate] Failed:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to reach backend" },
      { status: 502 }
    );
  }
}
