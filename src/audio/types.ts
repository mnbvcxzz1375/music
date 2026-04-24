export interface AudioCaptureConfig {
  bufferSize?: number
  channelCount?: number
  workletModuleUrl?: string
}

export interface AudioContextLike {
  state: AudioContextState
  sampleRate: number
  audioWorklet: AudioWorklet
  destination: AudioDestinationNode
  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode
  createGain(): GainNode
  resume(): Promise<void>
  close(): Promise<void>
}

export interface WorkletBufferReadyMessage {
  type: 'buffer-ready'
  samples: Float32Array
}

export interface WorkletErrorMessage {
  type: 'error'
  message: string
}

export type WorkletMessage = WorkletBufferReadyMessage | WorkletErrorMessage

export type SamplesCallback = (samples: Float32Array) => void
