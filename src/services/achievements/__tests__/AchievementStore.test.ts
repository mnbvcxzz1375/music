import { describe, it, expect, beforeEach } from 'vitest'
import { useAchievementStore, getAchievementStore } from '../AchievementStore'

describe('AchievementStore', () => {
  beforeEach(() => {
    useAchievementStore.setState({
      achievements: useAchievementStore.getState().achievements.map(a => ({
        ...a,
        progress: 0,
        isUnlocked: false,
        unlockedAt: undefined,
      })),
      notifications: [],
    })
  })

  describe('checkAchievements', () => {
    it('should check and unlock achievements based on stats', () => {
      const { checkAchievements } = useAchievementStore.getState()
      const newlyUnlocked = checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 3,
        totalPieces: 5,
      })

      expect(newlyUnlocked.length).toBeGreaterThan(0)
      expect(newlyUnlocked.some(a => a.id === 'first_practice')).toBe(true)
    })

    it('should unlock accuracy achievements', () => {
      const { checkAchievements } = useAchievementStore.getState()
      const newlyUnlocked = checkAchievements({
        totalSessions: 10,
        totalDuration: 600,
        averageAccuracy: 95,
        streakDays: 7,
        totalPieces: 10,
      })

      expect(newlyUnlocked.some(a => a.id === 'accuracy_95')).toBe(true)
    })

    it('should unlock streak achievements', () => {
      const { checkAchievements } = useAchievementStore.getState()
      const newlyUnlocked = checkAchievements({
        totalSessions: 30,
        totalDuration: 1800,
        averageAccuracy: 85,
        streakDays: 30,
        totalPieces: 20,
      })

      expect(newlyUnlocked.some(a => a.id === 'streak_30')).toBe(true)
    })

    it('should create notifications for newly unlocked achievements', () => {
      const { checkAchievements } = useAchievementStore.getState()
      checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 1,
        totalPieces: 1,
      })

      const state = useAchievementStore.getState()
      expect(state.notifications.length).toBeGreaterThan(0)
    })

    it('should not unlock already unlocked achievements', () => {
      const { checkAchievements } = useAchievementStore.getState()
      checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 1,
        totalPieces: 1,
      })

      const firstUnlock = useAchievementStore.getState().notifications.length

      checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 1,
        totalPieces: 1,
      })

      const secondUnlock = useAchievementStore.getState().notifications.length
      expect(secondUnlock).toBe(firstUnlock)
    })
  })

  describe('unlockAchievement', () => {
    it('should manually unlock an achievement', () => {
      const { unlockAchievement } = useAchievementStore.getState()
      unlockAchievement('first_practice')

      const state = useAchievementStore.getState()
      const achievement = state.achievements.find(a => a.id === 'first_practice')
      expect(achievement?.isUnlocked).toBe(true)
      expect(achievement?.unlockedAt).toBeDefined()
    })
  })

  describe('getAchievement', () => {
    it('should get achievement by id', () => {
      const { getAchievement } = useAchievementStore.getState()
      const result = getAchievement('first_practice')

      expect(result).toBeDefined()
      expect(result?.id).toBe('first_practice')
    })

    it('should return undefined for non-existent achievement', () => {
      const { getAchievement } = useAchievementStore.getState()
      const result = getAchievement('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getAchievementsByCategory', () => {
    it('should get achievements by category', () => {
      const { getAchievementsByCategory } = useAchievementStore.getState()
      const result = getAchievementsByCategory('practice')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every(a => a.category === 'practice')).toBe(true)
    })

    it('should return empty array for category with no achievements', () => {
      const { getAchievementsByCategory } = useAchievementStore.getState()
      const result = getAchievementsByCategory('social')

      expect(result.length).toBe(0)
    })
  })

  describe('getUnlockedAchievements', () => {
    it('should return only unlocked achievements', () => {
      const { unlockAchievement, getUnlockedAchievements } = useAchievementStore.getState()
      unlockAchievement('first_practice')
      unlockAchievement('streak_3')

      const result = getUnlockedAchievements()
      expect(result.length).toBe(2)
      expect(result.every(a => a.isUnlocked)).toBe(true)
    })

    it('should return empty array when no achievements unlocked', () => {
      const { getUnlockedAchievements } = useAchievementStore.getState()
      const result = getUnlockedAchievements()

      expect(result.length).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return achievement statistics', () => {
      const { unlockAchievement, getStats } = useAchievementStore.getState()
      unlockAchievement('first_practice')

      const result = getStats()
      expect(result.totalAchievements).toBeGreaterThan(0)
      expect(result.unlockedAchievements).toBe(1)
      expect(result.earnedPoints).toBe(10)
    })

    it('should calculate category progress', () => {
      const { getStats } = useAchievementStore.getState()
      const result = getStats()

      expect(result.categoryProgress).toHaveProperty('practice')
      expect(result.categoryProgress.practice.total).toBeGreaterThan(0)
    })
  })

  describe('getPoints', () => {
    it('should return total earned points', () => {
      const { unlockAchievement, getPoints } = useAchievementStore.getState()
      unlockAchievement('first_practice')

      const result = getPoints()
      expect(result).toBe(10)
    })

    it('should return 0 when no achievements unlocked', () => {
      const { getPoints } = useAchievementStore.getState()
      const result = getPoints()

      expect(result).toBe(0)
    })

    it('should calculate points correctly for different tiers', () => {
      const { unlockAchievement, getPoints } = useAchievementStore.getState()
      unlockAchievement('first_practice')
      unlockAchievement('practice_10')
      unlockAchievement('practice_50')

      const result = getPoints()
      expect(result).toBe(10 + 25 + 50)
    })
  })

  describe('dismissNotification', () => {
    it('should dismiss a notification', () => {
      const { checkAchievements, dismissNotification } = useAchievementStore.getState()
      checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 1,
        totalPieces: 1,
      })

      const notificationId = useAchievementStore.getState().notifications[0].achievement.id
      dismissNotification(notificationId)

      const state = useAchievementStore.getState()
      expect(state.notifications[0].shown).toBe(true)
    })
  })

  describe('getPendingNotifications', () => {
    it('should return only pending notifications', () => {
      const { checkAchievements, dismissNotification, getPendingNotifications } = useAchievementStore.getState()
      checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 1,
        totalPieces: 1,
      })

      const notifications = useAchievementStore.getState().notifications
      notifications.forEach(n => dismissNotification(n.achievement.id))

      const result = getPendingNotifications()
      expect(result.length).toBe(0)
    })

    it('should return all notifications when none dismissed', () => {
      const { checkAchievements, getPendingNotifications } = useAchievementStore.getState()
      checkAchievements({
        totalSessions: 1,
        totalDuration: 60,
        averageAccuracy: 80,
        streakDays: 1,
        totalPieces: 1,
      })

      const result = getPendingNotifications()
      expect(result.length).toBeGreaterThan(0)
    })
  })
})

describe('getAchievementStore', () => {
  it('should return the store state', () => {
    const store = getAchievementStore()
    expect(store).toHaveProperty('achievements')
    expect(store).toHaveProperty('notifications')
  })
})