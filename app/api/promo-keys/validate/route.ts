/**
 * PROMO KEY VALIDATION API
 *
 * POST /api/promo-keys/validate
 *
 * Validates and applies a promotional key to unlock a project.
 * Supports multi-credit keys (e.g., keys with 3 project credits).
 *
 * Key features:
 * - Authenticates user and verifies project ownership
 * - Validates key format before database lookup
 * - Supports keys with multiple credits
 * - Uses SECURITY DEFINER function for atomic operations
 * - Complete audit trail (user_id, project_id, timestamp)
 *
 * Request body:
 * {
 *   keyCode: string,
 *   projectId: string,
 *   userId: string
 * }
 *
 * Response:
 * Success: { success: true, message: "...", creditsRemaining: number }
 * Error: { success: false, error: "Error message" }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { normalizeKeyInput } from "@/lib/promo-keys";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyCode, projectId, userId } = body;

    // Validate required fields
    if (!keyCode || !projectId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Normalize key (remove dashes, spaces, uppercase)
    const normalizedKey = normalizeKeyInput(keyCode);

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
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use RPC function to redeem promo key (handles multi-credit keys atomically)
    const { data, error } = await supabase.rpc("redeem_promo_key", {
      p_key_code: normalizedKey,
      p_user_id: userId,
      p_project_id: projectId,
    });

    if (error) {
      console.error("[Promo Key] RPC error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to process promo code" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Failed to process promo code" },
        { status: 500 }
      );
    }

    // Check if the function returned an error
    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || "Invalid promo code" },
        { status: 400 }
      );
    }

    // Success - log for audit trail
    console.log(`[Promo Key] Key redeemed for project ${projectId} by user ${userId}. Credits remaining: ${data.credits_remaining}`);

    return NextResponse.json({
      success: true,
      message: data.message || "Project unlocked successfully!",
      creditsRemaining: data.credits_remaining,
    });

  } catch (error: any) {
    console.error("[Promo Key] Validation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
