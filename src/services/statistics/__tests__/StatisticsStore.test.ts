import { describe, it, expect, beforeEach } from 'vitest'
import { useStatisticsStore, getStatisticsStore } from '../StatisticsStore'
import type { PracticeSession } from '../types'

const createMockSession = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: 'session-1',
  userId: 'user-1',
  pieceId: 'piece-1',
  pieceTitle: 'Test Piece',
  startTime: new Date(),
  endTime: new Date(),
  durationSeconds: 1800,
  accuracy: 85,
  totalNotes: 100,
  correctNotes: 85,
  pitchErrors: 10,
  rhythmErrors: 5,
  retries: 0,
  averagePitchDeviation: 10,
  averageTimingDeviation: 15,
  errors: [],
  settings: { tempo: 120, mode: 'normal', partId: 'part-1' },
  createdAt: new Date(),
  ...overrides,
} as unknown as PracticeSession)

describe('StatisticsStore', () => {
  beforeEach(() => {
    useStatisticsStore.setState({
      sessions: [],
      stats: {
        totalDuration: 0,
        totalSessions: 0,
        totalPieces: 0,
        averageAccuracy: 0,
        streakDays: 0,
        skillLevels: [
          { skill: 'pitch', level: 1, progress: 0 },
          { skill: 'rhythm', level: 1, progress: 0 },
          { skill: 'duration', level: 1, progress: 0 },
        ],
      },
      dailyStats: [],
      weeklyStats: [],
      monthlyStats: [],
    })
  })

  describe('addSession', () => {
    it('should add a practice session', () => {
      const session = createMockSession()

      const { addSession } = useStatisticsStore.getState()
      addSession(session)

      const state = useStatisticsStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.sessions[0].pieceTitle).toBe('Test Piece')
    })

    it('should update stats when adding session', () => {
      const session = createMockSession()

      const { addSession } = useStatisticsStore.getState()
      addSession(session)

      const state = useStatisticsStore.getState()
      expect(state.stats.totalDuration).toBe(1800)
      expect(state.stats.totalSessions).toBe(1)
      expect(state.stats.totalPieces).toBe(1)
      expect(state.stats.averageAccuracy).toBe(85)
    })

    it('should calculate unique pieces count', () => {
      const session1 = createMockSession({ id: 'session-1', pieceId: 'piece-1', pieceTitle: 'Piece 1' })
      const session2 = createMockSession({ id: 'session-2', pieceId: 'piece-2', pieceTitle: 'Piece 2', durationSeconds: 1200, accuracy: 90 })

      const { addSession } = useStatisticsStore.getState()
      addSession(session1)
      addSession(session2)

      const state = useStatisticsStore.getState()
      expect(state.stats.totalPieces).toBe(2)
    })

    it('should not count duplicate pieces', () => {
      const session1 = createMockSession({ id: 'session-1', pieceId: 'piece-1', pieceTitle: 'Piece 1' })
      const session2 = createMockSession({ id: 'session-2', pieceId: 'piece-1', pieceTitle: 'Piece 1', durationSeconds: 1200, accuracy: 90 })

      const { addSession } = useStatisticsStore.getState()
      addSession(session1)
      addSession(session2)

      const state = useStatisticsStore.getState()
      expect(state.stats.totalPieces).toBe(1)
    })
  })

  describe('getSession', () => {
    it('should get session by id', () => {
      const session = createMockSession()
      useStatisticsStore.setState({ sessions: [session] })

      const { getSession } = useStatisticsStore.getState()
      const result = getSession('session-1')

      expect(result).toEqual(session)
    })

    it('should return undefined for non-existent session', () => {
      const { getSession } = useStatisticsStore.getState()
      const result = getSession('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getSessionsByPiece', () => {
    it('should get sessions for a specific piece', () => {
      const sessions: PracticeSession[] = [
        createMockSession({ id: 's1', pieceId: 'piece-1', pieceTitle: 'Piece 1' }),
        createMockSession({ id: 's2', pieceId: 'piece-2', pieceTitle: 'Piece 2' }),
        createMockSession({ id: 's3', pieceId: 'piece-1', pieceTitle: 'Piece 1', durationSeconds: 2400, accuracy: 88 }),
      ]

      useStatisticsStore.setState({ sessions })

      const { getSessionsByPiece } = useStatisticsStore.getState()
      const result = getSessionsByPiece('piece-1')

      expect(result).toHaveLength(2)
    })
  })

  describe('getSessionsByDateRange', () => {
    it('should get sessions within date range', () => {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const sessions: PracticeSession[] = [
        createMockSession({ id: 's1', startTime: now }),
        createMockSession({ id: 's2', startTime: yesterday }),
        createMockSession({ id: 's3', startTime: twoDaysAgo }),
      ]

      useStatisticsStore.setState({ sessions })

      const { getSessionsByDateRange } = useStatisticsStore.getState()
      const result = getSessionsByDateRange(yesterday, now)

      expect(result).toHaveLength(2)
    })
  })

  describe('calculateDailyStats', () => {
    it('should calculate stats for a specific date', () => {
      const today = new Date().toISOString().split('T')[0]
      const sessions: PracticeSession[] = [
        createMockSession({ startTime: new Date() }),
        createMockSession({ id: 's2', pieceId: 'piece-2', durationSeconds: 1200, accuracy: 90 }),
      ]

      useStatisticsStore.setState({ sessions })

      const { calculateDailyStats } = useStatisticsStore.getState()
      const result = calculateDailyStats(today)

      expect(result.date).toBe(today)
      expect(result.durationSeconds).toBe(3000)
      expect(result.sessionsCount).toBe(2)
      expect(result.piecesCount).toBe(2)
      expect(result.averageAccuracy).toBe(87.5)
    })
  })

  describe('calculateWeeklyStats', () => {
    it('should calculate stats for a week', () => {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const sessions: PracticeSession[] = [
        createMockSession({ startTime: now }),
      ]

      useStatisticsStore.setState({ sessions })

      const { calculateWeeklyStats } = useStatisticsStore.getState()
      const result = calculateWeeklyStats(weekStartStr)

      expect(result.weekStart).toBe(weekStartStr)
      expect(result.dailyStats).toHaveLength(7)
    })
  })

  describe('calculateMonthlyStats', () => {
    it('should calculate stats for a month', () => {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const sessions: PracticeSession[] = [
        createMockSession({ startTime: now }),
      ]

      useStatisticsStore.setState({ sessions })

      const { calculateMonthlyStats } = useStatisticsStore.getState()
      const result = calculateMonthlyStats(month)

      expect(result.month).toBe(month)
      expect(result.totalSessions).toBe(1)
    })
  })

  describe('getProgressTrend', () => {
    it('should return progress trend for specified days', () => {
      const { getProgressTrend } = useStatisticsStore.getState()
      const result = getProgressTrend(7)

      expect(result).toHaveLength(7)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('accuracy')
      expect(result[0]).toHaveProperty('duration')
    })
  })

  describe('getSkillLevels', () => {
    it('should return default skill levels when no sessions', () => {
      const { getSkillLevels } = useStatisticsStore.getState()
      const result = getSkillLevels()

      expect(result).toHaveLength(3)
      expect(result[0].skill).toBe('pitch')
      expect(result[0].level).toBe(1)
    })

    it('should calculate skill levels based on sessions', () => {
      const sessions: PracticeSession[] = [
        createMockSession({ accuracy: 95, pitchErrors: 2, rhythmErrors: 3 }),
      ]

      useStatisticsStore.setState({ sessions })

      const { getSkillLevels } = useStatisticsStore.getState()
      const result = getSkillLevels()

      expect(result[0].level).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getStreakDays', () => {
    it('should return 0 when no sessions', () => {
      const { getStreakDays } = useStatisticsStore.getState()
      const result = getStreakDays()

      expect(result).toBe(0)
    })

    it('should calculate streak days', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const sessions: PracticeSession[] = [
        createMockSession({ startTime: today }),
        createMockSession({ id: 's2', startTime: yesterday }),
      ]

      useStatisticsStore.setState({ sessions })

      const { getStreakDays } = useStatisticsStore.getState()
      const result = getStreakDays()

      expect(result).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getTotalDuration', () => {
    it('should return total duration', () => {
      useStatisticsStore.setState({ stats: { totalDuration: 3600, totalSessions: 2, totalPieces: 1, averageAccuracy: 85, streakDays: 1, skillLevels: [] } })

      const { getTotalDuration } = useStatisticsStore.getState()
      const result = getTotalDuration()

      expect(result).toBe(3600)
    })
  })

  describe('getAverageAccuracy', () => {
    it('should return average accuracy', () => {
      useStatisticsStore.setState({ stats: { totalDuration: 3600, totalSessions: 2, totalPieces: 1, averageAccuracy: 87.5, streakDays: 1, skillLevels: [] } })

      const { getAverageAccuracy } = useStatisticsStore.getState()
      const result = getAverageAccuracy()

      expect(result).toBe(87.5)
    })
  })
})

describe('getStatisticsStore', () => {
  it('should return the store state', () => {
    const store = getStatisticsStore()
    expect(store).toHaveProperty('sessions')
    expect(store).toHaveProperty('stats')
  })
})