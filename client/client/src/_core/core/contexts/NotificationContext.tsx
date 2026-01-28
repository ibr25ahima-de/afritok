/**
 * Notification Context - Global notification management for TikTok-style toasts
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TikTokToast, ToastType } from '../components/TikTokToast';

export interface NotificationOptions {
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  avatar?: string;
  username?: string;
}

export interface Notification extends NotificationOptions {
  id: string;
  message: string;
  title?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, options?: NotificationOptions & { title?: string }) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  like: (username: string, avatar?: string) => string;
  follow: (username: string, avatar?: string) => string;
  comment: (username: string, message?: string, avatar?: string) => string;
  message: (username: string, message?: string, avatar?: string) => string;
  gift: (username: string, giftName?: string, avatar?: string) => string;
  share: (message: string) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (message: string, options?: NotificationOptions & { title?: string }): string => {
      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const notification: Notification = {
        id,
        message,
        type: options?.type || 'info',
        duration: options?.duration || 3000,
        title: options?.title,
        action: options?.action,
        avatar: options?.avatar,
        username: options?.username,
      };

      setNotifications((prev) => [...prev, notification]);

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, title?: string) =>
      showNotification(message, { type: 'success', title }),
    [showNotification]
  );

  const error = useCallback(
    (message: string, title?: string) =>
      showNotification(message, { type: 'error', title }),
    [showNotification]
  );

  const info = useCallback(
    (message: string, title?: string) =>
      showNotification(message, { type: 'info', title }),
    [showNotification]
  );

  const warning = useCallback(
    (message: string, title?: string) =>
      showNotification(message, { type: 'warning', title }),
    [showNotification]
  );

  const like = useCallback(
    (username: string, avatar?: string) =>
      showNotification(`${username} liked your video`, {
        type: 'like',
        username,
        avatar,
        duration: 2500,
      }),
    [showNotification]
  );

  const follow = useCallback(
    (username: string, avatar?: string) =>
      showNotification(`${username} started following you`, {
        type: 'follow',
        username,
        avatar,
        duration: 3000,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to user profile
            window.location.href = `/profile/${username}`;
          },
        },
      }),
    [showNotification]
  );

  const comment = useCallback(
    (username: string, message?: string, avatar?: string) =>
      showNotification(
        message ? `${username}: "${message}"` : `${username} commented on your video`,
        {
          type: 'comment',
          username,
          avatar,
          duration: 3000,
        }
      ),
    [showNotification]
  );

  const message = useCallback(
    (username: string, messageText?: string, avatar?: string) =>
      showNotification(
        messageText ? `${username}: "${messageText}"` : `New message from ${username}`,
        {
          type: 'message',
          username,
          avatar,
          duration: 4000,
          action: {
            label: 'Reply',
            onClick: () => {
              // Open message dialog
              console.log(`Open message with ${username}`);
            },
          },
        }
      ),
    [showNotification]
  );

  const gift = useCallback(
    (username: string, giftName?: string, avatar?: string) =>
      showNotification(
        giftName ? `${username} sent you a ${giftName}` : `${username} sent you a gift`,
        {
          type: 'gift',
          username,
          avatar,
          duration: 3500,
          action: {
            label: 'Thank',
            onClick: () => {
              // Send thank you message
              console.log(`Thank ${username} for gift`);
            },
          },
        }
      ),
    [showNotification]
  );

  const share = useCallback(
    (shareMessage: string) =>
      showNotification(shareMessage, {
        type: 'share',
        duration: 2500,
      }),
    [showNotification]
  );

  const value: NotificationContextType = {
    notifications,
    showNotification,
    removeNotification,
    clearAll,
    success,
    error,
    info,
    warning,
    like,
    follow,
    comment,
    message,
    gift,
    share,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

/**
 * Container component that renders all active notifications
 */
const NotificationContainer: React.FC<{
  notifications: Notification[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed bottom-0 right-0 z-50 pointer-events-none">
      <div className="flex flex-col gap-3 p-4 pointer-events-auto">
        {notifications.map((notification) => (
          <TikTokToast
            key={notification.id}
            id={notification.id}
            type={notification.type || 'info'}
            message={notification.message}
            title={notification.title}
            duration={notification.duration}
            action={notification.action}
            avatar={notification.avatar}
            username={notification.username}
            onClose={onRemove}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Hook to use notifications in components
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
