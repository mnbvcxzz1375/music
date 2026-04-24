import type { Measure, Part, Score, Voice } from '@/types'
import { MeasureParser } from './MeasureParser'

type PartInfo = {
  id: string
  name: string
}

export class MusicXMLParser {
  private readonly measureParser = new MeasureParser()

  parse(input: string | Document): Score {
    const xmlDocument = typeof input === 'string' ? this.parseXmlString(input) : input
    const scoreElement = xmlDocument.querySelector('score-partwise')

    if (!scoreElement) {
      throw new Error('Invalid MusicXML: missing <score-partwise> root element')
    }

    const partsInfo = this.parsePartList(scoreElement)
    const parts = this.parseParts(scoreElement, partsInfo)

    const firstMeasure = parts[0]?.voices[0]?.measures[0]
    return {
      id: this.readText(scoreElement, 'work > work-number') ?? 'score-1',
      metadata: {
        title:
          this.readText(scoreElement, 'work > work-title')
          ?? this.readText(scoreElement, 'movement-title')
          ?? 'Untitled Score',
        composer: this.readComposer(scoreElement),
        timeSignature: firstMeasure?.timeSignature
          ? {
            numerator: firstMeasure.timeSignature.numerator,
            denominator: firstMeasure.timeSignature.denominator,
          }
          : undefined,
        keySignature: firstMeasure?.keySignature
          ? {
            fifths: firstMeasure.keySignature.fifths,
            mode: firstMeasure.keySignature.mode,
          }
          : undefined,
      },
      parts,
    }
  }

  private parseXmlString(xml: string): Document {
    const parser = new DOMParser()
    const document = parser.parseFromString(xml, 'application/xml')
    const parserError = document.querySelector('parsererror')

    if (parserError) {
      throw new Error(`Invalid XML: ${parserError.textContent?.trim() ?? 'Unknown parser error'}`)
    }

    return document
  }

  private parsePartList(scoreElement: Element): Map<string, PartInfo> {
    const partInfoMap = new Map<string, PartInfo>()
    const scorePartElements = Array.from(scoreElement.querySelectorAll(':scope > part-list > score-part'))

    for (const scorePartElement of scorePartElements) {
      const id = scorePartElement.getAttribute('id')
      if (!id) {
        continue
      }

      const name = this.readText(scorePartElement, 'part-name') ?? id
      partInfoMap.set(id, {
        id,
        name,
      })
    }

    return partInfoMap
  }

  private parseParts(scoreElement: Element, partInfoMap: Map<string, PartInfo>): Part[] {
    const partElements = Array.from(scoreElement.querySelectorAll(':scope > part'))

    return partElements.map((partElement, partIndex) => {
      const partId = partElement.getAttribute('id') ?? `P${partIndex + 1}`
      const partInfo = partInfoMap.get(partId)

      const voices = this.parseVoices(partElement, partId)
      return {
        id: partId,
        name: partInfo?.name ?? partId,
        instrument: {
          id: `${partId}-instrument`,
          name: partInfo?.name ?? partId,
          category: this.inferInstrumentCategory(partInfo?.name ?? partId),
        },
        voices,
        activeVoice: voices[0]?.id,
      }
    })
  }

  private parseVoices(partElement: Element, partId: string): Voice[] {
    const measureElements = Array.from(partElement.querySelectorAll(':scope > measure'))
    const voiceMeasures = new Map<string, Measure[]>()

    let divisions = 1
    let scoreTime = 0

    for (let i = 0; i < measureElements.length; i += 1) {
      const parsedMeasure = this.measureParser.parse(measureElements[i], {
        partId,
        measureIndex: i,
        divisions,
        startTime: scoreTime,
      })

      divisions = parsedMeasure.divisions
      scoreTime = parsedMeasure.nextStartTime

      const voiceIds = new Set<string>([
        ...parsedMeasure.measure.notes.map((note) => note.voiceId),
        ...parsedMeasure.measure.rests.map((rest) => rest.voiceId),
      ])

      const ensuredVoiceIds = voiceIds.size > 0 ? Array.from(voiceIds) : [`${partId}-voice-1`]
      for (const voiceId of ensuredVoiceIds) {
        const perVoiceMeasure: Measure = {
          ...parsedMeasure.measure,
          notes: parsedMeasure.measure.notes.filter((note) => note.voiceId === voiceId),
          rests: parsedMeasure.measure.rests.filter((rest) => rest.voiceId === voiceId),
        }

        const measures = voiceMeasures.get(voiceId) ?? []
        measures.push(perVoiceMeasure)
        voiceMeasures.set(voiceId, measures)
      }
    }

    return Array.from(voiceMeasures.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([voiceId, measures]) => ({
        id: voiceId,
        name: voiceId,
        measures,
      }))
  }

  private inferInstrumentCategory(partName: string): Part['instrument']['category'] {
    const lowerName = partName.toLowerCase()

    if (lowerName.includes('violin') || lowerName.includes('viola') || lowerName.includes('cello') || lowerName.includes('bass')) {
      return 'string'
    }
    if (lowerName.includes('piano') || lowerName.includes('keyboard') || lowerName.includes('organ')) {
      return 'keyboard'
    }
    if (lowerName.includes('flute') || lowerName.includes('clarinet') || lowerName.includes('sax') || lowerName.includes('trumpet') || lowerName.includes('trombone')) {
      return 'wind'
    }
    if (lowerName.includes('drum') || lowerName.includes('percussion')) {
      return 'percussion'
    }

    return 'other'
  }

  private readComposer(scoreElement: Element): string | undefined {
    const creators = Array.from(scoreElement.querySelectorAll(':scope > identification > creator'))
    const composer = creators.find((creator) => creator.getAttribute('type') === 'composer')
    return composer?.textContent?.trim() || undefined
  }

  private readText(parent: Element, selector: string): string | undefined {
    const value = parent.querySelector(`:scope > ${selector}`)?.textContent?.trim()
    return value && value.length > 0 ? value : undefined
  }
}
