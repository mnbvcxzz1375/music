import { useState } from 'react';
import { Button, Card, CardContent, Tabs, TabItem } from '../UI';
import { useAchievementStore } from '@/services/achievements';
import { AchievementCategory } from '@/services/achievements/types';

export interface AchievementsPageProps {
  onShare?: (achievementId: string) => void;
}

export function AchievementsPage({ onShare }: AchievementsPageProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');
  
  const { 
    achievements, 
    getAchievementsByCategory, 
    getStats, 
    getPoints 
  } = useAchievementStore();
  
  const stats = getStats();
  const points = getPoints();
  
  const categoryTabs: TabItem[] = [
    { id: 'all', label: '全部' },
    { id: 'practice', label: '练习' },
    { id: 'accuracy', label: '准确率' },
    { id: 'streak', label: '连续' },
  ];
  
  const displayedAchievements = activeCategory === 'all'
    ? achievements
    : getAchievementsByCategory(activeCategory);
  
  const tierLabels = {
    bronze: '铜牌',
    silver: '银牌',
    gold: '金牌',
    platinum: '铂金',
  };
  
  const tierColors = {
    bronze: 'tier-bronze',
    silver: 'tier-silver',
    gold: 'tier-gold',
    platinum: 'tier-platinum',
  };

  return (
    <div className="achievements-page">
      <header className="achievements-header">
        <div className="achievements-header-left">
          <h1 className="achievements-title">成就系统</h1>
          <p className="achievements-subtitle">
            已解锁 {stats.unlockedAchievements}/{stats.totalAchievements} 个成就
          </p>
        </div>
      </header>

      <main className="achievements-content">
        <Card variant="elevated">
          <CardContent>
            <div className="achievements-summary">
              <div className="achievements-points">
                <span className="achievements-points-value">{points}</span>
                <span className="achievements-points-label">积分</span>
              </div>
              <div className="achievements-progress">
                <div className="achievements-progress-bar">
                  <div 
                    className="achievements-progress-fill"
                    style={{ width: `${(stats.unlockedAchievements / stats.totalAchievements) * 100}%` }}
                  />
                </div>
                <span className="achievements-progress-text">
                  {Math.round((stats.unlockedAchievements / stats.totalAchievements) * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          items={categoryTabs}
          activeId={activeCategory}
          onChange={(id) => setActiveCategory(id as AchievementCategory | 'all')}
          variant="pills"
        />

        <div className="achievements-grid">
          {displayedAchievements.map((achievement) => (
            <Card 
              key={achievement.id}
              variant={achievement.isUnlocked ? 'elevated' : 'outlined'}
              className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'} ${tierColors[achievement.tier]}`}
            >
              <CardContent>
                <div className="achievement-icon">
                  {achievement.icon}
                </div>
                <div className="achievement-info">
                  <h3 className="achievement-name">{achievement.name}</h3>
                  <p className="achievement-description">{achievement.description}</p>
                  <div className="achievement-meta">
                    <span className={`achievement-tier ${tierColors[achievement.tier]}`}>
                      {tierLabels[achievement.tier]}
                    </span>
                    <span className="achievement-points">
                      +{achievement.isUnlocked ? (
                        achievement.tier === 'bronze' ? 10 :
                        achievement.tier === 'silver' ? 25 :
                        achievement.tier === 'gold' ? 50 : 100
                      ) : 0} 积分
                    </span>
                  </div>
                  {!achievement.isUnlocked && (
                    <div className="achievement-progress">
                      <div className="achievement-progress-bar">
                        <div 
                          className="achievement-progress-fill"
                          style={{ width: `${Math.min(100, (achievement.progress / achievement.requirement.target) * 100)}%` }}
                        />
                      </div>
                      <span className="achievement-progress-text">
                        {achievement.progress}/{achievement.requirement.target}
                      </span>
                    </div>
                  )}
                  {achievement.isUnlocked && achievement.unlockedAt && (
                    <span className="achievement-unlocked-date">
                      解锁于 {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {achievement.isUnlocked && onShare && (
                  <Button 
                    variant="ghost" 
                    size="small"
                    onClick={() => onShare(achievement.id)}
                  >
                    分享
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}