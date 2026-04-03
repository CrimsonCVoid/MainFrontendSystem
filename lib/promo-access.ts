/**
 * PROMO KEY ACCESS CONTROL
 *
 * Only specific users can see/use promo key functionality.
 */

// User IDs that have access to promo key features
const PROMO_KEY_ALLOWED_USERS = [
  "00113d34-ab12-4688-9812-31459a57b853",
<<<<<<< HEAD
  "41a653b2-a4cb-49f4-9cbe-b8adecc53636",
=======
  "58a1aae4-1484-4ef6-9388-90db602e7bc1",
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
];

/**
 * Check if a user has access to promo key features
 */
export function canAccessPromoKeys(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return PROMO_KEY_ALLOWED_USERS.includes(userId);
}
