import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ImageIcon, RotateCcw, Save, ScanLine } from 'lucide-react';
import { Button, Card, CardContent, CardFooter, CardHeader, Input } from '../UI';
import ScoreRenderer from '../ScoreRenderer/ScoreRenderer';
import { useOCRStore } from '@/services/ocr';
import { DetectedElement, OCRError } from '@/services/ocr/types';

export interface OCRCorrectionPageProps {
  onComplete?: (xml: string) => void;
  onCancel?: () => void;
}

export function OCRCorrectionPage({ onComplete, onCancel }: OCRCorrectionPageProps) {
  const {
    status,
    result,
    corrections,
    uploadImage,
    processImage,
    applyCorrection,
    applyAllCorrections,
    reset,
    getConfidenceReport,
    saveToLibrary,
  } = useOCRStore();

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const [previewTab, setPreviewTab] = useState<'image' | 'score'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    await processImage();
  };

  const handleApplyCorrection = () => {
    if (!selectedElement || !correctionValue.trim()) return;
    applyCorrection({
      elementId: selectedElement,
      originalValue: result?.detectedElements.find((element) => element.id === selectedElement)?.value || '',
      correctedValue: correctionValue.trim(),
    });
    setSelectedElement(null);
    setCorrectionValue('');
  };

  const handleSaveToLibrary = async () => {
    await saveToLibrary();
    navigate('/library');
  };

  const confidenceReport = getConfidenceReport();

  if (status === 'idle') {
    return (
      <div className="ocr-page">
        <header className="ocr-header">
          <h1 className="ocr-title">谱面扫描</h1>
          {onCancel && <Button variant="ghost" onClick={onCancel}>取消</Button>}
        </header>

        <main className="ocr-content">
          <Card variant="elevated">
            <CardContent>
              <div className="ocr-upload-area">
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="ocr-file-input" />
                <ScanLine size={42} />
                <Button variant="primary" icon={<ImageIcon size={18} />} onClick={() => fileInputRef.current?.click()}>
                  选择谱面图片
                </Button>
                <p className="ocr-upload-hint">建议使用正对拍摄、完整留白、分辨率较高的图片。系统会先校对再入库。</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="ocr-page">
        <header className="ocr-header"><h1 className="ocr-title">谱面扫描</h1></header>
        <main className="ocr-content">
          <Card variant="elevated">
            <CardContent>
              <div className="ocr-loading">
                <div className="ocr-spinner" />
                <p className="ocr-loading-text">{status === 'uploading' ? '正在读取图片...' : '正在分析谱面...'}</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (status === 'reviewing' && result) {
    const blockingErrors = result.errors.filter((error) => error.type === 'missing' || error.type === 'invalid');

    return (
      <div className="ocr-page">
        <header className="ocr-header">
          <div>
            <h1 className="ocr-title">识别校对</h1>
            <p className="ocr-header-note">先检查原图和谱面预览，再决定保存。低置信度结果不会自动当作完整曲谱。</p>
          </div>
          <div className="ocr-header-actions">
            <Button variant="ghost" icon={<RotateCcw size={18} />} onClick={reset}>重新上传</Button>
          </div>
        </header>

        <main className="ocr-content">
          {blockingErrors.length > 0 && (
            <div className="ocr-warning-banner">
              <AlertTriangle size={18} />
              <span>当前没有后端 OMR 返回的完整 MusicXML。已完成图片预处理和谱表定位，但音符、节奏和多声部仍需接入 Audiveris/云识谱。</span>
            </div>
          )}

          <Card variant="outlined">
            <CardHeader
              title="预览"
              action={
                <div className="ocr-preview-tabs">
                  <button className={`ocr-tab-btn ${previewTab === 'image' ? 'active' : ''}`} type="button" onClick={() => setPreviewTab('image')}>原图</button>
                  <button className={`ocr-tab-btn ${previewTab === 'score' ? 'active' : ''}`} type="button" onClick={() => setPreviewTab('score')}>MusicXML 预览</button>
                </div>
              }
            />
            <CardContent>
              {previewTab === 'image' ? (
                <div className="ocr-image-container">
                  <img src={result.originalImage} alt="原始乐谱" className="ocr-original-image" />
                </div>
              ) : result.generatedXml ? (
                <div className="ocr-score-preview">
                  <ScoreRenderer xml={result.generatedXml} className="ocr-score-renderer" />
                </div>
              ) : (
                <p className="ocr-no-score">暂无谱面预览数据。</p>
              )}
            </CardContent>
          </Card>

          <div className="ocr-review-grid">
            <Card variant="outlined">
              <CardHeader title="检测结果" subtitle={`整体置信度 ${Math.round(result.confidence * 100)}%`} />
              <CardContent>
                <div className="ocr-elements-list">
                  {result.detectedElements.map((element) => (
                    <button
                      type="button"
                      key={element.id}
                      className={`ocr-element-item ${getConfidenceClass(element.confidence)} ${selectedElement === element.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedElement(element.id);
                        setCorrectionValue(element.correctedValue || element.value);
                      }}
                    >
                      <span className="ocr-element-type">{getElementLabel(element.type)}</span>
                      <span className="ocr-element-value">{element.correctedValue || element.value}</span>
                      <span className="ocr-element-confidence">{Math.round(element.confidence * 100)}%</span>
                      {element.corrected && <span className="ocr-element-corrected">已修正</span>}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader title="置信度报告" />
              <CardContent>
                <div className="ocr-confidence-report">
                  <div className="ocr-confidence-item high"><span>高</span><strong>{confidenceReport.high}</strong></div>
                  <div className="ocr-confidence-item medium"><span>中</span><strong>{confidenceReport.medium}</strong></div>
                  <div className="ocr-confidence-item low"><span>低</span><strong>{confidenceReport.low}</strong></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {result.errors.length > 0 && (
            <Card variant="outlined">
              <CardHeader title="需要处理的问题" />
              <CardContent>
                <div className="ocr-errors-list">
                  {result.errors.map((error) => (
                    <div key={error.elementId} className="ocr-error-item">
                      <span className="ocr-error-type">{getErrorLabel(error.type)}</span>
                      <span className="ocr-error-message">{error.message}</span>
                      {error.suggestion && <span className="ocr-error-suggestion">建议：{error.suggestion}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedElement && (
            <Card variant="elevated">
              <CardHeader title="修正元素" />
              <CardContent>
                <div className="ocr-correction-form">
                  <Input label="修正值" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} placeholder="输入正确值" />
                  <Button variant="primary" onClick={handleApplyCorrection}>应用修正</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="ocr-actions">
            <Button variant="secondary" onClick={onCancel || reset}>取消</Button>
            <Button variant="primary" onClick={applyAllCorrections} disabled={result.errors.length > corrections.length && blockingErrors.length === 0}>
              完成校对
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="ocr-page">
        <header className="ocr-header"><h1 className="ocr-title">校对完成</h1></header>
        <main className="ocr-content">
          <Card variant="elevated">
            <CardContent>
              <div className="ocr-success">
                <CheckCircle2 size={40} />
                <p className="ocr-success-text">校对流程已完成</p>
                <p className="ocr-success-detail">检测 {result?.detectedElements.length ?? 0} 个元素，修正 {corrections.length} 项。</p>
              </div>
            </CardContent>
            {result?.generatedXml && (
              <div className="ocr-score-preview-container">
                <Card variant="outlined">
                  <CardHeader title="结果预览" />
                  <CardContent>
                    <div className="ocr-score-preview">
                      <ScoreRenderer xml={result.generatedXml} className="ocr-score-renderer" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <CardFooter>
              <Button variant="primary" onClick={() => onComplete?.(result?.generatedXml || '')}>开始练习</Button>
              <Button variant="secondary" icon={<Save size={18} />} onClick={handleSaveToLibrary}>保存到曲库</Button>
              <Button variant="ghost" onClick={reset}>导入新乐谱</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="ocr-page">
      <header className="ocr-header"><h1 className="ocr-title">识别失败</h1></header>
      <main className="ocr-content">
        <Card variant="elevated">
          <CardContent>
            <div className="ocr-error-page">
              <AlertTriangle size={40} />
              <p className="ocr-error-text">谱面识别失败，请换一张更清晰、无遮挡的图片。</p>
              <Button variant="primary" onClick={reset}>重试</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

function getElementLabel(type: DetectedElement['type']): string {
  const labels = {
    note: '音符',
    rest: '休止符',
    clef: '谱号',
    keySignature: '调号',
    timeSignature: '拍号',
    barline: '谱线/小节线',
    text: '文字',
  };
  return labels[type] || type;
}

function getErrorLabel(type: OCRError['type']): string {
  const labels = {
    low_confidence: '低置信度',
    ambiguous: '不明确',
    missing: '能力缺失',
    invalid: '无效识别',
  };
  return labels[type] || type;
}
