/**
 * RecordingBuffer accumulates Float32Array chunks for recording.
 * Unlike RingBuffer which overwrites, this accumulates all samples.
 */
export class RecordingBuffer {
  private chunks: Float32Array[] = [];
  private totalSamples = 0;

  append(samples: Float32Array): void {
    this.chunks.push(new Float32Array(samples));
    this.totalSamples += samples.length;
  }

  getLength(): number {
    return this.totalSamples;
  }

  getDurationSeconds(sampleRate: number): number {
    return this.totalSamples / sampleRate;
  }

  toFloat32Array(): Float32Array {
    const result = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  clear(): void {
    this.chunks = [];
    this.totalSamples = 0;
  }
}
