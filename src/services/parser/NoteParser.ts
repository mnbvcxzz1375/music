import type { Articulation, Duration, Note, Pitch } from '@/types'

export interface NoteParseContext {
  measureId: string
  voiceId: string
  startTime: number
  divisions: number
  noteIndex: number
}

const NOTE_TYPE_MAP: Record<string, Duration['type']> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': 'sixteenth',
  '32nd': 'thirty_second',
}

export class NoteParser {
  parse(noteElement: Element, context: NoteParseContext): Note {
    const durationValue = this.readNumber(noteElement, 'duration', context.divisions)
    const typeText = this.readText(noteElement, 'type')
    const duration: Duration = {
      type: NOTE_TYPE_MAP[typeText ?? ''] ?? 'quarter',
      dots: noteElement.querySelectorAll(':scope > dot').length,
    }

    const timeModification = noteElement.querySelector(':scope > time-modification')
    if (timeModification) {
      const actualNotes = this.readNumber(timeModification, 'actual-notes', 0)
      const normalNotes = this.readNumber(timeModification, 'normal-notes', 0)
      if (actualNotes > 0 && normalNotes > 0) {
        duration.tuplet = {
          numerator: actualNotes,
          denominator: normalNotes,
        }
      }
    }

    const pitch = this.parsePitch(noteElement)
    const articulations = this.parseArticulations(noteElement)

    return {
      id: `${context.measureId}-${context.voiceId}-note-${context.noteIndex + 1}`,
      pitch,
      duration,
      articulations,
      startTime: context.startTime,
      durationBeats: durationValue / context.divisions,
      voiceId: context.voiceId,
      measureId: context.measureId,
    }
  }

  private parsePitch(noteElement: Element): Pitch | null {
    if (noteElement.querySelector(':scope > rest')) {
      return null
    }

    const pitchElement = noteElement.querySelector(':scope > pitch')
    if (!pitchElement) {
      return null
    }

    const step = this.readText(pitchElement, 'step')
    const octave = this.readNumber(pitchElement, 'octave', 4)
    if (!step || !this.isValidStep(step)) {
      return null
    }

    const alter = this.readNumberOptional(pitchElement, 'alter')
    const accidentalText = this.readText(noteElement, 'accidental')
    const accidental = this.parseAccidental(alter, accidentalText)
    const midiNumber = this.toMidiNumber(step, octave, accidental)

    return {
      noteName: step,
      octave,
      accidental,
      midiNumber,
      frequency: 440 * Math.pow(2, (midiNumber - 69) / 12),
    }
  }

  private parseArticulations(noteElement: Element): Articulation[] {
    const result: Articulation[] = []
    const articulationsElement = noteElement.querySelector(':scope > notations > articulations')

    if (articulationsElement) {
      const articulationTags: Array<{
        tag: string
        type: Articulation['type']
      }> = [
        { tag: 'staccato', type: 'staccato' },
        { tag: 'accent', type: 'accent' },
        { tag: 'tenuto', type: 'tenuto' },
        { tag: 'strong-accent', type: 'marcato' },
        { tag: 'legato', type: 'legato' },
      ]

      for (const articulationTag of articulationTags) {
        const node = articulationsElement.querySelector(`:scope > ${articulationTag.tag}`)
        if (node) {
          result.push({
            type: articulationTag.type,
            position: this.parsePosition(node.getAttribute('placement')),
          })
        }
      }
    }

    const slur = noteElement.querySelector(':scope > notations > slur')
    if (slur) {
      result.push({
        type: 'slur',
        position: this.parsePosition(slur.getAttribute('placement')),
      })
    }

    const fermata = noteElement.querySelector(':scope > notations > fermata')
    if (fermata) {
      result.push({
        type: 'fermata',
        position: this.parsePosition(fermata.getAttribute('placement')),
      })
    }

    return result
  }

  private parsePosition(value: string | null): Articulation['position'] {
    return value === 'below' ? 'below' : 'above'
  }

  private parseAccidental(alter: number | null, accidentalText: string | null): Pitch['accidental'] {
    if (alter === null && !accidentalText) {
      return undefined
    }

    if (alter !== null) {
      if (alter > 0) {
        return 'sharp'
      }
      if (alter < 0) {
        return 'flat'
      }
      return 'natural'
    }

    if (accidentalText === 'sharp') {
      return 'sharp'
    }
    if (accidentalText === 'flat') {
      return 'flat'
    }

    return 'natural'
  }

  private toMidiNumber(step: Pitch['noteName'], octave: number, accidental?: Pitch['accidental']): number {
    const baseMap: Record<Pitch['noteName'], number> = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11,
    }

    const accidentalOffset = accidental === 'sharp' ? 1 : accidental === 'flat' ? -1 : 0
    return (octave + 1) * 12 + baseMap[step] + accidentalOffset
  }

  private readText(parent: Element, childTag: string): string | null {
    const value = parent.querySelector(`:scope > ${childTag}`)?.textContent?.trim() ?? null
    return value && value.length > 0 ? value : null
  }

  private readNumber(parent: Element, childTag: string, fallback: number): number {
    const value = this.readNumberOptional(parent, childTag)
    return value ?? fallback
  }

  private readNumberOptional(parent: Element, childTag: string): number | null {
    const text = this.readText(parent, childTag)
    if (!text) {
      return null
    }

    const value = Number(text)
    return Number.isFinite(value) ? value : null
  }

  private isValidStep(value: string): value is Pitch['noteName'] {
    return ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(value)
  }
}
