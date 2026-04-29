import { describe, expect, it } from 'vitest';
import { RecordingBuffer } from '../RecordingBuffer';

describe('RecordingBuffer', () => {
  it('should start empty', () => {
    const buffer = new RecordingBuffer();
    expect(buffer.getLength()).toBe(0);
    expect(buffer.getDurationSeconds(44100)).toBe(0);
  });

  it('should append chunks and accumulate length', () => {
    const buffer = new RecordingBuffer();
    buffer.append(new Float32Array([0.1, 0.2, 0.3]));
    buffer.append(new Float32Array([0.4, 0.5]));

    expect(buffer.getLength()).toBe(5);
  });

  it('should compute duration correctly', () => {
    const buffer = new RecordingBuffer();
    buffer.append(new Float32Array(44100)); // 1 second at 44100 Hz

    expect(buffer.getDurationSeconds(44100)).toBeCloseTo(1.0, 2);
  });

  it('should concatenate chunks into single Float32Array', () => {
    const buffer = new RecordingBuffer();
    buffer.append(new Float32Array([1, 2]));
    buffer.append(new Float32Array([3, 4, 5]));

    const result = buffer.toFloat32Array();
    expect(result.length).toBe(5);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should clear all data', () => {
    const buffer = new RecordingBuffer();
    buffer.append(new Float32Array(1000));
    buffer.clear();

    expect(buffer.getLength()).toBe(0);
    expect(buffer.toFloat32Array().length).toBe(0);
  });

  it('should handle empty append gracefully', () => {
    const buffer = new RecordingBuffer();
    buffer.append(new Float32Array(0));

    expect(buffer.getLength()).toBe(0);
  });
});
