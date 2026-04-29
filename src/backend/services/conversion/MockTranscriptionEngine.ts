import { generateMinimalMusicXml } from '../../../../test/fixtures/conversion';
import type { ConversionResult } from '../../../../services/conversion/types';

/**
 * Mock transcription engine for testing.
 * Returns a deterministic MusicXML draft without calling any real model.
 */
export class MockTranscriptionEngine {
  readonly name = 'mock-transcription';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async processAudio(_input: Buffer): Promise<ConversionResult> {
    return {
      generatedXml: generateMinimalMusicXml(),
      confidence: 0.75,
      engineName: this.name,
    };
  }
}
