import { useState, useRef } from 'react';
import { Button, Card, CardContent, CardHeader, CardFooter, Input } from '../UI';
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
    exportXml,
  } = useOCRStore();
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
      await processImage();
    }
  };

  const handleApplyCorrection = () => {
    if (selectedElement && correctionValue) {
      applyCorrection({
        elementId: selectedElement,
        originalValue: result?.detectedElements.find(e => e.id === selectedElement)?.value || '',
        correctedValue: correctionValue,
      });
      setSelectedElement(null);
      setCorrectionValue('');
    }
  };

  const handleComplete = () => {
    applyAllCorrections();
    const xml = exportXml();
    if (xml && onComplete) {
      onComplete(xml);
    }
  };

  const confidenceReport = getConfidenceReport();

  if (status === 'idle') {
    return (
      <div className="ocr-page">
        <header className="ocr-header">
          <h1 className="ocr-title">OCR 乐谱导入</h1>
        </header>
        
        <main className="ocr-content">
          <Card variant="elevated">
            <CardContent>
              <div className="ocr-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="ocr-file-input"
                />
                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                  选择乐谱图片
                </Button>
                <p className="ocr-upload-hint">
                  支持 JPG、PNG、PDF 格式的乐谱图片
                </p>
              </div>
            </CardContent>
          </Card>
          
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              取消
            </Button>
          )}
        </main>
      </div>
    );
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="ocr-page">
        <header className="ocr-header">
          <h1 className="ocr-title">OCR 乐谱导入</h1>
        </header>
        
        <main className="ocr-content">
          <Card variant="elevated">
            <CardContent>
              <div className="ocr-loading">
                <div className="ocr-spinner" />
                <p className="ocr-loading-text">
                  {status === 'uploading' ? '正在上传图片...' : '正在识别乐谱...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (status === 'reviewing' && result) {
    return (
      <div className="ocr-page">
        <header className="ocr-header">
          <h1 className="ocr-title">OCR 校对</h1>
          <div className="ocr-header-actions">
            <Button variant="ghost" onClick={reset}>
              重新上传
            </Button>
          </div>
        </header>
        
        <main className="ocr-content">
          <div className="ocr-review-grid">
            <Card variant="outlined">
              <CardHeader title="原始图片" />
              <CardContent>
                <div className="ocr-image-container">
                  <img 
                    src={result.originalImage} 
                    alt="原始乐谱" 
                    className="ocr-original-image"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card variant="outlined">
              <CardHeader title="识别结果" />
              <CardContent>
                <div className="ocr-elements-list">
                  {result.detectedElements.map((element) => (
                    <div 
                      key={element.id}
                      className={`ocr-element-item ${getConfidenceClass(element.confidence)} ${selectedElement === element.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedElement(element.id);
                        setCorrectionValue(element.correctedValue || element.value);
                      }}
                    >
                      <span className="ocr-element-type">{getElementLabel(element.type)}</span>
                      <span className="ocr-element-value">
                        {element.correctedValue || element.value}
                      </span>
                      <span className="ocr-element-confidence">
                        {Math.round(element.confidence * 100)}%
                      </span>
                      {element.corrected && (
                        <span className="ocr-element-corrected">已修正</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card variant="elevated">
            <CardHeader title="置信度报告" />
            <CardContent>
              <div className="ocr-confidence-report">
                <div className="ocr-confidence-item high">
                  <span className="ocr-confidence-label">高置信度</span>
                  <span className="ocr-confidence-value">{confidenceReport.high}</span>
                </div>
                <div className="ocr-confidence-item medium">
                  <span className="ocr-confidence-label">中等置信度</span>
                  <span className="ocr-confidence-value">{confidenceReport.medium}</span>
                </div>
                <div className="ocr-confidence-item low">
                  <span className="ocr-confidence-label">低置信度</span>
                  <span className="ocr-confidence-value">{confidenceReport.low}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {result.errors.length > 0 && (
            <Card variant="elevated">
              <CardHeader title="需要校对的元素" />
              <CardContent>
                <div className="ocr-errors-list">
                  {result.errors.map((error) => (
                    <div key={error.elementId} className="ocr-error-item">
                      <span className="ocr-error-type">{getErrorLabel(error.type)}</span>
                      <span className="ocr-error-message">{error.message}</span>
                      {error.suggestion && (
                        <span className="ocr-error-suggestion">建议: {error.suggestion}</span>
                      )}
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
                  <Input
                    label="修正值"
                    value={correctionValue}
                    onChange={(e) => setCorrectionValue(e.target.value)}
                    placeholder="输入正确的值"
                  />
                  <Button variant="primary" onClick={handleApplyCorrection}>
                    应用修正
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="ocr-actions">
            <Button variant="secondary" onClick={onCancel || reset}>
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handleComplete}
              disabled={result.errors.length > corrections.length}
            >
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
        <header className="ocr-header">
          <h1 className="ocr-title">OCR 完成</h1>
        </header>
        
        <main className="ocr-content">
          <Card variant="elevated">
            <CardContent>
              <div className="ocr-success">
                <span className="ocr-success-icon">✓</span>
                <p className="ocr-success-text">乐谱已成功识别并校对完成</p>
                <p className="ocr-success-detail">
                  共识别 {result?.detectedElements.length} 个元素，
                  修正 {corrections.length} 个错误
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="primary" onClick={() => onComplete?.(result?.generatedXml || '')}>
                开始练习
              </Button>
              <Button variant="secondary" onClick={reset}>
                导入新乐谱
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="ocr-page">
      <header className="ocr-header">
        <h1 className="ocr-title">OCR 错误</h1>
      </header>
      
      <main className="ocr-content">
        <Card variant="elevated">
          <CardContent>
            <div className="ocr-error-page">
              <span className="ocr-error-icon">✗</span>
              <p className="ocr-error-text">OCR 识别失败</p>
              <Button variant="primary" onClick={reset}>
                重试
              </Button>
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
    barline: '小节线',
    text: '文字',
  };
  return labels[type] || type;
}

function getErrorLabel(type: OCRError['type']): string {
  const labels = {
    low_confidence: '低置信度',
    ambiguous: '识别不明确',
    missing: '缺失元素',
    invalid: '无效识别',
  };
  return labels[type] || type;
}