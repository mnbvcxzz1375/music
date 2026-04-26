import { query, queryOne, queryMany } from './connection';
import type { PracticeSession, SessionFilter } from '../models/PracticeSession';

// Create a new practice session
export async function createSession(session: Omit<PracticeSession, 'id' | 'createdAt'>): Promise<PracticeSession> {
  const result = await queryOne<PracticeSession>(
    `INSERT INTO practice_sessions (
      id, user_id, piece_id, duration_seconds, total_notes, correct_notes, 
      accuracy, pitch_errors, rhythm_errors, tempo, mode, errors, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    RETURNING 
      id, user_id as "userId", piece_id as "pieceId", duration_seconds as "durationSeconds", 
      total_notes as "totalNotes", correct_notes as "correctNotes", 
      accuracy, pitch_errors as "pitchErrors", rhythm_errors as "rhythmErrors", 
      tempo, mode, errors, created_at as "createdAt"`,
    [
      session.id,
      session.userId,
      session.pieceId,
      session.durationSeconds,
      session.totalNotes,
      session.correctNotes,
      session.accuracy,
      session.pitchErrors,
      session.rhythmErrors,
      session.tempo || null,
      session.mode,
      JSON.stringify(session.errors),
    ]
  );

  if (!result) throw new Error('Failed to create practice session');
  return result;
}

// Get sessions for a user with filters
export async function findSessions(filter: SessionFilter): Promise<PracticeSession[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.userId) {
    conditions.push(`user_id = $${paramIndex}`);
    params.push(filter.userId);
    paramIndex++;
  }

  if (filter.pieceId) {
    conditions.push(`piece_id = $${paramIndex}`);
    params.push(filter.pieceId);
    paramIndex++;
  }

  if (filter.startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }

  if (filter.endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (filter.page - 1) * filter.limit;

  params.push(filter.limit, offset);

  return queryMany<PracticeSession>(
    `SELECT 
      id, user_id as "userId", piece_id as "pieceId", duration_seconds as "durationSeconds", 
      total_notes as "totalNotes", correct_notes as "correctNotes", 
      accuracy, pitch_errors as "pitchErrors", rhythm_errors as "rhythmErrors", 
      tempo, mode, errors, created_at as "createdAt"
     FROM practice_sessions ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
}

// Get basic statistics for a user (Total duration, sessions count, avg accuracy)
export async function getUserStats(userId: string): Promise<{
  totalSessions: number;
  totalDuration: number;
  avgAccuracy: number;
  bestAccuracy: number;
}> {
  const result = await queryOne(`
    SELECT 
      COUNT(*) as "totalSessions",
      COALESCE(SUM(duration_seconds), 0) as "totalDuration",
      COALESCE(AVG(accuracy), 0) as "avgAccuracy",
      COALESCE(MAX(accuracy), 0) as "bestAccuracy"
    FROM practice_sessions
    WHERE user_id = $1
  `, [userId]);

  return result as { totalSessions: number; totalDuration: number; avgAccuracy: number; bestAccuracy: number };
}

// Get daily practice stats for the last N days
export async function getDailyActivity(userId: string, days: number): Promise<{ date: string; duration: number; sessions: number }[]> {
  return queryMany(`
    SELECT 
      DATE(created_at) as date,
      SUM(duration_seconds) as duration,
      COUNT(*) as sessions
    FROM practice_sessions
    WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [userId]);
}

// Get achievements unlocked by user
export async function getUserAchievements(userId: string): Promise<{ achievementId: string; unlockedAt: Date }[]> {
  return queryMany<{ achievementId: string; unlockedAt: Date }>(
    `SELECT achievement_id as "achievementId", unlocked_at as "unlockedAt" 
     FROM user_achievements WHERE user_id = $1`,
    [userId]
  );
}

// Unlock an achievement for a user
export async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  await queryOne(
    `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) 
     VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
    [userId, achievementId]
  );
}
