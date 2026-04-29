import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';

import { ConversionJobResponse, ConversionSource } from '../../services/conversion/types';
import { conversionJobStore, MockOCREngine } from '../services/conversion';
import { AudiverisEngine, GOTOCR2Engine } from '../services/ocr';
import { validateWavBuffer, computeRmsAmplitude } from '../services/conversion/AudioValidator';
import { MockTranscriptionEngine } from '../services/conversion/MockTranscriptionEngine';

const router = Router();
const mockOCREngine = new MockOCREngine();
const mockTranscriptionEngine = new MockTranscriptionEngine();

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/bmp',
  'application/pdf',
]);

const ocrUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (OCR_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Invalid file type. Only PNG, JPEG, TIFF, BMP, and PDF files are allowed.'));
  },
});

const handleOCRError = (res: Response, message: string) => {
  res.status(400).json({
    error: {
      code: 'INVALID_OCR_UPLOAD',
      message,
    },
  });
};

const uploadSingleOCRFile = (req: Request, res: Response, next: NextFunction) => {
  ocrUpload.single('file')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      handleOCRError(res, 'File size must be 20MB or smaller.');
      return;
    }

    handleOCRError(
      res,
      error instanceof Error ? error.message : 'Invalid OCR upload.',
    );
  });
};

const toSource = (mimeType: string): ConversionSource => (
  mimeType === 'application/pdf' ? 'pdf' : 'image'
);

const runOCRJob = (jobId: string, file: Express.Multer.File) => {
  setTimeout(() => {
    void (async () => {
      const queuedJob = conversionJobStore.get(jobId);

      if (!queuedJob || queuedJob.status === 'error') {
        return;
      }

      conversionJobStore.updateStatus(jobId, 'processing');

      try {
        const engines = [new AudiverisEngine(), new GOTOCR2Engine()];
        let engine: any = null;
        for (const e of engines) {
          if (await e.isAvailable()) {
            engine = e;
            break;
          }
        }
        if (!engine) engine = mockOCREngine;

        const result = await engine.processImage(file.buffer, file.mimetype);
        const { warnings, ...conversionResult } = result;
        const processingJob = conversionJobStore.get(jobId);

        if (!processingJob || processingJob.status === 'error') {
          return;
        }

        for (const warning of warnings) {
          conversionJobStore.addWarning(jobId, warning);
        }

        conversionJobStore.updateStatus(jobId, 'review_ready', conversionResult);
      } catch (error) {
        conversionJobStore.updateStatus(jobId, 'error', undefined, {
          code: 'OCR_PROCESSING_FAILED',
          message: 'OCR processing failed.',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, 50);
};

router.post('/ocr', uploadSingleOCRFile, (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    handleOCRError(res, 'File is required.');
    return;
  }

  if (!OCR_ALLOWED_MIME_TYPES.has(file.mimetype)) {
    handleOCRError(res, 'Invalid file type. Only PNG, JPEG, TIFF, BMP, and PDF files are allowed.');
    return;
  }

  const job = conversionJobStore.create(
    'ocr',
    toSource(file.mimetype),
    file.originalname,
    file.mimetype,
  );
  runOCRJob(job.id, file);

  const response: ConversionJobResponse = {
    jobId: job.id,
    status: job.status,
  };

  res.status(202).json(response);
});

// ===== Transcription Route =====

const TRANSCRIPTION_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const TRANSCRIPTION_ALLOWED_MIME = new Set(['audio/wav', 'audio/wave', 'audio/x-wav']);

const transcriptionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TRANSCRIPTION_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (TRANSCRIPTION_ALLOWED_MIME.has(file.mimetype) || file.originalname.toLowerCase().endsWith('.wav')) {
      cb(null, true);
      return;
    }
    cb(new Error('仅支持 WAV 格式音频文件'));
  },
});

const uploadSingleAudioFile = (req: Request, res: Response, next: NextFunction) => {
  transcriptionUpload.single('file')(req, res, (error: unknown) => {
    if (!error) { next(); return; }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: '文件超过 50MB 限制' } });
      return;
    }
    res.status(400).json({ error: { code: 'INVALID_AUDIO_UPLOAD', message: error instanceof Error ? error.message : '无效的音频文件' } });
  });
};

const runTranscriptionJob = (jobId: string, file: Express.Multer.File) => {
  setTimeout(() => {
    void (async () => {
      const queuedJob = conversionJobStore.get(jobId);
      if (!queuedJob || queuedJob.status === 'error') return;

      conversionJobStore.updateStatus(jobId, 'processing');

      try {
        const result = await mockTranscriptionEngine.processAudio(file.buffer);
        const processingJob = conversionJobStore.get(jobId);
        if (!processingJob || processingJob.status === 'error') return;

        conversionJobStore.updateStatus(jobId, 'review_ready', result);
      } catch (error) {
        conversionJobStore.updateStatus(jobId, 'error', undefined, {
          code: 'TRANSCRIPTION_FAILED',
          message: '转谱处理失败',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, 1500);
};

router.post('/transcription', uploadSingleAudioFile, (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: { code: 'FILE_REQUIRED', message: '未提供音频文件' } });
    return;
  }

  // Validate WAV format
  const validation = validateWavBuffer(file.buffer);
  if (!validation.valid) {
    res.status(400).json({ error: { code: 'INVALID_WAV', message: validation.error } });
    return;
  }

  // Check audio level
  const rms = computeRmsAmplitude(file.buffer);
  if (rms < 0.001) {
    res.status(400).json({ error: { code: 'SILENT_AUDIO', message: '录音音量过低，无法识别' } });
    return;
  }

  const job = conversionJobStore.create('transcription', 'audio', file.originalname, file.mimetype);
  runTranscriptionJob(job.id, file);

  const response: ConversionJobResponse = {
    jobId: job.id,
    status: job.status,
  };

  res.status(202).json(response);
});

// ===== Generic Job Routes =====

router.get('/:jobId/result', (req: Request, res: Response) => {
  const job = conversionJobStore.get(req.params.jobId);

  if (!job) {
    res.status(404).json({
      error: {
        code: 'CONVERSION_JOB_NOT_FOUND',
        message: 'Conversion job not found.',
      },
    });
    return;
  }

  if (job.error) {
    res.status(400).json({ error: job.error });
    return;
  }

  if (!job.result) {
    res.status(202).json({ jobId: job.id, status: job.status });
    return;
  }

  res.json({ result: job.result });
});

router.get('/:jobId', (req: Request, res: Response) => {
  const job = conversionJobStore.get(req.params.jobId);

  if (!job) {
    res.status(404).json({
      error: {
        code: 'CONVERSION_JOB_NOT_FOUND',
        message: 'Conversion job not found.',
      },
    });
    return;
  }

  res.json({ job });
});

router.post('/:jobId/cancel', (req: Request, res: Response) => {
  const job = conversionJobStore.get(req.params.jobId);

  if (!job) {
    res.status(404).json({
      error: {
        code: 'CONVERSION_JOB_NOT_FOUND',
        message: 'Conversion job not found.',
      },
    });
    return;
  }

  if (job.status === 'review_ready' || job.status === 'completed') {
    res.status(409).json({
      error: {
        code: 'CONVERSION_JOB_ALREADY_FINISHED',
        message: 'Conversion job has already finished and cannot be cancelled.',
      },
    });
    return;
  }

  if (job.status !== 'error') {
    conversionJobStore.updateStatus(job.id, 'error', undefined, {
      code: 'CONVERSION_JOB_CANCELLED',
      message: 'Conversion job was cancelled.',
    });
    conversionJobStore.addWarning(job.id, 'Conversion was cancelled before completion.');
  }

  res.json({ job: conversionJobStore.get(job.id) });
});

export default router;
