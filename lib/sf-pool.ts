/**
 * Square Footage Pool System
 *
 * Organizations get a base SF pool and can purchase more.
 * Members create projects that consume SF from the pool.
 *
 * Pricing:
 * - 50,000 SF: $1,440
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Base square footage that every new organization starts with.
 * This is a free allocation for organizations.
 */
export const ORG_BASE_SF = 50_000;

// ============================================
// TYPES
// ============================================

export interface SFPackage {
  id: string;
  sqft: number;
  priceCents: number;
  priceDisplay: string;
  label: string;
  description: string;
}

export interface SFPool {
  total: number;
  used: number;
  remaining: number;
  updatedAt: string | null;
}

export interface SFTransaction {
  id: string;
  org_id: string;
  user_id: string;
  project_id: string | null;
  transaction_type: "purchase" | "usage" | "refund" | "adjustment";
  sf_amount: number;
  sf_balance_after: number;
  price_cents: number | null;
  stripe_payment_id: string | null;
  stripe_session_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SFTransactionWithUser extends SFTransaction {
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
  project?: {
    id: string;
    name: string;
  } | null;
}

// ============================================
// SF PACKAGES (PRICING TIERS)
// ============================================

export const SF_PACKAGES: readonly SFPackage[] = [
  {
    id: "sf-50000",
    sqft: 50000,
    priceCents: 144000,
    priceDisplay: "$1,440",
    label: "50,000 SF",
    description: "Full access package",
  },
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a package by its ID
 */
export function getPackageById(packageId: string): SFPackage | undefined {
  return SF_PACKAGES.find((pkg) => pkg.id === packageId);
}

/**
 * Calculate the pool state from org data
 */
export function calculatePoolState(
  total: number | null,
  used: number | null,
  updatedAt: string | null
): SFPool {
  const t = total ?? 0;
  const u = used ?? 0;
  return {
    total: t,
    used: u,
    remaining: Math.max(0, t - u),
    updatedAt,
  };
}

/**
 * Format SF amount for display (e.g., "1,500 SF")
 */
export function formatSF(amount: number): string {
  return `${amount.toLocaleString()} SF`;
}

/**
 * Format price in cents to display string (e.g., "$50.00")
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate price per SF for a package
 */
export function getPricePerSF(pkg: SFPackage): number {
  return pkg.priceCents / pkg.sqft;
}

/**
 * Get the best value package (lowest price per SF)
 */
export function getBestValuePackage(): SFPackage {
  return SF_PACKAGES.reduce((best, pkg) =>
    getPricePerSF(pkg) < getPricePerSF(best) ? pkg : best
  );
}

/**
 * Check if pool has enough SF for a project
 */
export function hasEnoughSF(pool: SFPool, requiredSF: number): boolean {
  return pool.remaining >= requiredSF;
}

/**
 * Calculate percentage of pool used
 */
export function getPoolUsagePercent(pool: SFPool): number {
  if (pool.total === 0) return 0;
  return Math.round((pool.used / pool.total) * 100);
}

/**
 * Get pool status badge color based on remaining percentage
 */
export function getPoolStatusColor(pool: SFPool): "green" | "yellow" | "red" {
  const remaining = pool.total > 0 ? (pool.remaining / pool.total) * 100 : 0;
  if (remaining > 50) return "green";
  if (remaining > 20) return "yellow";
  return "red";
}

/**
 * Get a human-readable pool status message
 */
export function getPoolStatusMessage(pool: SFPool): string {
  if (pool.total === 0) {
    return "Pool not initialized";
  }

  const percent = getPoolUsagePercent(pool);

  if (pool.remaining === 0) {
    return "Pool depleted - purchase more SF";
  }

  if (percent >= 80) {
    return `Low balance - ${formatSF(pool.remaining)} remaining`;
  }

  return `${formatSF(pool.remaining)} available`;
}

/**
 * Format transaction type for display
 */
export function formatTransactionType(
  type: SFTransaction["transaction_type"]
): string {
  const labels: Record<SFTransaction["transaction_type"], string> = {
    purchase: "Purchase",
    usage: "Project Usage",
    refund: "Refund",
    adjustment: "Adjustment",
  };
  return labels[type];
}

/**
 * Get transaction type color for badges
 */
export function getTransactionTypeColor(
  type: SFTransaction["transaction_type"]
): string {
  const colors: Record<SFTransaction["transaction_type"], string> = {
    purchase: "bg-green-100 text-green-800",
    usage: "bg-blue-100 text-blue-800",
    refund: "bg-amber-100 text-amber-800",
    adjustment: "bg-neutral-100 text-neutral-800",
  };
  return colors[type];
}

/**
 * Suggest the best package based on average project SF
 */
export function suggestPackage(averageProjectSF: number): SFPackage {
  // Find the smallest package that covers the average project
  const suitable = SF_PACKAGES.find((pkg) => pkg.sqft >= averageProjectSF);
  return suitable || SF_PACKAGES[SF_PACKAGES.length - 1];
}

/**
 * Calculate how many projects a package could support
 */
export function estimateProjectCount(pkg: SFPackage, avgSF: number): number {
  if (avgSF <= 0) return 0;
  return Math.floor(pkg.sqft / avgSF);
}
