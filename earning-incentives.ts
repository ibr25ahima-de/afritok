/**
 * Earning Incentives System for Afritok
 * Motivates users to earn more through bonuses and rewards
 */

import { getDb } from './db';

export interface Incentive {
  id: string;
  userId: number;
  type: 'daily_bonus' | 'streak_bonus' | 'milestone_bonus' | 'referral_bonus' | 'activity_bonus' | 'withdrawal_bonus';
  title: string;
  description: string;
  amount: number; // in USD
  condition: string;
  status: 'available' | 'claimed' | 'expired';
  expiresAt: Date;
  claimedAt?: Date;
  createdAt: Date;
}

export interface UserStreak {
  userId: number;
  currentStreak: number; // consecutive days
  longestStreak: number;
  lastActivityDate: Date;
  totalDaysActive: number;
}

export interface Milestone {
  id: string;
  userId: number;
  type: 'earnings' | 'activities' | 'referrals' | 'withdrawals';
  target: number;
  current: number;
  reward: number;
  status: 'in_progress' | 'completed' | 'claimed';
  completedAt?: Date;
  claimedAt?: Date;
}

// Incentive configurations
export const INCENTIVE_CONFIG = {
  // Daily bonuses
  daily_login_bonus: 0.05, // $0.05 for daily login
  daily_activity_bonus: 0.10, // $0.10 if user does 10+ activities
  daily_watch_bonus: 0.05, // $0.05 if user watches 20+ videos

  // Streak bonuses (increasing with streak length)
  streak_bonus: {
    3: 0.50, // $0.50 for 3-day streak
    7: 1.0, // $1.00 for 7-day streak
    14: 2.0, // $2.00 for 14-day streak
    30: 5.0, // $5.00 for 30-day streak
    60: 10.0, // $10.00 for 60-day streak
    100: 25.0, // $25.00 for 100-day streak
  },

  // Milestone rewards
  milestones: {
    earnings_10: 1.0, // $1.00 bonus for reaching $10 earned
    earnings_50: 5.0, // $5.00 bonus for reaching $50 earned
    earnings_100: 10.0, // $10.00 bonus for reaching $100 earned
    earnings_500: 50.0, // $50.00 bonus for reaching $500 earned
    activities_100: 1.0, // $1.00 for 100 activities
    activities_500: 5.0, // $5.00 for 500 activities
    activities_1000: 10.0, // $10.00 for 1000 activities
    referrals_5: 5.0, // $5.00 for 5 referrals
    referrals_10: 10.0, // $10.00 for 10 referrals
    referrals_20: 25.0, // $25.00 for 20 referrals
  },

  // Referral bonuses
  referral_bonus: 0.50, // $0.50 per successful referral
  referral_milestone_bonus: 5.0, // $5.00 bonus for every 5 referrals

  // Activity bonuses
  activity_bonus_threshold: 10, // bonus if user does 10+ activities
  activity_bonus_amount: 0.10, // $0.10 bonus

  // Withdrawal bonuses
  withdrawal_bonus_rate: 0.02, // 2% bonus on withdrawal amount
  min_withdrawal_for_bonus: 10.0, // minimum $10 to get bonus
};

/**
 * Check and award daily bonuses
 */
export async function checkDailyBonuses(userId: number): Promise<Incentive[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const incentives: Incentive[] = [];

    // Check if user already got daily bonus today
    const alreadyGotDaily = await hasClaimedDailyBonus(userId);
    if (!alreadyGotDaily) {
      // Award daily login bonus
      const dailyBonus: Incentive = {
        id: `incentive-${Date.now()}`,
        userId,
        type: 'daily_bonus',
        title: 'Daily Login Bonus',
        description: 'Log in every day to earn extra money!',
        amount: INCENTIVE_CONFIG.daily_login_bonus,
        condition: 'daily_login',
        status: 'available',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      incentives.push(dailyBonus);
    }

    // Check for activity bonus
    const todayActivities = await getTodayActivityCount(userId);
    if (todayActivities >= INCENTIVE_CONFIG.activity_bonus_threshold) {
      const activityBonus: Incentive = {
        id: `incentive-${Date.now()}-activity`,
        userId,
        type: 'activity_bonus',
        title: 'Activity Bonus',
        description: `You did ${todayActivities} activities today! Here's a bonus.`,
        amount: INCENTIVE_CONFIG.activity_bonus_amount,
        condition: `${INCENTIVE_CONFIG.activity_bonus_threshold}+ activities`,
        status: 'available',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      incentives.push(activityBonus);
    }

    // Check for watch bonus
    const todayWatches = await getTodayWatchCount(userId);
    if (todayWatches >= 20) {
      const watchBonus: Incentive = {
        id: `incentive-${Date.now()}-watch`,
        userId,
        type: 'activity_bonus',
        title: 'Watch Bonus',
        description: 'You watched 20+ videos today! Keep it up!',
        amount: INCENTIVE_CONFIG.daily_watch_bonus,
        condition: '20+ videos watched',
        status: 'available',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      incentives.push(watchBonus);
    }

    // Save incentives to database
    for (const incentive of incentives) {
      // await db.insert(incentives).values(incentive);
    }

    return incentives;
  } catch (error) {
    console.error('Failed to check daily bonuses:', error);
    return [];
  }
}

/**
 * Check and award streak bonuses
 */
export async function checkStreakBonuses(userId: number): Promise<Incentive | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const streak = await getUserStreak(userId);
    if (!streak) return null;

    // Check if streak reached a milestone
    const streakMilestones = Object.keys(INCENTIVE_CONFIG.streak_bonus).map(Number).sort((a, b) => b - a);

    for (const milestone of streakMilestones) {
      if (streak.currentStreak === milestone) {
        // Award streak bonus
        const streakBonus: Incentive = {
          id: `incentive-${Date.now()}-streak`,
          userId,
          type: 'streak_bonus',
          title: `${milestone}-Day Streak! 🔥`,
          description: `Amazing! You've been active for ${milestone} days in a row!`,
          amount: INCENTIVE_CONFIG.streak_bonus[milestone as keyof typeof INCENTIVE_CONFIG.streak_bonus],
          condition: `${milestone}-day streak`,
          status: 'available',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        // Save to database
        // await db.insert(incentives).values(streakBonus);

        return streakBonus;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to check streak bonuses:', error);
    return null;
  }
}

/**
 * Check and award milestone bonuses
 */
export async function checkMilestoneBonuses(userId: number): Promise<Incentive[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const incentives: Incentive[] = [];

    // Get user statistics
    const totalEarned = await getUserTotalEarnings(userId);
    const totalActivities = await getUserTotalActivities(userId);
    const totalReferrals = await getUserTotalReferrals(userId);

    // Check earnings milestones
    const earningMilestones = [
      { target: 10, reward: INCENTIVE_CONFIG.milestones.earnings_10, label: '$10' },
      { target: 50, reward: INCENTIVE_CONFIG.milestones.earnings_50, label: '$50' },
      { target: 100, reward: INCENTIVE_CONFIG.milestones.earnings_100, label: '$100' },
      { target: 500, reward: INCENTIVE_CONFIG.milestones.earnings_500, label: '$500' },
    ];

    for (const milestone of earningMilestones) {
      const alreadyClaimed = await hasMilestoneClaimed(userId, `earnings_${milestone.target}`);
      if (totalEarned >= milestone.target && !alreadyClaimed) {
        const bonus: Incentive = {
          id: `incentive-${Date.now()}-earnings-${milestone.target}`,
          userId,
          type: 'milestone_bonus',
          title: `Milestone: ${milestone.label} Earned! 🎉`,
          description: `Congratulations! You've earned ${milestone.label}!`,
          amount: milestone.reward,
          condition: `${milestone.label} earned`,
          status: 'available',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        incentives.push(bonus);
      }
    }

    // Check activity milestones
    const activityMilestones = [
      { target: 100, reward: INCENTIVE_CONFIG.milestones.activities_100, label: '100' },
      { target: 500, reward: INCENTIVE_CONFIG.milestones.activities_500, label: '500' },
      { target: 1000, reward: INCENTIVE_CONFIG.milestones.activities_1000, label: '1000' },
    ];

    for (const milestone of activityMilestones) {
      const alreadyClaimed = await hasMilestoneClaimed(userId, `activities_${milestone.target}`);
      if (totalActivities >= milestone.target && !alreadyClaimed) {
        const bonus: Incentive = {
          id: `incentive-${Date.now()}-activities-${milestone.target}`,
          userId,
          type: 'milestone_bonus',
          title: `${milestone.label} Activities! 🚀`,
          description: `You've completed ${milestone.label} activities!`,
          amount: milestone.reward,
          condition: `${milestone.label} activities`,
          status: 'available',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        incentives.push(bonus);
      }
    }

    // Check referral milestones
    const referralMilestones = [
      { target: 5, reward: INCENTIVE_CONFIG.milestones.referrals_5, label: '5' },
      { target: 10, reward: INCENTIVE_CONFIG.milestones.referrals_10, label: '10' },
      { target: 20, reward: INCENTIVE_CONFIG.milestones.referrals_20, label: '20' },
    ];

    for (const milestone of referralMilestones) {
      const alreadyClaimed = await hasMilestoneClaimed(userId, `referrals_${milestone.target}`);
      if (totalReferrals >= milestone.target && !alreadyClaimed) {
        const bonus: Incentive = {
          id: `incentive-${Date.now()}-referrals-${milestone.target}`,
          userId,
          type: 'referral_bonus',
          title: `${milestone.label} Referrals! 👥`,
          description: `You've referred ${milestone.label} friends!`,
          amount: milestone.reward,
          condition: `${milestone.label} referrals`,
          status: 'available',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        incentives.push(bonus);
      }
    }

    // Save to database
    for (const incentive of incentives) {
      // await db.insert(incentives).values(incentive);
    }

    return incentives;
  } catch (error) {
    console.error('Failed to check milestone bonuses:', error);
    return [];
  }
}

/**
 * Award withdrawal bonus
 */
export async function awardWithdrawalBonus(userId: number, withdrawalAmount: number): Promise<Incentive | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    if (withdrawalAmount < INCENTIVE_CONFIG.min_withdrawal_for_bonus) {
      return null;
    }

    const bonusAmount = withdrawalAmount * INCENTIVE_CONFIG.withdrawal_bonus_rate;

    const bonus: Incentive = {
      id: `incentive-${Date.now()}-withdrawal`,
      userId,
      type: 'withdrawal_bonus',
      title: 'Withdrawal Bonus! 💳',
      description: `You got a ${(INCENTIVE_CONFIG.withdrawal_bonus_rate * 100).toFixed(0)}% bonus on your withdrawal!`,
      amount: bonusAmount,
      condition: `Withdraw $${withdrawalAmount.toFixed(2)}`,
      status: 'available',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    // Save to database
    // await db.insert(incentives).values(bonus);

    return bonus;
  } catch (error) {
    console.error('Failed to award withdrawal bonus:', error);
    return null;
  }
}

/**
 * Claim incentive
 */
export async function claimIncentive(incentiveId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Get incentive
    const incentive = await getIncentiveById(incentiveId);
    if (!incentive || incentive.status !== 'available') {
      return false;
    }

    // Check if expired
    if (new Date() > incentive.expiresAt) {
      return false;
    }

    // Update incentive status
    // UPDATE incentives SET status = 'claimed', claimedAt = NOW() WHERE id = ?

    // Add earnings to user
    // INSERT INTO microEarnings (userId, type, amount, description) VALUES (?, 'incentive', ?, ?)

    return true;
  } catch (error) {
    console.error('Failed to claim incentive:', error);
    return false;
  }
}

/**
 * Get available incentives for user
 */
export async function getAvailableIncentives(userId: number): Promise<Incentive[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implement with database query
    // SELECT * FROM incentives WHERE userId = ? AND status = 'available' AND expiresAt > NOW()

    return [];
  } catch (error) {
    console.error('Failed to get available incentives:', error);
    return [];
  }
}

// Helper functions
async function hasClaimedDailyBonus(userId: number): Promise<boolean> {
  // Check if user claimed daily bonus today
  return false;
}

async function getTodayActivityCount(userId: number): Promise<number> {
  return 0;
}

async function getTodayWatchCount(userId: number): Promise<number> {
  return 0;
}

async function getUserStreak(userId: number): Promise<UserStreak | null> {
  return null;
}

async function getUserTotalEarnings(userId: number): Promise<number> {
  return 0;
}

async function getUserTotalActivities(userId: number): Promise<number> {
  return 0;
}

async function getUserTotalReferrals(userId: number): Promise<number> {
  return 0;
}

async function hasMilestoneClaimed(userId: number, milestoneName: string): Promise<boolean> {
  return false;
}

async function getIncentiveById(incentiveId: string): Promise<Incentive | null> {
  return null;
}
