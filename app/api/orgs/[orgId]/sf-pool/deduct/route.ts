/**
 * SF Pool Deduct API
 *
 * POST /api/orgs/[orgId]/sf-pool/deduct
 *
 * Deducts SF from the pool for a project.
 * Called when a project's roof data is ready and needs to be "unlocked".
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { calculatePoolState } from "@/lib/sf-pool";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * POST /api/orgs/[orgId]/sf-pool/deduct
 *
 * Deducts SF from the organization's pool for a project.
 * Body: { projectId: string, squareFootage: number }
 *
 * Returns:
 * - 200: Success with updated pool balance
 * - 400: Insufficient SF or invalid input
 * - 403: Insufficient permissions
 * - 404: Project or org not found
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { projectId, squareFootage, notes } = body;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  if (typeof squareFootage !== "number" || squareFootage <= 0) {
    return NextResponse.json({ error: "Square footage must be a positive number" }, { status: 400 });
  }

  // Verify project exists and belongs to this org
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("id, name, organization_id, user_id, payment_completed, square_footage")
    .eq("id", projectId)
    .single();

  if (projectError || !projectData) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = projectData as { id: string; name: string; organization_id: string | null; user_id: string; payment_completed: boolean | null; square_footage: number | null };

  if (project.organization_id !== orgId) {
    return NextResponse.json({ error: "Project does not belong to this organization" }, { status: 403 });
  }

  // Check if project is already unlocked
  if (project.payment_completed) {
    return NextResponse.json({
      success: true,
      message: "Project is already unlocked",
      already_unlocked: true,
      pool: calculatePoolState(
        orgContext.org.sf_pool_total,
        orgContext.org.sf_pool_used,
        orgContext.org.sf_pool_updated_at
      ),
    });
  }

  // Check current pool balance
  const currentPool = calculatePoolState(
    orgContext.org.sf_pool_total,
    orgContext.org.sf_pool_used,
    orgContext.org.sf_pool_updated_at
  );

  if (squareFootage > currentPool.remaining) {
    return NextResponse.json(
      {
        error: "Insufficient square footage in pool",
        required: squareFootage,
        available: currentPool.remaining,
        pool: currentPool,
      },
      { status: 400 }
    );
  }

  // Use service role to call the deduct function
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Call the deduct function
  const { data: result, error: deductError } = await supabaseAdmin.rpc("deduct_sf_from_pool", {
    p_org_id: orgId,
    p_user_id: orgContext.membership.user_id,
    p_project_id: projectId,
    p_sf_amount: Math.ceil(squareFootage), // Round up to ensure we always deduct enough
    p_notes: notes || `Unlocked project: ${project.name}`,
  });

  if (deductError) {
    console.error("Failed to deduct SF from pool:", deductError);
    return NextResponse.json({ error: "Failed to deduct from pool" }, { status: 500 });
  }

  const deductResult = result as { success: boolean; message: string; remaining: number };

  if (!deductResult.success) {
    return NextResponse.json(
      {
        error: deductResult.message,
        pool: currentPool,
      },
      { status: 400 }
    );
  }

  // Mark the project as paid/unlocked
  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({
      payment_completed: true,
      payment_required: false,
      payment_id: `sf_pool_${Date.now()}`,
      square_footage: squareFootage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) {
    console.error("Failed to update project:", updateError);
    // Note: SF has already been deducted, but project wasn't marked as unlocked
    // This is a partial failure state
    return NextResponse.json(
      {
        error: "SF deducted but failed to unlock project. Please contact support.",
        sf_deducted: true,
      },
      { status: 500 }
    );
  }

  // Return success with updated pool balance
  return NextResponse.json({
    success: true,
    message: `Successfully unlocked project with ${squareFootage} SF`,
    sf_deducted: Math.ceil(squareFootage),
    pool: {
      total: orgContext.org.sf_pool_total,
      used: (orgContext.org.sf_pool_used || 0) + Math.ceil(squareFootage),
      remaining: deductResult.remaining,
    },
  });
}
