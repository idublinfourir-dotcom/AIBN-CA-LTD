"use server";

import { revalidatePath } from "next/cache";
import { query } from "../../lib/db";
import { requireAdmin } from "../../lib/supabase/guards";

export interface ActionState {
  status: "idle" | "saved" | "error";
  message?: string;
}

const RATE_TYPES = [
  "variable",
  "fixed-1",
  "fixed-2",
  "fixed-3",
  "fixed-4",
  "fixed-5",
  "fixed-7",
  "fixed-10",
  "fixed-full",
] as const;

const AUDIENCES = ["first-time", "trading-up", "switch", "investment"] as const;

function revalidate() {
  revalidatePath("/tools/ireland");
  revalidatePath("/admin/mortgage-rates");
}

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());

/** Optional numeric field: empty input → null, otherwise the parsed number. */
const optNum = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};

interface ParsedProduct {
  lender: string;
  name: string;
  rateType: string;
  ratePercent: number;
  aprcPercent: number;
  maxLtv: number;
  green: boolean;
  cashback: string | null;
  revertRatePercent: number | null;
  cashbackPercent: number | null;
  cashbackFlat: number | null;
  details: string | null;
  audience: string[];
  active: boolean;
}

function parseProduct(formData: FormData): ParsedProduct | string {
  const lender = String(formData.get("lender") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rateType = String(formData.get("rate_type") ?? "");
  const ratePercent = num(formData.get("rate_percent"));
  const aprcPercent = num(formData.get("aprc_percent"));
  // Entered as a percentage (90), stored as a fraction (0.9).
  const maxLtv = num(formData.get("max_ltv_percent")) / 100;
  const cashback = String(formData.get("cashback") ?? "").trim();
  const revertRatePercent = optNum(formData.get("revert_rate_percent"));
  const cashbackPercent = optNum(formData.get("cashback_percent"));
  const cashbackFlat = optNum(formData.get("cashback_flat"));
  const details = String(formData.get("details") ?? "").trim();
  const audience = formData
    .getAll("audience")
    .map(String)
    .filter((a): a is (typeof AUDIENCES)[number] =>
      (AUDIENCES as readonly string[]).includes(a),
    );

  if (!lender) return "Lender is required.";
  if (!name) return "Product name is required.";
  if (!(RATE_TYPES as readonly string[]).includes(rateType))
    return "Pick a rate type.";
  if (!Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent >= 100)
    return "Interest rate must be between 0 and 100.";
  if (!Number.isFinite(aprcPercent) || aprcPercent <= 0 || aprcPercent >= 100)
    return "APRC must be between 0 and 100.";
  if (!Number.isFinite(maxLtv) || maxLtv <= 0 || maxLtv > 1)
    return "Max LTV must be between 1 and 100.";
  if (
    revertRatePercent !== null &&
    (!Number.isFinite(revertRatePercent) || revertRatePercent <= 0 || revertRatePercent >= 100)
  )
    return "Revert rate must be between 0 and 100 (or left empty).";
  if (
    cashbackPercent !== null &&
    (!Number.isFinite(cashbackPercent) || cashbackPercent <= 0 || cashbackPercent >= 100)
  )
    return "Cashback % must be between 0 and 100 (or left empty).";
  if (cashbackFlat !== null && (!Number.isFinite(cashbackFlat) || cashbackFlat <= 0))
    return "Flat cashback must be a positive amount (or left empty).";
  if (audience.length === 0) return "Pick at least one buyer type.";

  return {
    lender,
    name,
    rateType,
    ratePercent,
    aprcPercent,
    maxLtv,
    green: formData.get("green") === "on",
    cashback: cashback || null,
    revertRatePercent,
    cashbackPercent,
    cashbackFlat,
    details: details || null,
    audience,
    active: formData.get("active") === "on",
  };
}

/** Insert (no id) or update (hidden id field) a lender product. */
export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseProduct(formData);
  if (typeof parsed === "string") return { status: "error", message: parsed };

  const id = String(formData.get("id") ?? "").trim();

  try {
    if (id) {
      await query(
        `update mortgage_products
            set lender = $1, name = $2, rate_type = $3, rate_percent = $4,
                aprc_percent = $5, max_ltv = $6, green = $7, cashback = $8,
                revert_rate_percent = $9, cashback_percent = $10,
                cashback_flat = $11, details = $12,
                audience = $13, active = $14, updated_at = now()
          where id = $15`,
        [
          parsed.lender,
          parsed.name,
          parsed.rateType,
          parsed.ratePercent,
          parsed.aprcPercent,
          parsed.maxLtv,
          parsed.green,
          parsed.cashback,
          parsed.revertRatePercent,
          parsed.cashbackPercent,
          parsed.cashbackFlat,
          parsed.details,
          parsed.audience,
          parsed.active,
          id,
        ],
      );
    } else {
      await query(
        `insert into mortgage_products
           (lender, name, rate_type, rate_percent, aprc_percent, max_ltv,
            green, cashback, revert_rate_percent, cashback_percent,
            cashback_flat, details, audience, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          parsed.lender,
          parsed.name,
          parsed.rateType,
          parsed.ratePercent,
          parsed.aprcPercent,
          parsed.maxLtv,
          parsed.green,
          parsed.cashback,
          parsed.revertRatePercent,
          parsed.cashbackPercent,
          parsed.cashbackFlat,
          parsed.details,
          parsed.audience,
          parsed.active,
        ],
      );
    }
  } catch (err) {
    console.error("[mortgage-rates] save failed:", err);
    return { status: "error", message: "Could not save. Check the values." };
  }

  revalidate();
  return { status: "saved", message: id ? "Saved." : "Product added." };
}

export async function deleteProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { status: "error", message: "Missing product id." };

  try {
    await query(`delete from mortgage_products where id = $1`, [id]);
  } catch (err) {
    console.error("[mortgage-rates] delete failed:", err);
    return { status: "error", message: "Could not delete." };
  }

  revalidate();
  return { status: "saved", message: "Deleted." };
}

/** Update the single policy/settings row (Central Bank limits + rates label). */
export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const ratesAsOf = String(formData.get("rates_as_of") ?? "").trim();
  const ltiFirstTime = num(formData.get("lti_first_time"));
  const ltiTradingUp = num(formData.get("lti_trading_up"));
  const maxLtvOwner = num(formData.get("max_ltv_owner_percent")) / 100;
  const maxLtvInvestment = num(formData.get("max_ltv_investment_percent")) / 100;
  const maxAgeAtEnd = num(formData.get("max_age_at_end"));
  const maxTermOwner = num(formData.get("max_term_owner"));
  const maxTermInvestment = num(formData.get("max_term_investment"));

  if (!ratesAsOf) return { status: "error", message: "Rates-as-of label is required." };
  if (!Number.isFinite(ltiFirstTime) || ltiFirstTime <= 0 || ltiFirstTime > 20)
    return { status: "error", message: "First-time buyer LTI looks wrong." };
  if (!Number.isFinite(ltiTradingUp) || ltiTradingUp <= 0 || ltiTradingUp > 20)
    return { status: "error", message: "Trading-up LTI looks wrong." };
  if (!Number.isFinite(maxLtvOwner) || maxLtvOwner <= 0 || maxLtvOwner > 1)
    return { status: "error", message: "Owner max LTV must be between 1 and 100." };
  if (!Number.isFinite(maxLtvInvestment) || maxLtvInvestment <= 0 || maxLtvInvestment > 1)
    return { status: "error", message: "Investment max LTV must be between 1 and 100." };
  if (!Number.isInteger(maxAgeAtEnd) || maxAgeAtEnd < 50 || maxAgeAtEnd > 100)
    return { status: "error", message: "Max age at end of term must be 50–100." };
  if (!Number.isInteger(maxTermOwner) || maxTermOwner < 5 || maxTermOwner > 45)
    return { status: "error", message: "Residential max term must be 5–45 years." };
  if (!Number.isInteger(maxTermInvestment) || maxTermInvestment < 5 || maxTermInvestment > 45)
    return { status: "error", message: "Investment max term must be 5–45 years." };

  try {
    await query(
      `insert into mortgage_settings
         (id, rates_as_of, lti_first_time, lti_trading_up,
          max_ltv_owner, max_ltv_investment, max_age_at_end,
          max_term_owner, max_term_investment)
       values (1, $1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update
         set rates_as_of = excluded.rates_as_of,
             lti_first_time = excluded.lti_first_time,
             lti_trading_up = excluded.lti_trading_up,
             max_ltv_owner = excluded.max_ltv_owner,
             max_ltv_investment = excluded.max_ltv_investment,
             max_age_at_end = excluded.max_age_at_end,
             max_term_owner = excluded.max_term_owner,
             max_term_investment = excluded.max_term_investment,
             updated_at = now()`,
      [
        ratesAsOf,
        ltiFirstTime,
        ltiTradingUp,
        maxLtvOwner,
        maxLtvInvestment,
        maxAgeAtEnd,
        maxTermOwner,
        maxTermInvestment,
      ],
    );
  } catch (err) {
    console.error("[mortgage-rates] settings save failed:", err);
    return { status: "error", message: "Could not save settings." };
  }

  revalidate();
  return { status: "saved", message: "Policy saved." };
}
