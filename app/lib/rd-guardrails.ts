/* Server-side guardrails for R&D tax credit admin edits. PURE: reject
   clearly-wrong values with a message; the two-step preview is the guard
   against subtle mistakes. Mirrors cgt-guardrails.ts (type-only import). */

import type { RdConfig } from "./ireland-rd-tax-credit";

export interface RawRdConfig {
  ratePercent: number;
  tradingDeductionPercent: number;
  firstYearThresholdEur: number;
  secondInstalmentFraction: number;
}

/** Validate the four fields; returns the typed config or a message. */
export function validateRdConfig(
  raw: RawRdConfig,
): { ok: true; value: RdConfig } | { ok: false; message: string } {
  const { ratePercent: r, tradingDeductionPercent: t } = raw;
  const { firstYearThresholdEur: th, secondInstalmentFraction: f } = raw;

  if (![r, t, th, f].every((v) => Number.isFinite(v)))
    return { ok: false, message: "All values must be numbers." };
  if (r < 0 || r > 100) return { ok: false, message: "Credit rate must be 0–100%." };
  if (t < 0 || t > 100)
    return { ok: false, message: "Trading deduction must be 0–100%." };
  if (th < 0) return { ok: false, message: "First-year threshold can't be negative." };
  if (f < 0 || f > 1)
    return { ok: false, message: "Second-instalment fraction must be 0–1." };

  return {
    ok: true,
    value: {
      ratePercent: r,
      tradingDeductionPercent: t,
      firstYearThresholdEur: th,
      secondInstalmentFraction: f,
    },
  };
}
