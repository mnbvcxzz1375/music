export function generateSineWave(
  frequency: number,
  sampleRate: number,
  sampleCount: number,
  amplitude = 0.8,
): Float32Array {
  const buffer = new Float32Array(sampleCount)

  for (let i = 0; i < sampleCount; i += 1) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }

  return buffer
}

export function generateSilence(sampleCount: number): Float32Array {
  return new Float32Array(sampleCount)
}

export function generateWhiteNoise(sampleCount: number, amplitude = 0.03): Float32Array {
  const buffer = new Float32Array(sampleCount)

  for (let i = 0; i < sampleCount; i += 1) {
    buffer[i] = (Math.random() * 2 - 1) * amplitude
  }

  return buffer
}
