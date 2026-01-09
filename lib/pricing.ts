/**
 * PRICING ENGINE
 *
 * Handles subscription + per-project pricing calculations.
 * All prices are in cents (Stripe format).
 *
 * KY - PRICING MODEL:
 * - $10/month subscription (optional, but saves money for frequent users)
 * - Per-project fees based on roof square footage tiers:
 *   - 0-1,500 SF: $50
 *   - 1,501-3,000 SF: $60
 *   - 3,001-4,500 SF: $70
 *   - 4,501-6,000 SF: $80
 *   - 6,001+ SF: $100
 *
 * KY - HOW IT WORKS:
 * - User can pay per-project without subscription
 * - OR pay $10/month subscription for unlimited projects
 * - square_footage comes from roof_data.total_area_sf (your algorithm output)
 * - Stripe integration uses these functions to calculate amounts
 *
 * KY - KEY FUNCTIONS:
 * - getPricingTier(sf): Returns price tier for given square footage
 * - calculateProjectPrice(sf): Returns project fee in cents
 * - hasActiveSubscription(user): Checks if user has active monthly subscription
 * - calculateTotalProjectCost(sf, hasSub): Returns total cost breakdown
 */

export const MONTHLY_SUBSCRIPTION_FEE = 1000; // $10 in cents

export interface PricingTier {
  minSF: number;
  maxSF: number | null;
  price: number;
  priceDisplay: string;
  label: string;
}

export const PROJECT_PRICING_TIERS: PricingTier[] = [
  { minSF: 0, maxSF: 1500, price: 5000, priceDisplay: "$50", label: "0-1,500" },
  { minSF: 1501, maxSF: 3000, price: 6000, priceDisplay: "$60", label: "1,501-3,000" },
  { minSF: 3001, maxSF: 4500, price: 7000, priceDisplay: "$70", label: "3,001-4,500" },
  { minSF: 4501, maxSF: 6000, price: 8000, priceDisplay: "$80", label: "4,501-6,000" },
  { minSF: 6001, maxSF: null, price: 10000, priceDisplay: "$100", label: "6,001+" },
];

// Legacy alias - use calculateProjectPrice instead
export function calculatePrice(squareFootage: number): number {
  return calculateProjectPrice(squareFootage);
}

/**
 * Calculate project fee based on square footage
 * KY: Pass square_footage from project.roof_data.total_area_sf
 */
export function calculateProjectPrice(squareFootage: number): number {
  const tier = PROJECT_PRICING_TIERS.find(t =>
    squareFootage >= t.minSF && (t.maxSF === null || squareFootage <= t.maxSF)
  );
  return tier?.price || PROJECT_PRICING_TIERS[PROJECT_PRICING_TIERS.length - 1].price;
}

/**
 * Get pricing tier object for given square footage
 * Returns tier with price, label, and range info
 */
export function getPricingTier(squareFootage: number): PricingTier {
  const tier = PROJECT_PRICING_TIERS.find(t =>
    squareFootage >= t.minSF && (t.maxSF === null || squareFootage <= t.maxSF)
  );
  return tier || PROJECT_PRICING_TIERS[PROJECT_PRICING_TIERS.length - 1];
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
 * Calculate total cost for a project including subscription fee if needed
 * Returns breakdown with subscription fee, project fee, and total
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
  const tier = getPricingTier(squareFootage);
  const projectFee = tier.price;
  const subscriptionFee = hasSubscription ? 0 : MONTHLY_SUBSCRIPTION_FEE;

  return {
    subscriptionFee,
    projectFee,
    total: subscriptionFee + projectFee,
    breakdown: hasSubscription
      ? `${tier.priceDisplay} project fee (${tier.label} SF)`
      : `$10 monthly subscription + ${tier.priceDisplay} project fee (${tier.label} SF)`,
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
