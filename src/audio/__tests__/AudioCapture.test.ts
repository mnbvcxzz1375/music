import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AudioCapture } from '../AudioCapture'

class FakeGainNode {
  gain = { value: 1 }
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeMediaStreamSourceNode {
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeAudioWorkletNode {
  static lastInstance: FakeAudioWorkletNode | null = null

  port: {
    onmessage: ((event: MessageEvent) => void) | null
  } = {
    onmessage: null,
  }

  connect = vi.fn()
  disconnect = vi.fn()

  constructor() {
    FakeAudioWorkletNode.lastInstance = this
  }
}

describe('AudioCapture', () => {
  const trackStop = vi.fn()
  const fakeTrack = { stop: trackStop }
  const fakeStream = {
    getTracks: () => [fakeTrack],
  } as unknown as MediaStream

  const addModule = vi.fn(async () => undefined)
  const fakeSource = new FakeMediaStreamSourceNode()
  const fakeGain = new FakeGainNode()

  const fakeContext = {
    state: 'running' as AudioContextState,
    sampleRate: 48000,
    audioWorklet: { addModule },
    destination: {} as AudioDestinationNode,
    createMediaStreamSource: vi.fn(() => fakeSource),
    createGain: vi.fn(() => fakeGain),
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  }

  const fakeManager = {
    ensureRunning: vi.fn(async () => fakeContext),
    getSampleRate: vi.fn(() => fakeContext.sampleRate),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    FakeAudioWorkletNode.lastInstance = null

    ;(globalThis as unknown as { AudioWorkletNode: typeof FakeAudioWorkletNode }).AudioWorkletNode = FakeAudioWorkletNode
    ;(
      navigator as unknown as { mediaDevices: { getUserMedia: () => Promise<MediaStream> } }
    ).mediaDevices = {
      getUserMedia: vi.fn(async () => fakeStream),
    }
  })

  it('starts capture and receives worklet sample messages', async () => {
    const capture = new AudioCapture(
      { workletModuleUrl: '/mock-worklet.js', bufferSize: 4 },
      fakeManager as never,
    )

    const onSamples = vi.fn()
    capture.onSamples = onSamples

    await capture.start()

    expect(fakeManager.ensureRunning).toHaveBeenCalledTimes(1)
    expect(addModule).toHaveBeenCalledWith('/mock-worklet.js')
    expect(capture.isActive()).toBe(true)
    expect(capture.getSampleRate()).toBe(48000)

    FakeAudioWorkletNode.lastInstance?.port.onmessage?.({
      data: {
        type: 'buffer-ready',
        samples: new Float32Array([0.5, 0.25]),
      },
    } as MessageEvent)

    expect(onSamples).toHaveBeenCalledTimes(1)
    expect(Array.from(capture.readSamples(2))).toEqual([0.5, 0.25])
  })

  it('stops capture and closes media tracks', async () => {
    const capture = new AudioCapture({ workletModuleUrl: '/mock-worklet.js' }, fakeManager as never)

    await capture.start()
    capture.stop()

    expect(trackStop).toHaveBeenCalledTimes(1)
    expect(capture.isActive()).toBe(false)
    expect(capture.getBufferedSampleCount()).toBe(0)
  })
})
