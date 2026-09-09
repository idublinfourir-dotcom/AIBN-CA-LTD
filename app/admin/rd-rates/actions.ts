"use server";

/* Admin save action for the R&D tax credit calculator.
   saveRdSettings is TWO-PHASE: the first submit previews a diff and writes
   nothing; the Confirm submit carries a normalized `payload` and only THAT is
   written. Only the four fields that drive the maths are editable; the prose
   effectiveBenefitPercent / effectiveFrom stay in code. Re-checks requireAdmin
   on both phases; guard-railed + audited. Mirrors the CGT settings action. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase/guards";
import { saveCalculatorConfig } from "../../lib/calculator-settings";
import { RD_SETTINGS_KEY, getRdData } from "../../lib/rd-data";
import { validateRdConfig } from "../../lib/rd-guardrails";
import { diffRecords, type DiffEntry } from "../../lib/rate-diff";
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

function revalidate() {
  revalidatePath("/tools/ireland-rd-tax-credit");
  revalidatePath("/admin/rd-rates");
  revalidatePath("/admin");
}

export async function saveRdSettings(
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
    const v = validateRdConfig(parsed as never);
    if (!v.ok) return { status: "error", message: v.message };
    try {
      await saveCalculatorConfig(RD_SETTINGS_KEY, v.value);
    } catch (err) {
      console.error("[rd] settings save failed:", err);
      return { status: "error", message: "Could not save. Please try again." };
    }
    await recordAudit({
      area: "rd-credit-settings",
      action: "update",
      summary: "Updated R&D tax credit rates",
      details: v.value,
      changedBy: user.email ?? "admin",
    });
    revalidate();
    return { status: "saved", message: "Rates saved." };
  }

  // Phase 1: preview.
  const v = validateRdConfig({
    ratePercent: num(formData.get("rate")),
    tradingDeductionPercent: num(formData.get("trading_deduction")),
    firstYearThresholdEur: num(formData.get("first_year_threshold")),
    secondInstalmentFraction: num(formData.get("second_instalment_fraction")),
  });
  if (!v.ok) return { status: "error", message: v.message };

  const { config: current } = await getRdData();
  const diff = diffRecords(
    current as unknown as Record<string, unknown>,
    v.value as unknown as Record<string, unknown>,
    [
      { key: "ratePercent", label: "Credit rate", format: pctFmt },
      { key: "tradingDeductionPercent", label: "Trading deduction", format: pctFmt },
      { key: "firstYearThresholdEur", label: "First-year threshold", format: euroFmt },
      { key: "secondInstalmentFraction", label: "2nd instalment fraction" },
    ],
  );
  return { status: "preview", payload: JSON.stringify(v.value), diff };
}
