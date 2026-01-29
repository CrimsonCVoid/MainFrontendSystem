/**
 * ADMIN PROMO KEY LIST API
 *
 * GET /api/admin/promo-keys/list
 *
 * Retrieves all promotional keys with usage status.
 * Admin-only endpoint for viewing and managing promo keys.
 *
 * Query parameters:
 * - status: 'all' | 'used' | 'unused' (default: 'all')
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 *
 * Response:
 * Success: { success: true, keys: Array<PromoKey>, total: number }
 * Error: { success: false, error: "Error message" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - not logged in" },
        { status: 401 }
      );
    }

    // TODO: Add proper admin role check (same as generate endpoint)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Use service role client for database query
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let query = supabaseAdmin
      .from("promo_keys")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if specified
    if (status === "used") {
      query = query.eq("is_used", true);
    } else if (status === "unused") {
      query = query.eq("is_used", false);
    }

    const { data: keys, error, count } = await query;

    if (error) {
      console.error("[Admin] Failed to fetch promo keys:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch keys" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keys: keys || [],
      total: count || 0,
    });

  } catch (error: any) {
    console.error("[Admin] Promo key list error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
