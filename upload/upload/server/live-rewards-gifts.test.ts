/**
 * Tests pour les récompenses et cadeaux en direct
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getLiveRewardsManager } from './live-rewards';
import { getLiveSessionsManager } from './live-sessions';

describe('Live Rewards and Gifts System', () => {
  let rewardsManager: ReturnType<typeof getLiveRewardsManager>;
  let sessionsManager: ReturnType<typeof getLiveSessionsManager>;

  beforeEach(() => {
    rewardsManager = getLiveRewardsManager();
    sessionsManager = getLiveSessionsManager();
  });

  describe('Live Rewards', () => {
    it('should create a reward for a live session', () => {
      const reward = rewardsManager.createReward(
        'session-1',
        1,
        5,
        10,
        500,
        'USD'
      );

      expect(reward).toBeDefined();
      expect(reward.sessionId).toBe('session-1');
      expect(reward.hostId).toBe(1);
      expect(reward.participantCount).toBe(5);
      expect(reward.status).toBe('pending');
    });

    it('should calculate base reward correctly for different participant tiers', () => {
      // Tier 1: 1-5 participants = $1.00 per participant
      const reward1 = rewardsManager.createReward('session-1', 1, 3, 0, 0, 'USD');
      expect(reward1.baseReward).toBe(750); // 3 * 250 (nouveau taux)

      // Tier 2: 6-15 participants = $1.50 per participant
      const reward2 = rewardsManager.createReward('session-2', 2, 10, 0, 0, 'USD');
      expect(reward2.baseReward).toBe(3500); // 10 * 350 (nouveau taux)

      // Tier 3: 16-30 participants = $2.00 per participant
      const reward3 = rewardsManager.createReward('session-3', 3, 20, 0, 0, 'USD');
      expect(reward3.baseReward).toBe(9000); // 20 * 450 (nouveau taux)

      // Tier 4: 31-50 participants = $2.50 per participant
      const reward4 = rewardsManager.createReward('session-4', 4, 40, 0, 0, 'USD');
      expect(reward4.baseReward).toBe(22000); // 40 * 550 (nouveau taux)

      // Tier 5: 51+ participants = $3.00 per participant
      const reward5 = rewardsManager.createReward('session-5', 5, 100, 0, 0, 'USD');
      expect(reward5.baseReward).toBe(65000); // 100 * 650 (nouveau taux)
    });

    it('should calculate duration bonus correctly', () => {
      // 10 minutes = 500 cents ($5.00)
      const reward = rewardsManager.createReward('session-1', 1, 5, 10, 0, 'USD');
      expect(reward.durationBonus).toBe(1500); // 10 * 150 (nouveau bonus)
    });

    it('should calculate engagement bonus from gift revenue', () => {
      // 10% of $100 gift revenue = $10
      const reward = rewardsManager.createReward('session-1', 1, 5, 0, 1000, 'USD');
      expect(reward.engagementBonus).toBe(250); // 25% of 1000 (nouveau bonus)
    });

    it('should calculate total reward correctly', () => {
      const reward = rewardsManager.createReward(
        'session-1',
        1,
        10, // 10 participants = $1500
        10, // 10 minutes = $500
        1000, // $100 gift revenue = $100 bonus
        'USD'
      );

      expect(reward.totalReward).toBe(5250); // 3500 + 1500 + 250 (nouveaux taux)
    });

    it('should get a reward by ID', () => {
      const created = rewardsManager.createReward('session-1', 1, 5, 0, 0, 'USD');
      const retrieved = rewardsManager.getReward(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get host rewards', () => {
      const hostId = 999;
      rewardsManager.createReward('session-1', hostId, 5, 0, 0, 'USD');
      rewardsManager.createReward('session-2', hostId, 10, 0, 0, 'USD');
      rewardsManager.createReward('session-3', 2, 5, 0, 0, 'USD');

      const hostRewards = rewardsManager.getHostRewards(hostId);
      expect(hostRewards.length).toBeGreaterThanOrEqual(2);
      expect(hostRewards.every((r) => r.hostId === hostId)).toBe(true);
    });

    it('should calculate total host rewards', () => {
      const hostId = 888;
      rewardsManager.createReward('session-1', hostId, 5, 0, 0, 'USD'); // 500
      rewardsManager.createReward('session-2', hostId, 10, 0, 0, 'USD'); // 1500

      const total = rewardsManager.getTotalHostRewards(hostId);
      expect(total).toBeGreaterThanOrEqual(2000);
    });

    it('should mark reward as completed', () => {
      const reward = rewardsManager.createReward('session-1', 1, 5, 0, 0, 'USD');
      const success = rewardsManager.completeReward(reward.id);

      expect(success).toBe(true);

      const completed = rewardsManager.getReward(reward.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
    });

    it('should mark reward as failed', () => {
      const reward = rewardsManager.createReward('session-1', 1, 5, 0, 0, 'USD');
      const success = rewardsManager.failReward(reward.id, 'Payment failed');

      expect(success).toBe(true);

      const failed = rewardsManager.getReward(reward.id);
      expect(failed?.status).toBe('failed');
      expect(failed?.reason).toBe('Payment failed');
    });

    it('should get reward statistics', () => {
      rewardsManager.createReward('session-1', 1, 5, 0, 0, 'USD'); // 500
      rewardsManager.createReward('session-2', 1, 10, 0, 0, 'USD'); // 1500
      rewardsManager.createReward('session-3', 1, 20, 0, 0, 'USD'); // 4000

      const stats = rewardsManager.getRewardStats(1);

      expect(stats.totalRewards).toBeGreaterThanOrEqual(6000);
      expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
      expect(stats.averageRewardPerSession).toBeGreaterThanOrEqual(1000);
      expect(stats.highestReward).toBeGreaterThanOrEqual(4000);
    });

    it('should get pending rewards', () => {
      const reward1 = rewardsManager.createReward('session-1', 1, 5, 0, 0, 'USD');
      const reward2 = rewardsManager.createReward('session-2', 2, 10, 0, 0, 'USD');

      rewardsManager.completeReward(reward1.id);

      const pending = rewardsManager.getPendingRewards();
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.some((r) => r.id === reward2.id)).toBe(true);
    });

    it('should mark reward as processing', () => {
      const reward = rewardsManager.createReward('session-1', 1, 5, 0, 0, 'USD');
      const success = rewardsManager.markAsProcessing(reward.id);

      expect(success).toBe(true);

      const processing = rewardsManager.getReward(reward.id);
      expect(processing?.status).toBe('processing');
    });
  });

  describe('Live Sessions with Gifts', () => {
    it('should create a session with gift revenue tracking', () => {
      const session = sessionsManager.createSession(
        1,
        'TestHost',
        'Test Live',
        'Test description',
        'video',
        true,
        50
      );

      expect(session.giftRevenue).toBe(0);
      expect(session.maxParticipants).toBe(50);
    });

    it('should add gift revenue to a session', () => {
      const session = sessionsManager.createSession(
        1,
        'TestHost',
        'Test Live',
        'Test description'
      );

      const success = sessionsManager.addGiftRevenue(session.sessionId, 500);
      expect(success).toBe(true);

      const revenue = sessionsManager.getGiftRevenue(session.sessionId);
      expect(revenue).toBe(500);
    });

    it('should accumulate gift revenue', () => {
      const session = sessionsManager.createSession(
        1,
        'TestHost',
        'Test Live',
        'Test description'
      );

      sessionsManager.addGiftRevenue(session.sessionId, 500);
      sessionsManager.addGiftRevenue(session.sessionId, 300);
      sessionsManager.addGiftRevenue(session.sessionId, 200);

      const revenue = sessionsManager.getGiftRevenue(session.sessionId);
      expect(revenue).toBe(1000);
    });

    it('should include gift revenue in session stats', () => {
      const session = sessionsManager.createSession(
        1,
        'TestHost',
        'Test Live',
        'Test description'
      );

      sessionsManager.addGiftRevenue(session.sessionId, 750);

      const stats = sessionsManager.getSessionStats(session.sessionId);
      expect(stats?.giftRevenue).toBe(750);
    });

    it('should handle multiple participants with max limit of 50', () => {
      const session = sessionsManager.createSession(
        1,
        'TestHost',
        'Test Live',
        'Test description',
        'video',
        true,
        50
      );

      // Add 49 guests (host is already participant)
      for (let i = 2; i <= 50; i++) {
        const success = sessionsManager.addParticipant(
          session.sessionId,
          i,
          `User${i}`,
          'guest'
        );
        expect(success).toBe(true);
      }

      // Try to add one more (should fail)
      const shouldFail = sessionsManager.addParticipant(
        session.sessionId,
        51,
        'User51',
        'guest'
      );
      expect(shouldFail).toBe(false);

      const stats = sessionsManager.getSessionStats(session.sessionId);
      expect(stats?.participantCount).toBe(50);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete live session with rewards and gifts', () => {
      // Create session
      const session = sessionsManager.createSession(
        1,
        'Creator',
        'My Live',
        'Amazing live',
        'video',
        true,
        50
      );

      // Add participants
      for (let i = 2; i <= 15; i++) {
        sessionsManager.addParticipant(session.sessionId, i, `User${i}`, 'guest');
      }

      // Add gift revenue
      sessionsManager.addGiftRevenue(session.sessionId, 1000);

      // Create reward
      const reward = rewardsManager.createReward(
        session.sessionId,
        1,
        15, // 15 participants
        20, // 20 minutes
        1000, // $10 gift revenue
        'USD'
      );

      expect(reward.baseReward).toBe(5250); // 15 * 350 (nouveau taux augmenté)
      expect(reward.durationBonus).toBe(3000); // 20 * 150 (nouveau bonus augmenté)
      expect(reward.engagementBonus).toBe(250); // 25% of 1000 (nouveau bonus augmenté)
      expect(reward.totalReward).toBe(8500);

      // Mark as completed
      rewardsManager.completeReward(reward.id);

      // Verify stats (totalRewards includes all rewards for host)
      const stats = rewardsManager.getRewardStats(1);
      expect(stats.totalRewards).toBeGreaterThanOrEqual(3350);
      expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple concurrent live sessions', () => {
      // Create 3 concurrent sessions
      const session1 = sessionsManager.createSession(1, 'Creator1', 'Live 1', '');
      const session2 = sessionsManager.createSession(2, 'Creator2', 'Live 2', '');
      const session3 = sessionsManager.createSession(3, 'Creator3', 'Live 3', '');

      // Add different gift revenues
      sessionsManager.addGiftRevenue(session1.sessionId, 500);
      sessionsManager.addGiftRevenue(session2.sessionId, 1000);
      sessionsManager.addGiftRevenue(session3.sessionId, 750);

      // Create rewards for each
      const reward1 = rewardsManager.createReward(
        session1.sessionId,
        1,
        5,
        10,
        500,
        'USD'
      );
      const reward2 = rewardsManager.createReward(
        session2.sessionId,
        2,
        20,
        15,
        1000,
        'USD'
      );
      const reward3 = rewardsManager.createReward(
        session3.sessionId,
        3,
        10,
        12,
        750,
        'USD'
      );

      // Verify each creator's rewards
      const stats1 = rewardsManager.getRewardStats(1);
      const stats2 = rewardsManager.getRewardStats(2);
      const stats3 = rewardsManager.getRewardStats(3);

      expect(stats1.totalRewards).toBeGreaterThan(0);
      expect(stats2.totalRewards).toBeGreaterThan(0);
      expect(stats3.totalRewards).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of rewards', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        rewardsManager.createReward(
          `session-${i}`,
          Math.floor(i / 10) + 1,
          Math.floor(Math.random() * 50) + 1,
          Math.floor(Math.random() * 60),
          Math.floor(Math.random() * 5000),
          'USD'
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle large participant counts', () => {
      const session = sessionsManager.createSession(
        1,
        'Creator',
        'Mega Live',
        'Huge live',
        'video',
        true,
        100
      );

      // Add 99 participants
      for (let i = 2; i <= 100; i++) {
        sessionsManager.addParticipant(session.sessionId, i, `User${i}`, 'guest');
      }

      const stats = sessionsManager.getSessionStats(session.sessionId);
      expect(stats?.participantCount).toBe(100);

      // Create reward with 100 participants
      const reward = rewardsManager.createReward(
        session.sessionId,
        1,
        100,
        30,
        5000,
        'USD'
      );

      expect(reward.baseReward).toBe(65000); // 100 * 650 (nouveau taux augmenté)
      expect(reward.totalReward).toBeGreaterThan(65000);
    });
  });
});
