export type PracticeModeType = 
  | 'normal'
  | 'slow'
  | 'segment'
  | 'loop'
  | 'challenge'
  | 'free';

export interface PracticeMode {
  id: PracticeModeType;
  name: string;
  description: string;
  icon: string;
  settings: PracticeModeSettings;
}

export interface PracticeModeSettings {
  tempoMultiplier: number;
  repeatCount: number;
  segmentStart?: number;
  segmentEnd?: number;
  loopEnabled: boolean;
  challengeLevel?: number;
  autoAdvance: boolean;
  showHints: boolean;
}

export interface PracticeModeState {
  currentMode: PracticeModeType;
  settings: PracticeModeSettings;
  availableModes: PracticeMode[];
}

export interface SegmentDefinition {
  startMeasure: number;
  endMeasure: number;
  repeatCount: number;
}

export interface LoopDefinition {
  startMeasure: number;
  endMeasure: number;
  iterations: number;
}

export interface ChallengeConfig {
  level: number;
  maxErrors: number;
  timeLimit?: number;
  requiredAccuracy: number;
}