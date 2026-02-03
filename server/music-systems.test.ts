/**
 * Tests complets pour tous les systèmes de musiques et de challenges
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getArtistManagementManager } from './artist-management';
import { getMusicLicensingManager } from './music-licensing';
import { getMusicChallengesManager } from './music-challenges';
import { getMusicRevenueSharingManager } from './music-revenue-sharing';

describe('Music Systems', () => {
  describe('Artist Management', () => {
    let artistManager: ReturnType<typeof getArtistManagementManager>;

    beforeEach(() => {
      artistManager = getArtistManagementManager();
    });

    it('should create an artist', () => {
      const artist = artistManager.createArtist(1, 'The Weeknd', ['pop', 'r&b'], 'Bio');

      expect(artist).toBeDefined();
      expect(artist.name).toBe('The Weeknd');
      expect(artist.genre).toContain('pop');
      expect(artist.verified).toBe(false);
    });

    it('should verify an artist', () => {
      const artist = artistManager.createArtist(2, 'Drake', ['hip-hop', 'rap']);
      const verified = artistManager.verifyArtist(artist.id);

      expect(verified).toBe(true);

      const updated = artistManager.getArtist(artist.id);
      expect(updated?.verified).toBe(true);
    });

    it('should publish music', () => {
      const artist = artistManager.createArtist(3, 'Beyoncé', ['pop', 'r&b']);
      const music = artistManager.publishMusic(
        artist.id,
        'Halo',
        'pop',
        240,
        'https://example.com/halo.mp3',
        'Amazing song'
      );

      expect(music).toBeDefined();
      expect(music?.title).toBe('Halo');
      expect(music?.status).toBe('published');
    });

    it('should get artist musics', () => {
      const artist = artistManager.createArtist(4, 'Taylor Swift', ['pop']);
      artistManager.publishMusic(4, 'Song 1', 'pop', 200, 'url1');
      artistManager.publishMusic(4, 'Song 2', 'pop', 210, 'url2');

      const musics = artistManager.getArtistMusics(artist.id);
      expect(musics.length).toBe(2);
    });

    it('should record music usage', () => {
      const artist = artistManager.createArtist(5, 'Artist', ['pop']);
      const music = artistManager.publishMusic(5, 'Song', 'pop', 200, 'url');

      if (!music) throw new Error('Music creation failed');

      const usage = artistManager.recordMusicUsage(
        music.id,
        100,
        'challenge',
        'challenge_1'
      );

      expect(usage).toBeDefined();
      expect(usage?.creatorId).toBe(100);
      expect(usage?.usageType).toBe('challenge');
    });

    it('should record music views and earnings', () => {
      const artist = artistManager.createArtist(6, 'Artist', ['pop']);
      const music = artistManager.publishMusic(6, 'Song', 'pop', 200, 'url');

      if (!music) throw new Error('Music creation failed');

      const usage = artistManager.recordMusicUsage(music.id, 100, 'challenge');
      if (!usage) throw new Error('Usage creation failed');

      const recorded = artistManager.recordMusicViews(usage.id, 1000, 0.001);
      expect(recorded).toBe(true);

      const updated = artistManager.getMusicUsage(usage.id);
      expect(updated?.views).toBe(1000);
      expect(updated?.earnings).toBeGreaterThan(0);
    });

    it('should get popular musics', () => {
      const artist = artistManager.createArtist(7, 'Artist', ['pop']);
      const music1 = artistManager.publishMusic(7, 'Song 1', 'pop', 200, 'url1');
      const music2 = artistManager.publishMusic(7, 'Song 2', 'pop', 210, 'url2');

      if (music1) {
        const usage1 = artistManager.recordMusicUsage(music1.id, 100, 'challenge');
        if (usage1) artistManager.recordMusicViews(usage1.id, 5000);
      }

      if (music2) {
        const usage2 = artistManager.recordMusicUsage(music2.id, 101, 'challenge');
        if (usage2) artistManager.recordMusicViews(usage2.id, 1000);
      }

      const popular = artistManager.getPopularMusics(10);
      expect(popular.length).toBeGreaterThanOrEqual(1);
    });

    it('should get artist statistics', () => {
      const artist = artistManager.createArtist(8, 'Artist', ['pop']);
      const music = artistManager.publishMusic(8, 'Song', 'pop', 200, 'url');

      if (music) {
        const usage = artistManager.recordMusicUsage(music.id, 100, 'challenge');
        if (usage) artistManager.recordMusicViews(usage.id, 1000);
      }

      const stats = artistManager.getArtistStats(artist.id);
      expect(stats).toBeDefined();
      expect(stats?.totalMusics).toBe(1);
      expect(stats?.totalStreams).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Music Licensing', () => {
    let licensingManager: ReturnType<typeof getMusicLicensingManager>;

    beforeEach(() => {
      licensingManager = getMusicLicensingManager();
    });

    it('should create a music license', () => {
      const license = licensingManager.createLicense(
        'music_1',
        1,
        'standard',
        50,
        true,
        true,
        false,
        0,
        365
      );

      expect(license).toBeDefined();
      expect(license.licenseType).toBe('standard');
      expect(license.royaltyRate).toBe(50);
    });

    it('should check usage permissions', () => {
      const license = licensingManager.createLicense(
        'music_2',
        1,
        'standard',
        50,
        true,
        true,
        true
      );

      expect(licensingManager.isUsageAllowed(license.id, 'challenge')).toBe(true);
      expect(licensingManager.isUsageAllowed(license.id, 'commercial')).toBe(true);
      expect(licensingManager.isUsageAllowed(license.id, 'remix')).toBe(true);
    });

    it('should create a license agreement', () => {
      const license = licensingManager.createLicense(
        'music_3',
        1,
        'standard',
        50,
        true,
        true,
        false
      );

      const agreement = licensingManager.createAgreement(
        license.id,
        'music_3',
        1,
        100,
        'challenge',
        50
      );

      expect(agreement).toBeDefined();
      expect(agreement?.creatorId).toBe(100);
      expect(agreement?.status).toBe('active');
    });

    it('should record agreement earnings', () => {
      const license = licensingManager.createLicense(
        'music_4',
        1,
        'standard',
        50,
        true,
        true,
        false
      );

      const agreement = licensingManager.createAgreement(
        license.id,
        'music_4',
        1,
        100,
        'challenge',
        50
      );

      if (!agreement) throw new Error('Agreement creation failed');

      const recorded = licensingManager.recordAgreementEarnings(agreement.id, 5000);
      expect(recorded).toBe(true);

      const updated = licensingManager.getAgreement(agreement.id);
      expect(updated?.totalEarnings).toBe(5000);
    });

    it('should create royalty payments', () => {
      const license = licensingManager.createLicense(
        'music_5',
        1,
        'standard',
        50,
        true,
        true,
        false
      );

      const agreement = licensingManager.createAgreement(
        license.id,
        'music_5',
        1,
        100,
        'challenge',
        50
      );

      if (!agreement) throw new Error('Agreement creation failed');

      const payment = licensingManager.createRoyaltyPayment(1, agreement.id, 5000, '2024-01');
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe(5000);
    });

    it('should get license statistics', () => {
      licensingManager.createLicense('music_6', 1, 'standard', 50);
      licensingManager.createLicense('music_7', 2, 'premium', 60);

      const stats = licensingManager.getLicenseStats();
      expect(stats.totalLicenses).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Music Challenges', () => {
    let challengesManager: ReturnType<typeof getMusicChallengesManager>;

    beforeEach(() => {
      challengesManager = getMusicChallengesManager();
    });

    it('should create a challenge', () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const challenge = challengesManager.createChallenge(
        1,
        'music_1',
        'Dance Challenge',
        endDate,
        10000,
        'Show your moves!'
      );

      expect(challenge).toBeDefined();
      expect(challenge.title).toBe('Dance Challenge');
      expect(challenge.status).toBe('active');
    });

    it('should participate in a challenge', () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const challenge = challengesManager.createChallenge(1, 'music_1', 'Challenge', endDate);

      const participation = challengesManager.participateInChallenge(
        challenge.id,
        100,
        'video_1'
      );

      expect(participation).toBeDefined();
      expect(participation?.participantId).toBe(100);
      expect(challenge.participantCount).toBe(1);
    });

    it('should record engagement', () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const challenge = challengesManager.createChallenge(1, 'music_1', 'Challenge', endDate);

      const participation = challengesManager.participateInChallenge(
        challenge.id,
        100,
        'video_1'
      );

      if (!participation) throw new Error('Participation creation failed');

      const recorded = challengesManager.recordEngagement(
        participation.id,
        1000,
        100,
        50,
        10
      );

      expect(recorded).toBe(true);

      const updated = challengesManager.getParticipation(participation.id);
      expect(updated?.views).toBe(1000);
      expect(updated?.engagement).toBeGreaterThan(0);
    });

    it('should update leaderboard', () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const challenge = challengesManager.createChallenge(1, 'music_1', 'Challenge', endDate);

      const p1 = challengesManager.participateInChallenge(challenge.id, 100, 'video_1');
      const p2 = challengesManager.participateInChallenge(challenge.id, 101, 'video_2');

      if (p1) challengesManager.recordEngagement(p1.id, 1000, 100, 50, 10);
      if (p2) challengesManager.recordEngagement(p2.id, 500, 50, 25, 5);

      const leaderboard = challengesManager.updateLeaderboard(challenge.id);
      expect(leaderboard).toBeDefined();
      expect(leaderboard?.participations.length).toBe(2);
      expect(leaderboard?.participations[0].rank).toBe(1);
    });

    it('should get popular challenges', () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const c1 = challengesManager.createChallenge(1, 'music_1', 'Challenge 1', endDate);
      const c2 = challengesManager.createChallenge(1, 'music_2', 'Challenge 2', endDate);

      challengesManager.participateInChallenge(c1.id, 100, 'video_1');
      challengesManager.participateInChallenge(c1.id, 101, 'video_2');
      challengesManager.participateInChallenge(c2.id, 102, 'video_3');

      const popular = challengesManager.getPopularChallenges(10);
      expect(popular.length).toBeGreaterThanOrEqual(1);
    });

    it('should get challenge statistics', () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const challenge = challengesManager.createChallenge(1, 'music_1', 'Challenge', endDate);

      const p1 = challengesManager.participateInChallenge(challenge.id, 100, 'video_1');
      const p2 = challengesManager.participateInChallenge(challenge.id, 101, 'video_2');

      if (p1) challengesManager.recordEngagement(p1.id, 1000, 100, 50, 10);
      if (p2) challengesManager.recordEngagement(p2.id, 500, 50, 25, 5);

      const stats = challengesManager.getChallengeStats(challenge.id);
      expect(stats).toBeDefined();
      expect(stats?.totalParticipants).toBe(2);
      expect(stats?.totalViews).toBe(1500);
    });
  });

  describe('Music Revenue Sharing', () => {
    let revenueSharingManager: ReturnType<typeof getMusicRevenueSharingManager>;

    beforeEach(() => {
      revenueSharingManager = getMusicRevenueSharingManager();
    });

    it('should create shared revenue', () => {
      const revenue = revenueSharingManager.createSharedRevenue(
        'challenge_1',
        'music_1',
        1,
        2,
        100,
        10000,
        'views'
      );

      expect(revenue).toBeDefined();
      expect(revenue.totalRevenue).toBe(10000);
      expect(revenue.artistShare).toBe(4000); // 40%
      expect(revenue.creatorShare).toBe(4000); // 40%
      expect(revenue.participantShare).toBe(2000); // 20%
    });

    it('should get artist revenue statistics', () => {
      const artistId = 999;
      revenueSharingManager.createSharedRevenue(
        'challenge_999_1',
        'music_999_1',
        artistId,
        2,
        100,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        'challenge_999_2',
        'music_999_1',
        artistId,
        2,
        101,
        5000,
        'ads'
      );

      const stats = revenueSharingManager.getArtistRevenueStats(artistId);
      expect(stats).toBeDefined();
      expect(stats.totalRevenue).toBe(15000);
      expect(stats.artistEarnings).toBe(6000);
    });

    it('should get creator revenue statistics', () => {
      const creatorId = 888;
      revenueSharingManager.createSharedRevenue(
        'challenge_888_1',
        'music_888_1',
        1,
        creatorId,
        100,
        10000,
        'views'
      );

      const stats = revenueSharingManager.getCreatorRevenueStats(creatorId);
      expect(stats).toBeDefined();
      expect(stats.creatorEarnings).toBe(4000);
    });

    it('should get participant revenue statistics', () => {
      const participantId = 777;
      revenueSharingManager.createSharedRevenue(
        'challenge_777_1',
        'music_777_1',
        1,
        2,
        participantId,
        10000,
        'views'
      );

      const stats = revenueSharingManager.getParticipantRevenueStats(participantId);
      expect(stats).toBeDefined();
      expect(stats.participantEarnings).toBe(2000);
    });

    it('should get challenge revenue statistics', () => {
      const challengeId = 'challenge_666_1';
      revenueSharingManager.createSharedRevenue(
        challengeId,
        'music_666_1',
        1,
        2,
        100,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        challengeId,
        'music_666_1',
        1,
        2,
        101,
        5000,
        'ads'
      );

      const stats = revenueSharingManager.getChallengeRevenueStats(challengeId);
      expect(stats).toBeDefined();
      expect(stats.totalRevenue).toBe(15000);
      expect(stats.participantCount).toBe(2);
    });

    it('should get global revenue statistics', () => {
      const before = revenueSharingManager.getGlobalRevenueStats();
      revenueSharingManager.createSharedRevenue(
        'challenge_555_1',
        'music_555_1',
        1,
        2,
        100,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        'challenge_555_2',
        'music_555_2',
        2,
        3,
        101,
        5000,
        'ads'
      );

      const stats = revenueSharingManager.getGlobalRevenueStats();
      expect(stats).toBeDefined();
      expect(stats.totalRevenue).toBe(before.totalRevenue + 15000);
      expect(stats.totalTransactions).toBe(before.totalTransactions + 2);
    });

    it('should get top artists by revenue', () => {
      revenueSharingManager.createSharedRevenue(
        'challenge_444_1',
        'music_444_1',
        444,
        2,
        100,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        'challenge_444_2',
        'music_444_2',
        445,
        3,
        101,
        5000,
        'ads'
      );

      const topArtists = revenueSharingManager.getTopArtistsByRevenue(10);
      expect(topArtists.length).toBeGreaterThanOrEqual(1);
      expect(topArtists[0].totalEarnings).toBeGreaterThan(0);
    });

    it('should get top creators by revenue', () => {
      revenueSharingManager.createSharedRevenue(
        'challenge_333_1',
        'music_333_1',
        1,
        333,
        100,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        'challenge_333_2',
        'music_333_2',
        2,
        334,
        101,
        5000,
        'ads'
      );

      const topCreators = revenueSharingManager.getTopCreatorsByRevenue(10);
      expect(topCreators.length).toBeGreaterThanOrEqual(1);
    });

    it('should get top participants by revenue', () => {
      revenueSharingManager.createSharedRevenue(
        'challenge_222_1',
        'music_222_1',
        1,
        2,
        222,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        'challenge_222_2',
        'music_222_2',
        2,
        3,
        223,
        5000,
        'ads'
      );

      const topParticipants = revenueSharingManager.getTopParticipantsByRevenue(10);
      expect(topParticipants.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration Tests', () => {
    let artistManager: ReturnType<typeof getArtistManagementManager>;
    let licensingManager: ReturnType<typeof getMusicLicensingManager>;
    let challengesManager: ReturnType<typeof getMusicChallengesManager>;
    let revenueSharingManager: ReturnType<typeof getMusicRevenueSharingManager>;

    beforeEach(() => {
      artistManager = getArtistManagementManager();
      licensingManager = getMusicLicensingManager();
      challengesManager = getMusicChallengesManager();
      revenueSharingManager = getMusicRevenueSharingManager();
    });

    it('should handle complete music challenge workflow', () => {
      const artistId = 111;
      const creatorId = 112;
      const artist = artistManager.createArtist(artistId, 'Artist', ['pop']);
      const music = artistManager.publishMusic(artistId, 'Song', 'pop', 200, 'url');
      expect(music).toBeDefined();

      if (!music) throw new Error('Music creation failed');

      const license = licensingManager.createLicense(
        music.id,
        artist.id,
        'standard',
        50,
        true,
        true,
        false
      );
      expect(license).toBeDefined();

      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const challenge = challengesManager.createChallenge(creatorId, music.id, 'Challenge', endDate, 10000);
      expect(challenge).toBeDefined();

      const agreement = licensingManager.createAgreement(
        license.id,
        music.id,
        artist.id,
        creatorId,
        'challenge',
        50
      );
      expect(agreement).toBeDefined();

      const p1 = challengesManager.participateInChallenge(challenge.id, 100, 'video_1');
      const p2 = challengesManager.participateInChallenge(challenge.id, 101, 'video_2');
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      if (!p1 || !p2) throw new Error('Participation creation failed');

      challengesManager.recordEngagement(p1.id, 1000, 100, 50, 10);
      challengesManager.recordEngagement(p2.id, 500, 50, 25, 5);

      revenueSharingManager.createSharedRevenue(
        challenge.id,
        music.id,
        artist.id,
        creatorId,
        100,
        10000,
        'views'
      );
      revenueSharingManager.createSharedRevenue(
        challenge.id,
        music.id,
        artist.id,
        creatorId,
        101,
        5000,
        'views'
      );

      const artistStats = artistManager.getArtistStats(artist.id);
      const challengeStats = challengesManager.getChallengeStats(challenge.id);
      const challengeRevenue = revenueSharingManager.getChallengeRevenueStats(challenge.id);

      expect(artistStats?.totalMusics).toBe(1);
      expect(challengeStats?.totalParticipants).toBe(2);
      expect(challengeRevenue.totalRevenue).toBe(15000);
    });
  });
});
