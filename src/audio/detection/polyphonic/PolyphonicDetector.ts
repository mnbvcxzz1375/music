import { create } from 'zustand';
import {
  DetectedNote,
  PolyphonicDetectionResult,
  PolyphonicConfig,
  PolyphonicState,
} from './types';

interface PolyphonicDetectorStore extends PolyphonicState {
  initialize: () => Promise<void>;
  detect: (audioBuffer: Float32Array) => PolyphonicDetectionResult;
  reset: () => void;
  updateConfig: (config: Partial<PolyphonicConfig>) => void;
  
  getNotesInRange: (minMidi: number, maxMidi: number) => DetectedNote[];
  getStrongestNotes: (count: number) => DetectedNote[];
}

const defaultConfig: PolyphonicConfig = {
  modelPath: '/models/basic-pitch',
  minConfidence: 0.5,
  minFrequency: 80,
  maxFrequency: 2000,
  onsetThreshold: 0.3,
  frameSize: 2048,
  hopSize: 512,
};

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const usePolyphonicDetectorStore = create<PolyphonicDetectorStore>()(
  (set, get) => ({
    status: 'idle',
    isInitialized: false,
    lastResult: null,
    config: defaultConfig,

    initialize: async () => {
      set({ status: 'initializing' });
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ status: 'ready', isInitialized: true });
      } catch (error) {
        set({ status: 'error' });
      }
    },

    detect: (_audioBuffer) => {
      const startTime = performance.now();
      const config = get().config;
      
      const mockNotes: DetectedNote[] = [];
      
      const numNotes = Math.floor(Math.random() * 4) + 1;
      const baseMidi = 60 + Math.floor(Math.random() * 12);
      
      for (let i = 0; i < numNotes; i++) {
        const midiNumber = baseMidi + i * (Math.random() > 0.5 ? 3 : 4);
        const frequency = midiToFrequency(midiNumber);
        
        if (frequency >= config.minFrequency && frequency <= config.maxFrequency) {
          mockNotes.push({
            midiNumber,
            frequency,
            amplitude: 0.3 + Math.random() * 0.7,
            confidence: config.minConfidence + Math.random() * 0.5,
            onsetTime: startTime,
            duration: 100 + Math.random() * 200,
          });
        }
      }
      
      const result: PolyphonicDetectionResult = {
        notes: mockNotes,
        timestamp: startTime,
        confidence: mockNotes.length > 0 
          ? mockNotes.reduce((sum, n) => sum + n.confidence, 0) / mockNotes.length 
          : 0,
        processingTime: performance.now() - startTime,
      };
      
      set({ lastResult: result, status: 'detecting' });
      
      return result;
    },

    reset: () => {
      set({
        status: 'idle',
        isInitialized: false,
        lastResult: null,
      });
    },

    updateConfig: (newConfig) => {
      set((state) => ({
        config: { ...state.config, ...newConfig },
      }));
    },

    getNotesInRange: (minMidi, maxMidi) => {
      const result = get().lastResult;
      if (!result) return [];
      return result.notes.filter(n => n.midiNumber >= minMidi && n.midiNumber <= maxMidi);
    },

    getStrongestNotes: (count) => {
      const result = get().lastResult;
      if (!result) return [];
      return [...result.notes]
        .sort((a, b) => b.amplitude - a.amplitude)
        .slice(0, count);
    },
  })
);

export class PolyphonicDetector {
  private store = usePolyphonicDetectorStore.getState();
  private onDetectionCallback?: (result: PolyphonicDetectionResult) => void;

  constructor(config?: Partial<PolyphonicConfig>) {
    if (config) {
      this.store.updateConfig(config);
    }
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  isReady(): boolean {
    return this.store.isInitialized;
  }

  detect(audioBuffer: Float32Array): PolyphonicDetectionResult {
    const result = this.store.detect(audioBuffer);
    if (this.onDetectionCallback) {
      this.onDetectionCallback(result);
    }
    return result;
  }

  onDetection(callback: (result: PolyphonicDetectionResult) => void): void {
    this.onDetectionCallback = callback;
  }

  getNotesInRange(minMidi: number, maxMidi: number): DetectedNote[] {
    return this.store.getNotesInRange(minMidi, maxMidi);
  }

  getStrongestNotes(count: number): DetectedNote[] {
    return this.store.getStrongestNotes(count);
  }

  getConfig(): PolyphonicConfig {
    return this.store.config;
  }

  updateConfig(config: Partial<PolyphonicConfig>): void {
    this.store.updateConfig(config);
  }

  reset(): void {
    this.store.reset();
  }
}

export function getPolyphonicDetector() {
  return usePolyphonicDetectorStore.getState();
}