/**
 * Test fixture helpers for WAV/MIDI/MusicXML generation.
 * Used by OCR and transcription tests (Tasks 4, 5, 8, 9, 10, 11).
 */

/**
 * Generate a valid minimal WAV buffer with a sine wave tone.
 * Produces a standard 16-bit PCM WAV file.
 */
export function generateWavBuffer(
  durationSeconds: number,
  sampleRate = 44100,
  frequency = 440,
): Buffer {
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)

  // WAV header is 44 bytes
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4) // chunk size
  buffer.write('WAVE', 8)

  // fmt sub-chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // sub-chunk size (PCM = 16)
  buffer.writeUInt16LE(1, 20) // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data sub-chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Write PCM samples (sine wave)
  const amplitude = 0.5 * 32767 // 50% amplitude
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(
      amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate),
    )
    buffer.writeInt16LE(sample, 44 + i * 2)
  }

  return buffer
}

/**
 * Generate a silent WAV buffer (near-zero amplitude).
 * Useful for testing silence detection.
 */
export function generateSilentWavBuffer(
  durationSeconds: number,
  sampleRate = 44100,
): Buffer {
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)

  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt sub-chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data sub-chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Write near-zero samples (just 1 LSB to avoid true zero edge cases)
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(i % 2 === 0 ? 1 : -1, 44 + i * 2)
  }

  return buffer
}

/**
 * MIDI note event interface for test data.
 */
export interface MidiNoteEvent {
  note: number
  velocity: number
  startTime: number
  endTime: number
}

/**
 * Generate MIDI events for a C major scale.
 * C4(60) through C5(72), quarter notes at 120 BPM.
 */
export function generateCMajorScaleMidiEvents(): MidiNoteEvent[] {
  const notes = [60, 62, 64, 65, 67, 69, 71, 72] // C4 to C5
  const velocity = 80
  const quarterNoteDuration = 0.5 // 120 BPM = 0.5s per quarter

  return notes.map((note, i) => ({
    note,
    velocity,
    startTime: i * quarterNoteDuration,
    endTime: (i + 1) * quarterNoteDuration,
  }))
}

/**
 * Generate a minimal valid MusicXML string.
 * Returns a single-measure, single-part score in C major.
 */
export function generateMinimalMusicXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`
}

/**
 * Create a mock File object for testing file upload scenarios.
 * Works in both browser and jsdom environments.
 */
export function createMockFile(
  name: string,
  content: string | Buffer,
  mimeType: string,
): File {
  const parts = [typeof content === 'string' ? content : new Uint8Array(content)]
  return new File(parts, name, { type: mimeType })
}
