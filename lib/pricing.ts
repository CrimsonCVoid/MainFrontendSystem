/**
 * PRICING ENGINE
 *
 * Simple flat-rate pricing for roof analysis projects.
 * All prices are in cents (Stripe format).
 *
 * PRICING MODEL:
 * - Single tier: Up to 50,000 sqft for $1,440
 * - No subscription required
 */

export const MONTHLY_SUBSCRIPTION_FEE = 0; // No subscription

// Single pricing tier
export const PROJECT_PRICE = 144000; // $1,440 in cents
export const MAX_SQFT = 50000; // 50,000 sqft limit

export interface PricingTier {
  minSF: number;
  maxSF: number | null;
  price: number;
  priceDisplay: string;
  label: string;
}

// Single tier for display
export const PROJECT_PRICING_TIERS: PricingTier[] = [
  { minSF: 0, maxSF: MAX_SQFT, price: PROJECT_PRICE, priceDisplay: "$1,440", label: "Up to 50,000" },
];

// Legacy alias - use calculateProjectPrice instead
export function calculatePrice(squareFootage: number): number {
  return calculateProjectPrice(squareFootage);
}

/**
 * Calculate project fee - flat rate of $1,440 for up to 50,000 sqft
 */
export function calculateProjectPrice(squareFootage: number): number {
  return PROJECT_PRICE;
}

/**
 * Get pricing tier object for given square footage
 * Returns the single pricing tier
 */
export function getPricingTier(squareFootage: number): PricingTier {
  return {
    minSF: 0,
    maxSF: MAX_SQFT,
    price: PROJECT_PRICE,
    priceDisplay: "$1,440",
    label: "Up to 50,000",
  };
}

/**
 * Check if user has active subscription
 * Active = status is "active" AND end date is in the future
 */
export function hasActiveSubscription(
  user?: { subscription_status?: string | null; subscription_current_period_end?: string | null } | null
): boolean {
  if (!user?.subscription_status) return false;
  if (user.subscription_status !== 'active') return false;
  if (!user.subscription_current_period_end) return false;
  return new Date(user.subscription_current_period_end) > new Date();
}

/**
 * Calculate total cost for a project
 * Returns breakdown with project fee and total
 */
export function calculateTotalProjectCost(
  squareFootage: number,
  hasSubscription?: boolean
): {
  subscriptionFee: number;
  projectFee: number;
  total: number;
  breakdown: string;
} {
  return {
    subscriptionFee: 0,
    projectFee: PROJECT_PRICE,
    total: PROJECT_PRICE,
    breakdown: `$1,440 for up to 50,000 SF`,
  };
}

/**
 * Format Stripe price (cents) as human-readable dollar amount
 * Example: 5000 -> "$50"
 */
export function formatPrice(priceInCents: number): string {
  const dollars = priceInCents / 100;
  return `$${dollars.toFixed(0)}`;
}

export function calculateMonthlyCost(
  projectsPerMonth: number,
  avgSquareFootage: number
): number {
  const tier = getPricingTier(avgSquareFootage);
  const projectCosts = tier.price * projectsPerMonth;
  const subscription = MONTHLY_SUBSCRIPTION_FEE;

  return projectCosts + subscription;
}

export function getExamplePricingTiers(): PricingTier[] {
  return PROJECT_PRICING_TIERS;
}

export const PRICING_TIERS: PricingTier[] = PROJECT_PRICING_TIERS;
