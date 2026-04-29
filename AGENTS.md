# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite dev server (port 5174)
npm run build            # Type-check and build production bundle
npm run preview          # Preview production build
npm test                 # Run Vitest unit tests
npm test:ui              # Run tests with UI
npm test:coverage        # Run tests with coverage report
npm run type-check       # TypeScript type checking
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier formatting
npm run e2e              # Playwright end-to-end tests
```

## Architecture

### Tech Stack
- **Framework**: React 18 + TypeScript
- **Build**: Vite 5 with ESBuild
- **State**: Zustand for global state management
- **Audio**: Web Audio API + AudioWorklet
- **Sheet Music**: OSMD (OpenSheetMusicDisplay)
- **Testing**: Vitest (unit), Playwright (E2E)

### Core Modules

```
src/
├── audio/           # Audio processing pipeline
│   ├── capture/     # Microphone input via AudioCapture
│   ├── detection/   # YIN algorithm pitch detection (PitchDetector)
│   └── rhythm/      # Onset detection and beat evaluation
│   ├── RecordingBuffer.ts    # Accumulates Float32Array chunks for recording
│   ├── WavEncoder.ts         # Encode/decode 16-bit PCM WAV files
│   └── RecordingService.ts   # Browser mic recording (ScriptProcessorNode)
│
├── engine/          # Core practice logic
│   ├── practice/    # PracticeEngine + ErrorTracker (session workflow)
│   ├── score-graph/ # RepeatHandler (D.C./D.S./Coda/Fine)
│   └── position-tracker/  # Current position tracking
│
├── services/        # Business logic layer
│   ├── parser/      # MusicXMLParser + NoteParser
│   ├── calibration/ # CalibrationManager (audio setup wizard)
│   ├── settings/    # SettingsManager (localStorage persistence)
│   ├── ocr/         # OCR flow: OCRStore, types, correction workflow
│   ├── conversion/  # Shared conversion job types and barrel export
│   └── transcription/ # MidiToScore, MusicXMLGenerator, TranscriptionStore
│
├── backend/         # Express backend (separate from Vite frontend)
│   ├── routes/
│   │   └── conversions.ts  # POST /api/v1/conversions/ocr, /transcription
│   └── services/
│       ├── conversion/     # ConversionJobStore, MockOCREngine, AudioValidator
│       ├── ocr/            # OCREngine, AudiverisEngine, GOTOCR2Engine, HumdrumConverter
│       └── transcription/  # PianoTranscriptionEngine
│
├── models/          # Domain models
│   └── part/        # PartSelector, PartTimeline, PositionQuery
│
├── components/      # React components
│   ├── ScoreRenderer/   # OSMD wrapper with cursor control
│   ├── PitchIndicator/  # Real-time pitch feedback display
│   ├── PartSelector/    # Voice/part selection UI
│   ├── Calibration/     # Audio calibration wizard
│   └── OCR/             # OCRCorrectionPage (upload, review, save)
│
└── types/           # Shared TypeScript types (Score, Part, Measure, Note)
```

### OCR Pipeline (Image → MusicXML)

1. **Upload**: `LibraryPage` → `OCRStore.uploadImage(file)` → rejects PDFs explicitly
2. **Process**: `OCRStore.processImage()` → `POST /api/v1/conversions/ocr` → job ID
3. **Poll**: `pollJobStatus(jobId)` → waits for `review_ready` or `error`
4. **Review**: `OCRCorrectionPage` shows detected elements, allows corrections
5. **Save**: `saveToLibrary()` → tries backend `POST /api/v1/pieces`, falls back to blob URL

**Engine priority**: Audiveris (env-gated, AGPL) → GOT-OCR2.0 (env-gated, Apache) → MockOCREngine

### Transcription Pipeline (Audio → MusicXML)

1. **Record/Upload**: `RecordingService` captures mic → WAV blob, or user uploads WAV file
2. **Submit**: `TranscriptionStore.uploadAudio(file)` → `POST /api/v1/conversions/transcription`
3. **Poll**: `pollJobStatus(jobId)` → waits for `review_ready` or `error`
4. **Review**: Same review flow as OCR (shared correction UI pattern)
5. **Save**: `saveToLibrary()` → same backend save flow

**Engine priority**: PianoTranscriptionEngine (env-gated, archived model) → MockTranscriptionEngine

### Conversion Job Lifecycle

```
upload → queued → processing → review_ready → completed
                                   ↓
                                error (with error details)
```

- Jobs stored in-memory (`ConversionJobStore`) with 30-min TTL
- Mock engines return deterministic results for testing
- Real engines require env vars: `AUDIVERIS_BIN`, `GOT_OCR_URL`, `PIANO_TRANSCRIPTION_URL`

### Key Patterns

- **Singleton services**: `getSettingsManager()`, `CalibrationManager`
- **Class-based engines**: `PracticeEngine`, `ErrorTracker`, `PitchDetector`
- **React refs**: Audio objects stored in refs (`audioCaptureRef`, `pitchDetectorRef`)
- **Path alias**: `@/` resolves to `src/`
- **Async job pattern**: submit → poll → review → save (used by both OCR and transcription)

### Testing

- Unit tests colocated: `__tests__/*.test.ts` alongside source
- Test fixtures in `src/test/fixtures/` and `test/fixtures/`
- E2E tests in `e2e/` (Playwright)
- Mock sample XML in `src/assets/sampleXml.ts`
- Audio fixtures: `generateWavBuffer()`, `generateSilentWavBuffer()` in `src/test/fixtures/conversion.ts`

### Engine Configuration (Local Experiment Only)

**Audiveris** (AGPL-3.0, local experiment only):
- Set `AUDIVERIS_BIN` or `AUDIVERIS_HOME` env var
- Requires Java JDK 21-25, Tesseract OCR
- NOT for production use without legal review

**GOT-OCR2.0** (Apache 2.0):
- Set `GOT_OCR_URL` env var to remote endpoint
- Outputs Humdrum `**kern` format, converted to MusicXML via subset converter
- Requires GPU server or hosted API

**Piano Transcription** (Apache/MIT, archived):
- Set `PIANO_TRANSCRIPTION_URL` env var to worker endpoint
- Piano solo only, WAV input only
- Repository archived (Dec 2025), no further updates

### Data Flow

1. **MusicXML Parsing**: `MusicXMLParser` → `Score` object with `Part[]`
2. **Audio Pipeline**: `AudioCapture` → `PitchDetector` (YIN) → pitch callbacks
3. **Practice Loop**: `PracticeEngine` tracks position, `ErrorTracker` records mistakes
4. **Settings**: `SettingsManager` singleton with localStorage persistence

### Key Patterns

- **Singleton services**: `getSettingsManager()`, `CalibrationManager`
- **Class-based engines**: `PracticeEngine`, `ErrorTracker`, `PitchDetector`
- **React refs**: Audio objects stored in refs (`audioCaptureRef`, `pitchDetectorRef`)
- **Path alias**: `@/` resolves to `src/`

### Testing

- Unit tests colocated: `__tests__/*.test.ts` alongside source
- Test fixtures in `src/test/fixtures/`
- E2E tests in `e2e/` (Playwright)
- Mock sample XML in `src/assets/sampleXml.ts`
