/**
 * For You Page (FYP) Recommendation System
 * AI-powered personalized video recommendations
 */

import { getDb } from './db';
import { invokeLLM } from './_core/llm';

export interface UserPreferences {
  userId: number;
  watchHistory: number[]; // video IDs
  likedVideos: number[];
  sharedVideos: number[];
  commentedVideos: number[];
  followedCreators: number[];
  blockedCreators: number[];
  preferredCategories: string[];
  preferredLanguages: string[];
  engagementScore: number;
}

export interface VideoRecommendation {
  videoId: number;
  score: number; // 0-100
  reason: string;
  algorithm: 'collaborative' | 'content-based' | 'trending' | 'personalized' | 'hybrid';
}

export interface FYPFeed {
  videos: VideoRecommendation[];
  generatedAt: Date;
  userId: number;
}

/**
 * Generate personalized FYP feed using AI
 */
export async function generateFYPFeed(userId: number, limit: number = 50): Promise<FYPFeed> {
  const db = await getDb();
  if (!db) {
    return {
      videos: [],
      generatedAt: new Date(),
      userId,
    };
  }

  try {
    // Get user preferences
    const preferences = await getUserPreferences(userId);

    // Get candidate videos
    const candidates = await getCandidateVideos(userId, limit * 3);

    // Score videos using multiple algorithms
    const scoredVideos: VideoRecommendation[] = [];

    for (const video of candidates) {
      // Collaborative filtering score
      const collaborativeScore = await calculateCollaborativeScore(userId, video.id);

      // Content-based score
      const contentScore = await calculateContentScore(preferences, video);

      // Trending score
      const trendingScore = await calculateTrendingScore(video.id);

      // Engagement score
      const engagementScore = await calculateEngagementScore(video.id);

      // Personalization score
      const personalizationScore = await calculatePersonalizationScore(userId, video);

      // Combine scores using weighted average
      const finalScore =
        collaborativeScore * 0.25 +
        contentScore * 0.25 +
        trendingScore * 0.2 +
        engagementScore * 0.15 +
        personalizationScore * 0.15;

      // Determine algorithm
      let algorithm: VideoRecommendation['algorithm'] = 'hybrid';
      if (collaborativeScore > contentScore && collaborativeScore > personalizationScore) {
        algorithm = 'collaborative';
      } else if (contentScore > collaborativeScore && contentScore > personalizationScore) {
        algorithm = 'content-based';
      } else if (trendingScore > 70) {
        algorithm = 'trending';
      } else if (personalizationScore > 80) {
        algorithm = 'personalized';
      }

      scoredVideos.push({
        videoId: video.id,
        score: Math.round(finalScore),
        reason: `Recommended based on ${algorithm} algorithm`,
        algorithm,
      });
    }

    // Sort by score and return top videos
    const topVideos = scoredVideos.sort((a, b) => b.score - a.score).slice(0, limit);

    return {
      videos: topVideos,
      generatedAt: new Date(),
      userId,
    };
  } catch (error) {
    console.error('Failed to generate FYP feed:', error);
    return {
      videos: [],
      generatedAt: new Date(),
      userId,
    };
  }
}

/**
 * Calculate collaborative filtering score
 * Based on similar users' preferences
 */
async function calculateCollaborativeScore(userId: number, videoId: number): Promise<number> {
  try {
    // Find similar users (users with similar watch history)
    const similarUsers = await findSimilarUsers(userId, 10);

    // Check if similar users liked this video
    let score = 0;
    for (const similarUser of similarUsers) {
      const similarity = await calculateUserSimilarity(userId, similarUser.id);
      const hasLiked = await userLikedVideo(similarUser.id, videoId);

      if (hasLiked) {
        score += similarity * 100;
      }
    }

    return Math.min(100, score / similarUsers.length);
  } catch (error) {
    console.error('Failed to calculate collaborative score:', error);
    return 0;
  }
}

/**
 * Calculate content-based score
 * Based on video features and user preferences
 */
async function calculateContentScore(preferences: UserPreferences, video: any): Promise<number> {
  try {
    let score = 0;

    // Check if video category matches preferences
    if (preferences.preferredCategories.includes(video.category)) {
      score += 30;
    }

    // Check if video language matches preferences
    if (preferences.preferredLanguages.includes(video.language)) {
      score += 20;
    }

    // Check if creator is followed
    if (preferences.followedCreators.includes(video.creatorId)) {
      score += 25;
    }

    // Check if similar to liked videos
    const similarToLiked = await checkSimilarityToLikedVideos(preferences.likedVideos, video.id);
    if (similarToLiked) {
      score += 25;
    }

    return Math.min(100, score);
  } catch (error) {
    console.error('Failed to calculate content score:', error);
    return 0;
  }
}

/**
 * Calculate trending score
 * Based on current popularity
 */
async function calculateTrendingScore(videoId: number): Promise<number> {
  try {
    const video = await getVideoStats(videoId);
    if (!video) return 0;

    // Calculate trending score based on:
    // - Views in last 24 hours
    // - Engagement rate
    // - Share count

    const viewsLast24h = await getViewsInLast24h(videoId);
    const engagementRate = (video.likes + video.comments + video.shares) / (video.views || 1);
    const shareCount = video.shares;

    const score =
      Math.min(viewsLast24h / 1000, 30) + // Views component
      engagementRate * 40 + // Engagement component
      Math.min(shareCount / 100, 30); // Share component

    return Math.min(100, score);
  } catch (error) {
    console.error('Failed to calculate trending score:', error);
    return 0;
  }
}

/**
 * Calculate engagement score
 * Based on user interaction patterns
 */
async function calculateEngagementScore(videoId: number): Promise<number> {
  try {
    const video = await getVideoStats(videoId);
    if (!video) return 0;

    // Engagement rate = (likes + comments + shares) / views
    const engagementRate = (video.likes + video.comments + video.shares) / (video.views || 1);

    // Average watch time percentage
    const avgWatchPercentage = video.averageWatchTime || 0;

    // Completion rate
    const completionRate = video.completionRate || 0;

    const score =
      engagementRate * 40 + // Engagement component
      avgWatchPercentage * 30 + // Watch time component
      completionRate * 30; // Completion component

    return Math.min(100, score);
  } catch (error) {
    console.error('Failed to calculate engagement score:', error);
    return 0;
  }
}

/**
 * Calculate personalization score
 * Based on user's unique preferences
 */
async function calculatePersonalizationScore(userId: number, video: any): Promise<number> {
  try {
    const preferences = await getUserPreferences(userId);

    // Check if video matches user's engagement patterns
    const userAvgWatchTime = await getUserAverageWatchTime(userId);
    const videoLength = video.duration;

    let score = 0;

    // If user prefers short videos
    if (userAvgWatchTime < 30 && videoLength < 30) {
      score += 30;
    }

    // If user prefers long videos
    if (userAvgWatchTime > 45 && videoLength > 45) {
      score += 30;
    }

    // If video matches user's peak activity time
    const userPeakHours = await getUserPeakActivityHours(userId);
    const videoPeakHours = await getVideoPeakViewHours(video.id);

    const overlap = userPeakHours.filter((h) => videoPeakHours.includes(h)).length;
    score += overlap * 5;

    // If video is from user's region
    if (video.region === preferences.preferredLanguages[0]) {
      score += 20;
    }

    return Math.min(100, score);
  } catch (error) {
    console.error('Failed to calculate personalization score:', error);
    return 0;
  }
}

/**
 * Use LLM to explain recommendation
 */
export async function explainRecommendation(userId: number, videoId: number): Promise<string> {
  try {
    const preferences = await getUserPreferences(userId);
    const video = await getVideoInfo(videoId);

    const prompt = `
    A user with the following preferences:
    - Followed creators: ${preferences.followedCreators.length} creators
    - Preferred categories: ${preferences.preferredCategories.join(', ')}
    - Preferred languages: ${preferences.preferredLanguages.join(', ')}
    - Engagement score: ${preferences.engagementScore}/100
    
    Was recommended this video:
    - Title: ${video.title}
    - Creator: ${video.creatorName}
    - Category: ${video.category}
    - Language: ${video.language}
    - Views: ${video.views}
    - Engagement rate: ${((video.likes + video.comments + video.shares) / video.views * 100).toFixed(1)}%
    
    Explain in one sentence why this video was recommended to this user.
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: prompt as string,
        },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : 'Recommended based on your preferences';
  } catch (error) {
    console.error('Failed to explain recommendation:', error);
    return 'Recommended based on your preferences';
  }
}

// Helper functions
async function getUserPreferences(userId: number): Promise<UserPreferences> {
  return {
    userId,
    watchHistory: [],
    likedVideos: [],
    sharedVideos: [],
    commentedVideos: [],
    followedCreators: [],
    blockedCreators: [],
    preferredCategories: [],
    preferredLanguages: [],
    engagementScore: 50,
  };
}

async function getCandidateVideos(userId: number, limit: number): Promise<any[]> {
  return [];
}

async function findSimilarUsers(userId: number, limit: number): Promise<any[]> {
  return [];
}

async function calculateUserSimilarity(userId1: number, userId2: number): Promise<number> {
  return 0.5;
}

async function userLikedVideo(userId: number, videoId: number): Promise<boolean> {
  return false;
}

async function checkSimilarityToLikedVideos(likedVideoIds: number[], videoId: number): Promise<boolean> {
  return false;
}

async function getVideoStats(videoId: number): Promise<any> {
  return null;
}

async function getViewsInLast24h(videoId: number): Promise<number> {
  return 0;
}

async function getUserAverageWatchTime(userId: number): Promise<number> {
  return 30;
}

async function getUserPeakActivityHours(userId: number): Promise<number[]> {
  return [];
}

async function getVideoPeakViewHours(videoId: number): Promise<number[]> {
  return [];
}

async function getVideoInfo(videoId: number): Promise<any> {
  return null;
}
