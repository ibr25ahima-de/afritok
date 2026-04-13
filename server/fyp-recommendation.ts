/**
 * For You Page (FYP) Recommendation System
 * AI-powered personalized video recommendations
 */

// ✅ 1. Remplace getDb par db
import { db } from './db';
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
  // ✅ 2. Supprime getDb() et utilise directement db
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
 */
async function calculateCollaborativeScore(userId: number, videoId: number): Promise<number> {
  try {
    const similarUsers = await findSimilarUsers(userId, 10);
    if (similarUsers.length === 0) return 0;

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
 */
async function calculateContentScore(preferences: UserPreferences, video: any): Promise<number> {
  try {
    let score = 0;

    if (preferences.preferredCategories.includes(video.category)) {
      score += 30;
    }

    if (preferences.preferredLanguages.includes(video.language)) {
      score += 20;
    }

    if (preferences.followedCreators.includes(video.creatorId)) {
      score += 25;
    }

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
 */
async function calculateTrendingScore(videoId: number): Promise<number> {
  try {
    const video = await getVideoStats(videoId);
    if (!video) return 0;

    const viewsLast24h = await getViewsInLast24h(videoId);
    // ✅ 5. Sécurise les divisions (views || 1)
    const engagementRate = (video.likes + video.comments + video.shares) / (video.views || 1);
    const shareCount = video.shares;

    const score =
      Math.min(viewsLast24h / 1000, 30) +
      engagementRate * 40 +
      Math.min(shareCount / 100, 30);

    return Math.min(100, score);
  } catch (error) {
    console.error('Failed to calculate trending score:', error);
    return 0;
  }
}

/**
 * Calculate engagement score
 */
async function calculateEngagementScore(videoId: number): Promise<number> {
  try {
    const video = await getVideoStats(videoId);
    if (!video) return 0;

    // ✅ 5. Sécurise les divisions (views || 1)
    const engagementRate = (video.likes + video.comments + video.shares) / (video.views || 1);
    const avgWatchPercentage = video.averageWatchTime || 0;
    const completionRate = video.completionRate || 0;

    const score =
      engagementRate * 40 +
      avgWatchPercentage * 30 +
      completionRate * 30;

    return Math.min(100, score);
  } catch (error) {
    console.error('Failed to calculate engagement score:', error);
    return 0;
  }
}

/**
 * Calculate personalization score
 */
async function calculatePersonalizationScore(userId: number, video: any): Promise<number> {
  try {
    const preferences = await getUserPreferences(userId);
    const userAvgWatchTime = await getUserAverageWatchTime(userId);
    const videoLength = video.duration;

    let score = 0;

    if (userAvgWatchTime < 30 && videoLength < 30) {
      score += 30;
    }

    if (userAvgWatchTime > 45 && videoLength > 45) {
      score += 30;
    }

    const userPeakHours = await getUserPeakActivityHours(userId);
    const videoPeakHours = await getVideoPeakViewHours(video.id);

    const overlap = userPeakHours.filter((h) => videoPeakHours.includes(h)).length;
    score += overlap * 5;

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
    if (!video) return 'Recommended based on your preferences';

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
    - Engagement rate: ${(((video.likes + video.comments + video.shares) / (video.views || 1)) * 100).toFixed(1)}%
    
    Explain in one sentence why this video was recommended to this user.
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: prompt,
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

/**
 * 🔧 3. Remplace getCandidateVideos par une version fonctionnelle
 * Fallback intelligent : retourne les vidéos les plus populaires
 */
async function getCandidateVideos(userId: number, limit: number): Promise<any[]> {
  try {
    // @ts-ignore - Assuming drizzle schema structure
    return await db.query.videos.findMany({
      limit,
      orderBy: (videos, { desc }) => [desc(videos.views)],
    });
  } catch (error) {
    console.error('Failed to get candidate videos:', error);
    return [];
  }
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

/**
 * 🔧 4. Corrige getVideoStats pour utiliser la base de données
 */
async function getVideoStats(videoId: number): Promise<any> {
  try {
    // @ts-ignore - Assuming drizzle schema structure
    return await db.query.videos.findFirst({
      where: (videos, { eq }) => eq(videos.id, videoId),
    });
  } catch (error) {
    console.error('Failed to get video stats:', error);
    return null;
  }
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
  return await getVideoStats(videoId);
}
