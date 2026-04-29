import type { ConversionResult } from '../../../services/conversion/types';
import type { OCREngine, OCROptions } from './OCREngine';

const defaultMusicXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Mock OCR</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

export class MockOCREngine implements OCREngine {
  readonly name = 'MockOCR';

  constructor(
    private readonly result: ConversionResult = {
      generatedXml: defaultMusicXml,
      confidence: 1,
      engineName: 'MockOCR',
      detectedElements: [],
    },
    private readonly available = true,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async processImage(input: Buffer, mimeType: string, options?: OCROptions): Promise<ConversionResult> {
    void input;
    void mimeType;
    void options;
    return { ...this.result, engineName: this.name };
  }
}
