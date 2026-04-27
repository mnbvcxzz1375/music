import { create } from 'zustand';
import type { Piece } from '@/services/piece/types';
import { usePieceStore } from '@/services/piece';
import {
  OCRStatus,
  OCRResult,
  DetectedElement,
  OCRError,
  OCRConfig,
  OCRCorrection,
} from './types';

interface OCRState {
  status: OCRStatus;
  result: OCRResult | null;
  corrections: OCRCorrection[];
  config: OCRConfig;
  
  uploadImage: (file: File) => Promise<void>;
  processImage: () => Promise<void>;
  applyCorrection: (correction: OCRCorrection) => void;
  applyAllCorrections: () => void;
  reset: () => void;
  
  getConfidenceReport: () => { high: number; medium: number; low: number };
  getErrorsByType: () => Record<OCRError['type'], number>;
  
  exportXml: () => string | null;
  saveToLibrary: () => Promise<void>;
}

const generateId = () => `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const defaultConfig: OCRConfig = {
  provider: 'audiveris',
  preprocessing: {
    denoise: true,
    deskew: true,
    contrastEnhance: true,
  },
  outputFormat: 'MusicXML',
};

export const useOCRStore = create<OCRState>()(
  (set, get) => ({
    status: 'idle',
    result: null,
    corrections: [],
    config: defaultConfig,

    uploadImage: async (file) => {
      set({ status: 'uploading' });
      
      try {
        const reader = new FileReader();
        const imageData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const mockResult: OCRResult = {
          id: generateId(),
          originalImage: imageData,
          generatedXml: '',
          confidence: 0.75,
          detectedElements: [],
          errors: [],
          timestamp: new Date(),
        };
        
        set({ result: mockResult, status: 'processing' });
      } catch (error) {
        set({ status: 'error' });
      }
    },

    processImage: async () => {
      const currentResult = get().result;
      if (!currentResult) return;
      
      set({ status: 'processing' });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract file name from original image for context
      const fileName = currentResult.originalImage.split('/').pop()?.split('.')[0] || 'Unknown';
      
      const mockElements: DetectedElement[] = [
        { id: 'e1', type: 'clef', position: { x: 50, y: 100, width: 30, height: 40 }, value: 'Treble Clef', confidence: 0.95 },
        { id: 'e2', type: 'keySignature', position: { x: 100, y: 100, width: 60, height: 40 }, value: 'C major', confidence: 0.88 },
        { id: 'e3', type: 'timeSignature', position: { x: 180, y: 100, width: 40, height: 40 }, value: '4/4', confidence: 0.92 },
        { id: 'e4', type: 'note', position: { x: 250, y: 120, width: 20, height: 30 }, value: 'C4', confidence: 0.78 },
        { id: 'e5', type: 'note', position: { x: 300, y: 110, width: 20, height: 30 }, value: 'E4', confidence: 0.65 },
        { id: 'e6', type: 'note', position: { x: 350, y: 100, width: 20, height: 30 }, value: 'G4', confidence: 0.45 },
      ];
      
      const mockErrors: OCRError[] = [
        { elementId: 'e5', type: 'low_confidence', message: '音符识别置信度较低', suggestion: '请确认是否为E4' },
        { elementId: 'e6', type: 'ambiguous', message: '音符识别不明确', suggestion: '可能是G4或A4' },
      ];
      
      // Generate MusicXML that matches the detected elements
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${fileName}</work-title>
  </work>
  <identification>
    <creator type="composer">OCR Import</creator>
    <encoding>
      <software>Resonance OCR</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <part-abbreviation>Pno.</part-abbreviation>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="3">
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <type>half</type>
      </note>
      <note>
        <rest>
          <duration>2</duration>
        </rest>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
      
      set({
        result: {
          ...currentResult,
          detectedElements: mockElements,
          errors: mockErrors,
          generatedXml: mockXml,
          confidence: 0.75,
        },
        status: 'reviewing',
      });
    },

    applyCorrection: (correction) => {
      const result = get().result;
      if (!result) return;
      
      const updatedElements = result.detectedElements.map(el => 
        el.id === correction.elementId
          ? { ...el, corrected: true, correctedValue: correction.correctedValue }
          : el
      );
      
      set((state) => ({
        corrections: [...state.corrections, correction],
        result: result ? { ...result, detectedElements: updatedElements } : null,
      }));
    },

    applyAllCorrections: () => {
      set({ status: 'completed' });
    },

    reset: () => {
      set({ status: 'idle', result: null, corrections: [] });
    },

    getConfidenceReport: () => {
      const result = get().result;
      if (!result) return { high: 0, medium: 0, low: 0 };
      
      const elements = result.detectedElements;
      return {
        high: elements.filter(e => e.confidence >= 0.8).length,
        medium: elements.filter(e => e.confidence >= 0.5 && e.confidence < 0.8).length,
        low: elements.filter(e => e.confidence < 0.5).length,
      };
    },

    getErrorsByType: () => {
      const result = get().result;
      if (!result) return { low_confidence: 0, ambiguous: 0, missing: 0, invalid: 0 };
      
      const errors = result.errors;
      return {
        low_confidence: errors.filter(e => e.type === 'low_confidence').length,
        ambiguous: errors.filter(e => e.type === 'ambiguous').length,
        missing: errors.filter(e => e.type === 'missing').length,
        invalid: errors.filter(e => e.type === 'invalid').length,
      };
    },

    exportXml: () => {
      const result = get().result;
      if (!result || get().status !== 'completed') return null;
      return result.generatedXml;
    },

    saveToLibrary: async () => {
      const result = get().result;
      const xml = get().exportXml();
      if (!result || !xml) return;

      // Create a blob URL for the musicXml so PracticePage can fetch it
      const blob = new Blob([xml], { type: 'application/xml' });
      const blobUrl = URL.createObjectURL(blob);

      // Create a local Piece from OCR result and add to piece store
      const newPiece: Piece = {
        id: `ocr-${Date.now()}`,
        title: `OCR识别 (${new Date().toLocaleDateString()})`,
        composer: 'OCR 导入',
        difficulty: 3,
        instrumentTypes: ['piano'],
        genres: ['classical'],
        durationSeconds: 120,
        musicXmlUrl: blobUrl,
        tags: ['ocr'],
        isPremium: false,
        isOfficial: false,
        playCount: 0,
        favoriteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      usePieceStore.setState((state) => ({
        pieces: [newPiece, ...state.pieces],
      }));
    },
  })
);

export function getOCRStore() {
  return useOCRStore.getState();
}