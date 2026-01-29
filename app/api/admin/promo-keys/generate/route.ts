/**
 * ADMIN PROMO KEY GENERATION API
 *
 * POST /api/admin/promo-keys/generate
 *
 * Generates bulk promotional keys and inserts them into the database.
 * Admin-only endpoint for creating new promo key batches.
 *
 * Request body:
 * {
 *   count: number  // Number of keys to generate (default: 100)
 * }
 *
 * Response:
 * Success: { success: true, keys: Array<{keyCode: string, formattedKey: string}>, count: number }
 * Error: { success: false, error: "Error message" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { generatePromoKeys } from "@/lib/promo-keys";

export async function POST(request: NextRequest) {
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

    // TODO: Add proper admin role check
    // For now, any authenticated user can generate keys
    // In production, check user role from database:
    // const { data: profile } = await supabase
    //   .from("users")
    //   .select("role")
    //   .eq("id", user.id)
    //   .single();
    //
    // if (profile?.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 });
    // }

    const body = await request.json();
    const count = body.count || 100;

    // Validate count
    if (count < 1 || count > 1000) {
      return NextResponse.json(
        { success: false, error: "Count must be between 1 and 1000" },
        { status: 400 }
      );
    }

    // Generate unique promo keys
    console.log(`[Admin] Generating ${count} promo keys...`);
    const keys = generatePromoKeys(count);

    // Use service role client for database insertion
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Prepare keys for database insertion
    const keysToInsert = keys.map((k) => ({
      key_code: k.keyCode,
      created_by: user.email || user.id,
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by_email: user.email,
      },
    }));

    // Insert keys into database
    const { data, error } = await supabaseAdmin
      .from("promo_keys")
      .insert(keysToInsert)
      .select();

    if (error) {
      console.error("[Admin] Failed to insert promo keys:", error);
      return NextResponse.json(
        { success: false, error: "Failed to insert keys into database" },
        { status: 500 }
      );
    }

    console.log(`[Admin] Successfully generated ${data.length} promo keys by ${user.email}`);

    return NextResponse.json({
      success: true,
      keys: keys,
      count: data.length,
    });

  } catch (error: any) {
    console.error("[Admin] Promo key generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
