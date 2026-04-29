import { ConversionResult } from '../../../services/conversion/types';
import { DetectedElement } from '../../../services/ocr/types';

export interface MockOCRResult extends ConversionResult {
  warnings: string[];
}

export class MockOCREngine {
  readonly name = 'mock-ocr';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async processImage(input: Buffer, mimeType: string): Promise<MockOCRResult> {
    const warnings = this.getInputWarnings(input, mimeType);
    const hasValidSignature = this.hasExpectedSignature(input, mimeType);
    const confidence = hasValidSignature
      ? warnings.length > 0
        ? 0.62
        : 0.91
      : 0.35;

    if (!hasValidSignature) {
      warnings.push('Input bytes do not match the declared MIME type signature.');
    }

    return {
      generatedXml: this.generateMusicXml(),
      confidence,
      engineName: this.name,
      detectedElements: this.generateDetectedElements(confidence),
      warnings,
    };
  }

  private getInputWarnings(input: Buffer, mimeType: string): string[] {
    const warnings: string[] = [];

    if (input.length < 4096) {
      warnings.push('Input is very small; OCR result may be incomplete.');
    }

    if (mimeType.startsWith('image/') && this.looksBlank(input)) {
      warnings.push('Input appears blank or low-detail; review the generated score carefully.');
    }

    return warnings;
  }

  private looksBlank(input: Buffer): boolean {
    if (input.length === 0) {
      return true;
    }

    const sampleSize = Math.min(input.length, 2048);
    const offset = Math.max(0, input.length - sampleSize);
    let sum = 0;
    let sumSquares = 0;
    const uniqueValues = new Set<number>();

    for (let i = offset; i < offset + sampleSize; i += 1) {
      const value = input[i];
      sum += value;
      sumSquares += value * value;
      uniqueValues.add(value);
    }

    const mean = sum / sampleSize;
    const variance = sumSquares / sampleSize - mean * mean;

    return uniqueValues.size < 12 || variance < 80;
  }

  private hasExpectedSignature(input: Buffer, mimeType: string): boolean {
    if (input.length < 4) {
      return false;
    }

    switch (mimeType) {
      case 'image/png':
        return input.length >= 8 && input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      case 'image/jpeg':
        return input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
      case 'image/tiff':
        return input.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00]))
          || input.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]));
      case 'image/bmp':
        return input[0] === 0x42 && input[1] === 0x4d;
      case 'application/pdf':
        return input.subarray(0, 4).toString('ascii') === '%PDF';
      default:
        return false;
    }
  }

  private generateDetectedElements(confidence: number): DetectedElement[] {
    return [
      {
        id: 'mock-clef-1',
        type: 'clef',
        position: { x: 24, y: 36, width: 18, height: 48 },
        value: 'G',
        confidence,
      },
      {
        id: 'mock-time-1',
        type: 'timeSignature',
        position: { x: 74, y: 40, width: 20, height: 42 },
        value: '4/4',
        confidence,
      },
      {
        id: 'mock-note-1',
        type: 'note',
        position: { x: 132, y: 58, width: 14, height: 28 },
        value: 'C4 quarter',
        confidence,
      },
      {
        id: 'mock-note-2',
        type: 'note',
        position: { x: 182, y: 50, width: 14, height: 28 },
        value: 'E4 quarter',
        confidence,
      },
      {
        id: 'mock-note-3',
        type: 'note',
        position: { x: 232, y: 42, width: 14, height: 28 },
        value: 'G4 quarter',
        confidence,
      },
      {
        id: 'mock-note-4',
        type: 'note',
        position: { x: 282, y: 34, width: 14, height: 28 },
        value: 'C5 quarter',
        confidence,
      },
    ];
  }

  private generateMusicXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
  }
}
