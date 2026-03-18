/**
 * Simplified Payment System for Afritok
 * Compatible with instant withdrawal system
 */

import { getDb } from './db';

export interface WithdrawalRequest {
  id: string;
  userId: number;
  amount: number;
  method: 'mobile_money';
  status: 'completed' | 'failed';
  provider: string;
  accountNumber: string;
  createdAt: Date;
  processedAt?: Date;
  transactionId?: string;
  failureReason?: string;
}

export const WITHDRAWAL_RULES = {
  MIN_WITHDRAWAL: 0.01,
  MAX_WITHDRAWAL: 10000,
  PROCESSING_TIME: 0,
};

export const WITHDRAWAL_FEES = {
  mobile_money: {
    MTN: 0.02,
    Orange: 0.02,
    Airtel: 0.02,
    Wave: 0.01,
    Moov: 0.02,
  },
};

/**
 * CREATE WITHDRAWAL (INSTANT)
 */
export async function createWithdrawalRequest(
  userId: number,
  amount: number,
  provider: string,
  accountNumber: string
): Promise<WithdrawalRequest | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    if (amount < WITHDRAWAL_RULES.MIN_WITHDRAWAL) {
      throw new Error('Amount too low');
    }

    const feeRate =
      WITHDRAWAL_FEES.mobile_money[
        provider as keyof typeof WITHDRAWAL_FEES.mobile_money
      ] || 0.02;

    const netAmount = amount - amount * feeRate;

    const { success, transactionId } = await processMobileMoneyPayment(
      provider,
      accountNumber,
      netAmount
    );

    const withdrawal: WithdrawalRequest = {
      id: `withdraw-${Date.now()}`,
      userId,
      amount,
      method: 'mobile_money',
      status: success ? 'completed' : 'failed',
      provider,
      accountNumber: encrypt(accountNumber),
      createdAt: new Date(),
      processedAt: new Date(),
      transactionId,
      failureReason: success ? undefined : 'Payment failed',
    };

    return withdrawal;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * MOBILE MONEY PAYMENT (SIMULATED)
 */
async function processMobileMoneyPayment(
  provider: string,
  phoneNumber: string,
  amount: number
): Promise<{ success: boolean; transactionId: string }> {
  try {
    console.log(`[PAYMENT] ${provider} -> ${phoneNumber} : $${amount}`);

    return {
      success: true,
      transactionId: `${provider}-${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      transactionId: '',
    };
  }
}

/**
 * HISTORY (TEMP)
 */
export async function getWithdrawalHistory(): Promise<WithdrawalRequest[]> {
  return [];
}

/**
 * SIMPLE ENCRYPT
 */
function encrypt(value: string): string {
  return Buffer.from(value).toString('base64');
}
