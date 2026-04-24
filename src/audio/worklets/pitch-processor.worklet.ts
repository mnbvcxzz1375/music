class PitchProcessor extends AudioWorkletProcessor {
  private readonly frameBuffer: Float32Array
  private writeIndex = 0

  constructor(options?: AudioWorkletNodeOptions) {
    super()

    const configuredSize = options?.processorOptions?.bufferSize
    const bufferSize = typeof configuredSize === 'number' && configuredSize > 0
      ? Math.floor(configuredSize)
      : 2048

    this.frameBuffer = new Float32Array(bufferSize)
  }

  process(inputs: Float32Array[][]): boolean {
    const inputChannels = inputs[0]

    if (inputChannels === undefined || inputChannels.length === 0) {
      return true
    }

    const channel = inputChannels[0]

    for (let i = 0; i < channel.length; i += 1) {
      this.frameBuffer[this.writeIndex] = channel[i]
      this.writeIndex += 1

      if (this.writeIndex === this.frameBuffer.length) {
        const samples = this.frameBuffer.slice()
        this.port.postMessage({ type: 'buffer-ready', samples }, [samples.buffer])
        this.writeIndex = 0
      }
    }

    return true
  }
}

registerProcessor('pitch-processor', PitchProcessor)
