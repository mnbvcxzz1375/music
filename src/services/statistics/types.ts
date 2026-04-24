export interface PracticeError {
  measureIndex: number;
  noteIndex: number;
  errorType: 'pitch' | 'rhythm';
  deviation: number;
  timestamp: Date;
}

export interface PracticeSettings {
  tempo: number;
  mode: 'normal' | 'slow' | 'segment' | 'loop';
  partId: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  pieceId: string;
  pieceTitle: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  totalNotes: number;
  correctNotes: number;
  accuracy: number;
  pitchErrors: number;
  rhythmErrors: number;
  tempo?: number;
  mode?: string;
  retries: number;
  averagePitchDeviation: number;
  averageTimingDeviation: number;
  errors: PracticeError[];
  settings: PracticeSettings;
  createdAt: Date;
}

export interface SkillLevel {
  skill: 'pitch' | 'rhythm' | 'duration';
  level: number;
  progress: number;
}

export interface PracticeStats {
  totalDuration: number;
  totalSessions: number;
  totalPieces: number;
  averageAccuracy: number;
  streakDays: number;
  skillLevels: SkillLevel[];
}

export interface DailyStats {
  date: string;
  durationSeconds: number;
  sessionsCount: number;
  piecesCount: number;
  averageAccuracy: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalDuration: number;
  totalSessions: number;
  averageAccuracy: number;
  dailyStats: DailyStats[];
}

export interface MonthlyStats {
  month: string;
  totalDuration: number;
  totalSessions: number;
  averageAccuracy: number;
  weeklyStats: WeeklyStats[];
  improvementRate: number;
}

export interface ProgressTrend {
  date: string;
  accuracy: number;
  duration: number;
}

export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface StatisticsState {
  sessions: PracticeSession[];
  stats: PracticeStats;
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
  loading: boolean;
  error: string | null;
}