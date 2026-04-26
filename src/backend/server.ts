import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import pieceRoutes from './routes/pieces';
import practiceRoutes from './routes/practice';
import { testConnection } from './db/connection';
import { initRedis, testRedisConnection } from './db/redis';
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pieces', pieceRoutes);
app.use('/api/v1/practice', practiceRoutes);

// Health Check Route
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const [dbOk, redisOk] = await Promise.all([
      testConnection(),
      testRedisConnection(),
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
  res.send('Music Practice App Backend - Phase 9.5');
});

// Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    // Initialize connections
    await initRedis();
    
    const dbOk = await testConnection();
    const redisOk = await testRedisConnection();
    
    if (!dbOk || !redisOk) {
      console.error('Warning: Database or Redis connection failed on startup');
    } else {
      console.log('Database and Redis connections established');
    }

    app.listen(port, () => {
      console.log(`Backend server running at http://localhost:${port}`);
      console.log(`Health check available at http://localhost:${port}/api/health`);
      console.log(`Auth routes mounted at /api/v1/auth`);
      console.log(`Piece routes mounted at /api/v1/pieces`);
      console.log(`Practice & Stats routes mounted at /api/v1/practice`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;