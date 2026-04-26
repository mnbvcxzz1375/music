import { query, queryOne, queryMany } from '../db/connection';
import type { Piece, PieceFilter } from '../models/Piece';

/**
 * Retrieves pieces with filtering, sorting, and pagination.
 */
export async function findPieces(filter: PieceFilter): Promise<Piece[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.isOfficial !== undefined) {
    conditions.push(`is_official = $${paramIndex}`);
    params.push(filter.isOfficial);
    paramIndex++;
  }

  if (filter.instrument) {
    conditions.push(`$${paramIndex} = ANY(instrument_types)`);
    params.push(filter.instrument);
    paramIndex++;
  }

  if (filter.genre) {
    conditions.push(`$${paramIndex} = ANY(genres)`);
    params.push(filter.genre);
    paramIndex++;
  }

  if (filter.search) {
    conditions.push(`(title ILIKE $${paramIndex} OR composer ILIKE $${paramIndex})`);
    params.push(`%${filter.search}%`);
    paramIndex++;
  }

  if (filter.difficultyMin !== undefined) {
    conditions.push(`difficulty >= $${paramIndex}`);
    params.push(filter.difficultyMin);
    paramIndex++;
  }

  if (filter.difficultyMax !== undefined) {
    conditions.push(`difficulty <= $${paramIndex}`);
    params.push(filter.difficultyMax);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortValue = filter.sortBy === 'title' ? 'title' : filter.sortBy === 'difficulty' ? 'difficulty' : 'play_count';
  const sortOrder = filter.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const offset = (filter.page - 1) * filter.limit;

  params.push(filter.limit, offset);

  return queryMany<Piece>(
    `SELECT id, user_id as "userId", title, composer, difficulty, 
            instrument_types as "instrumentTypes", genres, 
            duration_seconds as "durationSeconds", musicxml_url as "musicXmlUrl", 
            tags, is_official as "isOfficial", is_premium as "isPremium",
            play_count as "playCount", favorite_count as "favoriteCount",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces ${whereClause}
     ORDER BY ${sortValue} ${sortOrder}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
}

export async function countPieces(filter: PieceFilter): Promise<number> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.isOfficial !== undefined) {
    conditions.push(`is_official = $${paramIndex}`);
    params.push(filter.isOfficial);
    paramIndex++;
  }
  if (filter.search) {
    conditions.push(`(title ILIKE $${paramIndex} OR composer ILIKE $${paramIndex})`);
    params.push(`%${filter.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM pieces ${whereClause}`,
    params
  );

  return parseInt(result?.count || '0');
}

/**
 * Finds a single piece by ID.
 */
export async function findById(id: string): Promise<Piece | null> {
  return queryOne<Piece>(
    `SELECT id, user_id as "userId", title, composer, difficulty, 
            instrument_types as "instrumentTypes", genres, 
            duration_seconds as "durationSeconds", musicxml_url as "musicXmlUrl", 
            tags, is_official as "isOfficial", is_premium as "isPremium",
            play_count as "playCount", favorite_count as "favoriteCount",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces WHERE id = $1`,
    [id]
  );
}

/**
 * Finds a single piece by Title (and optional user check).
 */
export async function findByTitle(title: string, userId?: string): Promise<Piece | null> {
  if (userId) {
    return queryOne<Piece>(
      `SELECT id, user_id as "userId", title, composer, difficulty, 
              instrument_types as "instrumentTypes", genres, 
              duration_seconds as "durationSeconds", musicxml_url as "musicXmlUrl", 
              tags, is_official as "isOfficial", is_premium as "isPremium",
              play_count as "playCount", favorite_count as "favoriteCount",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM pieces WHERE title = $1 AND user_id = $2`,
      [title, userId]
    );
  }
  return queryOne<Piece>(
    `SELECT id, user_id as "userId", title, composer, difficulty, 
            instrument_types as "instrumentTypes", genres, 
            duration_seconds as "durationSeconds", musicxml_url as "musicXmlUrl", 
            tags, is_official as "isOfficial", is_premium as "isPremium",
            play_count as "playCount", favorite_count as "favoriteCount",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces WHERE title = $1`,
    [title]
  );
}

/**
 * Creates a new piece.
 */
export async function create(pieceId: string, piece: Omit<Piece, 'id'>): Promise<void> {
  await queryOne(
    `INSERT INTO pieces (
      id, user_id, title, composer, difficulty, instrument_types, genres, 
      duration_seconds, musicxml_url, tags, is_official, is_premium, play_count, favorite_count, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      pieceId,
      piece.userId,
      piece.title,
      piece.composer,
      piece.difficulty,
      piece.instrumentTypes,
      piece.genres,
      piece.durationSeconds,
      piece.musicXmlUrl,
      piece.tags,
      piece.isOfficial,
      piece.isPremium,
      piece.playCount,
      piece.favoriteCount,
      piece.createdAt,
      piece.updatedAt
    ]
  );
}

/**
 * Updates an existing piece.
 */
export async function update(id: string, piece: Partial<Piece>): Promise<void> {
  await queryOne(
    `UPDATE pieces SET
      title = $1, composer = $2, difficulty = $3, instrument_types = $4, genres = $5,
      duration_seconds = $6, tags = $7, is_official = $8, is_premium = $9, updated_at = NOW()
     WHERE id = $10`,
    [
      piece.title,
      piece.composer,
      piece.difficulty,
      piece.instrumentTypes,
      piece.genres,
      piece.durationSeconds,
      piece.tags,
      piece.isOfficial,
      piece.isPremium,
      id
    ]
  );
}

/**
 * Increments favorite count for a piece.
 */
export async function incrementFavoriteCount(id: string): Promise<void> {
  await queryOne(`UPDATE pieces SET favorite_count = favorite_count + 1 WHERE id = $1`, [id]);
}

/**
 * Decrements favorite count for a piece.
 */
export async function decrementFavoriteCount(id: string): Promise<void> {
  await queryOne(`UPDATE pieces SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = $1`, [id]);
}

/**
 * Deletes a piece.
 */
export async function deletePiece(id: string): Promise<void> {
  await queryOne(`DELETE FROM pieces WHERE id = $1`, [id]);
}
