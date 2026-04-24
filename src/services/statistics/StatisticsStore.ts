import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PracticeSession,
  PracticeStats,
  DailyStats,
  WeeklyStats,
  MonthlyStats,
  ProgressTrend,
  SkillLevel,
} from './types';

interface StatisticsState {
  sessions: PracticeSession[];
  stats: PracticeStats;
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
  
  addSession: (session: PracticeSession) => void;
  getSession: (id: string) => PracticeSession | undefined;
  getSessionsByPiece: (pieceId: string) => PracticeSession[];
  getSessionsByDateRange: (start: Date, end: Date) => PracticeSession[];
  
  calculateDailyStats: (date: string) => DailyStats;
  calculateWeeklyStats: (weekStart: string) => WeeklyStats;
  calculateMonthlyStats: (month: string) => MonthlyStats;
  
  getProgressTrend: (days: number) => ProgressTrend[];
  getSkillLevels: () => SkillLevel[];
  
  getStreakDays: () => number;
  getTotalDuration: () => number;
  getAverageAccuracy: () => number;
}

const generateId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getWeekStart = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDate(d);
};

export const useStatisticsStore = create<StatisticsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      stats: {
        totalDuration: 0,
        totalSessions: 0,
        totalPieces: 0,
        averageAccuracy: 0,
        streakDays: 0,
        skillLevels: [
          { skill: 'pitch', level: 1, progress: 0 },
          { skill: 'rhythm', level: 1, progress: 0 },
          { skill: 'duration', level: 1, progress: 0 },
        ],
      },
      dailyStats: [],
      weeklyStats: [],
      monthlyStats: [],

      addSession: (session) => {
        const newSession = { ...session, id: session.id || generateId(), createdAt: new Date() };
        set((state) => {
          const sessions = [...state.sessions, newSession];
          const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
          const totalSessions = sessions.length;
          const uniquePieces = new Set(sessions.map((s) => s.pieceId)).size;
          const averageAccuracy = sessions.length > 0
            ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
            : 0;
          
          return {
            sessions,
            stats: {
              ...state.stats,
              totalDuration,
              totalSessions,
              totalPieces: uniquePieces,
              averageAccuracy,
              streakDays: get().getStreakDays(),
              skillLevels: get().getSkillLevels(),
            },
          };
        });
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),

      getSessionsByPiece: (pieceId) => get().sessions.filter((s) => s.pieceId === pieceId),

      getSessionsByDateRange: (start, end) => {
        const sessions = get().sessions;
        return sessions.filter((s) => {
          const sessionDate = new Date(s.startTime);
          return sessionDate >= start && sessionDate <= end;
        });
      },

      calculateDailyStats: (date) => {
        const sessions = get().sessions.filter((s) => formatDate(new Date(s.startTime)) === date);
        const durationSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
        const sessionsCount = sessions.length;
        const piecesCount = new Set(sessions.map((s) => s.pieceId)).size;
        const averageAccuracy = sessions.length > 0
          ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
          : 0;

        return {
          date,
          durationSeconds,
          sessionsCount,
          piecesCount,
          averageAccuracy,
        };
      },

      calculateWeeklyStats: (weekStart) => {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        
        const sessions = get().getSessionsByDateRange(start, end);
        const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
        const totalSessions = sessions.length;
        const averageAccuracy = sessions.length > 0
          ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
          : 0;

        const dailyStats: DailyStats[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          dailyStats.push(get().calculateDailyStats(formatDate(d)));
        }

        return {
          weekStart,
          weekEnd: formatDate(end),
          totalDuration,
          totalSessions,
          averageAccuracy,
          dailyStats,
        };
      },

      calculateMonthlyStats: (month) => {
        const [year, monthNum] = month.split('-').map(Number);
        const start = new Date(year, monthNum - 1, 1);
        const end = new Date(year, monthNum, 0);
        
        const sessions = get().getSessionsByDateRange(start, end);
        const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
        const totalSessions = sessions.length;
        const averageAccuracy = sessions.length > 0
          ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
          : 0;

        const weeklyStats: WeeklyStats[] = [];
        let currentWeek = getWeekStart(start);
        while (new Date(currentWeek) <= end) {
          weeklyStats.push(get().calculateWeeklyStats(currentWeek));
          const nextWeek = new Date(currentWeek);
          nextWeek.setDate(nextWeek.getDate() + 7);
          currentWeek = formatDate(nextWeek);
        }

        const prevMonth = new Date(year, monthNum - 2, 1);
        const prevMonthSessions = get().getSessionsByDateRange(prevMonth, new Date(year, monthNum - 1, 0));
        const prevAccuracy = prevMonthSessions.length > 0
          ? prevMonthSessions.reduce((sum, s) => sum + s.accuracy, 0) / prevMonthSessions.length
          : 0;
        const improvementRate = prevAccuracy > 0
          ? ((averageAccuracy - prevAccuracy) / prevAccuracy) * 100
          : 0;

        return {
          month,
          totalDuration,
          totalSessions,
          averageAccuracy,
          weeklyStats,
          improvementRate,
        };
      },

      getProgressTrend: (days) => {
        const trends: ProgressTrend[] = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = formatDate(date);
          const dailyStats = get().calculateDailyStats(dateStr);
          
          trends.push({
            date: dateStr,
            accuracy: dailyStats.averageAccuracy,
            duration: dailyStats.durationSeconds,
          });
        }
        
        return trends;
      },

      getSkillLevels: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) {
          return [
            { skill: 'pitch', level: 1, progress: 0 },
            { skill: 'rhythm', level: 1, progress: 0 },
            { skill: 'duration', level: 1, progress: 0 },
          ];
        }

        const pitchAccuracy = sessions.reduce((sum, s) => {
          const pitchCorrect = s.totalNotes - s.pitchErrors;
          return sum + (pitchCorrect / s.totalNotes) * 100;
        }, 0) / sessions.length;

        const rhythmAccuracy = sessions.reduce((sum, s) => {
          const rhythmCorrect = s.totalNotes - s.rhythmErrors;
          return sum + (rhythmCorrect / s.totalNotes) * 100;
        }, 0) / sessions.length;

        const avgDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / sessions.length;

        const calculateLevel = (accuracy: number): { level: number; progress: number } => {
          if (accuracy >= 95) return { level: 5, progress: (accuracy - 95) / 5 };
          if (accuracy >= 85) return { level: 4, progress: (accuracy - 85) / 10 };
          if (accuracy >= 70) return { level: 3, progress: (accuracy - 70) / 15 };
          if (accuracy >= 50) return { level: 2, progress: (accuracy - 50) / 20 };
          return { level: 1, progress: accuracy / 50 };
        };

        return [
          { skill: 'pitch', ...calculateLevel(pitchAccuracy) },
          { skill: 'rhythm', ...calculateLevel(rhythmAccuracy) },
          { skill: 'duration', level: Math.min(5, Math.floor(avgDuration / 600) + 1), progress: (avgDuration % 600) / 600 },
        ];
      },

      getStreakDays: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;

        const dates = new Set(sessions.map((s) => formatDate(new Date(s.startTime))));
        const sortedDates = Array.from(dates).sort().reverse();
        
        let streak = 0;
        const today = formatDate(new Date());
        let currentDate = today;

        for (const date of sortedDates) {
          if (date === currentDate) {
            streak++;
            const prev = new Date(currentDate);
            prev.setDate(prev.getDate() - 1);
            currentDate = formatDate(prev);
          } else {
            break;
          }
        }

        return streak;
      },

      getTotalDuration: () => get().stats.totalDuration,

      getAverageAccuracy: () => get().stats.averageAccuracy,
    }),
    {
      name: 'statistics-storage',
    }
  )
);

export function getStatisticsStore() {
  return useStatisticsStore.getState();
}