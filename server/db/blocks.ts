import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { blocks } from "../../drizzle/schema";

/* =====================
BLOCKS
===================== */

export async function isBlocked(userId: number, blockedUserId: number) {
  const res = await db
    .select()
    .from(blocks)
    .where(
      and(
        eq(blocks.userId, userId),
        eq(blocks.blockedUserId, blockedUserId)
      )
    )
    .limit(1);

  return res.length > 0;
}

export async function blockUser(userId: number, blockedUserId: number) {
  const exists = await isBlocked(userId, blockedUserId);
  if (exists) return;

  await db.insert(blocks).values({ userId, blockedUserId });
}

export async function unblockUser(userId: number, blockedUserId: number) {
  await db
    .delete(blocks)
    .where(
      and(
        eq(blocks.userId, userId),
        eq(blocks.blockedUserId, blockedUserId)
      )
    );
}

export async function getBlockedUsers(userId: number) {
  return db.select().from(blocks).where(eq(blocks.userId, userId));
}
