/**
 * PROMO KEY ACCESS CONTROL
 *
 * Only specific users can see/use promo key functionality.
 */

// User IDs that have access to promo key features
const PROMO_KEY_ALLOWED_USERS = [
  "00113d34-ab12-4688-9812-31459a57b853",
  "41a653b2-a4cb-49f4-9cbe-b8adecc53636",
];

/**
 * Check if a user has access to promo key features
 */
export function canAccessPromoKeys(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return PROMO_KEY_ALLOWED_USERS.includes(userId);
}
