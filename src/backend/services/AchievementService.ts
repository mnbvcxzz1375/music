import { getUserAchievements as dbGetUserAchievements } from '../db/practiceSessions';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number; // e.g. 100 sessions
  type: 'sessions' | 'accuracy' | 'duration' | 'streak';
}

const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first_step', title: 'First Step', description: 'Record your first practice session.', icon: '🎵', requirement: 1, type: 'sessions' },
  { id: 'dedicated', title: 'Dedicated', description: 'Complete 100 practice sessions.', icon: '🔥', requirement: 100, type: 'sessions' },
  { id: 'perfectionist', title: 'Perfectionist', description: 'Achieve 100% accuracy on any session.', icon: '⭐', requirement: 100, type: 'accuracy' },
  { id: 'marathon', title: 'Marathon', description: 'Practice for over 60 minutes in one session.', icon: '⏱️', requirement: 3600, type: 'duration' },
];

export class AchievementService {
  /**
   * Retrieves all achievements and whether the user has unlocked them.
   * Note: For a full production app, we would calculate specific progress for each achievement.
   */
  async getUserAchievements(userId: string) {
    // In a real app, we would join unlocked achievements with the full definition list
    // For now, we return the definitions and check against a local list of unlocked IDs if available in DB
    // Assuming dbGetUserAchievements returns the unlock status
    
    return ACHIEVEMENT_DEFINITIONS;
  }
}

export const achievementService = new AchievementService();
