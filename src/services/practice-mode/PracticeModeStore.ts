import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PracticeModeType,
  PracticeMode,
  PracticeModeSettings,
  PracticeModeState,
  SegmentDefinition,
  LoopDefinition,
  ChallengeConfig,
} from './types';

interface PracticeModeStore extends PracticeModeState {
  setMode: (mode: PracticeModeType) => void;
  updateSettings: (settings: Partial<PracticeModeSettings>) => void;
  
  setSegment: (segment: SegmentDefinition) => void;
  setLoop: (loop: LoopDefinition) => void;
  setChallenge: (challenge: ChallengeConfig) => void;
  
  getEffectiveTempo: (baseTempo: number) => number;
  shouldRepeat: (currentIteration: number) => boolean;
  isInSegment: (currentMeasure: number) => boolean;
  
  reset: () => void;
}

const defaultSettings: PracticeModeSettings = {
  tempoMultiplier: 1.0,
  repeatCount: 1,
  loopEnabled: false,
  autoAdvance: true,
  showHints: true,
};

const availableModes: PracticeMode[] = [
  {
    id: 'normal',
    name: '正常模式',
    description: '按原速度完整练习',
    icon: '🎵',
    settings: { ...defaultSettings },
  },
  {
    id: 'slow',
    name: '慢速模式',
    description: '降低速度便于学习',
    icon: '🐢',
    settings: { ...defaultSettings, tempoMultiplier: 0.5 },
  },
  {
    id: 'segment',
    name: '分段练习',
    description: '练习指定段落',
    icon: '📐',
    settings: { ...defaultSettings, segmentStart: 0, segmentEnd: 0 },
  },
  {
    id: 'loop',
    name: '循环练习',
    description: '重复练习指定段落',
    icon: '🔄',
    settings: { ...defaultSettings, loopEnabled: true, repeatCount: 3 },
  },
  {
    id: 'challenge',
    name: '挑战模式',
    description: '限制错误次数和时间',
    icon: '🏆',
    settings: { ...defaultSettings, challengeLevel: 1 },
  },
  {
    id: 'free',
    name: '自由练习',
    description: '无限制自由演奏',
    icon: '🆓',
    settings: { ...defaultSettings, autoAdvance: false, showHints: false },
  },
];

export const usePracticeModeStore = create<PracticeModeStore>()(
  persist(
    (set, get) => ({
      currentMode: 'normal',
      settings: defaultSettings,
      availableModes,

      setMode: (mode) => {
        const modeConfig = get().availableModes.find(m => m.id === mode);
        if (modeConfig) {
          set({
            currentMode: mode,
            settings: { ...defaultSettings, ...modeConfig.settings },
          });
        }
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setSegment: (segment) => {
        set((state) => ({
          currentMode: 'segment',
          settings: {
            ...state.settings,
            segmentStart: segment.startMeasure,
            segmentEnd: segment.endMeasure,
            repeatCount: segment.repeatCount,
          },
        }));
      },

      setLoop: (loop) => {
        set((state) => ({
          currentMode: 'loop',
          settings: {
            ...state.settings,
            segmentStart: loop.startMeasure,
            segmentEnd: loop.endMeasure,
            loopEnabled: true,
            repeatCount: loop.iterations,
          },
        }));
      },

      setChallenge: (challenge) => {
        set((state) => ({
          currentMode: 'challenge',
          settings: {
            ...state.settings,
            challengeLevel: challenge.level,
          },
        }));
      },

      getEffectiveTempo: (baseTempo) => {
        return Math.round(baseTempo * get().settings.tempoMultiplier);
      },

      shouldRepeat: (currentIteration) => {
        const settings = get().settings;
        if (!settings.loopEnabled) return false;
        return currentIteration < settings.repeatCount;
      },

      isInSegment: (currentMeasure) => {
        const settings = get().settings;
        if (get().currentMode !== 'segment' && get().currentMode !== 'loop') return true;
        return currentMeasure >= (settings.segmentStart || 0) && 
               currentMeasure <= (settings.segmentEnd || 999);
      },

      reset: () => {
        set({
          currentMode: 'normal',
          settings: defaultSettings,
        });
      },
    }),
    {
      name: 'practice-mode-storage',
    }
  )
);

export function getPracticeModeStore() {
  return usePracticeModeStore.getState();
}

export function getModeConfig(mode: PracticeModeType): PracticeMode | undefined {
  return availableModes.find(m => m.id === mode);
}