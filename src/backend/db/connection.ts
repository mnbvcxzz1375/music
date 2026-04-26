import { Pool, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'music_master',
  password: process.env.DB_PASSWORD || 'secret123',
  database: process.env.DB_NAME || 'musicdb',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

const pool = new Pool({
  host: defaultConfig.host,
  port: defaultConfig.port,
  user: defaultConfig.user,
  password: defaultConfig.password,
  database: defaultConfig.database,
  ssl: defaultConfig.ssl,
  max: defaultConfig.maxConnections,
  idleTimeoutMillis: defaultConfig.idleTimeoutMs,
  connectionTimeoutMillis: defaultConfig.connectionTimeoutMs,
});

// Event Listeners
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  // console.log('New database connection established');
});

export { defaultConfig as dbConfig };

// Query Helpers
export async function query<T = unknown>(
  sql: string, 
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function queryOne<T = unknown>(
  sql: string, 
  params?: unknown[]
): Promise<T | null> {
  try {
    const result = await pool.query<T>(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('QueryOne error:', { sql, error });
    return null;
  }
}

export async function queryMany<T = unknown>(
  sql: string, 
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
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

export async function closeConnection(): Promise<void> {
  await pool.end();
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Test connection failed:', error);
    return false;
  }
}

export default pool;
