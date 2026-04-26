import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', err => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Initialize connection
let isConnected = false;

export async function initRedis(): Promise<void> {
  if (!isConnected && !redisClient.isOpen) {
    await redisClient.connect();
    isConnected = true;
  }
}

// Health check
export async function testRedisConnection(): Promise<boolean> {
  try {
    if (!redisClient.isOpen) return false;
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

// Helper functions
export async function get(key: string): Promise<string | null> {
  return redisClient.get(key);
}

export async function set(key: string, value: string): Promise<void> {
  await redisClient.set(key, value);
}

export async function del(key: string): Promise<void> {
  await redisClient.del(key);
}

export async function expire(key: string, seconds: number): Promise<void> {
  await redisClient.expire(key, seconds);
}

export async function exists(key: string): Promise<boolean> {
  const result = await redisClient.exists(key);
  return result === 1;
}

export async function closeRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}

export default redisClient;
