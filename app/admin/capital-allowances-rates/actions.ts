"use server";

/* Admin save action for the capital allowances calculator.
   saveCapitalAllowancesSettings is TWO-PHASE: the first submit previews a diff
   and writes nothing; the Confirm submit carries a normalized `payload` and only
   THAT is written. Only the per-class rate + years and the two scalars (car cap,
   trading CT rate) are editable; asset keys/labels/notes and the CO2 groups stay
   in code. Re-checks requireAdmin on both phases; guard-railed + audited. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase/guards";
import { saveCalculatorConfig } from "../../lib/calculator-settings";
import { CA_SETTINGS_KEY, getCaData } from "../../lib/ca-data";
import {
  ASSET_CLASSES,
  parseCaConfig,
  type CaConfig,
} from "../../lib/ireland-capital-allowances";
import { validateCaConfig, type RawCaConfig } from "../../lib/ca-guardrails";
import { diffRecords, type DiffEntry, type DiffField } from "../../lib/rate-diff";
import { recordAudit } from "../../lib/rate-audit";

export type TwoPhaseState =
  | { status: "idle" }
  | { status: "preview"; payload: string; diff: DiffEntry[] }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());
const pctFmt = (v: unknown) => `${v}%`;
const yearsFmt = (v: unknown) => (typeof v === "number" ? `${v} yr` : String(v));
const euroFmt = (v: unknown) =>
  typeof v === "number"
    ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
    : String(v);

const DIFF_FIELDS: DiffField[] = [
  ...ASSET_CLASSES.flatMap((c) => [
    { key: `rate_${c.key}`, label: `${c.label} rate`, format: pctFmt },
    { key: `years_${c.key}`, label: `${c.label} years`, format: yearsFmt },
  ]),
  { key: "motorCapEur", label: "Car cost cap", format: euroFmt },
  { key: "tradingCtPercent", label: "Trading CT rate", format: pctFmt },
];

/** Flatten a config to the record shape the diff fields read. */
function flatten(cfg: CaConfig): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    motorCapEur: cfg.motorCapEur,
    tradingCtPercent: cfg.tradingCtPercent,
  };
  for (const c of cfg.classes) {
    flat[`rate_${c.key}`] = c.ratePercent;
    flat[`years_${c.key}`] = c.years;
  }
  return flat;
}

function revalidate() {
  revalidatePath("/tools/ireland-capital-allowances");
  revalidatePath("/admin/capital-allowances-rates");
  revalidatePath("/admin");
}

export async function saveCapitalAllowancesSettings(
  _prev: TwoPhaseState,
  formData: FormData,
): Promise<TwoPhaseState> {
  const user = await requireAdmin();

  if (formData.get("cancel")) return { status: "idle" };

  // Phase 2. Confirm: write the previewed payload only. Re-parse strictly.
  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw === "string" && payloadRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadRaw);
    } catch {
      return { status: "error", message: "Could not read the change. Please try again." };
    }
    const cfg = parseCaConfig(parsed);
    if (!cfg) return { status: "error", message: "The change didn't validate. Please try again." };
    try {
      await saveCalculatorConfig(CA_SETTINGS_KEY, cfg);
    } catch (err) {
      console.error("[ca] settings save failed:", err);
      return { status: "error", message: "Could not save. Please try again." };
    }
    await recordAudit({
      area: "capital-allowances-settings",
      action: "update",
      summary: "Updated capital allowances rates",
      details: cfg,
      changedBy: user.email ?? "admin",
    });
    revalidate();
    return { status: "saved", message: "Rates saved." };
  }

  // Phase 1. Preview: read the per-class numbers + scalars from the form.
  const raw: RawCaConfig = {
    classes: ASSET_CLASSES.map((c) => ({
      key: c.key,
      ratePercent: num(formData.get(`rate_${c.key}`)),
      years: num(formData.get(`years_${c.key}`)),
    })),
    motorCapEur: num(formData.get("motor_cap")),
    tradingCtPercent: num(formData.get("trading_ct")),
  };

  const v = validateCaConfig(raw);
  if (!v.ok) return { status: "error", message: v.message };

  const { config: current } = await getCaData();
  const diff = diffRecords(flatten(current), flatten(v.value), DIFF_FIELDS);
  return { status: "preview", payload: JSON.stringify(v.value), diff };
}
