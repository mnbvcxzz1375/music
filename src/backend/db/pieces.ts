import { query, queryOne, queryMany } from './connection';
import type { Piece } from './models';

export async function createPiece(
  title: string,
  filePath: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'professional',
  options?: {
    composer?: string;
    genre?: string;
    instrument?: string;
    durationSeconds?: number;
    isOfficial?: boolean;
    isPremium?: boolean;
    createdBy?: string;
  }
): Promise<Piece> {
  const result = await queryOne<Piece>(
    `INSERT INTO pieces (title, composer, difficulty, genre, instrument, 
                         duration_seconds, is_official, is_premium, file_path, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, title, composer, difficulty, genre, instrument,
               duration_seconds as "durationSeconds",
               is_official as "isOfficial", is_premium as "isPremium",
               file_path as "filePath", created_by as "createdBy",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [
      title,
      options?.composer,
      difficulty,
      options?.genre,
      options?.instrument,
      options?.durationSeconds,
      options?.isOfficial ?? false,
      options?.isPremium ?? false,
      filePath,
      options?.createdBy,
    ]
  );
  
  if (!result) {
    throw new Error('Failed to create piece');
  }
  
  return result;
}

export async function getPieceById(id: string): Promise<Piece | null> {
  return queryOne<Piece>(
    `SELECT id, title, composer, difficulty, genre, instrument,
            duration_seconds as "durationSeconds",
            is_official as "isOfficial", is_premium as "isPremium",
            file_path as "filePath", created_by as "createdBy",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces WHERE id = $1`,
    [id]
  );
}

export async function getPieces(
  limit: number = 20,
  offset: number = 0,
  filters?: {
    difficulty?: string;
    genre?: string;
    instrument?: string;
    isOfficial?: boolean;
    isPremium?: boolean;
  }
): Promise<Piece[]> {
  let sql = `SELECT id, title, composer, difficulty, genre, instrument,
             duration_seconds as "durationSeconds",
             is_official as "isOfficial", is_premium as "isPremium",
             file_path as "filePath", created_by as "createdBy",
             created_at as "createdAt", updated_at as "updatedAt"
             FROM pieces`;
  
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (filters?.difficulty) {
    conditions.push(`difficulty = $${paramIndex}`);
    values.push(filters.difficulty);
    paramIndex++;
  }
  if (filters?.genre) {
    conditions.push(`genre = $${paramIndex}`);
    values.push(filters.genre);
    paramIndex++;
  }
  if (filters?.instrument) {
    conditions.push(`instrument = $${paramIndex}`);
    values.push(filters.instrument);
    paramIndex++;
  }
  if (filters?.isOfficial !== undefined) {
    conditions.push(`is_official = $${paramIndex}`);
    values.push(filters.isOfficial);
    paramIndex++;
  }
  if (filters?.isPremium !== undefined) {
    conditions.push(`is_premium = $${paramIndex}`);
    values.push(filters.isPremium);
    paramIndex++;
  }
  
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);
  
  return queryMany<Piece>(sql, values);
}

export async function searchPieces(
  searchTerm: string,
  limit: number = 20
): Promise<Piece[]> {
  return queryMany<Piece>(
    `SELECT id, title, composer, difficulty, genre, instrument,
            duration_seconds as "durationSeconds",
            is_official as "isOfficial", is_premium as "isPremium",
            file_path as "filePath", created_by as "createdBy",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces 
     WHERE title ILIKE $1 OR composer ILIKE $1
     ORDER BY created_at DESC LIMIT $2`,
    [`%${searchTerm}%`, limit]
  );
}

export async function getOfficialPieces(limit: number = 50): Promise<Piece[]> {
  return queryMany<Piece>(
    `SELECT id, title, composer, difficulty, genre, instrument,
            duration_seconds as "durationSeconds",
            is_official as "isOfficial", is_premium as "isPremium",
            file_path as "filePath", created_by as "createdBy",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces 
     WHERE is_official = true
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
}

export async function getUserPieces(userId: string, limit: number = 20): Promise<Piece[]> {
  return queryMany<Piece>(
    `SELECT id, title, composer, difficulty, genre, instrument,
            duration_seconds as "durationSeconds",
            is_official as "isOfficial", is_premium as "isPremium",
            file_path as "filePath", created_by as "createdBy",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM pieces 
     WHERE created_by = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function updatePiece(
  id: string,
  updates: Partial<{
    title: string;
    composer: string;
    difficulty: string;
    genre: string;
    instrument: string;
    durationSeconds: number;
    isOfficial: boolean;
    isPremium: boolean;
    filePath: string;
  }>
): Promise<Piece | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex}`);
    values.push(updates.title);
    paramIndex++;
  }
  if (updates.composer !== undefined) {
    fields.push(`composer = $${paramIndex}`);
    values.push(updates.composer);
    paramIndex++;
  }
  if (updates.difficulty !== undefined) {
    fields.push(`difficulty = $${paramIndex}`);
    values.push(updates.difficulty);
    paramIndex++;
  }
  if (updates.genre !== undefined) {
    fields.push(`genre = $${paramIndex}`);
    values.push(updates.genre);
    paramIndex++;
  }
  if (updates.instrument !== undefined) {
    fields.push(`instrument = $${paramIndex}`);
    values.push(updates.instrument);
    paramIndex++;
  }
  if (updates.durationSeconds !== undefined) {
    fields.push(`duration_seconds = $${paramIndex}`);
    values.push(updates.durationSeconds);
    paramIndex++;
  }
  if (updates.isOfficial !== undefined) {
    fields.push(`is_official = $${paramIndex}`);
    values.push(updates.isOfficial);
    paramIndex++;
  }
  if (updates.isPremium !== undefined) {
    fields.push(`is_premium = $${paramIndex}`);
    values.push(updates.isPremium);
    paramIndex++;
  }
  if (updates.filePath !== undefined) {
    fields.push(`file_path = $${paramIndex}`);
    values.push(updates.filePath);
    paramIndex++;
  }
  
  fields.push(`updated_at = NOW()`);
  values.push(id);
  
  const result = await queryOne<Piece>(
    `UPDATE pieces SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, title, composer, difficulty, genre, instrument,
               duration_seconds as "durationSeconds",
               is_official as "isOfficial", is_premium as "isPremium",
               file_path as "filePath", created_by as "createdBy",
               created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );
  
  return result;
}

export async function deletePiece(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM pieces WHERE id = $1',
    [id]
  );
  
  return result.rowCount > 0;
}

export async function countPieces(filters?: {
  isOfficial?: boolean;
  isPremium?: boolean;
}): Promise<number> {
  let sql = 'SELECT COUNT(*) as count FROM pieces';
  const conditions: string[] = [];
  const values: unknown[] = [];
  
  if (filters?.isOfficial !== undefined) {
    conditions.push(`is_official = $${values.length + 1}`);
    values.push(filters.isOfficial);
  }
  if (filters?.isPremium !== undefined) {
    conditions.push(`is_premium = $${values.length + 1}`);
    values.push(filters.isPremium);
  }
  
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  const result = await queryOne<{ count: string }>(sql, values);
  
  return parseInt(result?.count || '0');
}