import { Pool, PoolClient, QueryResult } from 'pg';

// Initialize Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'music_master',
  password: process.env.DB_PASSWORD || 'secret123',
  database: process.env.DB_NAME || 'musicdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Health check
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

// Query Helpers
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', { text, error });
    throw error;
  }
}

export async function queryOne<T>(text: string, params?: any[]): Promise<T | null> {
  const result = await query(text, params);
  return result.rows.length ? result.rows[0] : null;
}

export async function queryMany<T>(text: string, params?: any[]): Promise<T[]> {
  const result = await query(text, params);
  return result.rows;
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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

// Shutdown handling
process.on('SIGINT', async () => await pool.end());
process.on('SIGTERM', async () => await pool.end());

export default pool;