import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { withdrawals, users } from "../../drizzle/schema";

/* =====================
WITHDRAWALS
===================== */

export async function getUserWithdrawals(userId: number) {
  return db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId));
}

/**
 * Creates a withdrawal and reserves the amount atomically.
 * The client never supplies the destination phone number: it is read from
 * the authenticated user's database record.
 *
 * The withdrawal starts as `pending`; it must only become `completed` after
 * a real payout provider confirms the transfer.
 */
export async function createWithdrawalRecord(
  userId: number,
  amount: number,
  paymentMethod: string,
  requestedPhone?: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid withdrawal amount");
  }

  const normalizedMethod = paymentMethod.trim().toUpperCase();
  if (!normalizedMethod) throw new Error("Invalid payment method");

  return db.transaction(async (tx) => {
    // Lock the user row so two simultaneous withdrawal requests cannot spend
    // the same balance at the same time.
    const rows = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for("update");

    const user = rows[0];
    if (!user) throw new Error("User not found");

    const earnings = Number(user.totalEarnings ?? 0);
    const withdrawalsTotal = Number(user.totalWithdrawals ?? 0);
    const availableBalance = earnings - withdrawalsTotal;

    if (!Number.isFinite(availableBalance) || amount > availableBalance) {
      throw new Error("Insufficient balance");
    }

    const phone = String(user.phone || "").trim();
    if (!phone) throw new Error("Withdrawal phone is not configured");

    // If a destination was supplied by the client, it must match the account
    // phone. This prevents redirecting another user's funds.
    if (requestedPhone && requestedPhone.trim() !== phone) {
      throw new Error("Withdrawal destination does not match account");
    }

    const [withdrawal] = await tx
      .insert(withdrawals)
      .values({
        userId,
        amount: amount.toFixed(4),
        paymentMethod: normalizedMethod,
        phone,
        status: "pending",
      })
      .returning();

    // Reserve the amount immediately. The payout worker/provider must later
    // finalize the withdrawal and release/settle this reservation.
    await tx
      .update(users)
      .set({
        totalWithdrawals: sql`${users.totalWithdrawals} + ${amount.toFixed(4)}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    return { success: true, withdrawal };
  });
}
