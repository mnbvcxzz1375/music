import { queryOne, queryMany } from './connection';

export async function add(userId: string, pieceId: string): Promise<void> {
  await queryOne(
    `INSERT INTO favorites (user_id, piece_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
    [userId, pieceId]
  );
}

export async function remove(userId: string, pieceId: string): Promise<void> {
  await queryOne(
    `DELETE FROM favorites WHERE user_id = $1 AND piece_id = $2`,
    [userId, pieceId]
  );
}

export async function isFavorited(userId: string, pieceId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `SELECT id FROM favorites WHERE user_id = $1 AND piece_id = $2`,
    [userId, pieceId]
  );
  return !!result;
}

export async function getFavoritesByUser(userId: string): Promise<string[]> {
  const result = await queryMany<{ piece_id: string }>(
    `SELECT piece_id FROM favorites WHERE user_id = $1`,
    [userId]
  );
  return result.map(r => r.piece_id);
}
