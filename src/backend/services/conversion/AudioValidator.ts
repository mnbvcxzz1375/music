/**
 * Validates WAV audio buffers and computes audio levels.
 */

export interface WavValidationResult {
  valid: boolean;
  error?: string;
  durationSeconds?: number;
  sampleRate?: number;
}

/**
 * Validate a WAV buffer: check RIFF/WAVE header, duration, format.
 */
export function validateWavBuffer(buffer: Buffer): WavValidationResult {
  if (buffer.length < 44) {
    return { valid: false, error: 'WAV 文件过小' };
  }

  // Check RIFF header
  const riff = buffer.toString('ascii', 0, 4);
  if (riff !== 'RIFF') {
    return { valid: false, error: '无效的 WAV 文件格式: 缺少 RIFF 头' };
  }

  // Check WAVE marker
  const wave = buffer.toString('ascii', 8, 12);
  if (wave !== 'WAVE') {
    return { valid: false, error: '无效的 WAV 文件格式: 缺少 WAVE 标记' };
  }

  // Extract format info
  const numChannels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  if (numChannels < 1 || numChannels > 2) {
    return { valid: false, error: `不支持的通道数: ${numChannels}` };
  }

  if (bitsPerSample !== 16 && bitsPerSample !== 8) {
    return { valid: false, error: `不支持的位深度: ${bitsPerSample}` };
  }

  // Find data chunk size
  const dataSize = buffer.readUInt32LE(40);
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = dataSize / (numChannels * bytesPerSample);
  const durationSeconds = totalSamples / sampleRate;

  if (durationSeconds < 2) {
    return { valid: false, error: `录音时长不足 2 秒 (${durationSeconds.toFixed(1)}s)`, durationSeconds };
  }

  return { valid: true, durationSeconds, sampleRate };
}

/**
 * Compute RMS amplitude of first N PCM samples from WAV data section.
 */
export function computeRmsAmplitude(buffer: Buffer, sampleCount = 1000): number {
  const dataStart = 44; // WAV data starts after 44-byte header
  const available = Math.min(sampleCount, Math.floor((buffer.length - dataStart) / 2));

  if (available <= 0) return 0;

  let sum = 0;
  for (let i = 0; i < available; i++) {
    const sample = buffer.readInt16LE(dataStart + i * 2) / 32768;
    sum += sample * sample;
  }

  return Math.sqrt(sum / available);
}
