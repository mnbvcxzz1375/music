export interface HumdrumConversionResult {
  generatedXml: string;
  warnings: string[];
}

interface ParsedDuration {
  duration: number;
  type: string;
  dots: number;
}

interface ParsedNote {
  step: string;
  octave: number;
  alter?: number;
  duration: ParsedDuration;
}

interface ParsedRest {
  duration: ParsedDuration;
}

interface MeasureState {
  number: number;
  elements: string[];
}

const DIVISIONS_PER_QUARTER = 8;

/**
 * Converts a deliberately small subset of Humdrum **kern into MusicXML.
 *
 * Supported subset:
 * - Single-spine or simple tab-separated **kern note/rest streams
 * - Basic note tokens using c, d, e, f, g, a, b with **kern octave spelling
 * - Optional numeric durations, dots, sharps (#), flats (-), and naturals (n)
 * - Rest tokens (r), barlines (=), time signatures (*M4/4), and simple key
 *   signatures (*k[f#c#])
 *
 * Unsupported Humdrum constructs such as chords, lyrics, dynamics, ornaments,
 * tuplets, ties, beams, multiple voices, and advanced interpretations are skipped
 * gracefully and reported in the returned warnings array. This is not a full
 * Humdrum parser.
 */
export function convertHumdrumToMusicXml(humdrum: string): HumdrumConversionResult {
  const warnings: string[] = [];
  const measures: MeasureState[] = [{ number: 1, elements: [] }];
  let beats = 4;
  let beatType = 4;
  let fifths = 0;
  let attributesWritten = false;

  const currentMeasure = () => measures[measures.length - 1];
  const addAttributes = () => {
    if (attributesWritten) return;
    currentMeasure().elements.push(renderAttributes(fifths, beats, beatType));
    attributesWritten = true;
  };

  const lines = humdrum.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!')) return;

    const tokens = trimmed.split(/\t+/).flatMap((token) => token.trim().split(/\s+/)).filter(Boolean);
    if (tokens.length === 0) return;

    if (tokens.every((token) => token.startsWith('='))) {
      addBarline(measures);
      return;
    }

    for (const token of tokens) {
      if (token === '**kern' || token === '*-') continue;
      if (token === '.') continue;

      if (token.startsWith('*M')) {
        const parsed = parseTimeSignature(token);
        if (parsed) {
          beats = parsed.beats;
          beatType = parsed.beatType;
          if (attributesWritten) currentMeasure().elements.push(renderAttributes(fifths, beats, beatType));
        } else {
          warnings.push(`Unsupported time signature token '${token}' on line ${lineIndex + 1}`);
        }
        continue;
      }

      if (token.startsWith('*k[')) {
        const parsed = parseKeySignature(token);
        if (parsed !== undefined) {
          fifths = parsed;
          if (attributesWritten) currentMeasure().elements.push(renderAttributes(fifths, beats, beatType));
        } else {
          warnings.push(`Unsupported key signature token '${token}' on line ${lineIndex + 1}`);
        }
        continue;
      }

      if (token.startsWith('*')) {
        warnings.push(`Unsupported Humdrum interpretation '${token}' on line ${lineIndex + 1}`);
        continue;
      }

      if (token.startsWith('=')) {
        addBarline(measures);
        continue;
      }

      addAttributes();

      const rest = parseRest(token, warnings, lineIndex + 1);
      if (rest) {
        currentMeasure().elements.push(renderRest(rest));
        continue;
      }

      const note = parseNote(token, warnings, lineIndex + 1);
      if (note) {
        currentMeasure().elements.push(renderNote(note));
        continue;
      }

      warnings.push(`Unsupported Humdrum token '${token}' on line ${lineIndex + 1}`);
    }
  });

  addAttributes();

  const warningComments = warnings.map((warning) => `  <!-- warning: ${escapeXml(warning)} -->`).join('\n');
  const parts = measures
    .filter((measure, index) => index === 0 || measure.elements.length > 0)
    .map(renderMeasure)
    .join('\n');

  const generatedXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="3.1">',
    warningComments,
    '  <part-list>',
    '    <score-part id="P1">',
    '      <part-name>Music</part-name>',
    '    </score-part>',
    '  </part-list>',
    '  <part id="P1">',
    parts,
    '  </part>',
    '</score-partwise>',
  ].filter((line) => line !== '').join('\n');

  return { generatedXml, warnings };
}

function addBarline(measures: MeasureState[]): void {
  const current = measures[measures.length - 1];
  if (current.elements.length > 0) {
    measures.push({ number: current.number + 1, elements: [] });
  }
}

function parseTimeSignature(token: string): { beats: number; beatType: number } | undefined {
  const match = /^\*M(\d+)\/(\d+)$/.exec(token);
  if (!match) return undefined;

  const beats = Number(match[1]);
  const beatType = Number(match[2]);
  if (!Number.isInteger(beats) || !Number.isInteger(beatType) || beats <= 0 || beatType <= 0) {
    return undefined;
  }

  return { beats, beatType };
}

function parseKeySignature(token: string): number | undefined {
  const match = /^\*k\[([^\]]*)\]$/.exec(token);
  if (!match) return undefined;

  const body = match[1];
  const sharps = body.match(/#/g)?.length ?? 0;
  const flats = body.match(/-/g)?.length ?? 0;
  return sharps - flats;
}

function parseRest(token: string, warnings: string[], lineNumber: number): ParsedRest | undefined {
  const parsed = splitDurationPrefix(token, warnings, lineNumber);
  if (!parsed || parsed.remaining !== 'r') return undefined;
  return { duration: parsed.duration };
}

function parseNote(token: string, warnings: string[], lineNumber: number): ParsedNote | undefined {
  const parsed = splitDurationPrefix(token, warnings, lineNumber);
  if (!parsed) return undefined;

  const match = /^([A-Ga-g]+)([#n-]*)$/.exec(parsed.remaining);
  if (!match) return undefined;

  const noteLetters = match[1];
  const normalizedLetters = noteLetters.toLowerCase();
  if (!normalizedLetters.split('').every((letter) => letter === normalizedLetters[0])) {
    warnings.push(`Chord-like token '${token}' on line ${lineNumber} is unsupported by the subset converter`);
    return undefined;
  }

  const accidentalText = match[2];
  const alter = accidentalText.split('').reduce((sum, accidental) => {
    if (accidental === '#') return sum + 1;
    if (accidental === '-') return sum - 1;
    return sum;
  }, 0);

  return {
    step: normalizedLetters[0].toUpperCase(),
    octave: getKernOctave(noteLetters),
    alter: alter === 0 ? undefined : alter,
    duration: parsed.duration,
  };
}

function splitDurationPrefix(
  token: string,
  warnings: string[],
  lineNumber: number,
): { duration: ParsedDuration; remaining: string } | undefined {
  const match = /^(\d+)?(\.*)(.+)$/.exec(token);
  if (!match) return undefined;

  const denominator = match[1] ? Number(match[1]) : 4;
  if (!Number.isInteger(denominator) || denominator <= 0) {
    warnings.push(`Invalid duration in token '${token}' on line ${lineNumber}`);
    return undefined;
  }

  return {
    duration: durationFromDenominator(denominator, match[2].length),
    remaining: match[3],
  };
}

function durationFromDenominator(denominator: number, dots: number): ParsedDuration {
  let multiplier = 1;
  let dotValue = 0.5;
  for (let index = 0; index < dots; index += 1) {
    multiplier += dotValue;
    dotValue /= 2;
  }

  const baseDuration = (DIVISIONS_PER_QUARTER * 4) / denominator;
  return {
    duration: Math.max(1, Math.round(baseDuration * multiplier)),
    type: durationType(denominator),
    dots,
  };
}

function durationType(denominator: number): string {
  switch (denominator) {
    case 1:
      return 'whole';
    case 2:
      return 'half';
    case 4:
      return 'quarter';
    case 8:
      return 'eighth';
    case 16:
      return '16th';
    case 32:
      return '32nd';
    case 64:
      return '64th';
    default:
      return 'quarter';
  }
}

function getKernOctave(noteLetters: string): number {
  const first = noteLetters[0];
  if (first === first.toLowerCase()) {
    return 3 + noteLetters.length;
  }
  return 4 - noteLetters.length;
}

function renderAttributes(fifths: number, beats: number, beatType: number): string {
  return [
    '      <attributes>',
    `        <divisions>${DIVISIONS_PER_QUARTER}</divisions>`,
    '        <key>',
    `          <fifths>${fifths}</fifths>`,
    '        </key>',
    '        <time>',
    `          <beats>${beats}</beats>`,
    `          <beat-type>${beatType}</beat-type>`,
    '        </time>',
    '        <clef>',
    '          <sign>G</sign>',
    '          <line>2</line>',
    '        </clef>',
    '      </attributes>',
  ].join('\n');
}

function renderNote(note: ParsedNote): string {
  const alter = note.alter === undefined ? [] : ['        <alter>' + note.alter + '</alter>'];
  return [
    '      <note>',
    '        <pitch>',
    `          <step>${note.step}</step>`,
    ...alter,
    `          <octave>${note.octave}</octave>`,
    '        </pitch>',
    `        <duration>${note.duration.duration}</duration>`,
    `        <type>${note.duration.type}</type>`,
    ...renderDots(note.duration.dots),
    '      </note>',
  ].join('\n');
}

function renderRest(rest: ParsedRest): string {
  return [
    '      <note>',
    '        <rest/>',
    `        <duration>${rest.duration.duration}</duration>`,
    `        <type>${rest.duration.type}</type>`,
    ...renderDots(rest.duration.dots),
    '      </note>',
  ].join('\n');
}

function renderDots(count: number): string[] {
  return Array.from({ length: count }, () => '        <dot/>');
}

function renderMeasure(measure: MeasureState): string {
  return [
    `    <measure number="${measure.number}">`,
    ...measure.elements,
    '    </measure>',
  ].join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
