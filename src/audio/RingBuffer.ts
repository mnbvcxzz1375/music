export class RingBuffer {
  private readonly buffer: Float32Array
  private writeIndex = 0
  private readIndex = 0
  private available = 0

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('RingBuffer capacity must be a positive integer')
    }

    this.buffer = new Float32Array(capacity)
  }

  write(samples: Float32Array): number {
    if (samples.length === 0) {
      return 0
    }

    const start = samples.length > this.capacity ? samples.length - this.capacity : 0

    for (let i = start; i < samples.length; i += 1) {
      this.buffer[this.writeIndex] = samples[i]
      this.writeIndex = (this.writeIndex + 1) % this.capacity

      if (this.available === this.capacity) {
        this.readIndex = (this.readIndex + 1) % this.capacity
      } else {
        this.available += 1
      }
    }

    return samples.length - start
  }

  read(count: number): Float32Array {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Read count must be a non-negative integer')
    }

    const readable = Math.min(count, this.available)
    const output = new Float32Array(readable)

    for (let i = 0; i < readable; i += 1) {
      output[i] = this.buffer[this.readIndex]
      this.readIndex = (this.readIndex + 1) % this.capacity
    }

    this.available -= readable
    return output
  }

  peek(count: number): Float32Array {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Peek count must be a non-negative integer')
    }

    const readable = Math.min(count, this.available)
    const output = new Float32Array(readable)
    let index = this.readIndex

    for (let i = 0; i < readable; i += 1) {
      output[i] = this.buffer[index]
      index = (index + 1) % this.capacity
    }

    return output
  }

  clear(): void {
    this.writeIndex = 0
    this.readIndex = 0
    this.available = 0
  }

  getAvailableSamples(): number {
    return this.available
  }

  getCapacity(): number {
    return this.capacity
  }
}
