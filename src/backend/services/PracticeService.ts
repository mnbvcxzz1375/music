import { v4 as uuidv4 } from 'uuid';
import { PracticeSession, SessionFilter } from '../models/PracticeSession';
import {
  createSession as dbCreateSession,
  findSessions as dbFindSessions,
  getUserStats as dbGetUserStats,
  getDailyActivity as dbGetDailyActivity,
  getUserAchievements as dbGetUserAchievements,
  unlockAchievement as dbUnlockAchievement,
} from '../db/practiceSessions';

export class PracticeService {
  /**
   * Records a completed practice session.
   */
  async recordSession(input: Omit<PracticeSession, 'id' | 'createdAt'>): Promise<PracticeSession> {
    const session: Omit<PracticeSession, 'id' | 'createdAt'> = {
      ...input,
      id: uuidv4(),
      createdAt: new Date(),
    };

    await dbCreateSession(session);
    
    // TODO: Check for achievements triggered by this session
    // await achievementService.checkSessionAchievements(input.userId, session);

    return session;
  }

  /**
   * Retrieves practice history for a user.
   */
  async getSessions(filter: SessionFilter): Promise<PracticeSession[]> {
    return dbFindSessions(filter);
  }

  /**
   * Aggregates statistics for a user.
   */
  async getStats(userId: string) {
    const stats = await dbGetUserStats(userId);
    const dailyActivity = await dbGetDailyActivity(userId, 30); // Last 30 days
    const achievements = await dbGetUserAchievements(userId);

    return {
      summary: stats,
      dailyActivity,
      achievements,
    };
  }
}

export const practiceService = new PracticeService();
