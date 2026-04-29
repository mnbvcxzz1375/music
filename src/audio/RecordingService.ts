import { RecordingBuffer } from './RecordingBuffer';
import { encodeWav } from './WavEncoder';

/**
 * RecordingService manages browser audio recording.
 * Uses ScriptProcessorNode to capture raw PCM samples and encodes to WAV.
 * Separate from AudioCapture (practice mode) to avoid interference.
 */
export class RecordingService {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private recordingBuffer: RecordingBuffer | null = null;
  private recording = false;
  private sampleRate = 44100;

  async startRecording(): Promise<void> {
    if (this.recording) throw new Error('已在录音中');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.recordingBuffer = new RecordingBuffer();

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (this.recording && this.recordingBuffer) {
          this.recordingBuffer.append(e.inputBuffer.getChannelData(0));
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.recording = true;
    } catch (error) {
      this.cleanup();
      throw new Error('无法访问麦克风，请检查浏览器权限设置');
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.recording || !this.recordingBuffer) {
      throw new Error('未在录音');
    }

    this.recording = false;

    const samples = this.recordingBuffer.toFloat32Array();
    const blob = encodeWav(samples, this.sampleRate);

    this.cleanup();

    return blob;
  }

  isRecording(): boolean {
    return this.recording;
  }

  getDuration(): number {
    if (!this.recording || !this.recordingBuffer) return 0;
    return this.recordingBuffer.getDurationSeconds(this.sampleRate);
  }

  private cleanup(): void {
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();

    this.recordingBuffer?.clear();
    this.recordingBuffer = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.stream = null;
  }

  /**
   * Validate a WAV file for upload.
   */
  static validateWavFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['audio/wav', 'audio/wave', 'audio/x-wav'];
    const isWav = allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.wav');
    if (!isWav) {
      return { valid: false, error: '仅支持 WAV 格式音频文件' };
    }
    if (file.size > 50 * 1024 * 1024) {
      return { valid: false, error: '文件超过 50MB 限制' };
    }
    if (file.size < 100) {
      return { valid: false, error: '文件过小，不是有效的音频文件' };
    }
    return { valid: true };
  }

  /**
   * Check if audio samples contain meaningful content (not silence).
   */
  static checkAudioLevel(samples: Float32Array): { hasContent: boolean; rms: number } {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    return { hasContent: rms > 0.01, rms };
  }
}
