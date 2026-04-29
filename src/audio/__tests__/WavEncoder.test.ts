import { describe, expect, it } from 'vitest';
import { encodeWav, decodeWav } from '../WavEncoder';

describe('WavEncoder', () => {
  it('should encode samples to valid WAV blob', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const blob = encodeWav(samples, 44100);

    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2); // header + 16-bit PCM
  });

  it('should produce valid RIFF/WAVE header', async () => {
    const samples = new Float32Array(100);
    const blob = encodeWav(samples, 22050);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    // RIFF
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');

    // WAVE
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');

    // fmt
    const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
    expect(fmt).toBe('fmt ');

    // PCM format (1)
    expect(view.getUint16(20, true)).toBe(1);

    // Sample rate
    expect(view.getUint32(24, true)).toBe(22050);
  });

  it('should round-trip encode and decode', async () => {
    const original = new Float32Array([0.1, -0.2, 0.3, -0.4, 0.5]);
    const blob = encodeWav(original, 44100);
    const buffer = await blob.arrayBuffer();
    const { samples, sampleRate } = decodeWav(buffer);

    expect(sampleRate).toBe(44100);
    expect(samples.length).toBe(original.length);

    // 16-bit quantization introduces small errors
    for (let i = 0; i < original.length; i++) {
      expect(samples[i]).toBeCloseTo(original[i], 2);
    }
  });

  it('should clamp out-of-range samples', async () => {
    const samples = new Float32Array([2, -2, 0.5]);
    const blob = encodeWav(samples, 44100);
    const buffer = await blob.arrayBuffer();
    const { samples: decoded } = decodeWav(buffer);

    expect(decoded[0]).toBeCloseTo(1, 2); // clamped
    expect(decoded[1]).toBeCloseTo(-1, 2); // clamped
    expect(decoded[2]).toBeCloseTo(0.5, 2);
  });
});
