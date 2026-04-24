import { query, queryOne, queryMany } from './connection';
import type { PracticeSession } from './models';

export async function createSession(
  userId: string,
  pieceId: string,
  startTime: Date,
  endTime: Date,
  durationSeconds: number,
  stats?: {
    totalNotes?: number;
    correctNotes?: number;
    accuracy?: number;
    pitchErrors?: number;
    rhythmErrors?: number;
    tempo?: number;
    mode?: string;
  }
): Promise<PracticeSession> {
  const result = await queryOne<PracticeSession>(
    `INSERT INTO practice_sessions 
     (user_id, piece_id, start_time, end_time, duration_seconds,
      total_notes, correct_notes, accuracy, pitch_errors, rhythm_errors, tempo, mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, user_id as "userId", piece_id as "pieceId",
               start_time as "startTime", end_time as "endTime",
               duration_seconds as "durationSeconds",
               total_notes as "totalNotes", correct_notes as "correctNotes",
               accuracy, pitch_errors as "pitchErrors",
               rhythm_errors as "rhythmErrors", tempo, mode,
               created_at as "createdAt"`,
    [
      userId,
      pieceId,
      startTime,
      endTime,
      durationSeconds,
      stats?.totalNotes,
      stats?.correctNotes,
      stats?.accuracy,
      stats?.pitchErrors ?? 0,
      stats?.rhythmErrors ?? 0,
      stats?.tempo,
      stats?.mode,
    ]
  );
  
  if (!result) {
    throw new Error('Failed to create practice session');
  }
  
  return result;
}

export async function getSessionById(id: string): Promise<PracticeSession | null> {
  return queryOne<PracticeSession>(
    `SELECT id, user_id as "userId", piece_id as "pieceId",
            start_time as "startTime", end_time as "endTime",
            duration_seconds as "durationSeconds",
            total_notes as "totalNotes", correct_notes as "correctNotes",
            accuracy, pitch_errors as "pitchErrors",
            rhythm_errors as "rhythmErrors", tempo, mode,
            created_at as "createdAt"
     FROM practice_sessions WHERE id = $1`,
    [id]
  );
}

export async function getUserSessions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PracticeSession[]> {
  return queryMany<PracticeSession>(
    `SELECT id, user_id as "userId", piece_id as "pieceId",
            start_time as "startTime", end_time as "endTime",
            duration_seconds as "durationSeconds",
            total_notes as "totalNotes", correct_notes as "correctNotes",
            accuracy, pitch_errors as "pitchErrors",
            rhythm_errors as "rhythmErrors", tempo, mode,
            created_at as "createdAt"
     FROM practice_sessions 
     WHERE user_id = $1
     ORDER BY start_time DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
}

export async function getPieceSessions(
  pieceId: string,
  limit: number = 20
): Promise<PracticeSession[]> {
  return queryMany<PracticeSession>(
    `SELECT id, user_id as "userId", piece_id as "pieceId",
            start_time as "startTime", end_time as "endTime",
            duration_seconds as "durationSeconds",
            total_notes as "totalNotes", correct_notes as "correctNotes",
            accuracy, pitch_errors as "pitchErrors",
            rhythm_errors as "rhythmErrors", tempo, mode,
            created_at as "createdAt"
     FROM practice_sessions 
     WHERE piece_id = $1
     ORDER BY start_time DESC LIMIT $2`,
    [pieceId, limit]
  );
}

export async function getUserSessionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PracticeSession[]> {
  return queryMany<PracticeSession>(
    `SELECT id, user_id as "userId", piece_id as "pieceId",
            start_time as "startTime", end_time as "endTime",
            duration_seconds as "durationSeconds",
            total_notes as "totalNotes", correct_notes as "correctNotes",
            accuracy, pitch_errors as "pitchErrors",
            rhythm_errors as "rhythmErrors", tempo, mode,
            created_at as "createdAt"
     FROM practice_sessions 
     WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3
     ORDER BY start_time DESC`,
    [userId, startDate, endDate]
  );
}

export async function getUserStats(userId: string): Promise<{
  totalSessions: number;
  totalDuration: number;
  averageAccuracy: number;
  bestAccuracy: number;
  totalPitchErrors: number;
  totalRhythmErrors: number;
}> {
  const result = await queryOne<{
    total_sessions: string;
    total_duration: string;
    avg_accuracy: string | null;
    max_accuracy: string | null;
    total_pitch_errors: string;
    total_rhythm_errors: string;
  }>(
    `SELECT 
      COUNT(*) as total_sessions,
      SUM(duration_seconds) as total_duration,
      AVG(accuracy) as avg_accuracy,
      MAX(accuracy) as max_accuracy,
      SUM(pitch_errors) as total_pitch_errors,
      SUM(rhythm_errors) as total_rhythm_errors
     FROM practice_sessions 
     WHERE user_id = $1`,
    [userId]
  );
  
  return {
    totalSessions: parseInt(result?.total_sessions || '0'),
    totalDuration: parseInt(result?.total_duration || '0'),
    averageAccuracy: parseFloat(result?.avg_accuracy || '0'),
    bestAccuracy: parseFloat(result?.max_accuracy || '0'),
    totalPitchErrors: parseInt(result?.total_pitch_errors || '0'),
    totalRhythmErrors: parseInt(result?.total_rhythm_errors || '0'),
  };
}

export async function getDailyStats(
  userId: string,
  date: Date
): Promise<{
  sessions: number;
  duration: number;
  accuracy: number;
}> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await queryOne<{
    sessions: string;
    duration: string;
    avg_accuracy: string | null;
  }>(
    `SELECT 
      COUNT(*) as sessions,
      SUM(duration_seconds) as duration,
      AVG(accuracy) as avg_accuracy
     FROM practice_sessions 
     WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3`,
    [userId, startOfDay, endOfDay]
  );
  
  return {
    sessions: parseInt(result?.sessions || '0'),
    duration: parseInt(result?.duration || '0'),
    accuracy: parseFloat(result?.avg_accuracy || '0'),
  };
}

export async function getWeeklyStats(
  userId: string,
  weekStart: Date
): Promise<{
  sessions: number;
  duration: number;
  accuracy: number;
  daysPracticed: number;
}> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const result = await queryOne<{
    sessions: string;
    duration: string;
    avg_accuracy: string | null;
    days_practiced: string;
  }>(
    `SELECT 
      COUNT(*) as sessions,
      SUM(duration_seconds) as duration,
      AVG(accuracy) as avg_accuracy,
      COUNT(DISTINCT DATE(start_time)) as days_practiced
     FROM practice_sessions 
     WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3`,
    [userId, weekStart, weekEnd]
  );
  
  return {
    sessions: parseInt(result?.sessions || '0'),
    duration: parseInt(result?.duration || '0'),
    accuracy: parseFloat(result?.avg_accuracy || '0'),
    daysPracticed: parseInt(result?.days_practiced || '0'),
  };
}

export async function getMostPracticedPieces(
  userId: string,
  limit: number = 10
): Promise<{ pieceId: string; count: number; avgAccuracy: number }[]> {
  return queryMany<{ piece_id: string; count: string; avg_accuracy: string }>(
    `SELECT 
      piece_id,
      COUNT(*) as count,
      AVG(accuracy) as avg_accuracy
     FROM practice_sessions 
     WHERE user_id = $1
     GROUP BY piece_id
     ORDER BY count DESC LIMIT $2`,
    [userId, limit]
  ).then(results => results.map(r => ({
    pieceId: r.piece_id,
    count: parseInt(r.count),
    avgAccuracy: parseFloat(r.avg_accuracy || '0'),
  })));
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM practice_sessions WHERE id = $1',
    [id]
  );
  
  return result.rowCount > 0;
}

export async function countUserSessions(userId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM practice_sessions WHERE user_id = $1',
    [userId]
  );
  
  return parseInt(result?.count || '0');
}