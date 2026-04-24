import pg from 'pg';
import type { Pool, PoolClient, QueryResult } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'music_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new pg.Pool({
      host: defaultConfig.host,
      port: defaultConfig.port,
      database: defaultConfig.database,
      user: defaultConfig.user,
      password: defaultConfig.password,
      max: defaultConfig.maxConnections,
      idleTimeoutMillis: defaultConfig.idleTimeoutMs,
      connectionTimeoutMillis: defaultConfig.connectionTimeoutMs,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
      console.log('New database connection established');
    });
  }

  return pool;
}

export async function query<T = unknown>(
  sql: string, 
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const result = await pool.query<T>(sql, params);
  return result;
}

export async function queryOne<T = unknown>(
  sql: string, 
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows[0] || null;
}

export async function queryMany<T = unknown>(
  sql: string, 
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(sql, params);
  return result.rows;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export { defaultConfig as dbConfig };