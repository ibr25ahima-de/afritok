/**
 * Fraud Detection System for Afritok
 * Prevents abuse and ensures fair earnings distribution
 */

import { getDb } from './db';

export interface FraudAlert {
  id: string;
  userId: number;
  type: 'suspicious_activity' | 'bot_like' | 'duplicate_account' | 'rapid_earnings' | 'invalid_location' | 'device_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface UserVerification {
  userId: number;
  phoneVerified: boolean;
  emailVerified: boolean;
  idVerified: boolean;
  addressVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected';
  riskScore: number; // 0-100, higher = more risky
  lastVerificationAt: Date;
}

// Fraud detection rules
export const FRAUD_RULES = {
  // Daily earning limits
  MAX_DAILY_EARNINGS: 10.0,
  MAX_HOURLY_EARNINGS: 2.0,

  // Activity limits
  MAX_WATCHES_PER_DAY: 500,
  MAX_LIKES_PER_DAY: 1000,
  MAX_COMMENTS_PER_DAY: 200,
  MAX_SHARES_PER_DAY: 100,

  // Time-based rules
  MIN_WATCH_TIME: 30, // seconds
  MIN_COMMENT_LENGTH: 3, // characters
  MIN_TIME_BETWEEN_ACTIVITIES: 2, // seconds

  // Account rules
  MIN_ACCOUNT_AGE_FOR_WITHDRAWAL: 7, // days
  MIN_ACTIVITIES_BEFORE_WITHDRAWAL: 10,

  // Device/Location rules
  MAX_ACCOUNTS_PER_DEVICE: 3,
  MAX_ACCOUNTS_PER_IP: 5,
  MAX_ACCOUNTS_PER_LOCATION: 10,

  // Referral rules
  MAX_REFERRALS_PER_DAY: 20,
  REFERRAL_VERIFICATION_DELAY: 24, // hours

  // Risk score thresholds
  RISK_SCORE_WARNING: 40,
  RISK_SCORE_SUSPEND: 70,
  RISK_SCORE_BAN: 90,
};

/**
 * Check for suspicious activity
 */
export async function checkSuspiciousActivity(
  userId: number,
  activityType: string,
  metadata: Record<string, any>
): Promise<FraudAlert | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const alerts: FraudAlert[] = [];

    // Check rapid earnings
    const hourlyEarnings = await getHourlyEarnings(userId);
    if (hourlyEarnings > FRAUD_RULES.MAX_HOURLY_EARNINGS) {
      alerts.push({
        id: `alert-${Date.now()}`,
        userId,
        type: 'rapid_earnings',
        severity: 'high',
        description: `User earned $${hourlyEarnings} in the last hour (limit: $${FRAUD_RULES.MAX_HOURLY_EARNINGS})`,
        evidence: { hourlyEarnings },
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Check for bot-like behavior
    const isBotLike = await detectBotLikeBehavior(userId);
    if (isBotLike) {
      alerts.push({
        id: `alert-${Date.now()}`,
        userId,
        type: 'bot_like',
        severity: 'high',
        description: 'Detected bot-like activity pattern',
        evidence: isBotLike,
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Check for duplicate accounts
    const duplicateAccounts = await detectDuplicateAccounts(userId, metadata);
    if (duplicateAccounts.length > 0) {
      alerts.push({
        id: `alert-${Date.now()}`,
        userId,
        type: 'duplicate_account',
        severity: 'critical',
        description: `Detected ${duplicateAccounts.length} duplicate accounts from same device/IP`,
        evidence: { duplicateAccounts },
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Check for invalid location
    const locationIssue = await checkLocationValidity(userId, metadata.location);
    if (locationIssue) {
      alerts.push({
        id: `alert-${Date.now()}`,
        userId,
        type: 'invalid_location',
        severity: 'medium',
        description: locationIssue.description,
        evidence: locationIssue,
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Check for device mismatch
    const deviceMismatch = await checkDeviceMismatch(userId, metadata.deviceId);
    if (deviceMismatch) {
      alerts.push({
        id: `alert-${Date.now()}`,
        userId,
        type: 'device_mismatch',
        severity: 'low',
        description: 'Device changed unexpectedly',
        evidence: deviceMismatch,
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Save alerts to database
    for (const alert of alerts) {
      // await db.insert(fraudAlerts).values(alert);
    }

    return alerts.length > 0 ? alerts[0] : null;
  } catch (error) {
    console.error('Failed to check suspicious activity:', error);
    return null;
  }
}

/**
 * Detect bot-like behavior
 */
async function detectBotLikeBehavior(userId: number): Promise<Record<string, any> | null> {
  try {
    const recentActivities = await getRecentActivities(userId, 60); // Last 60 minutes

    // Check for patterns
    const patterns = {
      perfectTiming: 0, // Activities at exact intervals
      noVariation: 0, // Same action repeated
      tooFast: 0, // Actions too close together
      noEngagement: 0, // No variation in content
    };

    if (recentActivities.length < 10) {
      return null; // Not enough data
    }

    // Analyze timing
    let lastTime = recentActivities[0].timestamp;
    const intervals: number[] = [];

    for (let i = 1; i < recentActivities.length; i++) {
      const interval = recentActivities[i].timestamp - lastTime;
      intervals.push(interval);
      lastTime = recentActivities[i].timestamp;
    }

    // Check for perfect intervals (bot-like)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 1000) {
      // Very consistent timing (< 1 second variation)
      patterns.perfectTiming = 1;
    }

    // Check for too fast actions
    const tooFastCount = intervals.filter((i) => i < 2000).length; // Less than 2 seconds
    if (tooFastCount > intervals.length * 0.5) {
      patterns.tooFast = 1;
    }

    // Check for no variation in actions
    const actionTypes = recentActivities.map((a) => a.type);
    const uniqueActions = new Set(actionTypes).size;
    if (uniqueActions === 1) {
      patterns.noVariation = 1;
    }

    const suspicionScore = Object.values(patterns).reduce((a, b) => a + b, 0);
    if (suspicionScore >= 2) {
      return patterns;
    }

    return null;
  } catch (error) {
    console.error('Failed to detect bot-like behavior:', error);
    return null;
  }
}

/**
 * Detect duplicate accounts
 */
async function detectDuplicateAccounts(userId: number, metadata: Record<string, any>): Promise<number[]> {
  try {
    const duplicates: number[] = [];

    // Check by device ID
    if (metadata.deviceId) {
      const accountsByDevice = await getAccountsByDeviceId(metadata.deviceId);
      duplicates.push(...accountsByDevice.filter((id) => id !== userId));
    }

    // Check by IP address
    if (metadata.ipAddress) {
      const accountsByIP = await getAccountsByIP(metadata.ipAddress);
      duplicates.push(...accountsByIP.filter((id) => id !== userId));
    }

    // Check by phone number (if verified)
    if (metadata.phoneNumber) {
      const accountsByPhone = await getAccountsByPhone(metadata.phoneNumber);
      duplicates.push(...accountsByPhone.filter((id) => id !== userId));
    }

    return Array.from(new Set(duplicates)); // Remove duplicates
  } catch (error) {
    console.error('Failed to detect duplicate accounts:', error);
    return [];
  }
}

/**
 * Check location validity
 */
async function checkLocationValidity(
  userId: number,
  location: { latitude: number; longitude: number }
): Promise<Record<string, any> | null> {
  try {
    if (!location) return null;

    // Get user's previous locations
    const previousLocations = await getUserLocationHistory(userId);

    if (previousLocations.length === 0) {
      return null; // First time, no history
    }

    // Check for impossible travel (too far too fast)
    const lastLocation = previousLocations[0];
    const distance = calculateDistance(lastLocation, location);
    const timeDiff = (Date.now() - lastLocation.timestamp) / 1000 / 60; // minutes

    // Max speed: 900 km/h (airplane speed)
    const maxDistance = (900 / 60) * timeDiff;

    if (distance > maxDistance) {
      return {
        description: `Impossible travel detected: ${distance}km in ${timeDiff}min (max: ${maxDistance}km)`,
        distance,
        timeDiff,
        maxDistance,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to check location validity:', error);
    return null;
  }
}

/**
 * Check device mismatch
 */
async function checkDeviceMismatch(userId: number, deviceId: string): Promise<Record<string, any> | null> {
  try {
    const previousDevices = await getUserDeviceHistory(userId);

    if (previousDevices.length === 0) {
      return null; // First device
    }

    // Check if device is new
    const isNewDevice = !previousDevices.some((d) => d.deviceId === deviceId);

    if (isNewDevice) {
      return {
        description: 'New device detected',
        newDevice: deviceId,
        previousDevices: previousDevices.slice(0, 5),
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to check device mismatch:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.latitude * Math.PI) / 180) *
      Math.cos((loc2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate user risk score
 */
export async function calculateRiskScore(userId: number): Promise<number> {
  try {
    let riskScore = 0;

    // Account age (newer accounts = higher risk)
    const accountAge = await getAccountAge(userId);
    if (accountAge < 7) riskScore += 20;
    else if (accountAge < 30) riskScore += 10;

    // Activity patterns
    const botLike = await detectBotLikeBehavior(userId);
    if (botLike) riskScore += 30;

    // Duplicate accounts
    const duplicates = await detectDuplicateAccounts(userId, {});
    riskScore += duplicates.length * 15;

    // Verification status
    const verification = await getUserVerification(userId);
    if (!verification.phoneVerified) riskScore += 10;
    if (!verification.emailVerified) riskScore += 5;
    if (!verification.idVerified) riskScore += 20;

    // Withdrawal history
    const withdrawalIssues = await checkWithdrawalHistory(userId);
    if (withdrawalIssues.chargebacks > 0) riskScore += 40;
    if (withdrawalIssues.failedPayments > 0) riskScore += 20;

    // Cap at 100
    return Math.min(riskScore, 100);
  } catch (error) {
    console.error('Failed to calculate risk score:', error);
    return 50; // Default to medium risk
  }
}

/**
 * Get user verification status
 */
export async function getUserVerification(userId: number): Promise<UserVerification> {
  const db = await getDb();
  if (!db) {
    return {
      userId,
      phoneVerified: false,
      emailVerified: false,
      idVerified: false,
      addressVerified: false,
      kycStatus: 'pending',
      riskScore: 50,
      lastVerificationAt: new Date(),
    };
  }

  try {
    // Implement with database query
    return {
      userId,
      phoneVerified: false,
      emailVerified: false,
      idVerified: false,
      addressVerified: false,
      kycStatus: 'pending',
      riskScore: 50,
      lastVerificationAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to get user verification:', error);
    return {
      userId,
      phoneVerified: false,
      emailVerified: false,
      idVerified: false,
      addressVerified: false,
      kycStatus: 'pending',
      riskScore: 50,
      lastVerificationAt: new Date(),
    };
  }
}

// Helper functions (implement with your database)
async function getHourlyEarnings(userId: number): Promise<number> {
  return 0;
}

async function getRecentActivities(userId: number, minutes: number): Promise<any[]> {
  return [];
}

async function getAccountsByDeviceId(deviceId: string): Promise<number[]> {
  return [];
}

async function getAccountsByIP(ipAddress: string): Promise<number[]> {
  return [];
}

async function getAccountsByPhone(phoneNumber: string): Promise<number[]> {
  return [];
}

async function getUserLocationHistory(userId: number): Promise<any[]> {
  return [];
}

async function getUserDeviceHistory(userId: number): Promise<any[]> {
  return [];
}

async function getAccountAge(userId: number): Promise<number> {
  return 0;
}

async function checkWithdrawalHistory(userId: number): Promise<{ chargebacks: number; failedPayments: number }> {
  return { chargebacks: 0, failedPayments: 0 };
}
