export interface PracticeSession {
  id: string;
  userId: string;
  pieceId: string;
  pieceTitle?: string; // Denormalized for easier retrieval
  durationSeconds: number;
  totalNotes: number;
  correctNotes: number;
  accuracy: number;
  pitchErrors: number;
  rhythmErrors: number;
  tempo?: number;
  mode: 'normal' | 'slow' | 'loop' | 'segment';
  errors: object[]; // Detailed error log
  createdAt: Date;
}

export interface SessionFilter {
  userId?: string;
  pieceId?: string;
  limit: number;
  page: number;
  startDate?: Date;
  endDate?: Date;
}
