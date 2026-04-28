import { create } from 'zustand';
import type { Piece } from '@/services/piece/types';
import { usePieceStore } from '@/services/piece';
import { DetectedElement, OCRConfig, OCRError, OCRCorrection, OCRResult, OCRStatus } from './types';

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

const generateId = () => `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const defaultConfig: OCRConfig = {
  provider: 'audiveris',
  preprocessing: {
    denoise: true,
    deskew: true,
    contrastEnhance: true,
  },
  outputFormat: 'MusicXML',
};

type BackendOCRResponse = {
  generatedXml?: string;
  confidence?: number;
  detectedElements?: DetectedElement[];
  errors?: OCRError[];
};

type LocalAnalysis = {
  elements: DetectedElement[];
  errors: OCRError[];
  confidence: number;
  measures: number;
};

async function readFileAsDataUrl(file: File): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

async function tryBackendOCR(file: File): Promise<BackendOCRResponse | null> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/v1/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片无法解析，请换用清晰的 JPG/PNG/WEBP。'));
    image.src = dataUrl;
  });
}

async function analyzeStaffLayout(dataUrl: string): Promise<LocalAnalysis> {
  const image = await loadImage(dataUrl);
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('浏览器不支持图片预处理。');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const rowInk: number[] = new Array(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    let darkPixels = 0;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const gray = imageData.data[index] * 0.299 + imageData.data[index + 1] * 0.587 + imageData.data[index + 2] * 0.114;
      if (gray < 120) darkPixels += 1;
    }
    rowInk[y] = darkPixels / width;
  }

  const lineRows = rowInk
    .map((ratio, y) => ({ ratio, y }))
    .filter(({ ratio }) => ratio > 0.16);

  const clusters: Array<{ y: number; height: number; strength: number }> = [];
  for (const row of lineRows) {
    const last = clusters[clusters.length - 1];
    if (last && row.y - (last.y + last.height) <= 2) {
      const totalStrength = last.strength + row.ratio;
      last.y = Math.round((last.y * last.strength + row.y * row.ratio) / totalStrength);
      last.height += 1;
      last.strength = totalStrength;
    } else {
      clusters.push({ y: row.y, height: 1, strength: row.ratio });
    }
  }

  const staffLines = clusters.filter((cluster) => cluster.height <= 5);
  const systems = Math.max(1, Math.round(staffLines.length / 5));
  const measures = Math.max(1, systems * 4);
  const elements: DetectedElement[] = staffLines.map((line, index) => ({
    id: `staff-${index + 1}`,
    type: 'barline',
    position: { x: 0, y: Math.round(line.y / scale), width: image.naturalWidth, height: Math.max(1, Math.round(line.height / scale)) },
    value: `谱线 ${index + 1}`,
    confidence: 0.82,
  }));

  const confidence = staffLines.length >= 10 ? 0.58 : 0.35;
  const errors: OCRError[] = [
    {
      elementId: 'omr-backend',
      type: 'missing',
      message: '当前未连接真正的 OMR 识谱服务，前端只能完成图片预处理和谱表定位，不能可靠识别音高、节奏与多声部。',
      suggestion: '部署 Audiveris 或云端 OMR 接口后，系统会优先使用后端返回的 MusicXML。',
    },
  ];

  if (staffLines.length < 10) {
    errors.push({
      elementId: 'staff-lines',
      type: 'low_confidence',
      message: '谱线定位较少，图片可能过暗、过斜或裁切不完整。',
      suggestion: '请使用正对拍摄、背景干净、分辨率更高的图片。',
    });
  }

  return { elements, errors, confidence, measures };
}

function generateReviewXml(measures: number, title: string): string {
  const measureXml = Array.from({ length: measures }, (_, index) => `
    <measure number="${index + 1}">
      ${index === 0 ? `
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>` : ''}
      <note>
        <rest />
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <identification><creator type="composer">OCR 校对草稿</creator><encoding><software>Resonance OCR</software></encoding></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">${measureXml}
  </part>
</score-partwise>`;
}

export const useOCRStore = create<OCRState>()((set, get) => ({
  status: 'idle',
  result: null,
  corrections: [],
  config: defaultConfig,

  uploadImage: async (file) => {
    set({ status: 'uploading' });

    try {
      const imageData = await readFileAsDataUrl(file);
      set({
        result: {
          id: generateId(),
          originalImage: imageData,
          generatedXml: '',
          confidence: 0,
          detectedElements: [],
          errors: [],
          timestamp: new Date(),
        },
        status: 'processing',
      });
    } catch {
      set({ status: 'error' });
      throw new Error('文件读取失败，请重新选择谱面图片。');
    }
  },

  processImage: async () => {
    const currentResult = get().result;
    if (!currentResult) return;

    set({ status: 'processing' });

    const file = await fetch(currentResult.originalImage)
      .then((response) => response.blob())
      .then((blob) => new File([blob], 'score-image', { type: blob.type }));

    const backend = await tryBackendOCR(file);
    if (backend?.generatedXml) {
      set({
        result: {
          ...currentResult,
          generatedXml: backend.generatedXml,
          confidence: backend.confidence ?? 0.8,
          detectedElements: backend.detectedElements ?? [],
          errors: backend.errors ?? [],
        },
        status: 'reviewing',
      });
      return;
    }

    try {
      const analysis = await analyzeStaffLayout(currentResult.originalImage);
      set({
        result: {
          ...currentResult,
          detectedElements: analysis.elements,
          errors: analysis.errors,
          generatedXml: generateReviewXml(analysis.measures, 'OCR 校对草稿'),
          confidence: analysis.confidence,
        },
        status: 'reviewing',
      });
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  applyCorrection: (correction) => {
    const result = get().result;
    if (!result) return;

    const updatedElements = result.detectedElements.map((element) =>
      element.id === correction.elementId
        ? { ...element, corrected: true, correctedValue: correction.correctedValue }
        : element
    );

    set((state) => ({
      corrections: [...state.corrections, correction],
      result: { ...result, detectedElements: updatedElements },
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

    return {
      high: result.detectedElements.filter((element) => element.confidence >= 0.8).length,
      medium: result.detectedElements.filter((element) => element.confidence >= 0.5 && element.confidence < 0.8).length,
      low: result.detectedElements.filter((element) => element.confidence < 0.5).length,
    };
  },

  getErrorsByType: () => {
    const result = get().result;
    const errors = result?.errors ?? [];
    return {
      low_confidence: errors.filter((error) => error.type === 'low_confidence').length,
      ambiguous: errors.filter((error) => error.type === 'ambiguous').length,
      missing: errors.filter((error) => error.type === 'missing').length,
      invalid: errors.filter((error) => error.type === 'invalid').length,
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

    const blob = new Blob([xml], { type: 'application/xml' });
    const blobUrl = URL.createObjectURL(blob);

    const newPiece: Piece = {
      id: `ocr-${Date.now()}`,
      title: `OCR 导入 (${new Date().toLocaleDateString()})`,
      composer: result.confidence >= 0.8 ? 'OMR 识别' : 'OCR 校对草稿',
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
      total: state.total + 1,
    }));
  },
}));

export function getOCRStore() {
  return useOCRStore.getState();
}
