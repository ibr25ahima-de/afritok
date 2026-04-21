/**
 * Micro-Earnings System (FINAL STABLE VERSION)
 */

import { db } from "./db";
import { microEarnings, earnings, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ============================================
// TYPES
// ============================================

export type EarningType =
  | "watch"
  | "like"
  | "comment"
  | "share"
  | "invite"
  | "live_watch"
  | "poll_vote"
  | "challenge"
  | "platform_fee";

export interface UserBalance {
  userId: number;
  totalEarned: number;
  totalWithdrawn: number;
  currentBalance: number;
}

// ============================================
// RATES
// ============================================

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

// ============================================
// CORE SAVE FUNCTION
// ============================================

const ADMIN_ID = 1; // ⚠️ à adapter si besoin

async function saveEarning(params: {
  userId: number;
  type: EarningType;
  amount: number;
  videoId?: number;
  referredUserId?: number;
  description?: string;
  status?: "pending" | "completed" | "verified";
}) {
  if (!db) return null;

  try {
    const id = crypto.randomUUID();

    const userAmount = params.amount * 0.75;
    const platformAmount = params.amount * 0.25;

    // USER EARNING
    await db.insert(microEarnings).values({
      id,
      userId: params.userId,
      type: params.type,
      amount: userAmount.toString(),
      videoId: params.videoId || null,
      referredUserId: params.referredUserId || null,
      description: params.description || params.type,
      createdAt: new Date(),
      status: params.status || "completed",
    });

    await db.insert(earnings).values({
      userId: params.userId,
      amount: userAmount.toString(),
      source: params.type,
      videoId: params.videoId || null,
    });

    // PLATFORM EARNING (TOI 💰)
    await db.insert(microEarnings).values({
      id: crypto.randomUUID(),
      userId: ADMIN_ID,
      type: "platform_fee",
      amount: platformAmount.toString(),
      videoId: params.videoId || null,
      description: "Platform fee",
      createdAt: new Date(),
      status: "completed",
    });

    // 🔗 SYNC AVEC users.totalEarnings
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);

    if (user[0]) {
      const current = parseFloat(user[0].totalEarnings?.toString() || "0");

      await db
        .update(users)
        .set({
          totalEarnings: (current + userAmount).toFixed(2),
        })
        .where(eq(users.id, params.userId));
    }

    return true;
  } catch (err) {
    console.error("[MicroEarnings ERROR]", err);
    return null;
  }
}

// ============================================
// ANTI-DUPLICATION (SIMPLE & SAFE)
// ============================================

async function alreadyEarned(
  userId: number,
  type: EarningType,
  videoId?: number
) {
  if (!db) return false;

  const results = await db
    .select()
    .from(microEarnings)
    .where(eq(microEarnings.userId, userId));

  return results.some(
    (e) =>
      e.type === type &&
      (videoId ? e.videoId === videoId : true)
  );
}

// ============================================
// EARNING ACTIONS
// ============================================

export async function recordWatchEarning(
  userId: number,
  videoId: number,
  duration: number
) {
  if (duration < 5) return null;

  // ❗ anti-duplication
  if (await alreadyEarned(userId, "watch", videoId)) return null;

  return saveEarning({
    userId,
    type: "watch",
    amount: EARNING_RATES.watch,
    videoId,
    description: "Watch video",
  });
}

export async function recordLikeEarning(
  userId: number,
  videoId: number
) {
  if (await alreadyEarned(userId, "like", videoId)) return null;

  return saveEarning({
    userId,
    type: "like",
    amount: EARNING_RATES.like,
    videoId,
  });
}

export async function recordCommentEarning(
  userId: number,
  videoId: number
) {
  return saveEarning({
    userId,
    type: "comment",
    amount: EARNING_RATES.comment,
    videoId,
  });
}

export async function recordShareEarning(
  userId: number,
  videoId: number
) {
  if (await alreadyEarned(userId, "share", videoId)) return null;

  return saveEarning({
    userId,
    type: "share",
    amount: EARNING_RATES.share,
    videoId,
  });
}

export async function recordInviteEarning(
  userId: number,
  referredUserId: number
) {
  return saveEarning({
    userId,
    type: "invite",
    amount: EARNING_RATES.invite,
    referredUserId,
    status: "verified",
  });
}

export async function recordLiveWatchEarning(
  userId: number,
  minutes: number
) {
  if (minutes < 1) return null;

  return saveEarning({
    userId,
    type: "live_watch",
    amount: minutes * EARNING_RATES.live_watch,
  });
}

export async function recordPollVoteEarning(userId: number) {
  return saveEarning({
    userId,
    type: "poll_vote",
    amount: EARNING_RATES.poll_vote,
  });
}

export async function recordChallengeEarning(userId: number) {
  return saveEarning({
    userId,
    type: "challenge",
    amount: EARNING_RATES.challenge,
  });
}

// ============================================
// USER BALANCE
// ============================================

export async function getUserBalance(
  userId: number
): Promise<UserBalance> {
  if (!db) {
    return {
      userId,
      totalEarned: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
    };
  }

  try {
    const results = await db
      .select()
      .from(microEarnings)
      .where(eq(microEarnings.userId, userId));

    const totalEarned = results.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

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
