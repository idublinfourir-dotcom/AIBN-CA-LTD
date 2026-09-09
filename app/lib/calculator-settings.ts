/* Shared server-side loader for admin-editable calculator configs.

   One JSONB row per calculator in `calculator_settings` (key = calculator slug),
   editable in /admin/<calc>-rates. Every calculator's `*-data.ts` is a thin
   typed wrapper around getCalculatorConfig: it passes its own `parse` +
   code-default `fallback`, so a missing row / invalid stored value / DB error
   all resolve to today's versioned numbers: the tool never renders broken data.

   Mirrors cgt-data.ts, but generic: CGT keeps its own two-table loader
   (cgt_settings + cgt_multipliers); the four Project-B calculators share this.

   Reads/writes go through the pg pool (app/lib/db.ts). */

import { query } from "./db";

export interface CalculatorConfigResult<T> {
  config: T;
  /** When this calculator was last reviewed/saved (ISO string), or null. */
  reviewedAt: string | null;
}

/**
 * Load a calculator's config: the DB row when present and valid, otherwise the
 * code fallback. `parse` returns a valid typed config or null (reject partial /
 * malformed JSON). Never throws: any failure falls back to `fallback`.
 */
export async function getCalculatorConfig<T>(
  key: string,
  parse: (raw: unknown) => T | null,
  fallback: T,
): Promise<CalculatorConfigResult<T>> {
  try {
    const { rows } = await query<{ config: unknown; reviewed_at: string | null }>(
      `select config, reviewed_at from calculator_settings where key = $1`,
      [key],
    );
    const config = parse(rows[0]?.config) ?? fallback;
    const reviewedAt = rows[0]?.reviewed_at ?? null;
    return { config, reviewedAt };
  } catch (err) {
    console.error(`[calc:${key}] DB read failed, using static defaults:`, err);
    return { config: fallback, reviewedAt: null };
  }
}

/**
 * Upsert a calculator's config and stamp it reviewed now. The caller is
 * responsible for validating `config` before this point (guardrails); we only
 * serialise and write. Throws on DB error so the action can surface a message.
 */
export async function saveCalculatorConfig(key: string, config: unknown): Promise<void> {
  await query(
    `insert into calculator_settings (key, config, reviewed_at, updated_at)
     values ($1, $2, now(), now())
     on conflict (key) do update set
       config = excluded.config,
       reviewed_at = now(),
       updated_at = now()`,
    [key, JSON.stringify(config)],
  );
}

/**
 * Stamp reviewed_at = now() without touching config. If the calculator has no
 * row yet (serving code defaults), inserts a CONFIG-LESS row (config stays null
 * → the code fallback remains authoritative, so no rate drift) purely to record
 * the review date: this lets the admin dismiss the reminder for an
 * un-customised calculator. Never throws: a review stamp must not block the admin.
 */
export async function markCalculatorReviewed(key: string): Promise<void> {
  try {
    await query(
      `insert into calculator_settings (key, reviewed_at, updated_at)
       values ($1, now(), now())
       on conflict (key) do update set reviewed_at = now(), updated_at = now()`,
      [key],
    );
  } catch (err) {
    console.error(`[calc:${key}] mark reviewed failed:`, err);
  }
}
