import type { AudioContextLike } from './types'

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContextLike

declare global {
  interface Window {
    webkitAudioContext?: AudioContextCtor
  }
}

export class AudioContextManager {
  private static instance: AudioContextManager | null = null
  private context: AudioContextLike | null = null

  private constructor() {}

  static getInstance(): AudioContextManager {
    if (AudioContextManager.instance === null) {
      AudioContextManager.instance = new AudioContextManager()
    }

    return AudioContextManager.instance
  }

  static resetForTests(): void {
    AudioContextManager.instance = null
  }

  getContext(): AudioContextLike | null {
    return this.context
  }

  async getOrCreateContext(sampleRate?: number): Promise<AudioContextLike> {
    if (this.context !== null) {
      return this.context
    }

    const AudioContextImpl =
      window.AudioContext ?? window.webkitAudioContext

    if (AudioContextImpl === undefined) {
      throw new Error('Web Audio API is not supported in this browser')
    }

    this.context = sampleRate === undefined
      ? new AudioContextImpl()
      : new AudioContextImpl({ sampleRate })

    return this.context
  }

  async ensureRunning(): Promise<AudioContextLike> {
    const context = await this.getOrCreateContext()

    if (context.state === 'suspended') {
      await context.resume()
    }

    return context
  }

  getSampleRate(): number | null {
    return this.context?.sampleRate ?? null
  }

  async close(): Promise<void> {
    if (this.context === null) {
      return
    }

    await this.context.close()
    this.context = null
  }
}
