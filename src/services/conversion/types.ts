export type ConversionMode = 'ocr' | 'transcription';
export type ConversionJobStatus = 'queued' | 'processing' | 'review_ready' | 'completed' | 'error';
export type ConversionSource = 'image' | 'pdf' | 'audio';

export interface ConversionJob {
  id: string;
  mode: ConversionMode;
  source: ConversionSource;
  status: ConversionJobStatus;
  inputFileName: string;
  inputMimeType: string;
  result?: ConversionResult;
  error?: ConversionError;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversionResult {
  generatedXml: string;
  confidence: number;
  engineName: string;
  detectedElements?: import('../ocr/types').DetectedElement[];
}

export interface ConversionError {
  code: string;
  message: string;
  details?: string;
}

export interface ConversionJobResponse {
  jobId: string;
  status: ConversionJobStatus;
}

export interface ConversionStatusResponse {
  job: ConversionJob;
}
