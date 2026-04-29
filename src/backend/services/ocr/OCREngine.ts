import type { ConversionResult } from '../../../services/conversion/types';

export interface OCREngine {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  processImage(input: Buffer, mimeType: string, options?: OCROptions): Promise<ConversionResult>;
}

export interface OCROptions {
  maxPages?: number;
  language?: string;
}
