/* Server-side guardrails for CGT admin edits. PURE: reject clearly-wrong
   values with a message; the two-step preview is the guard against subtle
   mistakes. */

import type { CgtConfig } from "./ireland-cgt";

/** A multiplier must be a positive, non-absurd number. */
export function validateMultiplier(n: number): boolean {
  return Number.isFinite(n) && n > 0 && n <= 50;
}

export interface RawCgtConfig {
  standardRatePercent: number;
  annualExemptionEur: number;
  entrepreneurRatePercent: number;
  entrepreneurLifetimeCapEur: number;
}

/** Validate the four scalars; returns the typed config or a message. */
export function validateCgtConfig(
  raw: RawCgtConfig,
): { ok: true; value: CgtConfig } | { ok: false; message: string } {
  const { standardRatePercent: s, annualExemptionEur: e } = raw;
  const { entrepreneurRatePercent: er, entrepreneurLifetimeCapEur: ec } = raw;

  if (![s, e, er, ec].every((v) => Number.isFinite(v)))
    return { ok: false, message: "All values must be numbers." };
  if (s < 0 || s > 100) return { ok: false, message: "Standard rate must be 0–100%." };
  if (er < 0 || er > 100)
    return { ok: false, message: "Entrepreneur Relief rate must be 0–100%." };
  if (e < 0) return { ok: false, message: "Annual exemption can't be negative." };
  if (ec < 0) return { ok: false, message: "Entrepreneur Relief cap can't be negative." };

  return {
    ok: true,
    value: {
      standardRatePercent: s,
      annualExemptionEur: e,
      entrepreneurRatePercent: er,
      entrepreneurLifetimeCapEur: ec,
    },
  };
}
