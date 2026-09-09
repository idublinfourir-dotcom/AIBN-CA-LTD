import { Pool } from "pg";

// Reuse one Pool across hot reloads in dev so we don't leak connections.
const globalForDb = globalThis as unknown as { pool?: Pool };

// Lazily construct the Pool on first use. Importing this module must never
// throw or open a connection, otherwise `next build` crashes while collecting
// page data for static routes (e.g. /_not-found) that don't touch the DB.
function getPool(): Pool {
  if (globalForDb.pool) return globalForDb.pool;

  // Supabase requires SSL. The transaction pooler (port 6543) presents a cert
  // that isn't in Node's default trust store, so we skip strict verification.
  // The connection is still encrypted in transit.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local");
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

  // Cache always so we don't leak pools across serverless invocations; in dev
  // this also survives hot reloads.
  globalForDb.pool = pool;
  return pool;
}

// Small helper so callers don't import `pool` directly everywhere.
export function query<T extends import("pg").QueryResultRow = import("pg").QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params as never);
}
