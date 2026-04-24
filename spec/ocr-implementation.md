# OCR技术路线设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | AI工程师 |

---

## 1. OCR技术选型

### 1.1 技术方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 云端TensorFlow模型 | 高准确率、可控性强 | 需要GPU服务器、成本高 | 主方案 |
| 第三方API（Google/Azure） | 快速集成、无需维护 | 成本高、依赖外部服务 | 备选方案 |
| Audiveris本地微服务 | 无网络依赖、隐私保护 | 仅支持桌面端、准确率中等 | 本地方案 |

### 1.2 混合方案架构

```
┌─────────────────────────────────────────────────────────────┐
│                    OCR技术架构                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │   Client    │                                            │
│  │  上传图片   │                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  图像预处理 │────>│  OCR识别    │────>│  结果评估   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   │                   │            │
│        │                   ▼                   │            │
│        │             ┌─────────────┐           │            │
│        │             │ 云端模型    │           │            │
│        │             │ (主方案)    │           │            │
│        │             └─────────────┘           │            │
│        │                   │                   │            │
│        │                   ▼                   │            │
│        │             ┌─────────────┐           │            │
│        │             │ 第三方API   │           │            │
│        │             │ (备选)      │           │            │
│        │             └─────────────┘           │            │
│        │                   │                   │            │
│        │                   ▼                   │            │
│        │             ┌─────────────┐           │            │
│        │             │ Audiveris   │           │            │
│        │             │ (本地)      │           │            │
│        │             └─────────────┘           │            │
│        │                   │                   │            │
│        ▼                   ▼                   ▼            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MusicXML生成与校对                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 云端模型配置

```typescript
interface CloudOCRConfig {
  modelPath: string;
  gpuMemory: number;
  batchSize: number;
  timeout: number;
  
  model: {
    architecture: 'CNN + LSTM + CTC';
    inputSize: [512, 512];
    outputFormat: 'MusicXML';
  };
  
  server: {
    type: 'AWS EC2 g4dn.xlarge';
    region: 'us-east-1';
    autoScaling: true;
  };
}
```

### 1.4 第三方API配置

```typescript
interface ThirdPartyOCRConfig {
  google: {
    apiKey: string;
    endpoint: 'https://vision.googleapis.com/v1/images:annotate';
    features: ['DOCUMENT_TEXT_DETECTION'];
  };
  
  azure: {
    apiKey: string;
    endpoint: 'https://*.cognitiveservices.azure.com/';
    apiVersion: '2023-02-01-preview';
  };
}
```

---

## 2. 图像处理流程设计

### 2.1 预处理流程图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  原始图片   │────>│  去噪处理   │────>│  二值化     │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ 高斯滤波    │     │ 自适应阈值  │
                    └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  分割识别   │────>│  结构解析   │────>│ MusicXML    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      ▼                   ▼
┌─────────────┐     ┌─────────────┐
│ 倾斜校正    │     │ 符号识别    │
└─────────────┘     └─────────────┘
```

### 2.2 去噪处理（高斯滤波）

```typescript
const gaussianFilter = (image: ImageData, kernelSize: number = 5): ImageData => {
  const sigma = 1.4;
  const kernel = generateGaussianKernel(kernelSize, sigma);
  
  const result = new ImageData(image.width, image.height);
  
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      let sum = 0;
      let weightSum = 0;
      
      for (let ky = -kernelSize / 2; ky <= kernelSize / 2; ky++) {
        for (let kx = -kernelSize / 2; kx <= kernelSize / 2; kx++) {
          const px = Math.min(Math.max(x + kx, 0), image.width - 1);
          const py = Math.min(Math.max(y + ky, 0), image.height - 1);
          const weight = kernel[ky + kernelSize / 2][kx + kernelSize / 2];
          sum += image.data[py * image.width + px] * weight;
          weightSum += weight;
        }
      }
      
      result.data[y * image.width + x] = sum / weightSum;
    }
  }
  
  return result;
};

const generateGaussianKernel = (size: number, sigma: number): number[][] => {
  const kernel: number[][] = [];
  const center = size / 2;
  
  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      kernel[y][x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }
  
  return kernel;
};
```

### 2.3 二值化处理（自适应阈值）

```typescript
const adaptiveThreshold = (
  image: ImageData,
  blockSize: number = 11,
  c: number = 2
): ImageData => {
  const result = new ImageData(image.width, image.height);
  
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const localMean = calculateLocalMean(image, x, y, blockSize);
      const threshold = localMean - c;
      
      const pixel = image.data[y * image.width + x];
      result.data[y * image.width + x] = pixel > threshold ? 255 : 0;
    }
  }
  
  return result;
};

const calculateLocalMean = (
  image: ImageData,
  x: number,
  y: number,
  blockSize: number
): number => {
  let sum = 0;
  let count = 0;
  const halfBlock = blockSize / 2;
  
  for (let dy = -halfBlock; dy <= halfBlock; dy++) {
    for (let dx = -halfBlock; dx <= halfBlock; dx++) {
      const px = Math.min(Math.max(x + dx, 0), image.width - 1);
      const py = Math.min(Math.max(y + dy, 0), image.height - 1);
      sum += image.data[py * image.width + px];
      count++;
    }
  }
  
  return sum / count;
};
```

### 2.4 倾斜校正（Hough变换）

```typescript
const houghTransformSkewCorrection = (image: ImageData): ImageData => {
  const edges = detectEdges(image);
  const lines = houghLineDetection(edges);
  
  const angles = lines.map(line => line.angle);
  const skewAngle = calculateMedianAngle(angles);
  
  if (Math.abs(skewAngle) > 0.5) {
    return rotateImage(image, -skewAngle);
  }
  
  return image;
};

const houghLineDetection = (edges: ImageData): Line[] => {
  const lines: Line[] = [];
  const accumulator: Map<string, number> = new Map();
  
  for (let y = 0; y < edges.height; y++) {
    for (let x = 0; x < edges.width; x++) {
      if (edges.data[y * edges.width + x] > 0) {
        for (let theta = 0; theta < 180; theta += 1) {
          const rad = theta * Math.PI / 180;
          const rho = x * Math.cos(rad) + y * Math.sin(rad);
          const key = `${Math.round(rho)}_${theta}`;
          accumulator.set(key, (accumulator.get(key) || 0) + 1);
        }
      }
    }
  }
  
  const threshold = edges.width * 0.1;
  for (const [key, votes] of accumulator) {
    if (votes > threshold) {
      const [rho, theta] = key.split('_').map(Number);
      lines.push({ rho, angle: theta, votes });
    }
  }
  
  return lines;
};
```

---

## 3. OCR置信度评估机制

### 3.1 分级处理策略

| 置信度 | 处理方式 | 用户操作 | 说明 |
|--------|----------|----------|------|
| ≥90% | 直接导入 | 可选校对 | 高置信度，用户可选择是否校对 |
| 80-89% | 强制校对 | 必须校对 | 中等置信度，必须进入校对流程 |
| <80% | 拒绝导入 | 建议重新扫描 | 低置信度，建议用户重新上传更清晰的图片 |

### 3.2 置信度计算

```typescript
interface OCRResult {
  confidence: number;
  musicxml: string;
  suggestedAction: 'direct_import' | 'force_review' | 'reject';
  details: {
    symbolConfidence: number[];
    structureConfidence: number;
    overallConfidence: number;
  };
}

const calculateConfidence = (recognizedSymbols: RecognizedSymbol[]): number => {
  const symbolConfidences = recognizedSymbols.map(s => s.confidence);
  const avgSymbolConfidence = symbolConfidences.reduce((a, b) => a + b, 0) / symbolConfidences.length;
  
  const structureConfidence = evaluateStructure(recognizedSymbols);
  
  const overallConfidence = (avgSymbolConfidence * 0.6 + structureConfidence * 0.4);
  
  return overallConfidence;
};

const evaluateStructure = (symbols: RecognizedSymbol[]): number => {
  let score = 100;
  
  const staffLines = symbols.filter(s => s.type === 'staff_line');
  if (staffLines.length < 5) score -= 20;
  
  const clefs = symbols.filter(s => s.type === 'clef');
  if (clefs.length === 0) score -= 15;
  
  const timeSignatures = symbols.filter(s => s.type === 'time_signature');
  if (timeSignatures.length === 0) score -= 10;
  
  const notes = symbols.filter(s => s.type === 'note');
  if (notes.length === 0) score -= 30;
  
  return Math.max(0, score);
};
```

### 3.3 处理决策

```typescript
const determineOCRAction = (confidence: number): OCRResult['suggestedAction'] => {
  if (confidence >= 90) return 'direct_import';
  if (confidence >= 80) return 'force_review';
  return 'reject';
};

const processOCRResult = async (result: OCRResult, userId: string): ProcessResult => {
  switch (result.suggestedAction) {
    case 'direct_import':
      return {
        status: 'success',
        pieceId: await createPiece(result.musicxml, userId),
        requiresReview: false,
      };
      
    case 'force_review':
      return {
        status: 'needs_review',
        reviewSessionId: await createReviewSession(result, userId),
        requiresReview: true,
      };
      
    case 'reject':
      return {
        status: 'rejected',
        reason: '置信度过低，建议重新扫描',
        requiresReview: false,
      };
  }
};
```

---

## 4. MusicXML生成流程

### 4.1 符号识别到MusicXML映射

```typescript
const symbolToMusicXML = (symbols: RecognizedSymbol[]): string => {
  const measures = groupSymbolsByMeasure(symbols);
  
  let musicxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">`;
  
  for (const measure of measures) {
    musicxml += generateMeasureXML(measure);
  }
  
  musicxml += `  </part>
</score-partwise>`;
  
  return musicxml;
};

const generateMeasureXML = (measure: Measure): string => {
  let xml = `<measure number="${measure.number}">`;
  
  if (measure.clef) {
    xml += `<attributes>
      <clef>
        <sign>${measure.clef.sign}</sign>
        <line>${measure.clef.line}</line>
      </clef>
    </attributes>`;
  }
  
  for (const note of measure.notes) {
    xml += generateNoteXML(note);
  }
  
  xml += `</measure>`;
  return xml;
};

const generateNoteXML = (note: Note): string => {
  return `<note>
    <pitch>
      <step>${note.step}</step>
      <alter>${note.alter || 0}</alter>
      <octave>${note.octave}</octave>
    </pitch>
    <duration>${note.duration}</duration>
    <type>${note.type}</type>
  </note>`;
};
```

---

## 5. 校对流程设计

### 5.1 校对界面设计

```
┌─────────────────────────────────────────────────────────────┐
│                    OCR校对界面                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │                     │   │                     │         │
│  │    原始乐谱图片     │   │    识别结果预览     │         │
│  │                     │   │                     │         │
│  │    [高亮可疑区域]   │   │    [可编辑MusicXML] │         │
│  │                     │   │                     │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  置信度报告:                                         │   │
│  │  - 符号识别: 85%                                     │   │
│  │  - 结构完整性: 92%                                   │   │
│  │  - 综合置信度: 87%                                   │   │
│  │  - 建议: 强制校对                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [确认导入]  [重新扫描]  [手动编辑]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 校对流程实现

```typescript
interface ReviewSession {
  id: string;
  userId: string;
  originalImage: string;
  recognizedResult: OCRResult;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  corrections: Correction[];
  createdAt: Date;
}

interface Correction {
  symbolId: string;
  originalValue: string;
  correctedValue: string;
  confidence: number;
}

const createReviewSession = async (
  result: OCRResult,
  userId: string
): string => {
  const session = await db.ocr_review_sessions.create({
    user_id: userId,
    original_image: result.imageUrl,
    recognized_musicxml: result.musicxml,
    confidence: result.confidence,
    status: 'pending',
  });
  
  return session.id;
};

const applyCorrection = async (
  sessionId: string,
  correction: Correction
): void => {
  await db.ocr_corrections.create({
    session_id: sessionId,
    symbol_id: correction.symbolId,
    original_value: correction.originalValue,
    corrected_value: correction.correctedValue,
  });
  
  await updateMusicXML(sessionId, correction);
};

const completeReview = async (sessionId: string): string => {
  const session = await db.ocr_review_sessions.findUnique({
    where: { id: sessionId },
    include: { corrections: true },
  });
  
  const finalMusicXML = applyAllCorrections(
    session.recognized_musicxml,
    session.corrections
  );
  
  const pieceId = await createPiece(finalMusicXML, session.user_id);
  
  await db.ocr_review_sessions.update({
    where: { id: sessionId },
    data: { status: 'completed', final_piece_id: pieceId },
  });
  
  return pieceId;
};
```

---

## 6. 技术架构图

### 6.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    OCR系统架构                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    前端层                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │ 图片上传│  │ 校对界面│  │ 结果预览│             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    API层                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │ OCR API │  │ 校对API │  │ 导入API │             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    服务层                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │预处理服务│  │ OCR服务 │  │ 校对服务│             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    存储层                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │ 图片存储│  │ Redis   │  │PostgreSQL│             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. API接口定义

### 7.1 OCR端点

| 端点 | 方法 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| /pieces/ocr | POST | 上传图片进行OCR | multipart/form-data | OCRResult |
| /pieces/ocr/:sessionId | GET | 获取校对会话 | - | ReviewSession |
| /pieces/ocr/:sessionId/correct | POST | 提交修正 | Correction | Success |
| /pieces/ocr/:sessionId/complete | POST | 完成校对 | - | PieceId |
| /pieces/ocr/:sessionId/reject | POST | 拒绝结果 | - | Success |

### 7.2 API实现

```typescript
const ocrUploadHandler = async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const imageFile = req.file;
  
  const preprocessed = await preprocessImage(imageFile);
  const result = await performOCR(preprocessed);
  
  if (result.suggestedAction === 'reject') {
    return res.json({
      success: false,
      error: { code: ErrorCode.OCR_CONFIDENCE_TOO_LOW, message: '置信度过低' }
    });
  }
  
  if (result.suggestedAction === 'force_review') {
    const sessionId = await createReviewSession(result, userId);
    return res.json({
      success: true,
      data: { sessionId, requiresReview: true, confidence: result.confidence }
    });
  }
  
  const pieceId = await createPiece(result.musicxml, userId);
  return res.json({
    success: true,
    data: { pieceId, requiresReview: false }
  });
};
```

---

## 8. 性能指标和优化策略

### 8.1 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 处理时间 | <30秒 | 单张图片OCR处理时间 |
| 准确率 | >85% | 符号识别准确率 |
| 并发处理 | 10请求 | 同时处理请求数 |
| GPU利用率 | <80% | GPU资源使用率 |

### 8.2 优化策略

```typescript
const optimizationStrategies = {
  caching: {
    enabled: true,
    ttl: 3600,
    keyPattern: 'ocr:result:{imageHash}',
  },
  
  batching: {
    enabled: true,
    maxBatchSize: 5,
    timeout: 5000,
  },
  
  modelOptimization: {
    quantization: 'dynamic',
    precision: 'float16',
    pruning: true,
  },
  
  preprocessingOptimization: {
    parallelProcessing: true,
    gpuAcceleration: true,
  },
};
```

---

## 9. 错误处理和降级方案

### 9.1 错误处理

```typescript
const handleOCRError = async (error: OCRError): ErrorResponse => {
  switch (error.type) {
    case 'image_invalid':
      return {
        success: false,
        error: { code: ErrorCode.OCR_SERVICE_UNAVAILABLE, message: '图片格式不支持' }
      };
      
    case 'processing_timeout':
      return {
        success: false,
        error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR, message: '处理超时' }
      };
      
    case 'model_error':
      return {
        success: false,
        error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR, message: '模型处理错误' }
      };
      
    default:
      return {
        success: false,
        error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR, message: '未知错误' }
      };
  }
};
```

### 9.2 降级方案

```typescript
const fallbackOCRStrategy = async (image: ImageData): OCRResult => {
  try {
    return await cloudOCR(image);
  } catch (cloudError) {
    console.warn('云端OCR失败，尝试第三方API');
    
    try {
      return await thirdPartyOCR(image);
    } catch (thirdPartyError) {
      console.warn('第三方API失败，尝试本地OCR');
      
      try {
        return await localOCR(image);
      } catch (localError) {
        throw new OCRError('all_methods_failed');
      }
    }
  }
};

const degradedMode = {
  enabled: false,
  fallbackOrder: ['cloud', 'third_party', 'local'],
  retryAttempts: 3,
  retryDelay: 1000,
};
```

---

## 10. 测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| OCR-01 | 高置信度图片 | 上传清晰乐谱 | 直接导入 |
| OCR-02 | 中置信度图片 | 上传模糊乐谱 | 强制校对 |
| OCR-03 | 低置信度图片 | 上传损坏图片 | 拒绝导入 |
| OCR-04 | 校对流程 | 提交修正 | 更新MusicXML |
| OCR-05 | 云端失败降级 | 模拟云端失败 | 使用第三方API |
| OCR-06 | 性能测试 | 连续10张图片 | <30秒/张 |

---

*文档结束*