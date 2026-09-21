import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { query } from "./db";

interface PublicActionLimits {
  action: string;
  identity: string;
  ip: { max: number; windowSeconds: number };
  identityLimit: { max: number; windowSeconds: number };
}

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function requestIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headerStore.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown"
  ).slice(0, 128);
}

async function consume(
  action: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(
    Math.floor(Date.now() / windowMs) * windowMs,
  ).toISOString();
  const keyHash = hashIdentifier(identifier);

  const { rows } = await query<{ count: number }>(
    `insert into request_rate_limits (action, key_hash, window_start, count)
     values ($1, $2, $3, 1)
     on conflict (action, key_hash, window_start) do update
       set count = request_rate_limits.count + 1
     returning count`,
    [action, keyHash, windowStart],
  );

  return (rows[0]?.count ?? max + 1) <= max;
}

/**
 * Apply both per-IP and per-identity limits. Identifiers are hashed before
 * storage. Errors reading or writing the counters fail open, to avoid turning a
 * transient metadata failure into a site-wide outage; the protected action still
 * performs its normal validation and database/auth checks. Table housekeeping
 * sits outside that path on purpose, so it can never lift a limit.
 */
export async function allowPublicAction({
  action,
  identity,
  ip,
  identityLimit,
}: PublicActionLimits): Promise<boolean> {
  let allowed: boolean;
  try {
    const clientIp = await requestIp();
    const ipAllowed = await consume(
      `${action}:ip`,
      `ip:${clientIp}`,
      ip.max,
      ip.windowSeconds,
    );
    const identityAllowed = await consume(
      `${action}:identity`,
      `identity:${identity.trim().toLowerCase()}`,
      identityLimit.max,
      identityLimit.windowSeconds,
    );
    allowed = ipAllowed && identityAllowed;
  } catch (err) {
    console.error(`[rate-limit:${action}] check failed open:`, err);
    return true;
  }

  /* Keep the fixed-window table bounded without requiring a scheduler. This
     runs AFTER the decision and swallows its own errors deliberately: while it
     shared the try above, a failed housekeeping delete reached the fail-open
     catch and turned an already-computed deny into an allow. Housekeeping must
     never be able to lift a limit. */
  try {
    await query(
      `delete from request_rate_limits
        where window_start < now() - interval '8 days'`,
    );
  } catch (err) {
    console.error(`[rate-limit:${action}] window cleanup failed (ignored):`, err);
  }

  return allowed;
}
