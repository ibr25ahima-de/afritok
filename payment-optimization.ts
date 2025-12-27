/**
 * Payment Optimization Module
 * Optimizes payment conditions to dominate TikTok
 * Afritok conditions are BETTER than TikTok in every way
 */

export interface PaymentConditions {
  minimumThreshold: number; // Seuil minimum de paiement
  minimumAccountAge: number; // Jours
  minimumFollowers: number;
  minimumEngagementRate: number; // Pourcentage
  paymentFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  commissionRate: number; // Pourcentage que Afritok prend
  creatorRate: number; // Pourcentage que le créateur reçoit
}

// AFRITOK CONDITIONS - BETTER THAN TIKTOK
export const AFRITOK_CONDITIONS: Record<string, PaymentConditions> = {
  creator_rewards: {
    minimumThreshold: 0.50, // $0.50 vs TikTok $1.00 ✅ BETTER
    minimumAccountAge: 7, // 7 jours vs TikTok 30 jours ✅ BETTER
    minimumFollowers: 100, // 100 vs TikTok 1,000 ✅ BETTER
    minimumEngagementRate: 0.5, // 0.5% vs TikTok 1% ✅ BETTER
    paymentFrequency: 'weekly', // Hebdomadaire vs TikTok mensuel ✅ BETTER
    commissionRate: 0.20, // 20% vs TikTok 45% ✅ BETTER
    creatorRate: 0.80, // 80% pour créateur vs TikTok 55% ✅ BETTER
  },

  virtual_gifts: {
    minimumThreshold: 0.50, // $0.50 vs TikTok $1.00 ✅ BETTER
    minimumAccountAge: 3, // 3 jours vs TikTok 14 jours ✅ BETTER
    minimumFollowers: 50, // 50 vs TikTok 1,000 ✅ BETTER
    minimumEngagementRate: 0.1, // 0.1% vs TikTok 1% ✅ BETTER
    paymentFrequency: 'daily', // Quotidien vs TikTok mensuel ✅ BETTER
    commissionRate: 0.25, // 25% vs TikTok 50% ✅ BETTER
    creatorRate: 0.75, // 75% pour créateur vs TikTok 50% ✅ BETTER
  },

  live_streaming: {
    minimumThreshold: 0.50, // $0.50 vs TikTok $2.00 ✅ BETTER
    minimumAccountAge: 7, // 7 jours vs TikTok 30 jours ✅ BETTER
    minimumFollowers: 100, // 100 vs TikTok 1,000 ✅ BETTER
    minimumEngagementRate: 0.5, // 0.5% vs TikTok 2% ✅ BETTER
    paymentFrequency: 'weekly', // Hebdomadaire vs TikTok mensuel ✅ BETTER
    commissionRate: 0.15, // 15% vs TikTok 50% ✅ BETTER
    creatorRate: 0.85, // 85% pour créateur vs TikTok 50% ✅ BETTER
  },

  brand_partnerships: {
    minimumThreshold: 25.0, // $25 vs TikTok $100 ✅ BETTER
    minimumAccountAge: 14, // 14 jours vs TikTok 90 jours ✅ BETTER
    minimumFollowers: 1000, // 1,000 vs TikTok 10,000 ✅ BETTER
    minimumEngagementRate: 1.0, // 1% vs TikTok 3% ✅ BETTER
    paymentFrequency: 'weekly', // Hebdomadaire vs TikTok mensuel ✅ BETTER
    commissionRate: 0.10, // 10% vs TikTok 30% ✅ BETTER
    creatorRate: 0.90, // 90% pour créateur vs TikTok 70% ✅ BETTER
  },

  shop_sales: {
    minimumThreshold: 0.50, // $0.50 vs TikTok $5.00 ✅ BETTER
    minimumAccountAge: 7, // 7 jours vs TikTok 30 jours ✅ BETTER
    minimumFollowers: 50, // 50 vs TikTok 1,000 ✅ BETTER
    minimumEngagementRate: 0.1, // 0.1% vs TikTok 1% ✅ BETTER
    paymentFrequency: 'weekly', // Hebdomadaire vs TikTok mensuel ✅ BETTER
    commissionRate: 0.10, // 10% vs TikTok 20% ✅ BETTER
    creatorRate: 0.90, // 90% pour créateur vs TikTok 80% ✅ BETTER
  },

  affiliate_marketing: {
    minimumThreshold: 0.50, // $0.50 vs TikTok $2.00 ✅ BETTER
    minimumAccountAge: 7, // 7 jours vs TikTok 30 jours ✅ BETTER
    minimumFollowers: 100, // 100 vs TikTok 1,000 ✅ BETTER
    minimumEngagementRate: 0.5, // 0.5% vs TikTok 1% ✅ BETTER
    paymentFrequency: 'weekly', // Hebdomadaire vs TikTok mensuel ✅ BETTER
    commissionRate: 0.05, // 5% vs TikTok 15% ✅ BETTER
    creatorRate: 0.95, // 95% pour créateur vs TikTok 85% ✅ BETTER
  },

  music_revenue: {
    minimumThreshold: 0.50, // $0.50 vs TikTok $1.00 ✅ BETTER
    minimumAccountAge: 7, // 7 jours vs TikTok 30 jours ✅ BETTER
    minimumFollowers: 0, // 0 vs TikTok 1,000 ✅ BETTER
    minimumEngagementRate: 0.0, // 0% vs TikTok 1% ✅ BETTER
    paymentFrequency: 'weekly', // Hebdomadaire vs TikTok mensuel ✅ BETTER
    commissionRate: 0.20, // 20% vs TikTok 50% ✅ BETTER
    creatorRate: 0.80, // 80% pour créateur vs TikTok 50% ✅ BETTER
  },

  micro_earnings: {
    minimumThreshold: 0.01, // $0.01 - UNIQUE À AFRITOK ✅ UNIQUE
    minimumAccountAge: 0, // Immédiat - UNIQUE À AFRITOK ✅ UNIQUE
    minimumFollowers: 0, // Pas besoin - UNIQUE À AFRITOK ✅ UNIQUE
    minimumEngagementRate: 0.0, // Pas besoin - UNIQUE À AFRITOK ✅ UNIQUE
    paymentFrequency: 'daily', // Quotidien - UNIQUE À AFRITOK ✅ UNIQUE
    commissionRate: 0.20, // 20% vs TikTok N/A ✅ BETTER
    creatorRate: 0.80, // 80% pour utilisateur vs TikTok N/A ✅ BETTER
  },
};

// TIKTOK CONDITIONS - FOR COMPARISON
export const TIKTOK_CONDITIONS: Record<string, PaymentConditions> = {
  creator_rewards: {
    minimumThreshold: 1.0,
    minimumAccountAge: 30,
    minimumFollowers: 1000,
    minimumEngagementRate: 1.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.45,
    creatorRate: 0.55,
  },

  virtual_gifts: {
    minimumThreshold: 1.0,
    minimumAccountAge: 14,
    minimumFollowers: 1000,
    minimumEngagementRate: 1.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.50,
    creatorRate: 0.50,
  },

  live_streaming: {
    minimumThreshold: 2.0,
    minimumAccountAge: 30,
    minimumFollowers: 1000,
    minimumEngagementRate: 2.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.50,
    creatorRate: 0.50,
  },

  brand_partnerships: {
    minimumThreshold: 100.0,
    minimumAccountAge: 90,
    minimumFollowers: 10000,
    minimumEngagementRate: 3.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.30,
    creatorRate: 0.70,
  },

  shop_sales: {
    minimumThreshold: 5.0,
    minimumAccountAge: 30,
    minimumFollowers: 1000,
    minimumEngagementRate: 1.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.20,
    creatorRate: 0.80,
  },

  affiliate_marketing: {
    minimumThreshold: 2.0,
    minimumAccountAge: 30,
    minimumFollowers: 1000,
    minimumEngagementRate: 1.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.15,
    creatorRate: 0.85,
  },

  music_revenue: {
    minimumThreshold: 1.0,
    minimumAccountAge: 30,
    minimumFollowers: 1000,
    minimumEngagementRate: 1.0,
    paymentFrequency: 'monthly',
    commissionRate: 0.50,
    creatorRate: 0.50,
  },
};

/**
 * Compare Afritok vs TikTok conditions
 */
export function compareConditions(system: string): {
  afritok: PaymentConditions;
  tiktok: PaymentConditions;
  afritokAdvantage: string[];
} {
  const afritok = AFRITOK_CONDITIONS[system];
  const tiktok = TIKTOK_CONDITIONS[system];
  const advantages: string[] = [];

  if (afritok.minimumThreshold < tiktok.minimumThreshold) {
    advantages.push(`Seuil minimum ${afritok.minimumThreshold}x plus bas ($${afritok.minimumThreshold} vs $${tiktok.minimumThreshold})`);
  }

  if (afritok.minimumAccountAge < tiktok.minimumAccountAge) {
    advantages.push(`Compte ${afritok.minimumAccountAge}x plus jeune (${afritok.minimumAccountAge}j vs ${tiktok.minimumAccountAge}j)`);
  }

  if (afritok.minimumFollowers < tiktok.minimumFollowers) {
    advantages.push(`Followers ${afritok.minimumFollowers}x moins requis (${afritok.minimumFollowers} vs ${tiktok.minimumFollowers})`);
  }

  if (afritok.minimumEngagementRate < tiktok.minimumEngagementRate) {
    advantages.push(`Engagement ${afritok.minimumEngagementRate}x moins exigeant (${afritok.minimumEngagementRate}% vs ${tiktok.minimumEngagementRate}%)`);
  }

  const frequencyOrder = { daily: 4, 'bi-weekly': 3, weekly: 2, monthly: 1 };
  if (frequencyOrder[afritok.paymentFrequency] > frequencyOrder[tiktok.paymentFrequency]) {
    advantages.push(`Paiements ${afritok.paymentFrequency} (vs ${tiktok.paymentFrequency} chez TikTok)`);
  }

  if (afritok.commissionRate < tiktok.commissionRate) {
    advantages.push(`Commission ${((tiktok.commissionRate - afritok.commissionRate) * 100).toFixed(0)}% plus basse (${(afritok.commissionRate * 100).toFixed(0)}% vs ${(tiktok.commissionRate * 100).toFixed(0)}%)`);
  }

  if (afritok.creatorRate > tiktok.creatorRate) {
    advantages.push(`Créateurs gagnent ${((afritok.creatorRate - tiktok.creatorRate) * 100).toFixed(0)}% plus (${(afritok.creatorRate * 100).toFixed(0)}% vs ${(tiktok.creatorRate * 100).toFixed(0)}%)`);
  }

  return { afritok, tiktok, afritokAdvantage: advantages };
}

/**
 * Get payment eligibility for user
 */
export function checkPaymentEligibility(
  system: string,
  userStats: {
    accountAge: number;
    followers: number;
    engagementRate: number;
    totalEarnings: number;
  }
): { eligible: boolean; reasons: string[] } {
  const conditions = AFRITOK_CONDITIONS[system];
  if (!conditions) {
    return { eligible: false, reasons: ['System not found'] };
  }

  const reasons: string[] = [];

  if (userStats.accountAge < conditions.minimumAccountAge) {
    reasons.push(`Account too young: ${userStats.accountAge}/${conditions.minimumAccountAge} days`);
  }

  if (userStats.followers < conditions.minimumFollowers) {
    reasons.push(`Not enough followers: ${userStats.followers}/${conditions.minimumFollowers}`);
  }

  if (userStats.engagementRate < conditions.minimumEngagementRate) {
    reasons.push(`Engagement rate too low: ${userStats.engagementRate}%/${conditions.minimumEngagementRate}%`);
  }

  if (userStats.totalEarnings < conditions.minimumThreshold) {
    reasons.push(`Earnings below threshold: $${userStats.totalEarnings}/$${conditions.minimumThreshold}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Calculate potential earnings with Afritok vs TikTok
 */
export function calculateEarningsDifference(
  system: string,
  baseAmount: number
): {
  afritokEarnings: number;
  tiktokEarnings: number;
  difference: number;
  percentageBetter: number;
} {
  const afritok = AFRITOK_CONDITIONS[system];
  const tiktok = TIKTOK_CONDITIONS[system];

  const afritokEarnings = baseAmount * afritok.creatorRate;
  const tiktokEarnings = baseAmount * tiktok.creatorRate;
  const difference = afritokEarnings - tiktokEarnings;
  const percentageBetter = ((difference / tiktokEarnings) * 100);

  return {
    afritokEarnings: parseFloat(afritokEarnings.toFixed(2)),
    tiktokEarnings: parseFloat(tiktokEarnings.toFixed(2)),
    difference: parseFloat(difference.toFixed(2)),
    percentageBetter: parseFloat(percentageBetter.toFixed(1)),
  };
}

/**
 * Generate comparison report
 */
export function generateComparisonReport(): string {
  let report = '# Afritok vs TikTok - Conditions de Paiement\n\n';
  report += '## Résumé : Afritok DOMINE TikTok partout ✅\n\n';

  const systems = Object.keys(AFRITOK_CONDITIONS);

  for (const system of systems) {
    const comparison = compareConditions(system);
    report += `### ${system}\n`;
    report += `**Avantages Afritok :**\n`;
    for (const advantage of comparison.afritokAdvantage) {
      report += `- ✅ ${advantage}\n`;
    }
    report += '\n';
  }

  report += '## Conclusion\n';
  report += 'Afritok offre des conditions MEILLEURES que TikTok sur TOUS les systèmes de monétisation.\n';
  report += 'Les créateurs africains gagnent plus, plus vite, avec moins de conditions restrictives.\n';

  return report;
}
