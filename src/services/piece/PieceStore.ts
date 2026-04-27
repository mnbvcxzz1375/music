import { create } from 'zustand';
import type { Piece, PieceFilter, OCRSession, FavoriteStatus } from './types';
import { OFFICIAL_PIECES } from './official-pieces';

const API_BASE = '/api/v1';

// Graceful API client that falls back to mock data when backend is unavailable
async function jsonFetch<T>(url: string): Promise<{ ok: boolean; data: T }> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, data: null as unknown as T };
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, data: null as unknown as T };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch {
    return { ok: false, data: null as unknown as T };
  }
}

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

export const usePieceStore = create<PieceStore>((set, get) => ({
  pieces: OFFICIAL_PIECES,
  currentPiece: null,
  favorites: [],
  loading: false,
  error: null,
  total: OFFICIAL_PIECES.length,
  page: 1,
  limit: 50,

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
      if (!response.ok) throw new Error('Network error');
      
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Not JSON');
      }
      
      const data = await response.json();

      // Merge API pieces with locally-saved pieces (OCR imports), deduping by ID
      const localPieces = get().pieces.filter(p => p.id.startsWith('ocr-'));
      const apiPieces = data.pieces || [];
      const merged = [...localPieces, ...apiPieces.filter((p: Piece) => !p.id.startsWith('ocr-'))];

      set({
        pieces: merged,
        total: merged.length,
        page: data.page || 1,
        limit: data.limit || 20,
        loading: false,
      });
    } catch {
      // Keep existing pieces on failure — don't wipe locally-saved items
      set({ loading: false });
    }
  },

  fetchPieceById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/pieces/${id}`);
      if (!response.ok) throw new Error('Network error');
      
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Not JSON');
      }
      
      const data = await response.json();
      set({ currentPiece: data, loading: false });
    } catch {
      set({ currentPiece: null, loading: false });
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
      if (!response.ok) throw new Error('Network error');
      
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Not JSON');
      }
      
      const data = await response.json();
      set((state) => ({
        pieces: [data, ...state.pieces],
        loading: false,
      }));
      return data;
    } catch {
      // Mock upload
      const reader = new FileReader();
      const piece: Piece = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const newPiece: Piece = {
            id: `user-${Date.now()}`,
            title: file.name.replace(/\.(xml|musicxml|mxl)$/i, ''),
            composer: '用户导入',
            difficulty: 3,
            instrumentTypes: ['piano'],
            genres: ['classical'],
            durationSeconds: 120,
            musicXmlUrl: '',
            tags: [],
            isPremium: false,
            isOfficial: false,
            playCount: 0,
            favoriteCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          resolve(newPiece);
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });

      set((state) => ({
        pieces: [piece, ...state.pieces],
        loading: false,
      }));
      return piece;
    }
  },

  deletePiece: async (id) => {
    try {
      const result = await jsonFetch<void>(`${API_BASE}/pieces/${id}`);
      if (result.ok) {
        set((state) => ({
          pieces: state.pieces.filter((p) => p.id !== id),
          currentPiece: state.currentPiece?.id === id ? null : state.currentPiece,
        }));
        return;
      }
    } catch { /* ignore */ }

    set((state) => ({
      pieces: state.pieces.filter((p) => p.id !== id),
    }));
  },

  toggleFavorite: async (pieceId) => {
    try {
      const { favorites } = get();
      const isFavorite = favorites.some((f) => f.pieceId === pieceId);

      const result = await jsonFetch<void>(`${API_BASE}/pieces/${pieceId}/favorite`);

      if (result.ok) {
        if (isFavorite) {
          set({ favorites: favorites.filter((f) => f.pieceId !== pieceId) });
        } else {
          set({ favorites: [...favorites, { pieceId, isFavorite: true, addedAt: new Date() }] });
        }
        return;
      }
    } catch { /* ignore */ }

    // Toggle locally
    const { favorites } = get();
    const isFavorite = favorites.some((f) => f.pieceId === pieceId);
    set({
      favorites: isFavorite
        ? favorites.filter((f) => f.pieceId !== pieceId)
        : [...favorites, { pieceId, isFavorite: true, addedAt: new Date() }],
    });
  },

  checkFavoriteStatus: async (pieceId) => {
    const { favorites } = get();
    return favorites.some((f) => f.pieceId === pieceId);
  },

  startOCRSession: async (imageFile) => {
    set({ loading: true, error: null });
    try {
      const result = await jsonFetch<OCRSession>(`${API_BASE}/pieces/ocr`);
      if (result.ok) {
        set({ loading: false });
        return result.data;
      }
    } catch { /* ignore */ }

    // Mock OCR session
    const session: OCRSession = {
      id: `ocr-${Date.now()}`,
      imageUrl: URL.createObjectURL(imageFile),
      status: 'processing',
      confidence: 0,
      userId: 'mock-user',
      errors: [],
      createdAt: new Date(),
    };
    set({ loading: false });
    return session;
  },

  getOCRSession: async (sessionId) => {
    try {
      const result = await jsonFetch<OCRSession>(`${API_BASE}/pieces/ocr/${sessionId}`);
      if (result.ok) return result.data;
    } catch { /* ignore */ }
    throw new Error('获取OCR会话失败');
  },

  submitOCRCorrections: async (sessionId, _corrections) => {
    set({ loading: true, error: null });
    try {
      const result = await jsonFetch<Piece>(`${API_BASE}/pieces/ocr/${sessionId}/correct`);
      if (result.ok) {
        set((state) => ({
          pieces: [result.data, ...state.pieces],
          loading: false,
        }));
        return result.data;
      }
    } catch { /* ignore */ }
    throw new Error('提交修正失败');
  },

  completeOCRSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const result = await jsonFetch<Piece>(`${API_BASE}/pieces/ocr/${sessionId}/complete`);
      if (result.ok) {
        set((state) => ({
          pieces: [result.data, ...state.pieces],
          loading: false,
        }));
        return result.data;
      }
    } catch { /* ignore */ }
    throw new Error('完成OCR失败');
  },

  rejectOCRSession: async (sessionId) => {
    try {
      const result = await jsonFetch<void>(`${API_BASE}/pieces/ocr/${sessionId}/reject`);
      if (result.ok) return;
    } catch { /* ignore */ }
    // No-op in mock mode
  },
}));
