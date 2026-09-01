import { getActivePremiumSubscription } from "./subscription-service";

export const PREMIUM_EARLY_ACCESS_FEATURES = [
  "advanced_analytics",
  "premium_profile_theme",
  "premium_badge",
  "premium_video_hd",
  "premium_video_scheduling",
  "premium_comment_controls",
] as const;

export async function hasPremiumEarlyAccess(userId: number, feature: string) {
  const subscription = await getActivePremiumSubscription(userId);
  if (!subscription) return false;
  return (PREMIUM_EARLY_ACCESS_FEATURES as readonly string[]).includes(feature);
}
