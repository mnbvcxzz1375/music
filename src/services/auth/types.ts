export interface User {
  id: string;
  email?: string;
  phone?: string;
  nickname: string;
  avatar?: string;
  instrument: InstrumentType;
  level: UserLevel;
  createdAt: Date;
  lastLoginAt: Date;
  subscription: SubscriptionStatus;
  settings: UserSettings;
}

export type InstrumentType = 'piano' | 'guitar' | 'violin' | 'cello' | 'flute' | 'other';
export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type SubscriptionStatus = 'free' | 'premium' | 'pro' | 'teacher';

export interface UserSettings {
  language: 'en' | 'zh-CN' | 'ja' | 'ko';
  theme: 'light' | 'dark' | 'auto';
  defaultTempo: number;
  pitchTolerance: number;
  timingTolerance: number;
  showHints: boolean;
  autoAdvance: boolean;
  retryLimit: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password?: string;
  verificationCode?: string;
}

export interface RegisterCredentials {
  email?: string;
  phone?: string;
  password: string;
  nickname: string;
  instrument: InstrumentType;
}

export interface OAuthCredentials {
  provider: 'google' | 'apple' | 'wechat';
  code: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  permissions: Permission[];
  iat: number;
  exp: number;
}

export type Permission =
  | 'basic_practice'
  | 'limited_pieces'
  | 'full_pieces'
  | 'ocr_import'
  | 'stats_export'
  | 'achievements'
  | 'polyphonic'
  | 'ai_analysis'
  | 'student_management';

export const ROLE_PERMISSIONS: Record<SubscriptionStatus, Permission[]> = {
  free: ['basic_practice', 'limited_pieces'],
  premium: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements'],
  pro: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements', 'polyphonic', 'ai_analysis'],
  teacher: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements', 'polyphonic', 'ai_analysis', 'student_management'],
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'zh-CN',
  theme: 'dark',
  defaultTempo: 120,
  pitchTolerance: 20,
  timingTolerance: 25,
  showHints: true,
  autoAdvance: false,
  retryLimit: 3,
};