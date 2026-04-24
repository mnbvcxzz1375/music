import { AudioContextManager } from './AudioContextManager'
import { RingBuffer } from './RingBuffer'
import type {
  AudioCaptureConfig,
  SamplesCallback,
  WorkletMessage,
} from './types'

const DEFAULT_BUFFER_SIZE = 2048
const DEFAULT_RING_BUFFER_CAPACITY = 16384

export class AudioCapture {
  private readonly bufferSize: number
  private readonly channelCount: number
  private readonly moduleUrl: string
  private readonly contextManager: AudioContextManager
  private readonly ringBuffer: RingBuffer

  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private sinkNode: GainNode | null = null
  private isCapturing = false

  onSamples: SamplesCallback | null = null

  constructor(config: AudioCaptureConfig = {}, contextManager = AudioContextManager.getInstance()) {
    this.bufferSize = config.bufferSize ?? DEFAULT_BUFFER_SIZE
    this.channelCount = config.channelCount ?? 1
    this.moduleUrl =
      config.workletModuleUrl ?? new URL('./worklets/pitch-processor.worklet.ts', import.meta.url).toString()
    this.contextManager = contextManager
    this.ringBuffer = new RingBuffer(Math.max(this.bufferSize * 4, DEFAULT_RING_BUFFER_CAPACITY))
  }

  async start(): Promise<void> {
    if (this.isCapturing) {
      return
    }

    if (navigator.mediaDevices?.getUserMedia === undefined) {
      throw new Error('Microphone capture is not supported in this browser')
    }

    const context = await this.contextManager.ensureRunning()

    await context.audioWorklet.addModule(this.moduleUrl)

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: this.channelCount,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    })

    this.sourceNode = context.createMediaStreamSource(this.mediaStream)
    this.workletNode = new AudioWorkletNode(context as unknown as BaseAudioContext, 'pitch-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: this.channelCount,
      channelCountMode: 'explicit',
      processorOptions: {
        bufferSize: this.bufferSize,
      },
    })
    this.sinkNode = context.createGain()
    this.sinkNode.gain.value = 0

    this.sourceNode.connect(this.workletNode)
    this.workletNode.connect(this.sinkNode)
    this.sinkNode.connect(context.destination)

    this.workletNode.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      this.handleWorkletMessage(event.data)
    }

    this.isCapturing = true
  }

  stop(): void {
    if (!this.isCapturing) {
      return
    }

    this.workletNode?.disconnect()
    this.sourceNode?.disconnect()
    this.sinkNode?.disconnect()

    this.workletNode = null
    this.sourceNode = null
    this.sinkNode = null

    if (this.mediaStream !== null) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop()
      }
      this.mediaStream = null
    }

    this.ringBuffer.clear()
    this.isCapturing = false
  }

  getSampleRate(): number {
    const sampleRate = this.contextManager.getSampleRate()
    if (sampleRate === null) {
      throw new Error('Audio context is not initialized')
    }

    return sampleRate
  }

  readSamples(count: number): Float32Array {
    return this.ringBuffer.read(count)
  }

  getBufferedSampleCount(): number {
    return this.ringBuffer.getAvailableSamples()
  }

  isActive(): boolean {
    return this.isCapturing
  }

  private handleWorkletMessage(message: WorkletMessage): void {
    if (message.type === 'error') {
      throw new Error(message.message)
    }

    this.ringBuffer.write(message.samples)
    this.onSamples?.(message.samples)
  }
}

export type { AudioCaptureConfig } from './types'
