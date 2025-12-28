/**
 * Notification Demo Component
 * Shows how to use the notification system in your app
 */

import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useNotificationEvents } from '../hooks/useNotificationEvents';
import { Button } from './ui/button';
import {
  Heart,
  UserPlus,
  MessageCircle,
  Gift,
  Share2,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

export const NotificationDemo: React.FC = () => {
  const notification = useNotification();
  const events = useNotificationEvents();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Notification System Demo</h2>
        <p className="text-foreground/70 mb-6">
          Click any button to trigger a TikTok-style notification
        </p>
      </div>

      {/* System Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">System Notifications</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => events.onSuccess('Operation completed successfully')}
            variant="outline"
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Success
          </Button>
          <Button
            onClick={() => events.onError('Something went wrong')}
            variant="outline"
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Error
          </Button>
          <Button
            onClick={() => events.onInfo('This is an info message')}
            variant="outline"
            className="gap-2"
          >
            <Info className="w-4 h-4" />
            Info
          </Button>
          <Button
            onClick={() => events.onWarning('Please be careful')}
            variant="outline"
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Warning
          </Button>
        </div>
      </div>

      {/* Social Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Social Notifications</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              events.onVideoLiked('Sarah Chen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah')
            }
            variant="outline"
            className="gap-2"
          >
            <Heart className="w-4 h-4 text-red-500" />
            Like
          </Button>
          <Button
            onClick={() =>
              events.onFollowed('John Smith', 'https://api.dicebear.com/7.x/avataaars/svg?seed=John')
            }
            variant="outline"
            className="gap-2"
          >
            <UserPlus className="w-4 h-4 text-blue-500" />
            Follow
          </Button>
          <Button
            onClick={() =>
              events.onCommented(
                'Emma Wilson',
                'This is amazing! 🔥',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
              )
            }
            variant="outline"
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4 text-green-500" />
            Comment
          </Button>
          <Button
            onClick={() =>
              events.onMentioned(
                'Alex Kumar',
                'Check out this amazing video',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
              )
            }
            variant="outline"
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4 text-green-500" />
            Mention
          </Button>
        </div>
      </div>

      {/* Gift & Reward Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Gifts & Rewards</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              events.onGiftReceived(
                'Lisa Park',
                'Diamond Ring',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa'
              )
            }
            variant="outline"
            className="gap-2"
          >
            <Gift className="w-4 h-4 text-yellow-500" />
            Gift
          </Button>
          <Button
            onClick={() => events.onRewardEarned(5000, 'from video views')}
            variant="outline"
            className="gap-2"
          >
            <Gift className="w-4 h-4 text-yellow-500" />
            Reward
          </Button>
        </div>
      </div>

      {/* Messaging Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Messaging</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              events.onNewMessage(
                'Mike Johnson',
                'Hey! How are you doing?',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
              )
            }
            variant="outline"
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4 text-purple-500" />
            Message
          </Button>
          <Button
            onClick={() => events.onMessageRead('Mike Johnson')}
            variant="outline"
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4 text-purple-500" />
            Read
          </Button>
        </div>
      </div>

      {/* Live Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Live Events</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              events.onLiveStarted(
                'Rachel Green',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel'
              )
            }
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-500" />
            Live Started
          </Button>
          <Button
            onClick={() => events.onLiveEnded('Rachel Green', 1234)}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-500" />
            Live Ended
          </Button>
          <Button
            onClick={() =>
              events.onLiveViewerJoined(
                'Tom Hardy',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom'
              )
            }
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-500" />
            Viewer Joined
          </Button>
        </div>
      </div>

      {/* Challenge Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Challenges</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => events.onChallengeCreated('Dance Challenge 2024')}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Challenge Created
          </Button>
          <Button
            onClick={() => events.onChallengeJoined('David Lee', 'Dance Challenge 2024')}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Challenge Joined
          </Button>
        </div>
      </div>

      {/* Sharing Notifications */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Sharing</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => events.onVideoShared('Nicole Brown')}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-500" />
            Video Shared
          </Button>
          <Button
            onClick={() => events.onVideoDownloaded()}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-500" />
            Downloaded
          </Button>
        </div>
      </div>

      {/* Custom Notification */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Custom Notifications</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              notification.showNotification('Custom notification with action', {
                type: 'info',
                duration: 5000,
                action: {
                  label: 'Click Me',
                  onClick: () => alert('Action clicked!'),
                },
              })
            }
            variant="outline"
          >
            With Action
          </Button>
          <Button
            onClick={() => notification.clearAll()}
            variant="outline"
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
};
