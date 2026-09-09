"use server";

/* Admin save action for the corporation tax calculator.
   saveCorporationTaxSettings is TWO-PHASE: the first submit returns a preview
   (diff) and writes nothing; the Confirm submit carries a normalized `payload`
   and only THAT is written, so you always commit exactly what you previewed.
   Re-checks requireAdmin on both phases; guard-railed + audited. Mirrors the
   CGT settings action. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase/guards";
import { saveCalculatorConfig } from "../../lib/calculator-settings";
import { CT_SETTINGS_KEY, getCorporationTaxData } from "../../lib/corporation-tax-data";
import { validateCtConfig } from "../../lib/ct-guardrails";
import { diffRecords, type DiffEntry } from "../../lib/rate-diff";
import { recordAudit } from "../../lib/rate-audit";

/** Two-phase (preview → confirm) result. */
export type TwoPhaseState =
  | { status: "idle" }
  | { status: "preview"; payload: string; diff: DiffEntry[] }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());
const pctFmt = (v: unknown) => `${v}%`;

function revalidate() {
  revalidatePath("/tools/ireland-corporation-tax");
  revalidatePath("/admin/ct-rates");
  revalidatePath("/admin");
}

export async function saveCorporationTaxSettings(
  _prev: TwoPhaseState,
  formData: FormData,
): Promise<TwoPhaseState> {
  const user = await requireAdmin();

  if (formData.get("cancel")) return { status: "idle" };

  // Phase 2. Confirm: write the previewed payload only.
  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw === "string" && payloadRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadRaw);
    } catch {
      return { status: "error", message: "Could not read the change. Please try again." };
    }
    const v = validateCtConfig(parsed as never);
    if (!v.ok) return { status: "error", message: v.message };
    try {
      await saveCalculatorConfig(CT_SETTINGS_KEY, v.value);
    } catch (err) {
      console.error("[ct] settings save failed:", err);
      return { status: "error", message: "Could not save. Please try again." };
    }
    await recordAudit({
      area: "corporation-tax-settings",
      action: "update",
      summary: "Updated corporation tax rates",
      details: v.value,
      changedBy: user.email ?? "admin",
    });
    revalidate();
    return { status: "saved", message: "Rates saved." };
  }

  // Phase 1: preview.
  const v = validateCtConfig({
    tradingPercent: num(formData.get("trading_rate")),
    passivePercent: num(formData.get("passive_rate")),
  });
  if (!v.ok) return { status: "error", message: v.message };

  const { config: current } = await getCorporationTaxData();
  const diff = diffRecords(
    current as unknown as Record<string, unknown>,
    v.value as unknown as Record<string, unknown>,
    [
      { key: "tradingPercent", label: "Trading rate", format: pctFmt },
      { key: "passivePercent", label: "Passive rate", format: pctFmt },
    ],
  );
  return { status: "preview", payload: JSON.stringify(v.value), diff };
}
