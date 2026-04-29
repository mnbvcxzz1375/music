export interface Piece {
  id: string;
  userId?: string;
  title: string;
  composer?: string;
  difficulty: number;
  instrumentTypes: InstrumentType[];
  genres: MusicGenre[];
  durationSeconds: number;
  musicXmlUrl: string;
  audioDemoUrl?: string;
  tags: string[];
  isOfficial: boolean;
  isPremium: boolean;
  playCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type InstrumentType = 'piano' | 'guitar' | 'violin' | 'cello' | 'flute' | 'other';
export type MusicGenre = 'classical' | 'pop' | 'jazz' | 'folk' | 'rock' | 'other';

export interface PieceFilter {
  instrument?: InstrumentType;
  genre?: MusicGenre;
  difficultyMin?: number;
  difficultyMax?: number;
  isOfficial?: boolean;
  isPremium?: boolean;
  search?: string;
  sortBy?: 'title' | 'difficulty' | 'playCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PieceListResponse {
  pieces: Piece[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Re-export OCR types from canonical source for backward compatibility
export type { OCRStatus, OCRError } from '../ocr/types';

export interface PieceUploadResult {
  piece: Piece;
  parseErrors?: string[];
}

export interface FavoriteStatus {
  pieceId: string;
  isFavorite: boolean;
  addedAt?: Date;
}
