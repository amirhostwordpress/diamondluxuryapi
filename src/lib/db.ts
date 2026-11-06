// ─────────────────────────────────────────────────────────────────────────────
// MySQL connection pool (mysql2/promise)
// A single pool is reused across all routes.
// ─────────────────────────────────────────────────────────────────────────────
import mysql from "mysql2/promise";
import { dbConfig } from "../config";

// Singleton pool stored on the global object so hot-reloads in dev don't leak
// connections.
declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host:            dbConfig.host,
    port:            dbConfig.port,
    user:            dbConfig.user,
    password:        dbConfig.password,
    database:        dbConfig.database,
    connectionLimit: dbConfig.connectionLimit,
    waitForConnections: true,
    queueLimit:      0,
    // Return JS Date objects for DATE/DATETIME columns
    dateStrings: false,
    // Use named timezone so stored times are consistent
    timezone: "+00:00",
  });
}

export const pool: mysql.Pool =
  globalThis._mysqlPool ?? (globalThis._mysqlPool = createPool());

// ── Convenience helpers ───────────────────────────────────────────────────────

// mysql2's ExecuteValues is what pool.execute actually accepts at runtime —
// we use a double cast through `unknown` to keep our API ergonomic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlParams = any[];

/** Run a SELECT and return typed rows. */
export async function query<T = mysql.RowDataPacket>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params as SqlParams);
  return rows as T[];
}

/** Run an INSERT / UPDATE / DELETE and return the result header. */
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, params as SqlParams);
  return result;
}

/** Grab a single row or null. */
export async function queryOne<T = mysql.RowDataPacket>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run multiple statements inside a single transaction. */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
