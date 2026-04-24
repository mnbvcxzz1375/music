import { getPlatformAdapter } from '@/utils/platformAdapter'
import { getPlatform } from '@/utils/platform'

export interface MobileAudioConfig {
  sampleRate: number
  latencyHint: 'interactive' | 'balanced' | 'playback'
  bufferSize: number
  enableEchoCancellation: boolean
  enableNoiseSuppression: boolean
}

const defaultConfig: MobileAudioConfig = {
  sampleRate: 44100,
  latencyHint: 'interactive',
  bufferSize: 2048,
  enableEchoCancellation: false,
  enableNoiseSuppression: false,
}

export class MobileAudioManager {
  private audioContext: AudioContext | null = null
  private config: MobileAudioConfig
  private isInitialized = false
  
  constructor(config?: Partial<MobileAudioConfig>) {
    this.config = { ...defaultConfig, ...config }
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    const adapter = getPlatformAdapter()
    const hasPermission = await adapter.requestAudioPermission()
    
    if (!hasPermission) {
      throw new Error('Audio permission denied')
    }
    
    this.audioContext = await adapter.createAudioContext()
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    
    this.isInitialized = true
  }
  
  async createAudioStream(): Promise<MediaStream> {
    const platform = getPlatform()
    
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: this.config.enableEchoCancellation,
        noiseSuppression: this.config.enableNoiseSuppression,
        sampleRate: this.config.sampleRate,
      },
    }
    
    if (platform.isMobile) {
      (constraints.audio as MediaTrackConstraints).channelCount = 1
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  }
  
  async createAudioSource(stream: MediaStream): Promise<MediaStreamAudioSourceNode> {
    if (!this.audioContext) {
      await this.initialize()
    }
    
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }
    
    return this.audioContext.createMediaStreamSource(stream)
  }
  
  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }
    return this.audioContext
  }
  
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
  
  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend()
    }
  }
  
  close(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
      this.isInitialized = false
    }
  }
  
  getLatency(): number {
    if (!this.audioContext) return 0
    
    const baseLatency = this.audioContext.baseLatency || 0
    const outputLatency = (this.audioContext as unknown as { outputLatency?: number }).outputLatency || 0
    
    return baseLatency + outputLatency
  }
  
  getSampleRate(): number {
    return this.audioContext?.sampleRate || this.config.sampleRate
  }
  
  isReady(): boolean {
    return this.isInitialized && this.audioContext?.state === 'running'
  }
  
  updateConfig(newConfig: Partial<MobileAudioConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

let defaultManager: MobileAudioManager | null = null

export function getMobileAudioManager(config?: Partial<MobileAudioConfig>): MobileAudioManager {
  if (!defaultManager) {
    defaultManager = new MobileAudioManager(config)
  }
  return defaultManager
}

export function resetMobileAudioManager(): void {
  if (defaultManager) {
    defaultManager.close()
    defaultManager = null
  }
}