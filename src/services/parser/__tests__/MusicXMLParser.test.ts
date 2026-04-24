import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MusicXMLParser } from '../MusicXMLParser'

const loadFixture = (name: string): string => {
  const filePath = resolve(process.cwd(), 'test', 'fixtures', name)
  return readFileSync(filePath, 'utf-8')
}

describe('MusicXMLParser', () => {
  it('parses a simple single-part score with attributes', () => {
    const parser = new MusicXMLParser()
    const score = parser.parse(loadFixture('simple.xml'))

    expect(score.metadata.title).toBe('Simple Scale')
    expect(score.metadata.composer).toBe('Practice Composer')
    expect(score.metadata.timeSignature).toEqual({ numerator: 4, denominator: 4 })
    expect(score.metadata.keySignature).toEqual({ fifths: 0, mode: 'major' })

    expect(score.parts).toHaveLength(1)
    const part = score.parts[0]
    expect(part.name).toBe('Piano')
    expect(part.instrument.category).toBe('keyboard')
    expect(part.voices).toHaveLength(1)
    expect(part.voices[0].measures).toHaveLength(2)
  })

  it('parses multi-part scores', () => {
    const parser = new MusicXMLParser()
    const score = parser.parse(loadFixture('multi-part.xml'))

    expect(score.parts).toHaveLength(2)
    expect(score.parts[0].id).toBe('P1')
    expect(score.parts[1].id).toBe('P2')
    expect(score.parts[0].instrument.category).toBe('string')
    expect(score.parts[1].instrument.category).toBe('keyboard')
  })

  it('handles rests and accidentals on notes', () => {
    const parser = new MusicXMLParser()
    const score = parser.parse(loadFixture('simple.xml'))
    const measure2 = score.parts[0].voices[0].measures[1]

    expect(measure2.rests).toHaveLength(1)
    const accidentalNote = measure2.notes.find((note) => note.pitch?.noteName === 'F')
    expect(accidentalNote?.pitch?.accidental).toBe('sharp')
    expect(accidentalNote?.duration.type).toBe('quarter')
    expect(accidentalNote?.articulations.some((item) => item.type === 'staccato')).toBe(true)
  })

  it('parses repeat and barline metadata', () => {
    const parser = new MusicXMLParser()
    const score = parser.parse(loadFixture('repeats.xml'))
    const measure2 = score.parts[0].voices[0].measures[1]

    expect(measure2.repeatStart).toBe(true)
    expect(measure2.repeatEnd).toBe(true)
    expect(measure2.rightBarline).toBe('end')
    expect(measure2.voltaNumber).toBe(1)
  })

  it('accepts parsed Document input', () => {
    const parser = new MusicXMLParser()
    const xml = loadFixture('simple.xml')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    const score = parser.parse(doc)

    expect(score.parts).toHaveLength(1)
  })
})
