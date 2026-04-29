import type { ConversionResult } from '../../../services/conversion/types';

/**
 * Adapter for bytedance/piano_transcription external worker.
 * Calls a remote Python service that accepts WAV audio and returns MIDI events.
 * Default: mock mode unless PIANO_TRANSCRIPTION_URL is configured.
 */
export class PianoTranscriptionEngine {
  readonly name = 'piano-transcription';
  private workerUrl: string | undefined;

  constructor() {
    this.workerUrl = process.env.PIANO_TRANSCRIPTION_URL;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.workerUrl) return false;
    try {
      const response = await fetch(`${this.workerUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  async processAudio(input: Buffer): Promise<ConversionResult> {
    if (!this.workerUrl) {
      throw new Error('PIANO_TRANSCRIPTION_URL 未配置');
    }

    const formData = new FormData();
    formData.append('file', new Blob([input], { type: 'audio/wav' }), 'recording.wav');

    const response = await fetch(`${this.workerUrl}/transcribe`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120000), // 2 min timeout for long audio
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '转谱服务请求失败' }));
      throw new Error(error.message || '转谱服务返回错误');
    }

    const data = await response.json();

    // Worker returns MIDI events, we convert to MusicXML via MidiToScore + MusicXMLGenerator
    const { midiToScore } = await import('../../../services/transcription/MidiToScore');
    const { generateMusicXml } = await import('../../../services/transcription/MusicXMLGenerator');

    const { score, warnings } = midiToScore(data.midiEvents || [], data.bpm || 120);
    const generatedXml = generateMusicXml(score, '钢琴转谱');

    return {
      generatedXml,
      confidence: data.confidence ?? 0.7,
      engineName: this.name,
    };
  }
}
