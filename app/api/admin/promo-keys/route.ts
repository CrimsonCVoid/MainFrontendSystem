/**
 * ADMIN PROMO KEYS API
 *
 * GET /api/admin/promo-keys
 *
 * Lists all promo keys with their status and usage information.
 * Only accessible by organization admins.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    // Create authenticated Supabase client
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

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get promo keys with usage info
    const { data: promoKeys, error } = await supabase
      .from("promo_keys")
      .select(`
        id,
        key_code,
        is_used,
        used_by_user_id,
        used_for_project_id,
        used_at,
        created_at,
        created_by,
        metadata,
        notes,
        credits_total,
        credits_remaining
      `)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Admin Promo Keys] Error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch promo keys" },
        { status: 500 }
      );
    }

    // Get user emails for used keys
    const usedByIds = promoKeys
      ?.filter((k) => k.used_by_user_id)
      .map((k) => k.used_by_user_id) || [];

    let usersMap: Record<string, { email: string; full_name: string | null }> = {};

    if (usedByIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, full_name")
        .in("id", usedByIds);

      if (users) {
        usersMap = users.reduce((acc, u) => {
          acc[u.id] = { email: u.email, full_name: u.full_name };
          return acc;
        }, {} as Record<string, { email: string; full_name: string | null }>);
      }
    }

    // Enrich keys with user info
    const enrichedKeys = promoKeys?.map((key) => ({
      ...key,
      used_by_user: key.used_by_user_id ? usersMap[key.used_by_user_id] || null : null,
    })) || [];

    // Calculate summary stats
    const stats = {
      total: enrichedKeys.length,
      unused: enrichedKeys.filter((k) => k.credits_remaining === k.credits_total).length,
      partiallyUsed: enrichedKeys.filter((k) => k.credits_remaining > 0 && k.credits_remaining < k.credits_total).length,
      fullyUsed: enrichedKeys.filter((k) => k.credits_remaining === 0).length,
      totalCredits: enrichedKeys.reduce((sum, k) => sum + k.credits_total, 0),
      remainingCredits: enrichedKeys.reduce((sum, k) => sum + k.credits_remaining, 0),
    };

    return NextResponse.json({
      success: true,
      keys: enrichedKeys,
      stats,
    });
  } catch (error: any) {
    console.error("[Admin Promo Keys] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
