import { getActivePremiumSubscription } from "./subscription-service";

export async function requirePremiumAccess(userId: number) {
  const subscription = await getActivePremiumSubscription(userId);
  if (!subscription) {
    throw new Error("Cette fonctionnalité est réservée aux abonnés AfriTok Premium actifs.");
  }
  return subscription;
}
