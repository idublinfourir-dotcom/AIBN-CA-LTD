/* Server-side guardrails for corporation-tax admin edits. PURE: reject
   clearly-wrong values with a message; the two-step preview is the guard
   against subtle mistakes. Mirrors cgt-guardrails.ts. */

import type { CtConfig } from "./ireland-corporation-tax";

export interface RawCtConfig {
  tradingPercent: number;
  passivePercent: number;
}

/** Validate the two rates; returns the typed config or a message. */
export function validateCtConfig(
  raw: RawCtConfig,
): { ok: true; value: CtConfig } | { ok: false; message: string } {
  const { tradingPercent: t, passivePercent: p } = raw;

  if (![t, p].every((v) => Number.isFinite(v)))
    return { ok: false, message: "All values must be numbers." };
  if (t < 0 || t > 100) return { ok: false, message: "Trading rate must be 0–100%." };
  if (p < 0 || p > 100) return { ok: false, message: "Passive rate must be 0–100%." };

  return { ok: true, value: { tradingPercent: t, passivePercent: p } };
}
