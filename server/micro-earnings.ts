import { earnings } from './schema';
/**
 * Micro-Earnings System for Afritok (FIXED VERSION)
 */

import { getDb } from './db';
import { microEarnings } from './schema';

// TYPES
export interface MicroEarning {
  id: string;
  userId: number;
  type:
    | 'watch'
    | 'like'
    | 'comment'
    | 'share'
    | 'invite'
    | 'live_watch'
    | 'poll_vote'
    | 'challenge';
  amount: number;
  videoId?: number;
  referredUserId?: number;
  description: string;
  createdAt: Date;
  status: 'pending' | 'completed' | 'verified';
}

export interface UserBalance {
  userId: number;
  totalEarned: number;
  totalWithdrawn: number;
  currentBalance: number;
}

// RATES
export const EARNING_RATES = {
  watch: 0.02,
  like: 0.01,
  comment: 0.02,
  share: 0.05,
  invite: 1.0,
  live_watch: 0.01,
  poll_vote: 0.02,
  challenge: 1.0,
};

// =======================
// CORE SAVE FUNCTION
// =======================

async function saveEarning(earning: MicroEarning) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(microEarnings).values(earning);
    return earning;
  } catch (err) {
    console.error('DB ERROR:', err);
    return null;
  }
}

// =======================
// EARNING FUNCTIONS
// =======================

export async function recordWatchEarning(userId: number, videoId: number, duration: number) {
  if (duration < 30) return null;

  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'watch',
    amount: EARNING_RATES.watch,
    videoId,
    description: 'Watch video',
    createdAt: new Date(),
    status: 'completed',
  });
}

export async function recordLikeEarning(userId: number, videoId: number) {
  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'like',
    amount: EARNING_RATES.like,
    videoId,
    description: 'Like',
    createdAt: new Date(),
    status: 'completed',
  });
}

export async function recordCommentEarning(userId: number, videoId: number, length: number) {
  if (length < 3) return null;

  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'comment',
    amount: EARNING_RATES.comment,
    videoId,
    description: 'Comment',
    createdAt: new Date(),
    status: 'completed',
  });
}

export async function recordShareEarning(userId: number, videoId: number) {
  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'share',
    amount: EARNING_RATES.share,
    videoId,
    description: 'Share',
    createdAt: new Date(),
    status: 'completed',
  });
}

export async function recordInviteEarning(userId: number, referredUserId: number) {
  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'invite',
    amount: EARNING_RATES.invite,
    referredUserId,
    description: 'Invite friend',
    createdAt: new Date(),
    status: 'verified',
  });
}

export async function recordLiveWatchEarning(userId: number, minutes: number) {
  if (minutes < 1) return null;

  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'live_watch',
    amount: minutes * EARNING_RATES.live_watch,
    description: 'Live watch',
    createdAt: new Date(),
    status: 'completed',
  });
}

export async function recordPollVoteEarning(userId: number) {
  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'poll_vote',
    amount: EARNING_RATES.poll_vote,
    description: 'Poll vote',
    createdAt: new Date(),
    status: 'completed',
  });
}

export async function recordChallengeEarning(userId: number) {
  return saveEarning({
    id: `earn-${Date.now()}`,
    userId,
    type: 'challenge',
    amount: EARNING_RATES.challenge,
    description: 'Challenge',
    createdAt: new Date(),
    status: 'completed',
  });
}

// =======================
// BALANCE SYSTEM
// =======================

export async function getUserBalance(userId: number): Promise<UserBalance> {
  const db = await getDb();
  if (!db) {
    return {
      userId,
      totalEarned: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
    };
  }

  try {
    const earnings = await db.select().from(microEarnings);

    const userEarnings = earnings.filter((e) => e.userId === userId);

    const totalEarned = userEarnings.reduce((sum, e) => sum + e.amount, 0);

    return {
      userId,
      totalEarned,
      totalWithdrawn: 0,
      currentBalance: totalEarned,
    };
  } catch (err) {
    console.error(err);
    return {
      userId,
      totalEarned: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
    };
  }
}
