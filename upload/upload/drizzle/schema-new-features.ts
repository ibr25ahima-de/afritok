/**
 * Schémas de base de données pour les nouvelles fonctionnalités
 * 
 * Ajouter ces tables à drizzle/schema.ts
 */

import {
  int,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  mysqlEnum,
  mysqlTable,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/mysql-core';

// ============================================================================
// HASHTAGS ET MENTIONS
// ============================================================================

export const hashtags = mysqlTable(
  'hashtags',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    videoCount: int('videoCount').default(0).notNull(),
    viewCount: int('viewCount').default(0).notNull(),
    trendingRank: int('trendingRank'),
    category: varchar('category', { length: 100 }),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index('hashtags_name_idx').on(table.name),
    trendingIdx: index('hashtags_trending_idx').on(table.trendingRank),
  })
);

export const videoHashtags = mysqlTable(
  'videoHashtags',
  {
    id: int('id').autoincrement().primaryKey(),
    videoId: int('videoId').notNull(),
    hashtagId: int('hashtagId').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    videoHashtagIdx: index('videoHashtags_videoId_idx').on(table.videoId),
    hashtagIdx: index('videoHashtags_hashtagId_idx').on(table.hashtagId),
  })
);

export const mentions = mysqlTable(
  'mentions',
  {
    id: int('id').autoincrement().primaryKey(),
    videoId: int('videoId').notNull(),
    mentionedUserId: int('mentionedUserId').notNull(),
    creatorId: int('creatorId').notNull(),
    timestamp: int('timestamp').notNull(), // Position dans la vidéo (ms)
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    videoIdx: index('mentions_videoId_idx').on(table.videoId),
    userIdx: index('mentions_mentionedUserId_idx').on(table.mentionedUserId),
  })
);

// ============================================================================
// DUETS ET STITCHES
// ============================================================================

export const duets = mysqlTable(
  'duets',
  {
    id: int('id').autoincrement().primaryKey(),
    originalVideoId: int('originalVideoId').notNull(),
    duetVideoId: int('duetVideoId').notNull(),
    layout: mysqlEnum('layout', ['side-by-side', 'picture-in-picture', 'split']).default('side-by-side').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    originalIdx: index('duets_originalVideoId_idx').on(table.originalVideoId),
    duetIdx: index('duets_duetVideoId_idx').on(table.duetVideoId),
  })
);

export const stitches = mysqlTable(
  'stitches',
  {
    id: int('id').autoincrement().primaryKey(),
    originalVideoId: int('originalVideoId').notNull(),
    stitchVideoId: int('stitchVideoId').notNull(),
    clipStartTime: int('clipStartTime').notNull(), // en ms
    clipEndTime: int('clipEndTime').notNull(), // en ms
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    originalIdx: index('stitches_originalVideoId_idx').on(table.originalVideoId),
    stitchIdx: index('stitches_stitchVideoId_idx').on(table.stitchVideoId),
  })
);

// ============================================================================
// MESSAGES DIRECTS
// ============================================================================

export const conversations = mysqlTable(
  'conversations',
  {
    id: int('id').autoincrement().primaryKey(),
    participant1Id: int('participant1Id').notNull(),
    participant2Id: int('participant2Id').notNull(),
    lastMessageAt: timestamp('lastMessageAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    participant1Idx: index('conversations_participant1Id_idx').on(table.participant1Id),
    participant2Idx: index('conversations_participant2Id_idx').on(table.participant2Id),
    uniqueConversation: unique('unique_conversation').on(table.participant1Id, table.participant2Id),
  })
);

export const directMessages = mysqlTable(
  'directMessages',
  {
    id: int('id').autoincrement().primaryKey(),
    conversationId: int('conversationId').notNull(),
    senderId: int('senderId').notNull(),
    content: text('content').notNull(),
    mediaUrl: varchar('mediaUrl', { length: 500 }),
    mediaType: mysqlEnum('mediaType', ['image', 'video', 'none']).default('none').notNull(),
    isRead: boolean('isRead').default(false).notNull(),
    readAt: timestamp('readAt'),
    isEdited: boolean('isEdited').default(false).notNull(),
    editedAt: timestamp('editedAt'),
    sentAt: timestamp('sentAt').defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index('directMessages_conversationId_idx').on(table.conversationId),
    senderIdx: index('directMessages_senderId_idx').on(table.senderId),
    readIdx: index('directMessages_isRead_idx').on(table.isRead),
  })
);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = mysqlTable(
  'notifications',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('userId').notNull(),
    type: mysqlEnum('type', [
      'like',
      'comment',
      'follow',
      'message',
      'mention',
      'duet',
      'stitch',
      'gift',
      'trending',
    ]).notNull(),
    relatedUserId: int('relatedUserId'),
    relatedVideoId: int('relatedVideoId'),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content'),
    isRead: boolean('isRead').default(false).notNull(),
    readAt: timestamp('readAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('notifications_userId_idx').on(table.userId),
    typeIdx: index('notifications_type_idx').on(table.type),
    readIdx: index('notifications_isRead_idx').on(table.isRead),
  })
);

// ============================================================================
// CADEAUX VIRTUELS
// ============================================================================

export const virtualGifts = mysqlTable(
  'virtualGifts',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    icon: varchar('icon', { length: 500 }).notNull(),
    price: varchar('price', { length: 20 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    creatorEarningsPercentage: int('creatorEarningsPercentage').default(50).notNull(),
    animated: boolean('animated').default(false).notNull(),
    category: varchar('category', { length: 50 }),
    isActive: boolean('isActive').default(true).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  }
);

export const giftTransactions = mysqlTable(
  'giftTransactions',
  {
    id: int('id').autoincrement().primaryKey(),
    senderId: int('senderId').notNull(),
    recipientId: int('recipientId').notNull(),
    videoId: int('videoId'),
    giftId: int('giftId').notNull(),
    amount: varchar('amount', { length: 20 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    creatorEarnings: varchar('creatorEarnings', { length: 20 }).notNull(),
    platformFee: varchar('platformFee', { length: 20 }).notNull(),
    status: mysqlEnum('status', ['pending', 'completed', 'failed', 'refunded']).default('pending').notNull(),
    transactionId: varchar('transactionId', { length: 255 }).unique(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    senderIdx: index('giftTransactions_senderId_idx').on(table.senderId),
    recipientIdx: index('giftTransactions_recipientId_idx').on(table.recipientId),
    videoIdx: index('giftTransactions_videoId_idx').on(table.videoId),
    statusIdx: index('giftTransactions_status_idx').on(table.status),
  })
);

// ============================================================================
// ANALYTICS
// ============================================================================

export const videoAnalytics = mysqlTable(
  'videoAnalytics',
  {
    id: int('id').autoincrement().primaryKey(),
    videoId: int('videoId').notNull().unique(),
    views: int('views').default(0).notNull(),
    likes: int('likes').default(0).notNull(),
    comments: int('comments').default(0).notNull(),
    shares: int('shares').default(0).notNull(),
    saves: int('saves').default(0).notNull(),
    averageWatchTime: int('averageWatchTime').default(0).notNull(), // en secondes
    completionRate: varchar('completionRate', { length: 10 }).default('0.00').notNull(), // en %
    engagementRate: varchar('engagementRate', { length: 10 }).default('0.00').notNull(), // en %
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    videoIdx: index('videoAnalytics_videoId_idx').on(table.videoId),
  })
);

export const creatorAnalytics = mysqlTable(
  'creatorAnalytics',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('userId').notNull().unique(),
    totalFollowers: int('totalFollowers').default(0).notNull(),
    followerGrowth: int('followerGrowth').default(0).notNull(), // par mois
    totalViews: int('totalViews').default(0).notNull(),
    totalEngagement: int('totalEngagement').default(0).notNull(),
    totalVideos: int('totalVideos').default(0).notNull(),
    averageEngagementRate: varchar('averageEngagementRate', { length: 10 }).default('0.00').notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index('creatorAnalytics_userId_idx').on(table.userId),
  })
);

export const dailyAnalytics = mysqlTable(
  'dailyAnalytics',
  {
    id: int('id').autoincrement().primaryKey(),
    videoId: int('videoId').notNull(),
    date: timestamp('date').notNull(),
    views: int('views').default(0).notNull(),
    likes: int('likes').default(0).notNull(),
    comments: int('comments').default(0).notNull(),
    shares: int('shares').default(0).notNull(),
    saves: int('saves').default(0).notNull(),
  },
  (table) => ({
    videoDateIdx: index('dailyAnalytics_videoId_date_idx').on(table.videoId, table.date),
  })
);

// ============================================================================
// FILTRES ET EFFETS
// ============================================================================

export const filters = mysqlTable(
  'filters',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    type: mysqlEnum('type', ['ar', 'effect', 'transition', 'color', 'sticker']).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    previewUrl: varchar('previewUrl', { length: 500 }).notNull(),
    arModelUrl: varchar('arModelUrl', { length: 500 }), // Pour filtres AR
    isActive: boolean('isActive').default(true).notNull(),
    creatorId: int('creatorId'), // Si créé par un utilisateur
    downloads: int('downloads').default(0).notNull(),
    rating: varchar('rating', { length: 10 }).default('0.0').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('filters_type_idx').on(table.type),
    categoryIdx: index('filters_category_idx').on(table.category),
  })
);

// ============================================================================
// TYPES EXPORTÉS
// ============================================================================

export type Hashtag = typeof hashtags.$inferSelect;
export type InsertHashtag = typeof hashtags.$inferInsert;

export type VideoHashtag = typeof videoHashtags.$inferSelect;
export type InsertVideoHashtag = typeof videoHashtags.$inferInsert;

export type Mention = typeof mentions.$inferSelect;
export type InsertMention = typeof mentions.$inferInsert;

export type Duet = typeof duets.$inferSelect;
export type InsertDuet = typeof duets.$inferInsert;

export type Stitch = typeof stitches.$inferSelect;
export type InsertStitch = typeof stitches.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = typeof directMessages.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type VirtualGift = typeof virtualGifts.$inferSelect;
export type InsertVirtualGift = typeof virtualGifts.$inferInsert;

export type GiftTransaction = typeof giftTransactions.$inferSelect;
export type InsertGiftTransaction = typeof giftTransactions.$inferInsert;

export type VideoAnalytic = typeof videoAnalytics.$inferSelect;
export type InsertVideoAnalytic = typeof videoAnalytics.$inferInsert;

export type CreatorAnalytic = typeof creatorAnalytics.$inferSelect;
export type InsertCreatorAnalytic = typeof creatorAnalytics.$inferInsert;

export type DailyAnalytic = typeof dailyAnalytics.$inferSelect;
export type InsertDailyAnalytic = typeof dailyAnalytics.$inferInsert;

export type Filter = typeof filters.$inferSelect;
export type InsertFilter = typeof filters.$inferInsert;
