export interface Piece {
  id: string;
  userId?: string;
  title: string;
  composer?: string;
  difficulty: number;
  instrumentTypes: string[];
  genres: string[];
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

export interface PieceFilter {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  instrument?: string;
  genre?: string;
  difficultyMin?: number;
  difficultyMax?: number;
  search?: string;
  isOfficial?: boolean;
}