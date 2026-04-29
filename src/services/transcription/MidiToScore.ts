import type { Score } from '../../types/score';
import type { Note, Pitch, Duration } from '../../types/note';

export interface MidiNoteEvent {
  note: number;      // MIDI note number (21-108)
  velocity: number;  // 0-127
  startTime: number; // seconds from start
  endTime: number;   // seconds from start
}

export interface MidiToScoreResult {
  score: Score;
  warnings: string[];
}

const NOTE_NAMES = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'] as const;
const ACCIDENTALS: Array<Pitch['accidental']> = [undefined, 'sharp', undefined, 'sharp', undefined, undefined, 'sharp', undefined, 'sharp', undefined, 'sharp', undefined];

function midiToPitch(midi: number): Pitch {
  const octave = Math.floor(midi / 12) - 1;
  const index = midi % 12;
  return {
    noteName: NOTE_NAMES[index] as Pitch['noteName'],
    octave,
    accidental: ACCIDENTALS[index],
    midiNumber: midi,
  };
}

function quantizeTime(timeSeconds: number, bpm: number, subdivision = 4): number {
  const beatDuration = 60 / bpm;
  const gridUnit = beatDuration / subdivision;
  return Math.round(timeSeconds / gridUnit) * gridUnit;
}

function beatsToDuration(beats: number): Duration {
  if (beats >= 3.5) return { type: 'whole', dots: 0 };
  if (beats >= 1.75) return { type: 'half', dots: beats >= 2.5 ? 1 : 0 };
  if (beats >= 0.875) return { type: 'quarter', dots: beats >= 1.25 ? 1 : 0 };
  if (beats >= 0.4375) return { type: 'eighth', dots: 0 };
  return { type: 'sixteenth', dots: 0 };
}

/**
 * Convert MIDI note events to a domain Score structure.
 * Quantizes onsets to grid, groups into measures, adds warnings.
 */
export function midiToScore(
  events: MidiNoteEvent[],
  bpm = 120,
  timeSignature: [number, number] = [4, 4],
): MidiToScoreResult {
  const warnings: string[] = [];
  const beatDuration = 60 / bpm;
  const beatsPerMeasure = timeSignature[0];
  const measureDuration = beatsPerMeasure * beatDuration;

  // Quantize and sort
  const quantized = events
    .map((e) => ({
      ...e,
      startTime: quantizeTime(e.startTime, bpm),
      endTime: quantizeTime(e.endTime, bpm),
    }))
    .sort((a, b) => a.startTime - b.startTime);

  // Validate
  for (const e of quantized) {
    const durationMs = (e.endTime - e.startTime) * 1000;
    if (durationMs < 50) {
      warnings.push(`音符 MIDI ${e.note} 时值过短 (${durationMs.toFixed(0)}ms)`);
    }
    if (e.velocity < 1 || e.velocity > 127) {
      warnings.push(`音符 MIDI ${e.note} 力度异常: ${e.velocity}`);
    }
  }

  // Group into measures
  const measureMap = new Map<number, MidiNoteEvent[]>();
  for (const e of quantized) {
    const measureIndex = Math.floor(e.startTime / measureDuration);
    if (!measureMap.has(measureIndex)) measureMap.set(measureIndex, []);
    measureMap.get(measureIndex)!.push(e);
  }

  // Build measures
  let noteId = 0;
  const sortedMeasures = Array.from(measureMap.entries()).sort(([a], [b]) => a - b);

  const measures = sortedMeasures.map(([measureIndex, measureEvents]) => {
    const notes: Note[] = measureEvents.map((e) => {
      const pitch = midiToPitch(e.note);
      const startBeat = (e.startTime - measureIndex * measureDuration) / beatDuration;
      const durationBeats = Math.max(0.25, (e.endTime - e.startTime) / beatDuration);

      return {
        id: `n-${noteId++}`,
        pitch,
        duration: beatsToDuration(durationBeats),
        articulations: [],
        startTime: startBeat,
        durationBeats,
        voiceId: 'v1',
        measureId: `m-${measureIndex}`,
      };
    });

    return {
      id: `m-${measureIndex}`,
      number: measureIndex + 1,
      notes,
      rests: [],
    };
  });

  // If no measures, create one empty measure
  if (measures.length === 0) {
    measures.push({ id: 'm-0', number: 1, notes: [], rests: [] });
    warnings.push('未检测到音符，已创建空白小节');
  }

  const score: Score = {
    id: `midi-${Date.now()}`,
    metadata: {
      title: 'MIDI 转谱草稿',
      tempo: bpm,
      timeSignature: { numerator: timeSignature[0], denominator: timeSignature[1] },
      keySignature: { fifths: 0, mode: 'major' },
    },
    parts: [
      {
        id: 'P1',
        name: 'Piano',
        instrument: { id: 'piano', name: 'Piano', category: 'keyboard' },
        voices: [{ id: 'v1', name: 'Voice 1', measures }],
      },
    ],
  };

  return { score, warnings };
}
