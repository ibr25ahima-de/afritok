import { eq, and, gt, lt, desc, sql } from "drizzle-orm";
import { db } from "./index";
import { otps, OTP } from "../../drizzle/schema";

export async function createOTP(phone: string, code: string, expiryMinutes = 5) {
  await db.insert(otps).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + expiryMinutes * 60000),
    attempts: 0,
  });
}

/** Return only the newest OTP for this phone. */
export async function getLatestOTP(phone: string): Promise<OTP | undefined> {
  return (
    await db
      .select()
      .from(otps)
      .where(eq(otps.phone, phone))
      .orderBy(desc(otps.createdAt))
      .limit(1)
  )[0];
}

/** Atomically reserve one verification attempt. */
export async function consumeOTPAttempt(id: number, maxAttempts: number): Promise<OTP | undefined> {
  return (
    await db
      .update(otps)
      .set({ attempts: sql`${otps.attempts} + 1` })
      .where(and(eq(otps.id, id), lt(otps.attempts, maxAttempts)))
      .returning()
  )[0];
}

export async function deleteOTP(id: number) {
  await db.delete(otps).where(eq(otps.id, id));
}
