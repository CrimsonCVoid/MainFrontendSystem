/**
 * Organization SF Pool API Routes
 *
 * GET /api/orgs/[orgId]/sf-pool - Get pool balance and transaction history
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOrgContext } from "@/lib/org-auth";
import { hasPermission } from "@/lib/org-types";
import { calculatePoolState } from "@/lib/sf-pool";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/orgs/[orgId]/sf-pool
 * Get SF pool balance and recent transactions.
 * All org members can view the pool.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const orgContext = await getOrgContext(supabase, orgId);

  if (!orgContext) {
    return NextResponse.json({ error: "Organization not found or access denied" }, { status: 404 });
  }

  // All members can view the pool (members:read permission)
  if (!hasPermission(orgContext.role, "members:read")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Get pool state from org
  const pool = calculatePoolState(
    orgContext.org.sf_pool_total,
    orgContext.org.sf_pool_used,
    orgContext.org.sf_pool_updated_at
  );

  // Get URL params for pagination
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Get transaction history
  const { data: transactions, error: txError, count } = await supabase
    .from("sf_pool_transactions")
    .select(
      `
      id,
      org_id,
      user_id,
      project_id,
      transaction_type,
      sf_amount,
      sf_balance_after,
      price_cents,
      stripe_payment_id,
      notes,
      created_at,
      users!sf_pool_transactions_user_id_fkey (
        id,
        email,
        full_name
      ),
      projects (
        id,
        name
      )
    `,
      { count: "exact" }
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (txError) {
    console.error("Failed to fetch SF transactions:", txError);
    // Return pool without transactions if there's an error
    return NextResponse.json({
      pool,
      transactions: [],
      pagination: { total: 0, limit, offset },
      can_purchase: hasPermission(orgContext.role, "org:billing"),
    });
  }

  // Transform transactions to include user and project data inline
  const transformedTransactions = (transactions || []).map((tx: any) => ({
    id: tx.id,
    org_id: tx.org_id,
    user_id: tx.user_id,
    project_id: tx.project_id,
    transaction_type: tx.transaction_type,
    sf_amount: tx.sf_amount,
    sf_balance_after: tx.sf_balance_after,
    price_cents: tx.price_cents,
    stripe_payment_id: tx.stripe_payment_id,
    notes: tx.notes,
    created_at: tx.created_at,
    user: tx.users,
    project: tx.projects,
  }));

  return NextResponse.json({
    pool,
    transactions: transformedTransactions,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
    can_purchase: hasPermission(orgContext.role, "org:billing"),
  });
}
