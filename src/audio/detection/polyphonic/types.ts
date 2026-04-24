export type PolyphonicDetectionStatus = 'idle' | 'initializing' | 'ready' | 'detecting' | 'error';

export interface DetectedNote {
  midiNumber: number;
  frequency: number;
  amplitude: number;
  confidence: number;
  onsetTime: number;
  duration: number;
}

export interface PolyphonicDetectionResult {
  notes: DetectedNote[];
  timestamp: number;
  confidence: number;
  processingTime: number;
}

export interface PolyphonicConfig {
  modelPath: string;
  minConfidence: number;
  minFrequency: number;
  maxFrequency: number;
  onsetThreshold: number;
  frameSize: number;
  hopSize: number;
}

export interface PolyphonicState {
  status: PolyphonicDetectionStatus;
  isInitialized: boolean;
  lastResult: PolyphonicDetectionResult | null;
  config: PolyphonicConfig;
}