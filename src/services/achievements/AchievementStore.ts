import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Achievement,
  AchievementCategory,
  AchievementTier,
  AchievementNotification,
  AchievementStats,
} from './types';

interface AchievementState {
  achievements: Achievement[];
  notifications: AchievementNotification[];
  
  checkAchievements: (stats: {
    totalSessions: number;
    totalDuration: number;
    averageAccuracy: number;
    streakDays: number;
    totalPieces: number;
  }) => Achievement[];
  
  unlockAchievement: (id: string) => void;
  getAchievement: (id: string) => Achievement | undefined;
  getAchievementsByCategory: (category: AchievementCategory) => Achievement[];
  getUnlockedAchievements: () => Achievement[];
  
  getStats: () => AchievementStats;
  getPoints: () => number;
  
  dismissNotification: (id: string) => void;
  getPendingNotifications: () => AchievementNotification[];
}

const defaultAchievements: Achievement[] = [
  {
    id: 'first_practice',
    name: '初次练习',
    description: '完成第一次练习',
    category: 'practice',
    tier: 'bronze',
    icon: '🎵',
    requirement: { type: 'count', target: 1, unit: 'sessions' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'practice_10',
    name: '练习达人',
    description: '完成10次练习',
    category: 'practice',
    tier: 'silver',
    icon: '🎯',
    requirement: { type: 'count', target: 10, unit: 'sessions' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'practice_50',
    name: '练习大师',
    description: '完成50次练习',
    category: 'practice',
    tier: 'gold',
    icon: '🏆',
    requirement: { type: 'count', target: 50, unit: 'sessions' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'practice_100',
    name: '练习传奇',
    description: '完成100次练习',
    category: 'practice',
    tier: 'platinum',
    icon: '⭐',
    requirement: { type: 'count', target: 100, unit: 'sessions' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'duration_1h',
    name: '一小时练习',
    description: '累计练习时长达到1小时',
    category: 'practice',
    tier: 'bronze',
    icon: '⏱',
    requirement: { type: 'duration', target: 60, unit: 'minutes' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'duration_10h',
    name: '十小时练习',
    description: '累计练习时长达到10小时',
    category: 'practice',
    tier: 'silver',
    icon: '⏱',
    requirement: { type: 'duration', target: 600, unit: 'minutes' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'accuracy_80',
    name: '准确演奏',
    description: '平均准确率达到80%',
    category: 'accuracy',
    tier: 'bronze',
    icon: '✓',
    requirement: { type: 'accuracy', target: 80, unit: 'percent' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'accuracy_90',
    name: '精准演奏',
    description: '平均准确率达到90%',
    category: 'accuracy',
    tier: 'silver',
    icon: '✓',
    requirement: { type: 'accuracy', target: 90, unit: 'percent' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'accuracy_95',
    name: '完美演奏',
    description: '平均准确率达到95%',
    category: 'accuracy',
    tier: 'gold',
    icon: '✓',
    requirement: { type: 'accuracy', target: 95, unit: 'percent' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'streak_3',
    name: '三日坚持',
    description: '连续练习3天',
    category: 'streak',
    tier: 'bronze',
    icon: '🔥',
    requirement: { type: 'streak', target: 3, unit: 'days' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'streak_7',
    name: '一周坚持',
    description: '连续练习7天',
    category: 'streak',
    tier: 'silver',
    icon: '🔥',
    requirement: { type: 'streak', target: 7, unit: 'days' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'streak_30',
    name: '一月坚持',
    description: '连续练习30天',
    category: 'streak',
    tier: 'gold',
    icon: '🔥',
    requirement: { type: 'streak', target: 30, unit: 'days' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'pieces_5',
    name: '曲目收藏家',
    description: '练习5首不同曲目',
    category: 'practice',
    tier: 'bronze',
    icon: '📚',
    requirement: { type: 'count', target: 5, unit: 'pieces' },
    progress: 0,
    isUnlocked: false,
  },
  {
    id: 'pieces_20',
    name: '曲目大师',
    description: '练习20首不同曲目',
    category: 'practice',
    tier: 'silver',
    icon: '📚',
    requirement: { type: 'count', target: 20, unit: 'pieces' },
    progress: 0,
    isUnlocked: false,
  },
];

const tierPoints: Record<AchievementTier, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 100,
};

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: defaultAchievements,
      notifications: [],

      checkAchievements: (stats) => {
        const newlyUnlocked: Achievement[] = [];
        
        set((state) => ({
          achievements: state.achievements.map((achievement) => {
            let progress = 0;
            
            switch (achievement.requirement.type) {
              case 'count':
                if (achievement.requirement.unit === 'sessions') {
                  progress = stats.totalSessions;
                } else if (achievement.requirement.unit === 'pieces') {
                  progress = stats.totalPieces;
                }
                break;
              case 'duration':
                progress = stats.totalDuration;
                break;
              case 'accuracy':
                progress = stats.averageAccuracy;
                break;
              case 'streak':
                progress = stats.streakDays;
                break;
            }
            
            const wasUnlocked = achievement.isUnlocked;
            const isUnlocked = progress >= achievement.requirement.target;
            
            if (!wasUnlocked && isUnlocked) {
              newlyUnlocked.push({
                ...achievement,
                progress,
                isUnlocked,
                unlockedAt: new Date(),
              });
            }
            
            return {
              ...achievement,
              progress,
              isUnlocked,
              unlockedAt: isUnlocked && !wasUnlocked ? new Date() : achievement.unlockedAt,
            };
          }),
        }));
        
        if (newlyUnlocked.length > 0) {
          set((state) => ({
            notifications: [
              ...state.notifications,
              ...newlyUnlocked.map((a) => ({
                achievement: a,
                timestamp: new Date(),
                shown: false,
              })),
            ],
          }));
        }
        
        return newlyUnlocked;
      },

      unlockAchievement: (id) => {
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id
              ? { ...a, isUnlocked: true, unlockedAt: new Date(), progress: a.requirement.target }
              : a
          ),
        }));
      },

      getAchievement: (id) => get().achievements.find((a) => a.id === id),

      getAchievementsByCategory: (category) =>
        get().achievements.filter((a) => a.category === category),

      getUnlockedAchievements: () =>
        get().achievements.filter((a) => a.isUnlocked),

      getStats: () => {
        const achievements = get().achievements;
        const unlocked = achievements.filter((a) => a.isUnlocked);
        
        const categoryProgress: Record<AchievementCategory, { unlocked: number; total: number }> = {
          practice: { unlocked: 0, total: 0 },
          accuracy: { unlocked: 0, total: 0 },
          streak: { unlocked: 0, total: 0 },
          social: { unlocked: 0, total: 0 },
          special: { unlocked: 0, total: 0 },
        };
        
        achievements.forEach((a) => {
          categoryProgress[a.category].total++;
          if (a.isUnlocked) {
            categoryProgress[a.category].unlocked++;
          }
        });
        
        return {
          totalAchievements: achievements.length,
          unlockedAchievements: unlocked.length,
          totalPoints: achievements.reduce((sum, a) => sum + tierPoints[a.tier], 0),
          earnedPoints: unlocked.reduce((sum, a) => sum + tierPoints[a.tier], 0),
          categoryProgress,
        };
      },

      getPoints: () => {
        const unlocked = get().achievements.filter((a) => a.isUnlocked);
        return unlocked.reduce((sum, a) => sum + tierPoints[a.tier], 0);
      },

      dismissNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.achievement.id === id ? { ...n, shown: true } : n
          ),
        }));
      },

      getPendingNotifications: () =>
        get().notifications.filter((n) => !n.shown),
    }),
    {
      name: 'achievements-storage',
    }
  )
);

export function getAchievementStore() {
  return useAchievementStore.getState();
}