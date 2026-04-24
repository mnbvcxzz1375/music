import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AudioContextManager } from '../AudioContextManager'

class FakeAudioContext {
  state: AudioContextState = 'suspended'
  sampleRate: number
  audioWorklet = {
    addModule: vi.fn(async () => undefined),
  }
  destination = {} as AudioDestinationNode

  constructor(options?: AudioContextOptions) {
    this.sampleRate = options?.sampleRate ?? 48000
  }

  createMediaStreamSource = vi.fn()
  createGain = vi.fn()
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  close = vi.fn(async () => undefined)
}

describe('AudioContextManager', () => {
  beforeEach(() => {
    AudioContextManager.resetForTests()
    ;(window as unknown as { AudioContext?: typeof FakeAudioContext }).AudioContext = FakeAudioContext
  })

  it('creates and reuses a singleton audio context', async () => {
    const manager = AudioContextManager.getInstance()

    const first = await manager.getOrCreateContext(44100)
    const second = await manager.getOrCreateContext()

    expect(first).toBe(second)
    expect(first.sampleRate).toBe(44100)
    expect(manager.getSampleRate()).toBe(44100)
  })

  it('resumes suspended context when ensureRunning is called', async () => {
    const manager = AudioContextManager.getInstance()
    const context = await manager.getOrCreateContext()

    expect(context.state).toBe('suspended')

    await manager.ensureRunning()

    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(context.state).toBe('running')
  })
})
