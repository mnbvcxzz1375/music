import { v4 as uuidv4 } from 'uuid';
import { Piece, PieceFilter } from '../models/Piece';
import * as pieceRepo from '../db/pieces';
import * as favoritesRepo from '../db/favorites';

export class PieceService {
  async getPieces(filter: PieceFilter): Promise<{ pieces: Piece[]; total: number }> {
    const [pieces, total] = await Promise.all([
      pieceRepo.findPieces(filter),
      pieceRepo.countPieces(filter)
    ]);
    return { pieces, total };
  }

  async getOfficialPieces(options: { page: number; limit: number }): Promise<{ pieces: Piece[]; total: number }> {
    return this.getPieces({
      page: options.page,
      limit: options.limit,
      isOfficial: true
    });
  }

  async searchPieces(query: string, options: { page: number; limit: number }): Promise<{ pieces: Piece[]; total: number }> {
    return this.getPieces({
      ...options,
      search: query
    });
  }

  async getPieceById(id: string): Promise<Piece | null> {
    return pieceRepo.findById(id);
  }

  async getPieceByTitle(title: string, userId?: string): Promise<Piece | null> {
    return pieceRepo.findByTitle(title, userId);
  }

  async createPiece(input: {
    userId: string;
    title: string;
    composer?: string;
    filePath: string; // Path to the uploaded MusicXML file
    instrumentTypes?: string[];
    genres?: string[];
    difficulty?: number;
    tags?: string[];
  }): Promise<Piece> {
    // Check for duplicates by title for the same user
    const existing = await this.getPieceByTitle(input.title, input.userId);
    if (existing) {
      throw new Error('A piece with this title already exists in your library');
    }

    const pieceId = uuidv4();
    const piece: Piece = {
      id: pieceId,
      userId: input.userId,
      title: input.title,
      composer: input.composer,
      difficulty: input.difficulty || 1,
      instrumentTypes: input.instrumentTypes || ['other'],
      genres: input.genres || ['other'],
      durationSeconds: 0,
      musicXmlUrl: input.filePath,
      tags: input.tags || [],
      isOfficial: false,
      isPremium: false,
      playCount: 0,
      favoriteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await pieceRepo.create(pieceId, piece);

    return piece;
  }

  async updatePiece(id: string, userId: string, updates: Partial<Piece>): Promise<Piece> {
    const piece = await this.getPieceById(id);
    if (!piece || piece.userId !== userId) {
      throw new Error('Piece not found or unauthorized');
    }

    const updatedPiece = {
      ...piece,
      ...updates,
      updatedAt: new Date(),
    };

    await pieceRepo.update(id, updatedPiece);
    return updatedPiece;
  }

  async deletePiece(id: string, userId: string): Promise<void> {
    const piece = await this.getPieceById(id);
    if (!piece || piece.userId !== userId) {
      throw new Error('Piece not found or unauthorized');
    }
    await pieceRepo.deletePiece(id);
  }

  async toggleFavorite(userId: string, pieceId: string): Promise<{ isFavorite: boolean }> {
    const isFav = await favoritesRepo.isFavorited(userId, pieceId);

    if (isFav) {
      await favoritesRepo.remove(userId, pieceId);
      await pieceRepo.decrementFavoriteCount(pieceId);
      return { isFavorite: false };
    } else {
      await favoritesRepo.add(userId, pieceId);
      await pieceRepo.incrementFavoriteCount(pieceId);
      return { isFavorite: true };
    }
  }

  async getFavorites(userId: string): Promise<Piece[]> {
    const pieceIds = await favoritesRepo.getFavoritesByUser(userId);
    // We could fetch them in a batch, but for now sequential is okay for typical library sizes
    const pieces: Piece[] = [];
    for (const id of pieceIds) {
      const p = await this.getPieceById(id);
      if (p) pieces.push(p);
    }
    return pieces;
  }
}
