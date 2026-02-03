/**
 * TikTok-style Toast Notification Component
 * Animated toast notifications that appear in the bottom-right corner
 */

import React, { useEffect, useState } from 'react';
import { X, Heart, UserPlus, MessageCircle, Share2, Gift, CheckCircle, AlertCircle, Info } from 'lucide-react';
import '../styles/tiktok-toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'like' | 'follow' | 'comment' | 'message' | 'gift' | 'share';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: (id: string) => void;
  avatar?: string;
  username?: string;
}

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'like':
      return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
    case 'follow':
      return <UserPlus className="w-5 h-5 text-blue-500" />;
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-green-500" />;
    case 'message':
      return <MessageCircle className="w-5 h-5 text-purple-500" />;
    case 'gift':
      return <Gift className="w-5 h-5 text-yellow-500" />;
    case 'share':
      return <Share2 className="w-5 h-5 text-cyan-500" />;
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'info':
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
};

const getBackgroundColor = (type: ToastType) => {
  switch (type) {
    case 'like':
      return 'bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30';
    case 'follow':
      return 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30';
    case 'comment':
      return 'bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/30';
    case 'message':
      return 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-500/30';
    case 'gift':
      return 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30';
    case 'share':
      return 'bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border-cyan-500/30';
    case 'success':
      return 'bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/30';
    case 'error':
      return 'bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30';
    case 'warning':
      return 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30';
    case 'info':
    default:
      return 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30';
  }
};

export const TikTokToast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  title,
  duration = 3000,
  action,
  onClose,
  avatar,
  username,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`tiktok-toast ${isExiting ? 'tiktok-toast-exit' : 'tiktok-toast-enter'}`}
    >
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
          ${getBackgroundColor(type)}
          shadow-lg hover:shadow-xl transition-shadow
        `}
      >
        {/* Avatar for social notifications */}
        {avatar && (
          <img
            src={avatar}
            alt={username}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        )}

        {/* Icon */}
        <div className="flex-shrink-0">{getIcon(type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-foreground truncate">
              {title}
            </p>
          )}
          <p className={`text-sm text-foreground/90 ${title ? 'mt-0.5' : ''}`}>
            {message}
          </p>
        </div>

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="flex-shrink-0 px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full hover:from-red-600 hover:to-pink-600 transition-all"
          >
            {action.label}
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-foreground/60" />
        </button>
      </div>
    </div>
  );
};
