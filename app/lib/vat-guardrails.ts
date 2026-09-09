/* Server-side guardrails for VAT admin edits. PURE: reject clearly-wrong
   values with a message; the two-step preview is the guard against subtle
   mistakes. The five statutory rate keys are fixed (categories map to them):
   percents editable, no add/remove. Mirrors cgt-guardrails.ts. */

// Value import needs the explicit .ts extension so `node --test` (native
// type-stripping) can resolve it; tsconfig allowImportingTsExtensions + Next's
// bundler resolution both accept it. Type-only imports are erased.
import { REQUIRED_VAT_KEYS } from "./ireland-vat.ts";
import type { VatConfig, VatRate, VatRateKey } from "./ireland-vat";

export interface RawVatRate {
  key: VatRateKey;
  percent: number;
  label: string;
  applies: string;
  note?: string;
}

export interface RawVatConfig {
  rates: RawVatRate[];
  thresholds: { goods: number; services: number; since: string };
}

/** Validate the rate rows + thresholds; returns the typed config or a message. */
export function validateVatConfig(
  raw: RawVatConfig,
): { ok: true; value: VatConfig } | { ok: false; message: string } {
  if (!Array.isArray(raw.rates)) return { ok: false, message: "Missing rate rows." };

  const rates: VatRate[] = [];
  for (const r of raw.rates) {
    if (!REQUIRED_VAT_KEYS.includes(r.key))
      return { ok: false, message: `Unknown rate "${r.key}".` };
    if (!Number.isFinite(r.percent) || r.percent < 0 || r.percent > 100)
      return { ok: false, message: `${r.label || r.key}: rate must be 0–100%.` };
    if (!r.label.trim()) return { ok: false, message: "Every rate needs a label." };
    if (!r.applies.trim()) return { ok: false, message: "Every rate needs an 'applies to'." };
    const rate: VatRate = {
      key: r.key,
      percent: r.percent,
      label: r.label.trim(),
      applies: r.applies.trim(),
    };
    if (r.note && r.note.trim()) rate.note = r.note.trim();
    rates.push(rate);
  }

  const keys = rates.map((x) => x.key);
  for (const k of REQUIRED_VAT_KEYS)
    if (!keys.includes(k)) return { ok: false, message: `Missing the ${k} rate.` };
  if (keys.length !== REQUIRED_VAT_KEYS.length)
    return { ok: false, message: "Unexpected extra rate rows." };

  const { goods, services, since } = raw.thresholds;
  if (!Number.isFinite(goods) || goods < 0)
    return { ok: false, message: "Goods threshold can't be negative." };
  if (!Number.isFinite(services) || services < 0)
    return { ok: false, message: "Services threshold can't be negative." };
  if (!since.trim()) return { ok: false, message: "Enter the 'in force since' label." };

  return {
    ok: true,
    value: { rates, thresholds: { goods, services, since: since.trim() } },
  };
}
