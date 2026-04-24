export interface User {
  id: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  nickname?: string;
  avatarUrl?: string;
  instrumentType?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  subscriptionStatus: 'free' | 'premium' | 'expired';
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  settings?: UserSettings;
}

export interface UserSettings {
  pitchTolerance: number;
  rhythmTolerance: number;
  tempo: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    practiceReminder: boolean;
    achievementUnlock: boolean;
    streakReminder: boolean;
  };
}

export interface UserStats {
  totalSessions: number;
  totalDuration: number;
  averageAccuracy: number;
  streakDays: number;
  totalPieces: number;
  achievementsCount: number;
}