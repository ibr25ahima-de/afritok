/**
 * Hook for handling notification events
 * Provides methods to trigger various notification types
 */

import { useNotification } from '../contexts/NotificationContext';

export interface NotificationEventHandlers {
  // Social interactions
  onVideoLiked: (username: string, avatar?: string) => void;
  onVideoUnliked: (username: string) => void;
  onFollowed: (username: string, avatar?: string) => void;
  onUnfollowed: (username: string) => void;
  onCommented: (username: string, commentText: string, avatar?: string) => void;
  onCommentLiked: (username: string) => void;
  onMentioned: (username: string, message: string, avatar?: string) => void;

  // Messaging
  onNewMessage: (username: string, message: string, avatar?: string) => void;
  onMessageRead: (username: string) => void;

  // Gifts and rewards
  onGiftReceived: (username: string, giftName: string, avatar?: string) => void;
  onRewardEarned: (amount: number, reason: string) => void;

  // Live events
  onLiveStarted: (username: string, avatar?: string) => void;
  onLiveEnded: (username: string, viewers: number) => void;
  onLiveViewerJoined: (username: string, avatar?: string) => void;

  // Challenges
  onChallengeCreated: (challengeName: string) => void;
  onChallengeJoined: (username: string, challengeName: string) => void;

  // Sharing
  onVideoShared: (username: string) => void;
  onVideoDownloaded: () => void;

  // System notifications
  onSuccess: (message: string, title?: string) => void;
  onError: (message: string, title?: string) => void;
  onInfo: (message: string, title?: string) => void;
  onWarning: (message: string, title?: string) => void;
}

export const useNotificationEvents = (): NotificationEventHandlers => {
  const notification = useNotification();

  return {
    // Social interactions
    onVideoLiked: (username: string, avatar?: string) => {
      notification.like(username, avatar);
    },

    onVideoUnliked: (username: string) => {
      notification.info(`Unliked ${username}'s video`);
    },

    onFollowed: (username: string, avatar?: string) => {
      notification.follow(username, avatar);
    },

    onUnfollowed: (username: string) => {
      notification.info(`Unfollowed ${username}`);
    },

    onCommented: (username: string, commentText: string, avatar?: string) => {
      notification.comment(username, commentText, avatar);
    },

    onCommentLiked: (username: string) => {
      notification.info(`${username} liked your comment`);
    },

    onMentioned: (username: string, message: string, avatar?: string) => {
      notification.showNotification(`${username} mentioned you: "${message}"`, {
        type: 'comment',
        username,
        avatar,
        duration: 4000,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to the mention context
            console.log(`View mention from ${username}`);
          },
        },
      });
    },

    // Messaging
    onNewMessage: (username: string, message: string, avatar?: string) => {
      notification.message(username, message, avatar);
    },

    onMessageRead: (username: string) => {
      notification.info(`${username} read your message`);
    },

    // Gifts and rewards
    onGiftReceived: (username: string, giftName: string, avatar?: string) => {
      notification.gift(username, giftName, avatar);
    },

    onRewardEarned: (amount: number, reason: string) => {
      notification.showNotification(`You earned $${(amount / 100).toFixed(2)} ${reason}`, {
        type: 'gift',
        duration: 3000,
        action: {
          label: 'Withdraw',
          onClick: () => {
            // Open withdrawal dialog
            console.log('Open withdrawal dialog');
          },
        },
      });
    },

    // Live events
    onLiveStarted: (username: string, avatar?: string) => {
      notification.showNotification(`${username} is now live`, {
        type: 'info',
        username,
        avatar,
        duration: 3000,
        action: {
          label: 'Watch',
          onClick: () => {
            // Navigate to live
            window.location.href = `/live/${username}`;
          },
        },
      });
    },

    onLiveEnded: (username: string, viewers: number) => {
      notification.info(`${username}'s live ended (${viewers} viewers)`);
    },

    onLiveViewerJoined: (username: string, avatar?: string) => {
      notification.showNotification(`${username} joined your live`, {
        type: 'info',
        username,
        avatar,
        duration: 2000,
      });
    },

    // Challenges
    onChallengeCreated: (challengeName: string) => {
      notification.success(`Challenge "${challengeName}" created successfully`);
    },

    onChallengeJoined: (username: string, challengeName: string) => {
      notification.info(`${username} joined your challenge "${challengeName}"`);
    },

    // Sharing
    onVideoShared: (username: string) => {
      notification.share(`${username} shared your video`);
    },

    onVideoDownloaded: () => {
      notification.success('Video downloaded successfully');
    },

    // System notifications
    onSuccess: (message: string, title?: string) => {
      notification.success(message, title);
    },

    onError: (message: string, title?: string) => {
      notification.error(message, title);
    },

    onInfo: (message: string, title?: string) => {
      notification.info(message, title);
    },

    onWarning: (message: string, title?: string) => {
      notification.warning(message, title);
    },
  };
};
