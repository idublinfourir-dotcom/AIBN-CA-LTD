"use server";

/* Admin save action for the CAT calculator.
   saveCatSettings is TWO-PHASE: the first submit previews a diff and writes
   nothing; the Confirm submit carries a normalized `payload` and only THAT is
   written. Re-checks requireAdmin on both phases; guard-railed + audited.
   Mirrors vat-rates/actions.ts. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase/guards";
import { saveCalculatorConfig } from "../../lib/calculator-settings";
import { CAT_SETTINGS_KEY, getCatData } from "../../lib/cat-data";
import { parseCatConfig, type CatConfig } from "../../lib/ireland-cat";
import { validateCatConfig, type RawCatConfig } from "../../lib/cat-guardrails";
import { diffRecords, type DiffEntry, type DiffField } from "../../lib/rate-diff";
import { recordAudit } from "../../lib/rate-audit";

export type TwoPhaseState =
  | { status: "idle" }
  | { status: "preview"; payload: string; diff: DiffEntry[] }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());
const pctFmt = (v: unknown) => `${v}%`;
const euroFmt = (v: unknown) =>
  typeof v === "number"
    ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
    : String(v);

const DIFF_FIELDS: DiffField[] = [
  { key: "ratePercent", label: "CAT rate", format: pctFmt },
  { key: "groupA", label: "Group A threshold", format: euroFmt },
  { key: "groupB", label: "Group B threshold", format: euroFmt },
  { key: "groupC", label: "Group C threshold", format: euroFmt },
  { key: "smallGift", label: "Small gift exemption", format: euroFmt },
  { key: "agri", label: "Agricultural relief", format: pctFmt },
  { key: "biz", label: "Business relief", format: pctFmt },
  { key: "dwelling", label: "Dwelling house exemption", format: pctFmt },
];

/** Flatten a config to the record shape the diff fields read. */
function flatten(cfg: CatConfig): Record<string, unknown> {
  return {
    ratePercent: cfg.ratePercent,
    groupA: cfg.thresholds.groupA,
    groupB: cfg.thresholds.groupB,
    groupC: cfg.thresholds.groupC,
    smallGift: cfg.smallGiftExemptionEur,
    agri: cfg.reliefs.agriculturalPercent,
    biz: cfg.reliefs.businessPercent,
    dwelling: cfg.reliefs.dwellingHousePercent,
  };
}

function revalidate() {
  revalidatePath("/tools/ireland-cat");
  revalidatePath("/admin/cat-rates");
  revalidatePath("/admin");
}

export async function saveCatSettings(
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
    const cfg = parseCatConfig(parsed);
    if (!cfg) return { status: "error", message: "The change didn't validate. Please try again." };
    try {
      await saveCalculatorConfig(CAT_SETTINGS_KEY, cfg);
    } catch (err) {
      console.error("[cat] settings save failed:", err);
      return { status: "error", message: "Could not save. Please try again." };
    }
    await recordAudit({
      area: "cat-settings",
      action: "update",
      summary: "Updated CAT rate, thresholds & reliefs",
      details: cfg,
      changedBy: user.email ?? "admin",
    });
    revalidate();
    return { status: "saved", message: "Rates saved." };
  }

  // Phase 1. Preview: reconstruct the config from the form fields.
  const raw: RawCatConfig = {
    ratePercent: num(formData.get("ratePercent")),
    thresholds: {
      groupA: num(formData.get("groupA")),
      groupB: num(formData.get("groupB")),
      groupC: num(formData.get("groupC")),
    },
    smallGiftExemptionEur: num(formData.get("smallGift")),
    reliefs: {
      agriculturalPercent: num(formData.get("agri")),
      businessPercent: num(formData.get("biz")),
      dwellingHousePercent: num(formData.get("dwelling")),
    },
  };

  const v = validateCatConfig(raw);
  if (!v.ok) return { status: "error", message: v.message };

  const { config: current } = await getCatData();
  const diff = diffRecords(flatten(current), flatten(v.value), DIFF_FIELDS);
  return { status: "preview", payload: JSON.stringify(v.value), diff };
}
