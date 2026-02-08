/**
 * LOGO UPLOAD API ENDPOINT
 *
 * POST /api/upload-logo
 *
 * Handles company logo uploads to Supabase Storage.
 * Updates user.company_logo_url with the public URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, WebP, SVG" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      );
    }

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${user.id}/logo-${Date.now()}.${ext}`;

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // If bucket doesn't exist, give helpful error
      if (uploadError.message.includes("not found")) {
        return NextResponse.json(
          { error: "Storage bucket not configured. Please create 'company-logos' bucket in Supabase." },
          { status: 500 }
        );
      }
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("company-logos")
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Update user record with logo URL
    const { error: updateError } = await supabase
      .from("users")
      .update({ company_logo_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Database update error:", updateError);
      // Don't fail - logo is uploaded, just couldn't save URL
    }

    console.log(`[Logo Upload] User ${user.id} uploaded logo: ${filename}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error("[Logo Upload] Error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
