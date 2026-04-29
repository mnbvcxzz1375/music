/**
 * Encodes Float32Array samples into a valid 16-bit PCM WAV file.
 */

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Encode Float32Array samples (-1..1) into a WAV Blob.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * numChannels * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (float32 -> int16)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decode WAV buffer to Float32Array samples.
 * Supports 16-bit PCM only.
 */
export function decodeWav(buffer: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(buffer);

  // Validate RIFF/WAVE header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('无效的 WAV 文件: 缺少 RIFF 头');

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') throw new Error('无效的 WAV 文件: 缺少 WAVE 标记');

  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const numChannels = view.getUint16(22, true);

  // Find data sub-chunk
  let dataOffset = 12;
  while (dataOffset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(dataOffset),
      view.getUint8(dataOffset + 1),
      view.getUint8(dataOffset + 2),
      view.getUint8(dataOffset + 3),
    );
    const chunkSize = view.getUint32(dataOffset + 4, true);

    if (chunkId === 'data') {
      const dataStart = dataOffset + 8;
      const bytesPerSample = bitsPerSample / 8;
      const totalSamples = chunkSize / (numChannels * bytesPerSample);
      const samples = new Float32Array(totalSamples);

      for (let i = 0; i < totalSamples; i++) {
        const offset = dataStart + i * bytesPerSample;
        if (bitsPerSample === 16) {
          samples[i] = view.getInt16(offset, true) / 32768;
        } else if (bitsPerSample === 8) {
          samples[i] = (view.getUint8(offset) - 128) / 128;
        }
      }

      return { samples, sampleRate };
    }

    dataOffset += 8 + chunkSize;
  }

  throw new Error('无效的 WAV 文件: 未找到 data 子块');
}
