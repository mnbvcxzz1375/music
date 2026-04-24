import { Router } from 'express';
import { testConnection } from '../db/connection';
import { testRedisConnection } from '../db/redis';

const router = Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };
  
  try {
    const dbOk = await testConnection();
    health.services.database = dbOk ? 'ok' : 'error';
  } catch {
    health.services.database = 'error';
  }
  
  try {
    const redisOk = await testRedisConnection();
    health.services.redis = redisOk ? 'ok' : 'error';
  } catch {
    health.services.redis = 'error';
  }
  
  const allOk = health.services.database === 'ok' && health.services.redis === 'ok';
  
  res.status(allOk ? 200 : 503).json(health);
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

router.get('/health/ready', async (req, res) => {
  try {
    const dbOk = await testConnection();
    const redisOk = await testRedisConnection();
    
    if (dbOk && redisOk) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

router.get('/metrics', (req, res) => {
  const metrics = {
    process: {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
    },
    timestamps: {
      current: Date.now(),
      started: Date.now() - Math.floor(process.uptime() * 1000),
    },
  };
  
  res.json(metrics);
});

router.get('/info', (req, res) => {
  res.json({
    name: 'Music Practice App API',
    version: '1.0.0',
    description: 'Backend API for Music Practice Application',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      pieces: '/api/pieces',
      payments: '/api/payments',
      subscriptions: '/api/subscriptions',
      storage: '/api/storage',
    },
  });
});

export default router;