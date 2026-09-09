"use server";

import { revalidatePath } from "next/cache";
import { query } from "../../lib/db";
import { requireAdmin } from "../../lib/supabase/guards";
import { TAX_YEARS, yearRatesToJson } from "../../lib/tax-data";
import type { YearRates } from "../../lib/ireland-income-tax";

export interface ActionState {
  status: "idle" | "saved" | "error";
  message?: string;
}

function revalidate() {
  revalidatePath("/tools/ireland-income-tax");
  revalidatePath("/admin/tax-rates");
}

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());

/* Percentages are ENTERED as percent (e.g. 20, 0.5) and STORED as fractions
   (0.2, 0.005), matching the mortgage admin convention. */

class Invalid extends Error {}

function euro(formData: FormData, name: string, label: string): number {
  const n = num(formData.get(name));
  if (!Number.isFinite(n) || n < 0) throw new Invalid(`${label} must be a number ≥ 0.`);
  return n;
}

function pctFrac(formData: FormData, name: string, label: string): number {
  const n = num(formData.get(name));
  if (!Number.isFinite(n) || n < 0 || n > 100)
    throw new Invalid(`${label} must be between 0 and 100 (%).`);
  return n / 100;
}

/* Pension relief age bands: the age boundaries are fixed (Revenue has kept
   them stable for decades); only the relief % per band is editable. */
const PENSION_BAND_FIELDS = [
  { name: "pension_rate_u30", label: "Pension relief % (under 30)", maxAge: 29 },
  { name: "pension_rate_30_39", label: "Pension relief % (30–39)", maxAge: 39 },
  { name: "pension_rate_40_49", label: "Pension relief % (40–49)", maxAge: 49 },
  { name: "pension_rate_50_54", label: "Pension relief % (50–54)", maxAge: 54 },
  { name: "pension_rate_55_59", label: "Pension relief % (55–59)", maxAge: 59 },
  { name: "pension_rate_60_plus", label: "Pension relief % (60+)", maxAge: Infinity },
] as const;

function parseYearForm(formData: FormData): { year: number; rates: YearRates } {
  const year = num(formData.get("year"));
  if (!(TAX_YEARS as readonly number[]).includes(year))
    throw new Invalid("Unknown tax year.");

  const uscBand1UpTo = euro(formData, "usc_band1_up_to", "USC band 1 upper bound");
  const uscBand2UpTo = euro(formData, "usc_band2_up_to", "USC band 2 upper bound");
  const uscBand3UpTo = euro(formData, "usc_band3_up_to", "USC band 3 upper bound");
  if (!(uscBand1UpTo < uscBand2UpTo && uscBand2UpTo < uscBand3UpTo))
    throw new Invalid("USC band upper bounds must be increasing.");

  const rates: YearRates = {
    year,
    incomeTax: {
      standardRate: pctFrac(formData, "it_standard_rate", "Standard income tax rate"),
      higherRate: pctFrac(formData, "it_higher_rate", "Higher income tax rate"),
      srcop: {
        single: euro(formData, "srcop_single", "SRCOP (single)"),
        singleWithSpccc: euro(formData, "srcop_single_spccc", "SRCOP (single with SPCCC)"),
        marriedOneIncome: euro(formData, "srcop_married_one", "SRCOP (married, one income)"),
        marriedBandIncrease: euro(
          formData,
          "srcop_married_increase",
          "SRCOP (married second-income increase)",
        ),
      },
      credits: {
        personalSingle: euro(formData, "credit_personal_single", "Personal credit (single)"),
        personalMarried: euro(formData, "credit_personal_married", "Personal credit (married)"),
        employeePaye: euro(formData, "credit_employee_paye", "Employee PAYE credit"),
        earnedIncome: euro(formData, "credit_earned_income", "Earned income credit"),
        employmentCombinedCap: euro(
          formData,
          "credit_employment_cap",
          "PAYE + earned income combined cap",
        ),
        spccc: euro(formData, "credit_spccc", "Single person child carer credit"),
        ageSingle: euro(formData, "credit_age_single", "Age credit (single)"),
        ageMarried: euro(formData, "credit_age_married", "Age credit (married)"),
      },
      ageCreditThreshold: euro(formData, "age_credit_threshold", "Age credit threshold"),
    },
    usc: {
      exemptionThreshold: euro(formData, "usc_exemption_threshold", "USC exemption threshold"),
      bands: [
        { upTo: uscBand1UpTo, rate: pctFrac(formData, "usc_band1_rate", "USC band 1 rate") },
        { upTo: uscBand2UpTo, rate: pctFrac(formData, "usc_band2_rate", "USC band 2 rate") },
        { upTo: uscBand3UpTo, rate: pctFrac(formData, "usc_band3_rate", "USC band 3 rate") },
        { upTo: Infinity, rate: pctFrac(formData, "usc_band4_rate", "USC balance rate") },
      ],
      reduced: {
        ageThreshold: euro(formData, "usc_reduced_age", "Reduced USC age threshold"),
        incomeCeiling: euro(formData, "usc_reduced_ceiling", "Reduced USC income ceiling"),
        bands: [
          {
            upTo: euro(formData, "usc_reduced_band1_up_to", "Reduced USC band 1 upper bound"),
            rate: pctFrac(formData, "usc_reduced_band1_rate", "Reduced USC band 1 rate"),
          },
          {
            upTo: Infinity,
            rate: pctFrac(formData, "usc_reduced_band2_rate", "Reduced USC balance rate"),
          },
        ],
      },
      selfEmployedSurchargeThreshold: euro(
        formData,
        "usc_surcharge_threshold",
        "USC surcharge threshold",
      ),
      selfEmployedSurchargeRate: pctFrac(formData, "usc_surcharge_rate", "USC surcharge rate"),
    },
    prsi: {
      rate: pctFrac(formData, "prsi_rate", "PRSI rate"),
      selfEmployedMinimum: euro(formData, "prsi_min", "Class S minimum contribution"),
      weeklyExemptionThreshold: euro(formData, "prsi_weekly_exemption", "PRSI weekly exemption"),
      weeklyCreditMax: euro(formData, "prsi_weekly_credit_max", "PRSI weekly credit max"),
      weeklyCreditTaperUpper: euro(formData, "prsi_taper_upper", "PRSI credit taper upper"),
      weeklyCreditTaperDivisor: euro(formData, "prsi_taper_divisor", "PRSI credit taper divisor"),
    },
    pension: {
      earningsCap: euro(formData, "pension_earnings_cap", "Pension relief earnings cap"),
      ageBands: PENSION_BAND_FIELDS.map((f) => ({
        maxAge: f.maxAge,
        rate: pctFrac(formData, f.name, f.label),
      })),
    },
  };

  if (rates.prsi.weeklyCreditTaperDivisor <= 0)
    throw new Invalid("PRSI credit taper divisor must be greater than 0.");

  return { year, rates };
}

/** Save one tax year's full rate config (upsert into tax_rates as JSONB). */
export async function saveTaxYear(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  let parsed: { year: number; rates: YearRates };
  try {
    parsed = parseYearForm(formData);
  } catch (err) {
    if (err instanceof Invalid) return { status: "error", message: err.message };
    throw err;
  }

  try {
    await query(
      `insert into tax_rates (year, rates)
       values ($1, $2)
       on conflict (year) do update
         set rates = excluded.rates, updated_at = now()`,
      [parsed.year, JSON.stringify(yearRatesToJson(parsed.rates))],
    );
  } catch (err) {
    console.error("[tax-rates] save failed:", err);
    return { status: "error", message: "Could not save. Check the values." };
  }

  revalidate();
  return { status: "saved", message: `${parsed.year} rates saved.` };
}
