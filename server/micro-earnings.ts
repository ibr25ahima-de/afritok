/**
 * Micro-Earnings System (FINAL STABLE VERSION)
 *
 * Security rules:
 * - reward amounts are defined server-side only
 * - user identity always comes from the authenticated server caller
 * - earning + platform fee + balance sync are atomic
 * - banned/suspended accounts cannot receive new rewards
 * - balance updates are performed in SQL to avoid lost updates
 */

import { db } from "./db";
import { microEarnings, earnings, users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export type EarningType = "watch" | "like" | "comment" | "share" | "invite" | "live_watch" | "poll_vote" | "challenge" | "platform_fee";

export interface UserBalance { userId: number; totalEarned: number; totalWithdrawn: number; currentBalance: number; }

export const EARNING_RATES = {
  watch: 0.02,
  like: 0.01,
  comment: 0.02,
  share: 0.05,
  invite: 1.0,
  live_watch: 0.01,
  poll_vote: 0.02,
  challenge: 1.0,
} as const;

async function saveEarning(params: {
  userId: number;
  type: Exclude<EarningType, "platform_fee">;
  amount: number;
  videoId?: number;
  referredUserId?: number;
  description?: string;
  status?: "pending" | "completed" | "verified";
}) {
  if (!db) return null;
  if (!Number.isFinite(params.amount) || params.amount <= 0 || params.amount > 1000) return null;
  if (!Number.isInteger(params.userId) || params.userId <= 0) return null;
  if (params.videoId !== undefined && (!Number.isInteger(params.videoId) || params.videoId <= 0)) return null;
  if (params.referredUserId !== undefined && (!Number.isInteger(params.referredUserId) || params.referredUserId <= 0)) return null;

  const userAmount = Number(params.amount) * 0.75;
  const platformAmount = Number(params.amount) * 0.25;

  try {
    return await db.transaction(async (tx) => {
      const userRows = await tx
        .select({ id: users.id, isBanned: users.isBanned, isSuspended: users.isSuspended })
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1)
        .for("update");

      const user = userRows[0];
      if (!user || user.isBanned || user.isSuspended) return null;

      // A concrete video action is rewarded only once for the same user/type/video.
      if (params.videoId !== undefined) {
        const duplicate = await tx
          .select({ id: microEarnings.id })
          .from(microEarnings)
          .where(and(
            eq(microEarnings.userId, params.userId),
            eq(microEarnings.type, params.type),
            eq(microEarnings.videoId, params.videoId),
          ))
          .limit(1);
        if (duplicate.length > 0) return null;
      }

      await tx.insert(microEarnings).values({
        id: crypto.randomUUID(),
        userId: params.userId,
        type: params.type,
        amount: userAmount.toFixed(4),
        videoId: params.videoId ?? null,
        referredUserId: params.referredUserId ?? null,
        description: params.description || params.type,
        createdAt: new Date(),
        status: params.status || "completed",
      });

      await tx.insert(earnings).values({
        userId: params.userId,
        amount: userAmount.toFixed(4),
        source: params.type,
        videoId: params.videoId ?? null,
      });

      const adminRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.isBanned, false), eq(users.isSuspended, false)))
        .limit(1);
      const admin = adminRows[0];

      if (admin) {
        await tx.insert(microEarnings).values({
          id: crypto.randomUUID(),
          userId: admin.id,
          type: "platform_fee",
          amount: platformAmount.toFixed(4),
          videoId: params.videoId ?? null,
          description: "Platform fee",
          createdAt: new Date(),
          status: "completed",
        });
      }

      await tx
        .update(users)
        .set({
          totalEarnings: sql`${users.totalEarnings} + ${userAmount.toFixed(4)}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, params.userId));

      return true;
    });
  } catch (err) {
    console.error("[MicroEarnings ERROR] transaction failed");
    return null;
  }
}

export async function recordWatchEarning(userId: number, videoId: number, duration: number) {
  if (!Number.isFinite(duration) || duration < 5) return null;
  return saveEarning({ userId, type: "watch", amount: EARNING_RATES.watch, videoId, description: "Watch video" });
}

export async function recordLikeEarning(userId: number, videoId: number) {
  return saveEarning({ userId, type: "like", amount: EARNING_RATES.like, videoId });
}

export async function recordCommentEarning(userId: number, videoId: number) {
  return saveEarning({ userId, type: "comment", amount: EARNING_RATES.comment, videoId });
}

export async function recordShareEarning(userId: number, videoId: number) {
  return saveEarning({ userId, type: "share", amount: EARNING_RATES.share, videoId });
}

export async function recordInviteEarning(userId: number, referredUserId: number) {
  if (userId === referredUserId) return null;
  return saveEarning({ userId, type: "invite", amount: EARNING_RATES.invite, referredUserId, status: "verified" });
}

export async function recordLiveWatchEarning(userId: number, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return null;
  return saveEarning({ userId, type: "live_watch", amount: minutes * EARNING_RATES.live_watch });
}

export async function recordPollVoteEarning(userId: number) {
  return saveEarning({ userId, type: "poll_vote", amount: EARNING_RATES.poll_vote });
}

export async function recordChallengeEarning(userId: number) {
  return saveEarning({ userId, type: "challenge", amount: EARNING_RATES.challenge });
}

export async function getUserBalance(userId: number): Promise<UserBalance> {
  if (!db) return { userId, totalEarned: 0, totalWithdrawn: 0, currentBalance: 0 };

  try {
    const userRows = await db
      .select({ totalEarnings: users.totalEarnings, totalWithdrawals: users.totalWithdrawals })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const user = userRows[0];
    if (!user) return { userId, totalEarned: 0, totalWithdrawn: 0, currentBalance: 0 };

    const totalEarned = Number(user.totalEarnings ?? 0);
    const totalWithdrawn = Number(user.totalWithdrawals ?? 0);
    return {
      userId,
      totalEarned,
      totalWithdrawn,
      currentBalance: Math.max(0, totalEarned - totalWithdrawn),
    };
  } catch (err) {
    console.error("[MicroEarnings BALANCE ERROR]");
    return { userId, totalEarned: 0, totalWithdrawn: 0, currentBalance: 0 };
  }
}