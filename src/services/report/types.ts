export type ReportFormat = 'pdf' | 'html' | 'json' | 'csv';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReportConfig {
  format: ReportFormat;
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
  includeSections: ReportSection[];
}

export type ReportSection = 
  | 'summary'
  | 'accuracy'
  | 'duration'
  | 'pieces'
  | 'errors'
  | 'trends'
  | 'achievements';

export interface ReportData {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: ReportSummary;
  accuracy: AccuracyAnalysis;
  duration: DurationAnalysis;
  pieces: PieceAnalysis[];
  errors: ErrorAnalysis;
  trends: TrendData[];
  achievements: AchievementSummary[];
}

export interface ReportSummary {
  totalSessions: number;
  totalDuration: number;
  averageAccuracy: number;
  totalPieces: number;
  streakDays: number;
}

export interface AccuracyAnalysis {
  overall: number;
  byPiece: Record<string, number>;
  byDate: Record<string, number>;
  improvementRate: number;
}

export interface DurationAnalysis {
  total: number;
  averagePerSession: number;
  byDate: Record<string, number>;
  peakDay: string;
}

export interface PieceAnalysis {
  id: string;
  title: string;
  practiceCount: number;
  averageAccuracy: number;
  totalDuration: number;
  lastPracticeDate: Date;
}

export interface ErrorAnalysis {
  totalErrors: number;
  byType: Record<string, number>;
  byPiece: Record<string, number>;
  commonErrors: string[];
}

export interface TrendData {
  date: string;
  accuracy: number;
  duration: number;
  sessions: number;
}

export interface AchievementSummary {
  id: string;
  name: string;
  unlockedAt: Date;
}

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename?: string;
  error?: string;
}