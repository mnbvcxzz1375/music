import Redis from 'ioredis';
import type { Redis as RedisType } from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

const defaultConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'music:',
  retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
};

let redis: RedisType | null = null;

export function getRedis(): RedisType {
  if (!redis) {
    redis = new Redis({
      host: defaultConfig.host,
      port: defaultConfig.port,
      password: defaultConfig.password,
      db: defaultConfig.db,
      keyPrefix: defaultConfig.keyPrefix,
      retryStrategy: (times) => {
        if (times > defaultConfig.maxRetriesPerRequest) {
          console.error('Redis connection retry limit reached');
          return null;
        }
        return defaultConfig.retryDelayOnFailover;
      },
    });

    redis.on('connect', () => {
      console.log('Redis connection established');
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  return redis;
}

export async function get(key: string): Promise<string | null> {
  const client = getRedis();
  return client.get(key);
}

export async function set(
  key: string, 
  value: string, 
  ttlSeconds?: number
): Promise<void> {
  const client = getRedis();
  if (ttlSeconds) {
    await client.setex(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
}

export async function del(key: string): Promise<void> {
  const client = getRedis();
  await client.del(key);
}

export async function exists(key: string): Promise<boolean> {
  const client = getRedis();
  const result = await client.exists(key);
  return result === 1;
}

export async function incr(key: string): Promise<number> {
  const client = getRedis();
  return client.incr(key);
}

export async function expire(key: string, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  await client.expire(key, ttlSeconds);
}

export async function ttl(key: string): Promise<number> {
  const client = getRedis();
  return client.ttl(key);
}

export async function hset(
  key: string, 
  field: string, 
  value: string
): Promise<void> {
  const client = getRedis();
  await client.hset(key, field, value);
}

export async function hget(key: string, field: string): Promise<string | null> {
  const client = getRedis();
  return client.hget(key, field);
}

export async function hgetall(key: string): Promise<Record<string, string>> {
  const client = getRedis();
  return client.hgetall(key);
}

export async function hdel(key: string, field: string): Promise<void> {
  const client = getRedis();
  await client.hdel(key, field);
}

export async function zadd(
  key: string, 
  score: number, 
  member: string
): Promise<void> {
  const client = getRedis();
  await client.zadd(key, score, member);
}

export async function zrange(
  key: string, 
  start: number, 
  stop: number, 
  withScores: boolean = false
): Promise<string[]> {
  const client = getRedis();
  if (withScores) {
    return client.zrange(key, start, stop, 'WITHSCORES');
  }
  return client.zrange(key, start, stop);
}

export async function zrevrange(
  key: string, 
  start: number, 
  stop: number, 
  withScores: boolean = false
): Promise<string[]> {
  const client = getRedis();
  if (withScores) {
    return client.zrevrange(key, start, stop, 'WITHSCORES');
  }
  return client.zrevrange(key, start, stop);
}

export async function zrank(key: string, member: string): Promise<number | null> {
  const client = getRedis();
  const result = await client.zrank(key, member);
  return result;
}

export async function zscore(key: string, member: string): Promise<number | null> {
  const client = getRedis();
  const result = await client.zscore(key, member);
  return result === null ? null : parseFloat(result);
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.ping();
    console.log('Redis connection test successful:', result);
    return result === 'PONG';
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

export { defaultConfig as redisConfig };