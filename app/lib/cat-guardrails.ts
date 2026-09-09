/* Server-side guardrails for CAT admin edits. PURE: reject clearly-wrong
   values with a message; the two-step preview is the guard against subtle
   mistakes. Mirrors cgt-guardrails.ts / vat-guardrails.ts. */

import type { CatConfig } from "./ireland-cat";

export interface RawCatConfig {
  ratePercent: number;
  thresholds: { groupA: number; groupB: number; groupC: number };
  smallGiftExemptionEur: number;
  reliefs: {
    agriculturalPercent: number;
    businessPercent: number;
    dwellingHousePercent: number;
  };
}

const isPct = (v: number) => Number.isFinite(v) && v >= 0 && v <= 100;
const isEuro = (v: number) => Number.isFinite(v) && v >= 0;

/** Validate the rate, three thresholds, small gift + three relief percents. */
export function validateCatConfig(
  raw: RawCatConfig,
): { ok: true; value: CatConfig } | { ok: false; message: string } {
  const { ratePercent, smallGiftExemptionEur } = raw;
  const { groupA, groupB, groupC } = raw.thresholds;
  const { agriculturalPercent, businessPercent, dwellingHousePercent } = raw.reliefs;

  if (!isPct(ratePercent)) return { ok: false, message: "CAT rate must be 0–100%." };
  if (![groupA, groupB, groupC].every(isEuro))
    return { ok: false, message: "Group thresholds must be zero or more." };
  if (!isEuro(smallGiftExemptionEur))
    return { ok: false, message: "Small gift exemption must be zero or more." };
  if (![agriculturalPercent, businessPercent, dwellingHousePercent].every(isPct))
    return { ok: false, message: "Each relief must be 0–100%." };

  return {
    ok: true,
    value: {
      ratePercent,
      thresholds: { groupA, groupB, groupC },
      smallGiftExemptionEur,
      reliefs: { agriculturalPercent, businessPercent, dwellingHousePercent },
    },
  };
}
