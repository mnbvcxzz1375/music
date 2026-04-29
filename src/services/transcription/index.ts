// Audio capture and encoding
export { RecordingBuffer } from '../../audio/RecordingBuffer';
export { encodeWav, decodeWav } from '../../audio/WavEncoder';
export { RecordingService } from '../../audio/RecordingService';

// MIDI to Score conversion
export { midiToScore } from './MidiToScore';
export type { MidiNoteEvent, MidiToScoreResult } from './MidiToScore';

// MusicXML generation
export { generateMusicXml, generateMinimalMusicXml } from './MusicXMLGenerator';

// Transcription store
export { useTranscriptionStore } from './TranscriptionStore';
export type { TranscriptionStatus, TranscriptionResult } from './TranscriptionStore';
