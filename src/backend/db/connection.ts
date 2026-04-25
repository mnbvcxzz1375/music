import { Pool, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'music_master',
  password: process.env.DB_PASSWORD || 'secret123',
  database: process.env.DB_NAME || 'musicdb',
  ssl: process.env.DB_SSL === 'true',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
};

const pool = new Pool(config);

export default pool;

// Helper method to query
export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Database query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper method to get a client
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Health check
export async function checkConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW()');
    return res.rows.length > 0;
  } catch (error) {
    // Do not throw to allow health check endpoints to report "unhealthy"
    console.error('Database health check failed:', error);
    return false;
  }
}

// Cleanup on exit
process.on('SIGTERM', () => {
  console.info('SIGTERM received. Shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool has ended');
  });
});

process.on('SIGINT', () => {
  console.info('SIGINT received. Shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool has ended');
  });
});

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