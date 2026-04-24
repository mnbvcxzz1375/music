export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatarUrl?: string;
  bio?: string;
  role: 'user' | 'admin' | 'moderator';
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  isVerified: boolean;
  isPremium: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'premium' | 'premium_plus';
  status: 'active' | 'canceled' | 'expired' | 'pending';
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'stripe' | 'alipay' | 'wechat' | 'apple' | 'google';
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Piece {
  id: string;
  title: string;
  composer?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  genre?: string;
  instrument?: string;
  durationSeconds?: number;
  isOfficial: boolean;
  isPremium: boolean;
  filePath: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PracticeSession {
  id: string;
  userId: string;
  pieceId: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  totalNotes?: number;
  correctNotes?: number;
  accuracy?: number;
  pitchErrors: number;
  rhythmErrors: number;
  tempo?: number;
  mode?: string;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  achievementType: string;
  achievementName: string;
  unlockedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Checkin {
  id: string;
  userId: string;
  checkinDate: Date;
  streakDays: number;
  rewardPoints: number;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  sessions: number;
  accuracy: number;
  rank: number;
}