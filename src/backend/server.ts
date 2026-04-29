import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import conversionRoutes from './routes/conversions';
import { errorHandler, requestLogger } from './middleware/errorHandler';

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes - conversion only (OCR + transcription)
app.use('/api/v1/conversions', conversionRoutes);

// Health Check Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      conversions: 'available',
    },
  });
});

// Root Route
app.get('/', (_req: Request, res: Response) => {
  res.send('Music Practice App Backend - Conversion Service');
});

// Error Handler
app.use(errorHandler);

// Start Server
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log(`Conversion routes: http://localhost:${port}/api/v1/conversions`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/v1/conversions/ocr          - OCR image upload');
  console.log('  POST /api/v1/conversions/transcription - Audio transcription');
  console.log('  GET  /api/v1/conversions/:jobId        - Check job status');
});

export default app;
