import { describe, expect, it } from 'vitest'

import { RingBuffer } from '../RingBuffer'

describe('RingBuffer', () => {
  const toRoundedArray = (samples: Float32Array): number[] =>
    Array.from(samples, (sample) => Number(sample.toFixed(6)))

  it('writes and reads samples in FIFO order', () => {
    const buffer = new RingBuffer(8)

    buffer.write(new Float32Array([0.1, 0.2, 0.3]))

    expect(buffer.getAvailableSamples()).toBe(3)
    expect(toRoundedArray(buffer.read(2))).toEqual([0.1, 0.2])
    expect(buffer.getAvailableSamples()).toBe(1)
    expect(toRoundedArray(buffer.read(10))).toEqual([0.3])
  })

  it('overwrites oldest samples when capacity is exceeded', () => {
    const buffer = new RingBuffer(4)

    buffer.write(new Float32Array([1, 2, 3, 4, 5, 6]))

    expect(buffer.getAvailableSamples()).toBe(4)
    expect(toRoundedArray(buffer.read(4))).toEqual([3, 4, 5, 6])
  })

  it('peeks without consuming data', () => {
    const buffer = new RingBuffer(4)

    buffer.write(new Float32Array([10, 20, 30]))

    expect(toRoundedArray(buffer.peek(2))).toEqual([10, 20])
    expect(buffer.getAvailableSamples()).toBe(3)
    expect(toRoundedArray(buffer.read(3))).toEqual([10, 20, 30])
  })
})
