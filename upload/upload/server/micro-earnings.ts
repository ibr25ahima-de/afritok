/**
 * Micro-Earnings System for Afritok
 * Allows ALL users to earn money without talent or skills
 * Revolutionary system for African creators and viewers
 */

import { eq, and, gte, lte } from 'drizzle-orm';
import { getDb } from './db';

export interface MicroEarning {
  id: string;
  userId: number;
  type: 'watch' | 'like' | 'comment' | 'share' | 'invite' | 'live_watch' | 'poll_vote' | 'challenge' | 'task';
  amount: number; // in USD
  videoId?: number;
  referredUserId?: number;
  taskId?: string;
  description: string;
  createdAt: Date;
  status: 'pending' | 'completed' | 'verified';
}

export interface UserBalance {
  userId: number;
  totalEarned: number;
  totalWithdrawn: number;
  currentBalance: number;
  dailyEarnings: number;
  monthlyEarnings: number;
  lastUpdated: Date;
}

// Earning rates (in USD) - AFRITOK PAIE PLUS
export const EARNING_RATES = {
  watch_video: 0.02, // TikTok 0 -> Afritok 0.02 UNIQUE
  like: 0.01, // TikTok 0 -> Afritok 0.01 UNIQUE
  comment: 0.02, // TikTok 0 -> Afritok 0.02 UNIQUE
  share: 0.05, // TikTok 0 -> Afritok 0.05 UNIQUE
  invite_friend: 1.00, // TikTok 0 -> Afritok 1.00 UNIQUE
  live_watch_per_minute: 0.01, // TikTok 0 -> Afritok 0.01 UNIQUE
  poll_vote: 0.02, // TikTok 0 -> Afritok 0.02 UNIQUE
  challenge_participation: 1.00, // TikTok 0 -> Afritok 1.00 UNIQUE
  simple_post: 0.10, // TikTok 0 -> Afritok 0.10 UNIQUE
  video_post: 0.25, // TikTok 0 -> Afritok 0.25 UNIQUE
  group_creation: 1.00, // TikTok 0 -> Afritok 1.00 UNIQUE
  group_invite_10: 2.50, // TikTok 0 -> Afritok 2.50 UNIQUE
  moderation: 0.05, // TikTok 0 -> Afritok 0.05 UNIQUE
  survey_response: 0.25, // TikTok 0 -> Afritok 0.25 UNIQUE
  app_test: 1.50, // TikTok 0 -> Afritok 1.50 UNIQUE
  review_write: 0.50, // TikTok 0 -> Afritok 0.50 UNIQUE
};

// Daily limits to prevent abuse
export const DAILY_LIMITS = {
  max_daily_earnings: 10.0, // Max $10 per day
  max_watches_per_day: 500, // Max 500 videos per day
  max_likes_per_day: 1000, // Max 1000 likes per day
  max_comments_per_day: 200, // Max 200 comments per day
  max_shares_per_day: 100, // Max 100 shares per day
};

/**
 * Record a watch earning
 */
export async function recordWatchEarning(
  userId: number,
  videoId: number,
  watchDuration: number // in seconds
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if watched for at least 30 seconds
    if (watchDuration < 30) return null;

    // Check daily limit
    const dailyWatches = await getDailyActivityCount(userId, 'watch');
    if (dailyWatches >= DAILY_LIMITS.max_watches_per_day) {
      return null;
    }

    // Check daily earnings limit
    const dailyEarnings = await getDailyEarnings(userId);
    const newAmount = EARNING_RATES.watch_video;
    if (dailyEarnings + newAmount > DAILY_LIMITS.max_daily_earnings) {
      return null;
    }

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'watch',
      amount: newAmount,
      videoId,
      description: `Watched video for ${watchDuration}s`,
      createdAt: new Date(),
      status: 'completed',
    };

    // Save to database (implement with your DB schema)
    // await db.insert(microEarnings).values(earning);

    return earning;
  } catch (error) {
    console.error('Failed to record watch earning:', error);
    return null;
  }
}

/**
 * Record a like earning
 */
export async function recordLikeEarning(
  userId: number,
  videoId: number
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check daily limit
    const dailyLikes = await getDailyActivityCount(userId, 'like');
    if (dailyLikes >= DAILY_LIMITS.max_likes_per_day) {
      return null;
    }

    // Check daily earnings limit
    const dailyEarnings = await getDailyEarnings(userId);
    const newAmount = EARNING_RATES.like;
    if (dailyEarnings + newAmount > DAILY_LIMITS.max_daily_earnings) {
      return null;
    }

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'like',
      amount: newAmount,
      videoId,
      description: 'Liked a video',
      createdAt: new Date(),
      status: 'completed',
    };

    return earning;
  } catch (error) {
    console.error('Failed to record like earning:', error);
    return null;
  }
}

/**
 * Record a comment earning
 */
export async function recordCommentEarning(
  userId: number,
  videoId: number,
  commentLength: number
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Minimum 3 characters to prevent spam
    if (commentLength < 3) return null;

    // Check daily limit
    const dailyComments = await getDailyActivityCount(userId, 'comment');
    if (dailyComments >= DAILY_LIMITS.max_comments_per_day) {
      return null;
    }

    // Check daily earnings limit
    const dailyEarnings = await getDailyEarnings(userId);
    const newAmount = EARNING_RATES.comment;
    if (dailyEarnings + newAmount > DAILY_LIMITS.max_daily_earnings) {
      return null;
    }

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'comment',
      amount: newAmount,
      videoId,
      description: `Commented on video (${commentLength} chars)`,
      createdAt: new Date(),
      status: 'completed',
    };

    return earning;
  } catch (error) {
    console.error('Failed to record comment earning:', error);
    return null;
  }
}

/**
 * Record a share earning
 */
export async function recordShareEarning(
  userId: number,
  videoId: number,
  platform: string
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check daily limit
    const dailyShares = await getDailyActivityCount(userId, 'share');
    if (dailyShares >= DAILY_LIMITS.max_shares_per_day) {
      return null;
    }

    // Check daily earnings limit
    const dailyEarnings = await getDailyEarnings(userId);
    const newAmount = EARNING_RATES.share;
    if (dailyEarnings + newAmount > DAILY_LIMITS.max_daily_earnings) {
      return null;
    }

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'share',
      amount: newAmount,
      videoId,
      description: `Shared video on ${platform}`,
      createdAt: new Date(),
      status: 'completed',
    };

    return earning;
  } catch (error) {
    console.error('Failed to record share earning:', error);
    return null;
  }
}

/**
 * Record an invite earning
 */
export async function recordInviteEarning(
  userId: number,
  referredUserId: number
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if user was already invited by someone else
    const existingInvite = await getInviteHistory(referredUserId);
    if (existingInvite) {
      return null; // User already has a referrer
    }

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'invite',
      amount: EARNING_RATES.invite_friend,
      referredUserId,
      description: `Invited user ${referredUserId}`,
      createdAt: new Date(),
      status: 'verified', // Requires verification
    };

    return earning;
  } catch (error) {
    console.error('Failed to record invite earning:', error);
    return null;
  }
}

/**
 * Record a live watch earning
 */
export async function recordLiveWatchEarning(
  userId: number,
  liveSessionId: string,
  watchMinutes: number
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Minimum 1 minute to earn
    if (watchMinutes < 1) return null;

    // Check daily earnings limit
    const dailyEarnings = await getDailyEarnings(userId);
    const newAmount = EARNING_RATES.live_watch_per_minute * watchMinutes;
    if (dailyEarnings + newAmount > DAILY_LIMITS.max_daily_earnings) {
      return null;
    }

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'live_watch',
      amount: newAmount,
      description: `Watched live for ${watchMinutes} minutes`,
      createdAt: new Date(),
      status: 'completed',
    };

    return earning;
  } catch (error) {
    console.error('Failed to record live watch earning:', error);
    return null;
  }
}

/**
 * Record a poll vote earning
 */
export async function recordPollVoteEarning(
  userId: number,
  pollId: string
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if already voted on this poll
    const alreadyVoted = await hasVotedOnPoll(userId, pollId);
    if (alreadyVoted) return null;

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'poll_vote',
      amount: EARNING_RATES.poll_vote,
      description: `Voted on poll ${pollId}`,
      createdAt: new Date(),
      status: 'completed',
    };

    return earning;
  } catch (error) {
    console.error('Failed to record poll vote earning:', error);
    return null;
  }
}

/**
 * Record a challenge participation earning
 */
export async function recordChallengeEarning(
  userId: number,
  challengeId: string
): Promise<MicroEarning | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if already participated today
    const alreadyParticipated = await hasParticipatedInChallenge(userId, challengeId);
    if (alreadyParticipated) return null;

    const earning: MicroEarning = {
      id: `earn-${Date.now()}`,
      userId,
      type: 'challenge',
      amount: EARNING_RATES.challenge_participation,
      description: `Participated in challenge ${challengeId}`,
      createdAt: new Date(),
      status: 'completed',
    };

    return earning;
  } catch (error) {
    console.error('Failed to record challenge earning:', error);
    return null;
  }
}

/**
 * Get daily activity count
 */
async function getDailyActivityCount(userId: number, type: string): Promise<number> {
  // Implement with your database
  // SELECT COUNT(*) FROM microEarnings WHERE userId = ? AND type = ? AND DATE(createdAt) = TODAY
  return 0;
}

/**
 * Get daily earnings
 */
async function getDailyEarnings(userId: number): Promise<number> {
  // Implement with your database
  // SELECT SUM(amount) FROM microEarnings WHERE userId = ? AND DATE(createdAt) = TODAY
  return 0;
}

/**
 * Get invite history
 */
async function getInviteHistory(userId: number): Promise<any | null> {
  // Implement with your database
  // SELECT * FROM microEarnings WHERE referredUserId = ? AND type = 'invite'
  return null;
}

/**
 * Check if user has voted on poll
 */
async function hasVotedOnPoll(userId: number, pollId: string): Promise<boolean> {
  // Implement with your database
  return false;
}

/**
 * Check if user has participated in challenge
 */
async function hasParticipatedInChallenge(userId: number, challengeId: string): Promise<boolean> {
  // Implement with your database
  return false;
}

/**
 * Get user balance
 */
export async function getUserBalance(userId: number): Promise<UserBalance | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Implement with your database queries
    // SELECT SUM(amount) as totalEarned FROM microEarnings WHERE userId = ?
    // SELECT SUM(amount) as totalWithdrawn FROM withdrawals WHERE userId = ?
    // etc.

    return {
      userId,
      totalEarned: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
      dailyEarnings: 0,
      monthlyEarnings: 0,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Failed to get user balance:', error);
    return null;
  }
}

/**
 * Get earning history
 */
export async function getEarningHistory(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<MicroEarning[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implement with your database query
    // SELECT * FROM microEarnings WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?

    return [];
  } catch (error) {
    console.error('Failed to get earning history:', error);
    return [];
  }
}

/**
 * Get top earners
 */
export async function getTopEarners(limit: number = 100): Promise<Array<{ userId: number; totalEarned: number }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implement with your database query
    // SELECT userId, SUM(amount) as totalEarned FROM microEarnings GROUP BY userId ORDER BY totalEarned DESC LIMIT ?

    return [];
  } catch (error) {
    console.error('Failed to get top earners:', error);
    return [];
  }
}

/**
 * Get earning statistics
 */
export async function getEarningStatistics(): Promise<{
  totalDistributed: number;
  totalUsers: number;
  averageEarningsPerUser: number;
  topEarner: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalDistributed: 0,
      totalUsers: 0,
      averageEarningsPerUser: 0,
      topEarner: 0,
    };
  }

  try {
    // Implement with your database queries
    return {
      totalDistributed: 0,
      totalUsers: 0,
      averageEarningsPerUser: 0,
      topEarner: 0,
    };
  } catch (error) {
    console.error('Failed to get earning statistics:', error);
    return {
      totalDistributed: 0,
      totalUsers: 0,
      averageEarningsPerUser: 0,
      topEarner: 0,
    };
  }
}
