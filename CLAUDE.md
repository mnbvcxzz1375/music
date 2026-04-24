# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
│
├── engine/          # Core practice logic
│   ├── practice/    # PracticeEngine + ErrorTracker (session workflow)
│   ├── score-graph/ # RepeatHandler (D.C./D.S./Coda/Fine)
│   └── position-tracker/  # Current position tracking
│
├── services/        # Business logic layer
│   ├── parser/      # MusicXMLParser + NoteParser
│   ├── calibration/ # CalibrationManager (audio setup wizard)
│   └── settings/    # SettingsManager (localStorage persistence)
│
├── models/          # Domain models
│   └── part/        # PartSelector, PartTimeline, PositionQuery
│
├── components/      # React components
│   ├── ScoreRenderer/   # OSMD wrapper with cursor control
│   ├── PitchIndicator/  # Real-time pitch feedback display
│   ├── PartSelector/    # Voice/part selection UI
│   └── Calibration/     # Audio calibration wizard
│
└── types/           # Shared TypeScript types
```

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
