import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  value: number;
  rank: number;
  sessions?: number;
  streak?: number;
}

export interface LeaderboardState {
  weeklyDuration: LeaderboardEntry[];
  weeklyAccuracy: LeaderboardEntry[];
  monthlyDuration: LeaderboardEntry[];
  monthlyAccuracy: LeaderboardEntry[];
  streakLeaderboard: LeaderboardEntry[];
  
  currentUserRank: {
    weeklyDuration: number;
    weeklyAccuracy: number;
    monthlyDuration: number;
    monthlyAccuracy: number;
    streak: number;
  };
  
  loading: boolean;
  period: 'weekly' | 'monthly';
  metric: 'duration' | 'accuracy' | 'streak';
  
  fetchLeaderboard: (period: 'weekly' | 'monthly', metric: 'duration' | 'accuracy' | 'streak') => Promise<void>;
  setPeriod: (period: 'weekly' | 'monthly') => void;
  setMetric: (metric: 'duration' | 'accuracy' | 'streak') => void;
  getCurrentLeaderboard: () => LeaderboardEntry[];
  getUserRank: () => number;
}

const mockLeaderboardData: LeaderboardEntry[] = [
  { userId: '1', userName: '音乐达人', value: 3600, rank: 1, sessions: 15, streak: 7 },
  { userId: '2', userName: '钢琴爱好者', value: 2400, rank: 2, sessions: 10, streak: 5 },
  { userId: '3', userName: '小提琴新手', value: 1800, rank: 3, sessions: 8, streak: 3 },
  { userId: '4', userName: '吉他玩家', value: 1200, rank: 4, sessions: 6, streak: 2 },
  { userId: '5', userName: '古典迷', value: 900, rank: 5, sessions: 4, streak: 1 },
  { userId: '6', userName: '流行歌手', value: 600, rank: 6, sessions: 3, streak: 0 },
  { userId: '7', userName: '爵士爱好者', value: 300, rank: 7, sessions: 2, streak: 0 },
];

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      weeklyDuration: mockLeaderboardData,
      weeklyAccuracy: mockLeaderboardData.map(e => ({ ...e, value: 95 - e.rank * 2 })),
      monthlyDuration: mockLeaderboardData.map(e => ({ ...e, value: e.value * 4 })),
      monthlyAccuracy: mockLeaderboardData.map(e => ({ ...e, value: 92 - e.rank })),
      streakLeaderboard: mockLeaderboardData.map(e => ({ ...e, value: e.streak || 0 })),
      
      currentUserRank: {
        weeklyDuration: 3,
        weeklyAccuracy: 5,
        monthlyDuration: 4,
        monthlyAccuracy: 6,
        streak: 2,
      },
      
      loading: false,
      period: 'weekly',
      metric: 'duration',

      fetchLeaderboard: async (period, metric) => {
        set({ loading: true, period, metric });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set({ loading: false });
      },

      setPeriod: (period) => {
        set({ period });
      },

      setMetric: (metric) => {
        set({ metric });
      },

      getCurrentLeaderboard: () => {
        const state = get();
        const key = `${state.period}${state.metric.charAt(0).toUpperCase() + state.metric.slice(1)}` as keyof LeaderboardState;
        
        if (state.metric === 'streak') {
          return state.streakLeaderboard;
        }
        
        return (state[key] as LeaderboardEntry[]) || [];
      },

      getUserRank: () => {
        const state = get();
        const key = `${state.period}${state.metric.charAt(0).toUpperCase() + state.metric.slice(1)}` as keyof typeof state.currentUserRank;
        
        if (state.metric === 'streak') {
          return state.currentUserRank.streak;
        }
        
        return state.currentUserRank[key] || 0;
      },
    }),
    {
      name: 'leaderboard-storage',
    }
  )
);

export function getLeaderboardStore() {
  return useLeaderboardStore.getState();
}