import type { ConversionResult } from '../../../services/conversion/types';
import type { OCREngine, OCROptions } from './OCREngine';
import { convertHumdrumToMusicXml } from './HumdrumConverter';

type RemoteResponse = {
  kern?: unknown;
  humdrum?: unknown;
  text?: unknown;
  result?: unknown;
};

export class GOTOCR2Engine implements OCREngine {
  readonly name = 'GOT-OCR2.0';

  async isAvailable(): Promise<boolean> {
    return Boolean(this.endpoint());
  }

  async processImage(input: Buffer, mimeType: string, options?: OCROptions): Promise<ConversionResult> {
    const endpoint = this.endpoint();
    if (!endpoint) {
      throw new Error('GOT-OCR2.0 remote OCR is unavailable. Set GOT_OCR_URL to enable the HTTP adapter.');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.headers(mimeType, options),
        body: input,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`remote endpoint returned ${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`);
      }

      const kern = await this.extractHumdrum(response);
      const converted = convertHumdrumToMusicXml(kern);
      const confidence = Math.max(0.1, 0.75 - converted.warnings.length * 0.03);

      return {
        generatedXml: converted.generatedXml,
        confidence,
        engineName: this.name,
      };
    } catch (error) {
      throw new Error(`GOT-OCR2.0 OCR failed: ${(error as Error).message}`);
    }
  }

  private endpoint(): string | undefined {
    return process.env.GOT_OCR_URL?.trim() || undefined;
  }

  private headers(mimeType: string, options?: OCROptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      Accept: 'text/plain, application/json',
    };

    if (options?.language) headers['X-OCR-Language'] = options.language;
    if (options?.maxPages !== undefined) headers['X-OCR-Max-Pages'] = String(options.maxPages);

    return headers;
  }

  private async extractHumdrum(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await response.json() as RemoteResponse;
      const value = body.kern ?? body.humdrum ?? body.text ?? body.result;
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('remote JSON response did not contain **kern text in kern, humdrum, text, or result');
      }
      return value;
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error('remote endpoint returned an empty **kern response');
    }
    return text;
  }
}
