/* Server-side guardrails for capital-allowances admin edits. PURE: reject
   clearly-wrong values with a message; the two-step preview is the guard
   against subtle mistakes. Only the per-class rate + years and the two scalars
   (car cap, trading CT rate) are editable; the label/note/flags are merged from
   the CURRENT code ASSET_CLASSES by key, so prose never drifts and can't be
   edited here. CO2 groups stay statutory (code). Mirrors cgt-guardrails.ts. */

// Value import needs the explicit .ts extension so `node --test` (native
// type-stripping) can resolve it; the bundler accepts it too. Types are erased.
import { ASSET_CLASSES } from "./ireland-capital-allowances.ts";
import type { AssetClass, AssetKey, CaConfig } from "./ireland-capital-allowances";

/** One editable row from the form: only the numbers move; prose comes from code. */
export interface RawCaClass {
  key: AssetKey;
  ratePercent: number;
  years: number;
}

export interface RawCaConfig {
  classes: RawCaClass[];
  motorCapEur: number;
  tradingCtPercent: number;
}

/** Validate the editable numbers; returns a full typed config (code prose
    merged in by key) or a message. */
export function validateCaConfig(
  raw: RawCaConfig,
): { ok: true; value: CaConfig } | { ok: false; message: string } {
  if (!Number.isFinite(raw.motorCapEur) || raw.motorCapEur < 0)
    return { ok: false, message: "Car cap can't be negative." };
  if (!Number.isFinite(raw.tradingCtPercent) || raw.tradingCtPercent < 0 || raw.tradingCtPercent > 100)
    return { ok: false, message: "Trading CT rate must be 0–100%." };

  const classes: AssetClass[] = [];
  for (const code of ASSET_CLASSES) {
    const row = raw.classes.find((c) => c.key === code.key);
    if (!row) return { ok: false, message: `Missing the ${code.label} row.` };
    if (!Number.isFinite(row.ratePercent) || row.ratePercent < 0 || row.ratePercent > 100)
      return { ok: false, message: `${code.label}: rate must be 0–100%.` };
    if (!Number.isFinite(row.years) || row.years < 1 || !Number.isInteger(row.years))
      return { ok: false, message: `${code.label}: years must be a whole number of 1 or more.` };
    // Merge the editable numbers onto the current code prose/flags.
    classes.push({ ...code, ratePercent: row.ratePercent, years: row.years });
  }

  return {
    ok: true,
    value: { classes, motorCapEur: raw.motorCapEur, tradingCtPercent: raw.tradingCtPercent },
  };
}
