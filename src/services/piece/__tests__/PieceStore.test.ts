import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePieceStore } from '../PieceStore'
import type { Piece, OCRSession } from '../types'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('PieceStore', () => {
  beforeEach(() => {
    usePieceStore.setState({
      pieces: [],
      currentPiece: null,
      favorites: [],
      loading: false,
      error: null,
      total: 0,
      page: 1,
      limit: 20,
    })
    mockFetch.mockReset()
  })

  describe('fetchPieces', () => {
    it('should fetch pieces successfully', async () => {
      const mockPieces: Piece[] = [
        { id: '1', title: 'Test Piece', composer: 'Test Composer', difficulty: 1, instrumentTypes: ['piano'], genres: ['classical'], durationSeconds: 180, musicXmlUrl: 'url', tags: [], isOfficial: true, isPremium: false, playCount: 0, favoriteCount: 0, createdAt: new Date(), updatedAt: new Date() } as unknown as Piece,
        { id: '2', title: 'Another Piece', composer: 'Another Composer', difficulty: 2, instrumentTypes: ['guitar'], genres: ['pop'], durationSeconds: 240, musicXmlUrl: 'url', tags: [], isOfficial: false, isPremium: true, playCount: 0, favoriteCount: 0, createdAt: new Date(), updatedAt: new Date() } as unknown as Piece,
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ pieces: mockPieces, total: 2, page: 1, limit: 20 }),
      })

      const { fetchPieces } = usePieceStore.getState()
      await fetchPieces({})

      const state = usePieceStore.getState()
      expect(state.pieces).toEqual(mockPieces)
      expect(state.total).toBe(2)
      expect(state.loading).toBe(false)
    })

    it('should fetch pieces with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ pieces: [], total: 0, page: 1, limit: 20 }),
      })

      const { fetchPieces } = usePieceStore.getState()
      await fetchPieces({ instrument: 'piano', difficultyMin: 1, difficultyMax: 3, search: 'test' })

      expect(mockFetch.mock.calls[0][0]).toContain('instrument=piano')
      expect(mockFetch.mock.calls[0][0]).toContain('difficultyMin=1')
      expect(mockFetch.mock.calls[0][0]).toContain('difficultyMax=3')
      expect(mockFetch.mock.calls[0][0]).toContain('search=test')
    })

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      const { fetchPieces } = usePieceStore.getState()
      await fetchPieces({})

      const state = usePieceStore.getState()
      expect(state.error).toBe('获取曲目列表失败')
      expect(state.loading).toBe(false)
    })
  })

  describe('fetchPieceById', () => {
    it('should fetch single piece by id', async () => {
      const mockPiece: Piece = {
        id: '1',
        title: 'Test Piece',
        composer: 'Test Composer',
        difficulty: 1,
        instrumentTypes: ['piano'],
        genres: ['classical'],
        durationSeconds: 180,
        musicXmlUrl: 'url',
        tags: [],
        isOfficial: true,
        isPremium: false,
        playCount: 0,
        favoriteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Piece
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPiece),
      })

      const { fetchPieceById } = usePieceStore.getState()
      await fetchPieceById('1')

      const state = usePieceStore.getState()
      expect(state.currentPiece).toEqual(mockPiece)
    })

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      const { fetchPieceById } = usePieceStore.getState()
      await fetchPieceById('invalid')

      const state = usePieceStore.getState()
      expect(state.error).toBe('获取曲目详情失败')
    })
  })

  describe('uploadPiece', () => {
    it('should upload piece successfully', async () => {
      const mockPiece: Piece = {
        id: 'new',
        title: 'Uploaded Piece',
        composer: 'User',
        difficulty: 1,
        instrumentTypes: ['piano'],
        genres: ['classical'],
        durationSeconds: 180,
        musicXmlUrl: 'url',
        tags: [],
        isOfficial: false,
        isPremium: false,
        playCount: 0,
        favoriteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Piece
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPiece),
      })

      const file = new File(['<score>'], 'test.xml', { type: 'application/xml' })
      const { uploadPiece } = usePieceStore.getState()
      const result = await uploadPiece(file)

      expect(result).toEqual(mockPiece)
      const state = usePieceStore.getState()
      expect(state.pieces[0]).toEqual(mockPiece)
    })

    it('should handle upload error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid file format' }),
      })

      const file = new File(['invalid'], 'test.txt', { type: 'text/plain' })
      const { uploadPiece } = usePieceStore.getState()
      await expect(uploadPiece(file)).rejects.toThrow('Invalid file format')
    })
  })

  describe('deletePiece', () => {
    it('should delete piece successfully', async () => {
      usePieceStore.setState({
        pieces: [{ id: '1', title: 'Test', composer: 'Test', difficulty: 1, instrumentTypes: ['piano'], genres: ['classical'], durationSeconds: 180, musicXmlUrl: 'url', tags: [], isOfficial: false, isPremium: false, playCount: 0, favoriteCount: 0, createdAt: new Date(), updatedAt: new Date() } as unknown as Piece],
        currentPiece: { id: '1', title: 'Test', composer: 'Test', difficulty: 1, instrumentTypes: ['piano'], genres: ['classical'], durationSeconds: 180, musicXmlUrl: 'url', tags: [], isOfficial: false, isPremium: false, playCount: 0, favoriteCount: 0, createdAt: new Date(), updatedAt: new Date() } as unknown as Piece,
      })
      mockFetch.mockResolvedValueOnce({ ok: true })

      const { deletePiece } = usePieceStore.getState()
      await deletePiece('1')

      const state = usePieceStore.getState()
      expect(state.pieces).toHaveLength(0)
      expect(state.currentPiece).toBe(null)
    })

    it('should handle delete error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      const { deletePiece } = usePieceStore.getState()
      await expect(deletePiece('invalid')).rejects.toThrow('删除失败')
    })
  })

  describe('toggleFavorite', () => {
    it('should add favorite', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const { toggleFavorite } = usePieceStore.getState()
      await toggleFavorite('piece-1')

      const state = usePieceStore.getState()
      expect(state.favorites).toHaveLength(1)
      expect(state.favorites[0].pieceId).toBe('piece-1')
    })

    it('should remove favorite', async () => {
      usePieceStore.setState({
        favorites: [{ pieceId: 'piece-1', isFavorite: true, addedAt: new Date() }],
      })
      mockFetch.mockResolvedValueOnce({ ok: true })

      const { toggleFavorite } = usePieceStore.getState()
      await toggleFavorite('piece-1')

      const state = usePieceStore.getState()
      expect(state.favorites).toHaveLength(0)
    })
  })

  describe('OCR functions', () => {
    it('should start OCR session', async () => {
      const mockSession: OCRSession = {
        id: 'session-1',
        userId: 'user-1',
        imageUrl: 'image-url',
        status: 'processing',
        confidence: 0,
        createdAt: new Date(),
      } as unknown as OCRSession
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      })

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const { startOCRSession } = usePieceStore.getState()
      const result = await startOCRSession(file)

      expect(result).toEqual(mockSession)
    })

    it('should get OCR session', async () => {
      const mockSession: OCRSession = {
        id: 'session-1',
        userId: 'user-1',
        imageUrl: 'image-url',
        status: 'completed',
        confidence: 0.85,
        createdAt: new Date(),
      } as unknown as OCRSession
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      })

      const { getOCRSession } = usePieceStore.getState()
      const result = await getOCRSession('session-1')

      expect(result).toEqual(mockSession)
    })

    it('should submit OCR corrections', async () => {
      const mockPiece: Piece = {
        id: 'ocr-piece',
        title: 'OCR Result',
        composer: 'Unknown',
        difficulty: 1,
        instrumentTypes: ['piano'],
        genres: ['classical'],
        durationSeconds: 180,
        musicXmlUrl: 'url',
        tags: [],
        isOfficial: false,
        isPremium: false,
        playCount: 0,
        favoriteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Piece
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPiece),
      })

      const { submitOCRCorrections } = usePieceStore.getState()
      const result = await submitOCRCorrections('session-1', { title: 'Corrected Title' })

      expect(result).toEqual(mockPiece)
    })

    it('should complete OCR session', async () => {
      const mockPiece: Piece = {
        id: 'completed-piece',
        title: 'Completed',
        composer: 'Test',
        difficulty: 1,
        instrumentTypes: ['piano'],
        genres: ['classical'],
        durationSeconds: 180,
        musicXmlUrl: 'url',
        tags: [],
        isOfficial: false,
        isPremium: false,
        playCount: 0,
        favoriteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Piece
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPiece),
      })

      const { completeOCRSession } = usePieceStore.getState()
      const result = await completeOCRSession('session-1')

      expect(result).toEqual(mockPiece)
    })

    it('should reject OCR session', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const { rejectOCRSession } = usePieceStore.getState()
      await rejectOCRSession('session-1')

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('checkFavoriteStatus', () => {
    it('should return true if piece is favorite', async () => {
      usePieceStore.setState({
        favorites: [{ pieceId: 'piece-1', isFavorite: true, addedAt: new Date() }],
      })

      const { checkFavoriteStatus } = usePieceStore.getState()
      const result = await checkFavoriteStatus('piece-1')

      expect(result).toBe(true)
    })

    it('should return false if piece is not favorite', async () => {
      const { checkFavoriteStatus } = usePieceStore.getState()
      const result = await checkFavoriteStatus('piece-2')

      expect(result).toBe(false)
    })
  })
})