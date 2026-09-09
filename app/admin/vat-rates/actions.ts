"use server";

/* Admin save action for the VAT calculator.
   saveVatSettings is TWO-PHASE: the first submit previews a diff and writes
   nothing; the Confirm submit carries a normalized `payload` and only THAT is
   written. The five statutory rate keys are fixed (categories map to them):
   the form edits each row's percent/label/applies in place; no add/remove.
   Re-checks requireAdmin on both phases; guard-railed + audited. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase/guards";
import { saveCalculatorConfig } from "../../lib/calculator-settings";
import { VAT_SETTINGS_KEY, getVatData } from "../../lib/vat-data";
import {
  REQUIRED_VAT_KEYS,
  parseVatConfig,
  type VatConfig,
  type VatRateKey,
} from "../../lib/ireland-vat";
import { validateVatConfig, type RawVatConfig, type RawVatRate } from "../../lib/vat-guardrails";
import { diffRecords, type DiffEntry, type DiffField } from "../../lib/rate-diff";
import { recordAudit } from "../../lib/rate-audit";

export type TwoPhaseState =
  | { status: "idle" }
  | { status: "preview"; payload: string; diff: DiffEntry[] }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const pctFmt = (v: unknown) => `${v}%`;
const euroFmt = (v: unknown) =>
  typeof v === "number"
    ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
    : String(v);

const RATE_LABEL: Record<VatRateKey, string> = {
  standard: "Standard",
  reduced: "Reduced",
  "second-reduced": "Second reduced",
  livestock: "Livestock",
  zero: "Zero",
};

const DIFF_FIELDS: DiffField[] = [
  ...REQUIRED_VAT_KEYS.map((k) => ({ key: `pct_${k}`, label: `${RATE_LABEL[k]} rate`, format: pctFmt })),
  { key: "goods", label: "Goods threshold", format: euroFmt },
  { key: "services", label: "Services threshold", format: euroFmt },
  { key: "since", label: "Thresholds since" },
];

/** Flatten a config to the record shape the diff fields read. */
function flatten(cfg: VatConfig): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    goods: cfg.thresholds.goods,
    services: cfg.thresholds.services,
    since: cfg.thresholds.since,
  };
  for (const r of cfg.rates) flat[`pct_${r.key}`] = r.percent;
  return flat;
}

function revalidate() {
  revalidatePath("/tools/ireland-vat");
  revalidatePath("/admin/vat-rates");
  revalidatePath("/admin");
}

export async function saveVatSettings(
  _prev: TwoPhaseState,
  formData: FormData,
): Promise<TwoPhaseState> {
  const user = await requireAdmin();

  if (formData.get("cancel")) return { status: "idle" };

  // Phase 2. Confirm: write the previewed payload only. Re-parse strictly:
  // never trust the round-tripped JSON.
  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw === "string" && payloadRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadRaw);
    } catch {
      return { status: "error", message: "Could not read the change. Please try again." };
    }
    const cfg = parseVatConfig(parsed);
    if (!cfg) return { status: "error", message: "The change didn't validate. Please try again." };
    try {
      await saveCalculatorConfig(VAT_SETTINGS_KEY, cfg);
    } catch (err) {
      console.error("[vat] settings save failed:", err);
      return { status: "error", message: "Could not save. Please try again." };
    }
    await recordAudit({
      area: "vat-settings",
      action: "update",
      summary: "Updated VAT rates & thresholds",
      details: cfg,
      changedBy: user.email ?? "admin",
    });
    revalidate();
    return { status: "saved", message: "Rates saved." };
  }

  // Phase 1. Preview: reconstruct the config from the fixed-key form fields.
  const rates: RawVatRate[] = REQUIRED_VAT_KEYS.map((key) => {
    const note = str(formData.get(`note_${key}`));
    const r: RawVatRate = {
      key,
      percent: num(formData.get(`pct_${key}`)),
      label: str(formData.get(`label_${key}`)),
      applies: str(formData.get(`applies_${key}`)),
    };
    if (note) r.note = note;
    return r;
  });
  const raw: RawVatConfig = {
    rates,
    thresholds: {
      goods: num(formData.get("goods")),
      services: num(formData.get("services")),
      since: str(formData.get("since")),
    },
  };

  const v = validateVatConfig(raw);
  if (!v.ok) return { status: "error", message: v.message };

  const { config: current } = await getVatData();
  const diff = diffRecords(flatten(current), flatten(v.value), DIFF_FIELDS);
  return { status: "preview", payload: JSON.stringify(v.value), diff };
}
