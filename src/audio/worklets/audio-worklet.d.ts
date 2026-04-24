declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort

  constructor(options?: {
    processorOptions?: Record<string, unknown>
  })

  abstract process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean
}

declare function registerProcessor(name: string, processorCtor: new (options?: {
  processorOptions?: Record<string, unknown>
}) => AudioWorkletProcessor): void
