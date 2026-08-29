export const AFRITOK_PREMIUM_PLANS = [
  { id: "week", label: "1 semaine", price: 1000, durationDays: 7 },
  { id: "month", label: "1 mois", price: 3000, durationDays: 30 },
  { id: "quarter", label: "3 mois", price: 7500, durationDays: 90 },
  { id: "year", label: "1 an", price: 25000, durationDays: 365 },
] as const;

export type PremiumPlanId = (typeof AFRITOK_PREMIUM_PLANS)[number]["id"];

export function getPremiumPlan(planId: string) {
  return AFRITOK_PREMIUM_PLANS.find((plan) => plan.id === planId) ?? null;
}
