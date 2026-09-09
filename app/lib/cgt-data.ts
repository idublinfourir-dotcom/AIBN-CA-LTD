/* Server-side loader for the Ireland CGT calculator.
   Reads the editable config (cgt_settings, one JSONB row id=1) and the
   indexation multiplier table (cgt_multipliers, 29 rows) from Postgres, both
   editable in /admin/cgt-rates; falls back to the versioned constants in
   ireland-cgt.ts when the DB is unreachable, a row is missing, or a stored
   value fails validation, so the calculator never renders broken numbers.

   Reads go through the pg pool (app/lib/db.ts), matching tax-data.ts. */

import { query } from "./db";
import {
  CGT_CONFIG_DEFAULT,
  CGT_MULTIPLIERS_DEFAULT,
  parseCgtConfig,
  type CgtConfig,
  type CgtMultiplier,
} from "./ireland-cgt";

export interface CgtData {
  config: CgtConfig;
  multipliers: CgtMultiplier[];
  /** When the CGT rates were last reviewed/changed (ISO string), or null. */
  reviewedAt: string | null;
}

/**
 * Load the CGT config + multipliers: DB row(s) when present and valid,
 * otherwise the versioned code fallback. Never throws.
 */
export async function getCgtData(): Promise<CgtData> {
  try {
    const [{ rows: cfgRows }, { rows: multRows }] = await Promise.all([
      query<{ config: unknown; reviewed_at: string | null }>(
        `select config, reviewed_at from cgt_settings where id = 1`,
      ),
      query<{ year_key: string; year_label: string; sort_order: number; multiplier: string }>(
        `select year_key, year_label, sort_order, multiplier from cgt_multipliers order by sort_order`,
      ),
    ]);

    const config = parseCgtConfig(cfgRows[0]?.config) ?? CGT_CONFIG_DEFAULT;
    const reviewedAt = cfgRows[0]?.reviewed_at ?? null;

    // pg returns numeric as a string: coerce and drop any invalid row.
    let multipliers: CgtMultiplier[] = CGT_MULTIPLIERS_DEFAULT;
    if (multRows.length > 0) {
      const parsed = multRows
        .map((r) => ({
          yearKey: r.year_key,
          yearLabel: r.year_label,
          sortOrder: r.sort_order,
          multiplier: Number(r.multiplier),
        }))
        .filter((m) => Number.isFinite(m.multiplier) && m.multiplier > 0);
      if (parsed.length > 0) multipliers = parsed;
    }

    return { config, multipliers, reviewedAt };
  } catch (err) {
    console.error("[cgt] DB read failed, using static defaults:", err);
    return { config: CGT_CONFIG_DEFAULT, multipliers: CGT_MULTIPLIERS_DEFAULT, reviewedAt: null };
  }
}
