import type { Score } from '../../types/score';
import type { Note } from '../../types/note';

function durationToXmlType(type: string): string {
  const map: Record<string, string> = {
    whole: 'whole',
    half: 'half',
    quarter: 'quarter',
    eighth: 'eighth',
    sixteenth: '16th',
    thirty_second: '32nd',
  };
  return map[type] || 'quarter';
}

function noteToXml(note: Note, divisions: number): string {
  if (!note.pitch) {
    // Rest
    const duration = Math.max(1, Math.round(note.durationBeats * divisions));
    return `      <note>
        <rest/>
        <duration>${duration}</duration>
        <voice>${note.voiceId}</voice>
        <type>${durationToXmlType(note.duration.type)}</type>
      </note>`;
  }

  const duration = Math.max(1, Math.round(note.durationBeats * divisions));
  const alter = note.pitch.accidental === 'sharp' ? '<alter>1</alter>' :
                note.pitch.accidental === 'flat' ? '<alter>-1</alter>' : '';
  const accidental = note.pitch.accidental === 'sharp' ? '<accidental>sharp</accidental>' :
                     note.pitch.accidental === 'flat' ? '<accidental>flat</accidental>' : '';

  return `      <note>
        <pitch>
          <step>${note.pitch.noteName}</step>
          ${alter}
          <octave>${note.pitch.octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <voice>${note.voiceId}</voice>
        <type>${durationToXmlType(note.duration.type)}</type>
        ${accidental}
      </note>`;
}

/**
 * Generate MusicXML 4.0 string from a domain Score.
 * Single-part, single-voice only for v1.
 */
export function generateMusicXml(score: Score, title?: string): string {
  const part = score.parts[0];
  if (!part) return generateMinimalMusicXml();

  const voice = part.voices[0];
  if (!voice) return generateMinimalMusicXml();

  const divisions = 1; // quarter note = 1 division
  const ts = score.metadata.timeSignature || { numerator: 4, denominator: 4 };
  const ks = score.metadata.keySignature || { fifths: 0, mode: 'major' };

  const measuresXml = voice.measures
    .map((measure, i) => {
      const isFirst = i === 0;
      const notesXml = measure.notes.map((n) => noteToXml(n, divisions)).join('\n');

      return `    <measure number="${measure.number}">
${isFirst ? `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${ks.fifths}</fifths>
          <mode>${ks.mode}</mode>
        </key>
        <time>
          <beats>${ts.numerator}</beats>
          <beat-type>${ts.denominator}</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>` : ''}
${notesXml}
    </measure>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${title || score.metadata.title || '转谱草稿'}</work-title>
  </work>
  <identification>
    <creator type="composer">MIDI 转谱</creator>
    <encoding>
      <software>Resonance Transcription</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="${part.id}">
      <part-name>${part.name}</part-name>
    </score-part>
  </part-list>
  <part id="${part.id}">
${measuresXml}
  </part>
</score-partwise>`;
}

/**
 * Generate a minimal MusicXML with a single whole-note rest.
 * Used as fallback/empty template.
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
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <rest/>
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
}
