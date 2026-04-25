import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { checkConnection } from './db/connection';
import { checkRedis } from './db/redis';

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Health Check Route
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const [dbOk, redisOk] = await Promise.all([
      checkConnection(),
      checkRedis(),
    ]);

    const status = dbOk && redisOk ? 200 : 503;
    res.status(status).json({
      status: status === 200 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'connected' : 'disconnected',
        cache: redisOk ? 'connected' : 'disconnected',
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Root Route
app.get('/', (_req: Request, res: Response) => {
  res.send('Music Practice App Backend API - Phase 9.1 Ready');
});

// Start Server
const startServer = async () => {
  try {
    app.listen(port, () => {
      console.log(`Backend server running at http://localhost:${port}`);
      console.log(`Health check available at http://localhost:${port}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;