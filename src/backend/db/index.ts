export { 
  getPool, 
  query, 
  queryOne, 
  queryMany, 
  transaction, 
  closePool, 
  testConnection,
  dbConfig,
} from './connection';

export {
  getRedis,
  get,
  set,
  del,
  exists,
  incr,
  expire,
  ttl,
  hset,
  hget,
  hgetall,
  hdel,
  zadd,
  zrange,
  zrevrange,
  zrank,
  zscore,
  closeRedis,
  testRedisConnection,
  redisConfig,
} from './redis';

export type {
  User,
  Subscription,
  Payment,
  Piece,
  PracticeSession,
  Achievement,
  Checkin,
  LeaderboardEntry,
} from './models';

export * as users from './users';
export * as subscriptions from './subscriptions';
export * as pieces from './pieces';
export * as sessions from './sessions';