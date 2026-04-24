import type { KeySignature, Measure, TimeSignature } from '@/types'
import { NoteParser } from './NoteParser'

export interface ParsedMeasure {
  measure: Measure
  divisions: number
  nextStartTime: number
}

export interface MeasureParseContext {
  partId: string
  measureIndex: number
  divisions: number
  startTime: number
}

export class MeasureParser {
  private readonly noteParser = new NoteParser()

  parse(measureElement: Element, context: MeasureParseContext): ParsedMeasure {
    const measureNumber = this.readNumberFromAttribute(measureElement, 'number', context.measureIndex + 1)
    const measureId = `${context.partId}-measure-${measureNumber}`

    const attributes = measureElement.querySelector(':scope > attributes')
    const divisions = this.readDivisions(attributes, context.divisions)
    const timeSignature = this.readTimeSignature(attributes)
    const keySignature = this.readKeySignature(attributes)

    const parsedBarline = this.parseBarline(measureElement)

    const notes = [] as Measure['notes']
    const rests = [] as Measure['rests']
    let currentTime = context.startTime

    const noteElements = Array.from(measureElement.querySelectorAll(':scope > note'))
    for (let i = 0; i < noteElements.length; i += 1) {
      const noteElement = noteElements[i]
      const voiceId = this.readVoice(noteElement, context.partId)
      const note = this.noteParser.parse(noteElement, {
        measureId,
        voiceId,
        startTime: currentTime,
        divisions,
        noteIndex: i,
      })

      if (note.pitch) {
        notes.push(note)
      } else {
        rests.push({
          id: note.id,
          duration: note.duration,
          startTime: note.startTime,
          durationBeats: note.durationBeats,
          voiceId: note.voiceId,
          measureId: note.measureId,
        })
      }

      if (!noteElement.querySelector(':scope > chord')) {
        currentTime += note.durationBeats
      }
    }

    const measure: Measure = {
      id: measureId,
      number: measureNumber,
      notes,
      rests,
      ...parsedBarline,
    }

    if (timeSignature) {
      measure.timeSignature = timeSignature
    }
    if (keySignature) {
      measure.keySignature = keySignature
    }

    return {
      measure,
      divisions,
      nextStartTime: currentTime,
    }
  }

  private parseBarline(measureElement: Element): Pick<
    Measure,
    'leftBarline' | 'rightBarline' | 'repeatStart' | 'repeatEnd' | 'voltaNumber'
  > {
    const barlines = Array.from(measureElement.querySelectorAll(':scope > barline'))

    const left = barlines.find((barline) => barline.getAttribute('location') === 'left')
    const right = barlines.find((barline) => barline.getAttribute('location') === 'right')

    const leftStyle = this.parseLeftBarStyle(left)
    const rightStyle = this.parseRightBarStyle(right)

    const repeatStart = left?.querySelector(':scope > repeat[direction="forward"]') !== null
    const repeatEnd = right?.querySelector(':scope > repeat[direction="backward"]') !== null

    const ending = right?.querySelector(':scope > ending')
    const voltaNumber = ending?.getAttribute('number')
      ? Number(ending.getAttribute('number')?.split(',')[0])
      : undefined

    return {
      leftBarline: leftStyle,
      rightBarline: rightStyle,
      repeatStart,
      repeatEnd,
      voltaNumber: Number.isFinite(voltaNumber) ? voltaNumber : undefined,
    }
  }

  private parseLeftBarStyle(barline?: Element): Measure['leftBarline'] | undefined {
    if (!barline) {
      return undefined
    }

    const style = barline.querySelector(':scope > bar-style')?.textContent?.trim()
    if (!style) {
      return 'regular'
    }

    if (style.includes('heavy')) {
      return 'heavy'
    }

    return 'regular'
  }

  private parseRightBarStyle(barline?: Element): Measure['rightBarline'] | undefined {
    if (!barline) {
      return undefined
    }

    const style = barline.querySelector(':scope > bar-style')?.textContent?.trim()
    if (!style) {
      return 'regular'
    }

    if (style === 'light-heavy') {
      return 'end'
    }
    if (style.includes('heavy')) {
      return 'heavy'
    }

    return 'regular'
  }

  private readVoice(noteElement: Element, partId: string): string {
    const rawVoice = noteElement.querySelector(':scope > voice')?.textContent?.trim()
    const voice = rawVoice && rawVoice.length > 0 ? rawVoice : '1'
    return `${partId}-voice-${voice}`
  }

  private readDivisions(attributesElement: Element | null, fallback: number): number {
    if (!attributesElement) {
      return fallback
    }

    const text = attributesElement.querySelector(':scope > divisions')?.textContent?.trim()
    if (!text) {
      return fallback
    }

    const value = Number(text)
    return Number.isFinite(value) && value > 0 ? value : fallback
  }

  private readTimeSignature(attributesElement: Element | null): TimeSignature | undefined {
    if (!attributesElement) {
      return undefined
    }

    const beatsText = attributesElement.querySelector(':scope > time > beats')?.textContent?.trim()
    const beatTypeText = attributesElement.querySelector(':scope > time > beat-type')?.textContent?.trim()
    if (!beatsText || !beatTypeText) {
      return undefined
    }

    const numerator = Number(beatsText)
    const denominator = Number(beatTypeText)

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
      return undefined
    }

    return {
      numerator,
      denominator,
    }
  }

  private readKeySignature(attributesElement: Element | null): KeySignature | undefined {
    if (!attributesElement) {
      return undefined
    }

    const fifthsText = attributesElement.querySelector(':scope > key > fifths')?.textContent?.trim()
    if (!fifthsText) {
      return undefined
    }

    const modeText = attributesElement.querySelector(':scope > key > mode')?.textContent?.trim()
    const fifths = Number(fifthsText)
    if (!Number.isFinite(fifths)) {
      return undefined
    }

    return {
      fifths,
      mode: modeText === 'minor' ? 'minor' : 'major',
    }
  }

  private readNumberFromAttribute(element: Element, attribute: string, fallback: number): number {
    const value = Number(element.getAttribute(attribute))
    return Number.isFinite(value) ? value : fallback
  }
}
