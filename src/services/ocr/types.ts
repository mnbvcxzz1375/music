export type OCRStatus = 'idle' | 'uploading' | 'processing' | 'reviewing' | 'completed' | 'error';

export interface OCRResult {
  id: string;
  originalImage: string;
  generatedXml: string;
  confidence: number;
  detectedElements: DetectedElement[];
  errors: OCRError[];
  timestamp: Date;
}

export interface DetectedElement {
  id: string;
  type: 'note' | 'rest' | 'clef' | 'keySignature' | 'timeSignature' | 'barline' | 'text';
  position: { x: number; y: number; width: number; height: number };
  value: string;
  confidence: number;
  corrected?: boolean;
  correctedValue?: string;
}

export interface OCRError {
  elementId: string;
  type: 'low_confidence' | 'ambiguous' | 'missing' | 'invalid';
  message: string;
  suggestion?: string;
}

export interface OCRConfig {
  provider: 'audiveris' | 'cloud';
  preprocessing: {
    denoise: boolean;
    deskew: boolean;
    contrastEnhance: boolean;
  };
  outputFormat: 'MusicXML' | 'XML';
}

export interface OCRCorrection {
  elementId: string;
  originalValue: string;
  correctedValue: string;
  reason?: string;
}