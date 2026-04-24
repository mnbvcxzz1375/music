import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CheckinRecord {
  date: string;
  checkedAt: Date;
  practiceDuration: number;
  sessionsCount: number;
}

export interface CheckinReward {
  id: string;
  name: string;
  description: string;
  requiredStreak: number;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

export interface CheckinState {
  records: CheckinRecord[];
  rewards: CheckinReward[];
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
  
  checkin: (duration: number, sessions: number) => void;
  isCheckedToday: () => boolean;
  getStreak: () => number;
  getTodayRecord: () => CheckinRecord | undefined;
  getMonthRecords: (month: string) => CheckinRecord[];
  checkRewards: () => CheckinReward[];
}

const defaultRewards: CheckinReward[] = [
  {
    id: 'streak_3',
    name: '三日坚持',
    description: '连续打卡3天',
    requiredStreak: 3,
    icon: '🔥',
    isUnlocked: false,
  },
  {
    id: 'streak_7',
    name: '一周坚持',
    description: '连续打卡7天',
    requiredStreak: 7,
    icon: '🌟',
    isUnlocked: false,
  },
  {
    id: 'streak_14',
    name: '两周坚持',
    description: '连续打卡14天',
    requiredStreak: 14,
    icon: '💪',
    isUnlocked: false,
  },
  {
    id: 'streak_30',
    name: '一月坚持',
    description: '连续打卡30天',
    requiredStreak: 30,
    icon: '🏆',
    isUnlocked: false,
  },
  {
    id: 'streak_60',
    name: '两月坚持',
    description: '连续打卡60天',
    requiredStreak: 60,
    icon: '👑',
    isUnlocked: false,
  },
  {
    id: 'streak_100',
    name: '百日坚持',
    description: '连续打卡100天',
    requiredStreak: 100,
    icon: '💎',
    isUnlocked: false,
  },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getToday(): string {
  return formatDate(new Date());
}

function calculateStreak(records: CheckinRecord[]): number {
  if (records.length === 0) return 0;
  
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const today = getToday();
  
  let streak = 0;
  let currentDate = today;
  
  for (const record of sortedRecords) {
    if (record.date === currentDate) {
      streak++;
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      currentDate = formatDate(prevDate);
    } else if (record.date === formatDate(new Date(new Date().setDate(new Date().getDate() - 1)))) {
      streak = 1;
      currentDate = record.date;
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      currentDate = formatDate(prevDate);
    } else {
      break;
    }
  }
  
  return streak;
}

export const useCheckinStore = create<CheckinState>()(
  persist(
    (set, get) => ({
      records: [],
      rewards: defaultRewards,
      currentStreak: 0,
      longestStreak: 0,
      totalCheckins: 0,

      checkin: (duration, sessions) => {
        const today = getToday();
        const existingRecord = get().records.find(r => r.date === today);
        
        if (existingRecord) {
          set((state) => ({
            records: state.records.map(r => 
              r.date === today 
                ? { 
                    ...r, 
                    practiceDuration: r.practiceDuration + duration,
                    sessionsCount: r.sessionsCount + sessions,
                    checkedAt: new Date(),
                  }
                : r
            ),
          }));
        } else {
          const newRecord: CheckinRecord = {
            date: today,
            checkedAt: new Date(),
            practiceDuration: duration,
            sessionsCount: sessions,
          };
          
          set((state) => {
            const newRecords = [...state.records, newRecord];
            const newStreak = calculateStreak(newRecords);
            const newLongestStreak = Math.max(state.longestStreak, newStreak);
            
            return {
              records: newRecords,
              currentStreak: newStreak,
              longestStreak: newLongestStreak,
              totalCheckins: state.totalCheckins + 1,
            };
          });
          
          get().checkRewards();
        }
      },

      isCheckedToday: () => {
        const today = getToday();
        return get().records.some(r => r.date === today);
      },

      getStreak: () => get().currentStreak,

      getTodayRecord: () => {
        const today = getToday();
        return get().records.find(r => r.date === today);
      },

      getMonthRecords: (month) => {
        return get().records.filter(r => r.date.startsWith(month));
      },

      checkRewards: () => {
        const streak = get().currentStreak;
        const newlyUnlocked: CheckinReward[] = [];
        
        set((state) => ({
          rewards: state.rewards.map(reward => {
            if (!reward.isUnlocked && streak >= reward.requiredStreak) {
              newlyUnlocked.push({
                ...reward,
                isUnlocked: true,
                unlockedAt: new Date(),
              });
              return {
                ...reward,
                isUnlocked: true,
                unlockedAt: new Date(),
              };
            }
            return reward;
          }),
        }));
        
        return newlyUnlocked;
      },
    }),
    {
      name: 'checkin-storage',
    }
  )
);

export function getCheckinStore() {
  return useCheckinStore.getState();
}