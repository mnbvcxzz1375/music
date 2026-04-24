import { useState } from 'react';
import { Button } from '../UI';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareData: {
    title: string;
    description?: string;
    stats?: {
      sessions?: number;
      duration?: number;
      accuracy?: number;
      streakDays?: number;
      achievements?: number;
    };
    achievementId?: string;
    achievementName?: string;
  };
}

export function ShareModal({ isOpen, onClose, shareData }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    if (shareData.achievementId) {
      params.set('achievement', shareData.achievementId);
    }
    
    if (shareData.stats) {
      if (shareData.stats.sessions) params.set('sessions', String(shareData.stats.sessions));
      if (shareData.stats.duration) params.set('duration', String(shareData.stats.duration));
      if (shareData.stats.accuracy) params.set('accuracy', String(shareData.stats.accuracy.toFixed(1)));
      if (shareData.stats.streakDays) params.set('streak', String(shareData.stats.streakDays));
    }
    
    return `${baseUrl}/share?${params.toString()}`;
  };

  const shareLink = generateShareLink();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToTwitter = () => {
    const text = shareData.achievementName
      ? `我解锁了"${shareData.achievementName}"成就！🎵 #MusicMaster #音乐练习`
      : `我在MusicMaster上练习了${shareData.stats?.sessions || 0}次，准确率${shareData.stats?.accuracy?.toFixed(1) || 0}%！🎵 #MusicMaster #音乐练习`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank');
  };

  const handleShareToWeChat = () => {
    handleCopyLink();
    alert('链接已复制，请在微信中粘贴分享');
  };

  const handleShareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description || shareData.title,
          url: shareLink,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="share-modal-overlay">
      <div className="share-modal">
        <div className="share-header">
          <h2 className="share-title">分享成就</h2>
          <Button variant="ghost" size="small" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="share-body">
          <div className="share-preview">
            <h3 className="share-preview-title">{shareData.title}</h3>
            {shareData.description && (
              <p className="share-preview-description">{shareData.description}</p>
            )}
            
            {shareData.stats && (
              <div className="share-preview-content">
                {shareData.stats.sessions && (
                  <div className="share-preview-stat">
                    <span className="share-preview-stat-label">练习次数</span>
                    <span className="share-preview-stat-value">{shareData.stats.sessions}</span>
                  </div>
                )}
                {shareData.stats.duration && (
                  <div className="share-preview-stat">
                    <span className="share-preview-stat-label">练习时长</span>
                    <span className="share-preview-stat-value">{formatDuration(shareData.stats.duration)}</span>
                  </div>
                )}
                {shareData.stats.accuracy && (
                  <div className="share-preview-stat">
                    <span className="share-preview-stat-label">准确率</span>
                    <span className="share-preview-stat-value">{shareData.stats.accuracy.toFixed(1)}%</span>
                  </div>
                )}
                {shareData.stats.streakDays && (
                  <div className="share-preview-stat">
                    <span className="share-preview-stat-label">连续天数</span>
                    <span className="share-preview-stat-value">{shareData.stats.streakDays}</span>
                  </div>
                )}
                {shareData.stats.achievements && (
                  <div className="share-preview-stat">
                    <span className="share-preview-stat-label">解锁成就</span>
                    <span className="share-preview-stat-value">{shareData.stats.achievements}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="share-platforms">
            <button className="share-platform-btn" onClick={handleShareToTwitter}>
              <span className="share-platform-icon">𝕏</span>
              <span className="share-platform-label">Twitter</span>
            </button>
            <button className="share-platform-btn" onClick={handleShareToWeChat}>
              <span className="share-platform-icon">💬</span>
              <span className="share-platform-label">微信</span>
            </button>
            <button className="share-platform-btn" onClick={handleShareToFacebook}>
              <span className="share-platform-icon">f</span>
              <span className="share-platform-label">Facebook</span>
            </button>
            {typeof navigator.share === 'function' && (
              <button className="share-platform-btn" onClick={handleNativeShare}>
                <span className="share-platform-icon">📤</span>
                <span className="share-platform-label">更多</span>
              </button>
            )}
          </div>

          <div className="share-link-section">
            <label className="share-link-label">分享链接</label>
            <div className="share-link-container">
              <input
                type="text"
                className="share-link-input"
                value={shareLink}
                readOnly
              />
              <Button
                variant="secondary"
                className="share-copy-btn"
                onClick={handleCopyLink}
              >
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>
        </div>

        <div className="share-footer">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useShare() {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{
    title: string;
    description?: string;
    stats?: {
      sessions?: number;
      duration?: number;
      accuracy?: number;
      streakDays?: number;
      achievements?: number;
    };
    achievementId?: string;
    achievementName?: string;
  }>({
    title: '',
  });

  const openShareModal = (data: typeof shareData) => {
    setShareData(data);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
  };

  const shareAchievement = (achievementId: string, achievementName: string) => {
    openShareModal({
      title: `解锁成就: ${achievementName}`,
      description: `我在MusicMaster上解锁了"${achievementName}"成就！`,
      achievementId,
      achievementName,
    });
  };

  const shareStats = (stats: typeof shareData.stats) => {
    openShareModal({
      title: '我的练习成果',
      description: '来看看我在MusicMaster上的练习成果吧！',
      stats,
    });
  };

  return {
    showShareModal,
    shareData,
    openShareModal,
    closeShareModal,
    shareAchievement,
    shareStats,
  };
}