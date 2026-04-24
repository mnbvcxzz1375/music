export type AchievementCategory = 'practice' | 'accuracy' | 'streak' | 'social' | 'special';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  requirement: AchievementRequirement;
  unlockedAt?: Date;
  progress: number;
  isUnlocked: boolean;
}

export interface AchievementRequirement {
  type: 'count' | 'duration' | 'accuracy' | 'streak' | 'special';
  target: number;
  unit: 'sessions' | 'minutes' | 'percent' | 'days' | 'pieces';
}

export interface AchievementNotification {
  achievement: Achievement;
  timestamp: Date;
  shown: boolean;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  totalPoints: number;
  earnedPoints: number;
  categoryProgress: Record<AchievementCategory, { unlocked: number; total: number }>;
}