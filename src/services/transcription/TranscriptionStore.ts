import { create } from 'zustand';
import type { Piece } from '@/services/piece/types';
import { usePieceStore } from '@/services/piece';
import type { ConversionJob } from '@/services/conversion/types';

export type TranscriptionStatus = 'idle' | 'recording' | 'uploading' | 'processing' | 'reviewing' | 'completed' | 'error';

export interface TranscriptionResult {
  jobId: string;
  generatedXml: string;
  confidence: number;
  engineName: string;
  warnings: string[];
}

interface TranscriptionState {
  status: TranscriptionStatus;
  result: TranscriptionResult | null;
  error: string | null;
  recordingBlob: Blob | null;

  // Recording actions
  setRecordingBlob: (blob: Blob) => void;
  startRecording: () => void;

  // Upload and processing
  uploadAudio: (file: File) => Promise<void>;
  submitRecording: () => Promise<void>;

  // Job polling
  pollJobStatus: (jobId: string) => Promise<void>;

  // Review actions
  exportXml: () => string | null;
  saveToLibrary: () => Promise<void>;
  reset: () => void;
}

const pollInterval = 1500;
const maxPollAttempts = 120; // 3 minutes max

async function submitTranscriptionJob(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/v1/conversions/transcription', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || '转谱请求失败');
  }

  const data = await response.json();
  return data.jobId;
}

async function fetchJobStatus(jobId: string): Promise<ConversionJob> {
  const response = await fetch(`/api/v1/conversions/${jobId}`);
  if (!response.ok) throw new Error('获取转谱状态失败');
  const data = await response.json();
  return data.job;
}

export const useTranscriptionStore = create<TranscriptionState>()((set, get) => ({
  status: 'idle',
  result: null,
  error: null,
  recordingBlob: null,

  setRecordingBlob: (blob) => {
    set({ recordingBlob: blob, status: 'idle', error: null });
  },

  startRecording: () => {
    set({ status: 'recording', error: null, result: null });
  },

  uploadAudio: async (file) => {
    set({ status: 'uploading', error: null });

    // Validate WAV
    const allowedTypes = ['audio/wav', 'audio/wave', 'audio/x-wav'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.wav')) {
      set({ status: 'error', error: '仅支持 WAV 格式音频文件' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      set({ status: 'error', error: '文件超过 50MB 限制' });
      return;
    }

    try {
      set({ status: 'processing' });
      const jobId = await submitTranscriptionJob(file);
      if (jobId) {
        await get().pollJobStatus(jobId);
      }
    } catch (error) {
      set({ status: 'error', error: (error as Error).message });
    }
  },

  submitRecording: async () => {
    const blob = get().recordingBlob;
    if (!blob) {
      set({ status: 'error', error: '没有录音数据' });
      return;
    }

    const file = new File([blob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
    await get().uploadAudio(file);
  },

  pollJobStatus: async (jobId) => {
    for (let i = 0; i < maxPollAttempts; i++) {
      try {
        const job = await fetchJobStatus(jobId);

        if (job.status === 'review_ready' || job.status === 'completed') {
          set({
            status: 'reviewing',
            result: {
              jobId,
              generatedXml: job.result?.generatedXml || '',
              confidence: job.result?.confidence ?? 0.7,
              engineName: job.result?.engineName || 'unknown',
              warnings: job.warnings || [],
            },
          });
          return;
        }

        if (job.status === 'error') {
          set({ status: 'error', error: job.error?.message || '转谱处理失败' });
          return;
        }

        // Still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch {
        set({ status: 'error', error: '获取转谱状态失败' });
        return;
      }
    }

    set({ status: 'error', error: '转谱处理超时' });
  },

  exportXml: () => {
    const result = get().result;
    const status = get().status;
    if (!result || (status !== 'reviewing' && status !== 'completed')) return null;
    return result.generatedXml;
  },

  saveToLibrary: async () => {
    const result = get().result;
    const xml = get().exportXml();
    if (!result || !xml) return;

    const blob = new Blob([xml], { type: 'application/xml' });
    const blobUrl = URL.createObjectURL(blob);

    const newPiece: Piece = {
      id: `transcription-${Date.now()}`,
      title: `录音转谱 (${new Date().toLocaleDateString()})`,
      composer: '钢琴转谱',
      difficulty: 3,
      instrumentTypes: ['piano'],
      genres: ['classical'],
      durationSeconds: 120,
      musicXmlUrl: blobUrl,
      tags: ['transcription', 'piano'],
      isPremium: false,
      isOfficial: false,
      playCount: 0,
      favoriteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Try backend save
    try {
      const formData = new FormData();
      formData.append('file', new File([xml], `${newPiece.title}.musicxml`, { type: 'application/xml' }));
      formData.append('title', newPiece.title);

      const response = await fetch('/api/v1/pieces', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        if (data.url || data.piece?.musicXmlUrl) {
          newPiece.musicXmlUrl = data.url || data.piece.musicXmlUrl;
        }
      }
    } catch {
      console.warn('Backend save failed, using blob URL fallback');
    }

    usePieceStore.setState((state) => ({
      pieces: [newPiece, ...state.pieces],
      total: state.total + 1,
    }));

    set({ status: 'completed' });
  },

  reset: () => {
    set({ status: 'idle', result: null, error: null, recordingBlob: null });
  },
}));
