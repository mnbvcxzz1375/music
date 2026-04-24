import { create } from 'zustand';
import type { Piece, PieceFilter, PieceListResponse, OCRSession, FavoriteStatus } from './types';

interface PieceStore {
  pieces: Piece[];
  currentPiece: Piece | null;
  favorites: FavoriteStatus[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;

  fetchPieces: (filter: PieceFilter) => Promise<void>;
  fetchPieceById: (id: string) => Promise<void>;
  uploadPiece: (file: File) => Promise<Piece>;
  deletePiece: (id: string) => Promise<void>;
  toggleFavorite: (pieceId: string) => Promise<void>;
  checkFavoriteStatus: (pieceId: string) => Promise<boolean>;
  startOCRSession: (imageFile: File) => Promise<OCRSession>;
  getOCRSession: (sessionId: string) => Promise<OCRSession>;
  submitOCRCorrections: (sessionId: string, corrections: Record<string, unknown>) => Promise<Piece>;
  completeOCRSession: (sessionId: string) => Promise<Piece>;
  rejectOCRSession: (sessionId: string) => Promise<void>;
}

const API_BASE = '/api/v1';

export const usePieceStore = create<PieceStore>((set, get) => ({
  pieces: [],
  currentPiece: null,
  favorites: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,

  fetchPieces: async (filter) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filter.instrument) params.set('instrument', filter.instrument);
      if (filter.genre) params.set('genre', filter.genre);
      if (filter.difficultyMin) params.set('difficultyMin', String(filter.difficultyMin));
      if (filter.difficultyMax) params.set('difficultyMax', String(filter.difficultyMax));
      if (filter.isOfficial) params.set('isOfficial', 'true');
      if (filter.isPremium) params.set('isPremium', 'true');
      if (filter.search) params.set('search', filter.search);
      if (filter.sortBy) params.set('sortBy', filter.sortBy);
      if (filter.sortOrder) params.set('sortOrder', filter.sortOrder);
      if (filter.page) params.set('page', String(filter.page));
      if (filter.limit) params.set('limit', String(filter.limit));

      const response = await fetch(`${API_BASE}/pieces?${params}`);
      if (!response.ok) throw new Error('获取曲目列表失败');

      const data: PieceListResponse = await response.json();
      set({
        pieces: data.pieces,
        total: data.total,
        page: data.page,
        limit: data.limit,
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  fetchPieceById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/pieces/${id}`);
      if (!response.ok) throw new Error('获取曲目详情失败');

      const piece: Piece = await response.json();
      set({ currentPiece: piece, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  uploadPiece: async (file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/pieces`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      const piece: Piece = await response.json();
      set((state) => ({
        pieces: [piece, ...state.pieces],
        loading: false,
      }));
      return piece;
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },

  deletePiece: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/pieces/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      set((state) => ({
        pieces: state.pieces.filter((p) => p.id !== id),
        currentPiece: state.currentPiece?.id === id ? null : state.currentPiece,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  toggleFavorite: async (pieceId) => {
    try {
      const { favorites } = get();
      const isFavorite = favorites.some((f) => f.pieceId === pieceId);

      const response = await fetch(`${API_BASE}/pieces/${pieceId}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });

      if (!response.ok) throw new Error('操作失败');

      set((state) => ({
        favorites: isFavorite
          ? state.favorites.filter((f) => f.pieceId !== pieceId)
          : [...state.favorites, { pieceId, isFavorite: true, addedAt: new Date() }],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  checkFavoriteStatus: async (pieceId) => {
    const { favorites } = get();
    return favorites.some((f) => f.pieceId === pieceId);
  },

  startOCRSession: async (imageFile) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${API_BASE}/pieces/ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('OCR启动失败');

      const session: OCRSession = await response.json();
      set({ loading: false });
      return session;
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },

  getOCRSession: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE}/pieces/ocr/${sessionId}`);
      if (!response.ok) throw new Error('获取OCR会话失败');

      return await response.json();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  submitOCRCorrections: async (sessionId, corrections) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/pieces/ocr/${sessionId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corrections),
      });

      if (!response.ok) throw new Error('提交修正失败');

      const piece: Piece = await response.json();
      set((state) => ({
        pieces: [piece, ...state.pieces],
        loading: false,
      }));
      return piece;
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },

  completeOCRSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/pieces/ocr/${sessionId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('完成OCR失败');

      const piece: Piece = await response.json();
      set((state) => ({
        pieces: [piece, ...state.pieces],
        loading: false,
      }));
      return piece;
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },

  rejectOCRSession: async (sessionId) => {
    try {
      await fetch(`${API_BASE}/pieces/ocr/${sessionId}/reject`, {
        method: 'POST',
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));