"use client";

/* Admin editor for the Ireland income tax calculator: one card per tax year,
   covering income tax bands/credits, USC, PRSI and pension relief. Saving
   upserts the year's JSONB row in tax_rates and revalidates the public
   calculator, no deploy. Percentages are shown and entered as percent
   (20, 0.5) and stored as fractions (0.2, 0.005). */

import { useActionState } from "react";
import type { YearRates } from "../../lib/ireland-income-tax";
import { saveTaxYear, type ActionState } from "./actions";

const IDLE: ActionState = { status: "idle" };

const inputClass =
  "h-9 w-full rounded-none border border-line bg-white px-2.5 text-sm text-ink transition-colors duration-200 focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40";

const toPct = (fraction: number) => +(fraction * 100).toFixed(4);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Euro({ name, value, label }: { name: string; value: number; label: string }) {
  return (
    <Field label={label}>
      <input name={name} type="number" step="any" min="0" defaultValue={value} className={inputClass} required />
    </Field>
  );
}

function Pct({ name, value, label }: { name: string; value: number; label: string }) {
  return (
    <Field label={`${label} (%)`}>
      <input name={name} type="number" step="any" min="0" max="100" defaultValue={toPct(value)} className={inputClass} required />
    </Field>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-5 border-b border-line pb-1.5 text-sm font-semibold text-ink">
      {children}
    </h4>
  );
}

function StateNote({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      className={`text-xs font-medium ${
        state.status === "saved" ? "text-secondary-600" : "text-primary-600"
      }`}
    >
      {state.message}
    </p>
  );
}

const PENSION_BANDS = [
  { name: "pension_rate_u30", label: "Under 30" },
  { name: "pension_rate_30_39", label: "30–39" },
  { name: "pension_rate_40_49", label: "40–49" },
  { name: "pension_rate_50_54", label: "50–54" },
  { name: "pension_rate_55_59", label: "55–59" },
  { name: "pension_rate_60_plus", label: "60+" },
] as const;

function YearForm({ rates }: { rates: YearRates }) {
  const [state, action, pending] = useActionState(saveTaxYear, IDLE);
  const it = rates.incomeTax;
  const usc = rates.usc;
  const prsi = rates.prsi;

  return (
    <form action={action} className="rounded-none border border-line bg-white p-5">
      <input type="hidden" name="year" value={rates.year} />
      <h3 className="font-display text-base font-semibold text-ink">
        Tax year {rates.year}
      </h3>

      <SectionTitle>Income tax rates &amp; bands</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Pct name="it_standard_rate" value={it.standardRate} label="Standard rate" />
        <Pct name="it_higher_rate" value={it.higherRate} label="Higher rate" />
        <Euro name="age_credit_threshold" value={it.ageCreditThreshold} label="Age credit from age" />
        <Euro name="srcop_single" value={it.srcop.single} label="SRCOP, single (€)" />
        <Euro name="srcop_single_spccc" value={it.srcop.singleWithSpccc} label="SRCOP, single + SPCCC (€)" />
        <Euro name="srcop_married_one" value={it.srcop.marriedOneIncome} label="SRCOP, married with 1 income (€)" />
        <Euro name="srcop_married_increase" value={it.srcop.marriedBandIncrease} label="SRCOP, married 2nd-income increase, max (€)" />
      </div>

      <SectionTitle>Income tax credits (€)</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Euro name="credit_personal_single" value={it.credits.personalSingle} label="Personal, single" />
        <Euro name="credit_personal_married" value={it.credits.personalMarried} label="Personal, married" />
        <Euro name="credit_employee_paye" value={it.credits.employeePaye} label="Employee PAYE" />
        <Euro name="credit_earned_income" value={it.credits.earnedIncome} label="Earned income" />
        <Euro name="credit_employment_cap" value={it.credits.employmentCombinedCap} label="PAYE + earned cap" />
        <Euro name="credit_spccc" value={it.credits.spccc} label="SPCCC" />
        <Euro name="credit_age_single" value={it.credits.ageSingle} label="Age, single" />
        <Euro name="credit_age_married" value={it.credits.ageMarried} label="Age, married" />
      </div>

      <SectionTitle>USC</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Euro name="usc_exemption_threshold" value={usc.exemptionThreshold} label="Exempt at/below (€)" />
        <Euro name="usc_band1_up_to" value={usc.bands[0].upTo} label="Band 1 up to (€)" />
        <Euro name="usc_band2_up_to" value={usc.bands[1].upTo} label="Band 2 up to (€)" />
        <Euro name="usc_band3_up_to" value={usc.bands[2].upTo} label="Band 3 up to (€)" />
        <Pct name="usc_band1_rate" value={usc.bands[0].rate} label="Band 1 rate" />
        <Pct name="usc_band2_rate" value={usc.bands[1].rate} label="Band 2 rate" />
        <Pct name="usc_band3_rate" value={usc.bands[2].rate} label="Band 3 rate" />
        <Pct name="usc_band4_rate" value={usc.bands[3].rate} label="Balance rate" />
        <Euro name="usc_reduced_age" value={usc.reduced.ageThreshold} label="Reduced bands from age" />
        <Euro name="usc_reduced_ceiling" value={usc.reduced.incomeCeiling} label="Reduced income ceiling (€)" />
        <Euro name="usc_reduced_band1_up_to" value={usc.reduced.bands[0].upTo} label="Reduced band 1 up to (€)" />
        <Pct name="usc_reduced_band1_rate" value={usc.reduced.bands[0].rate} label="Reduced band 1 rate" />
        <Pct name="usc_reduced_band2_rate" value={usc.reduced.bands[1].rate} label="Reduced balance rate" />
        <Euro name="usc_surcharge_threshold" value={usc.selfEmployedSurchargeThreshold} label="Self-emp surcharge over (€)" />
        <Pct name="usc_surcharge_rate" value={usc.selfEmployedSurchargeRate} label="Self-emp surcharge" />
      </div>

      <SectionTitle>PRSI</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Pct name="prsi_rate" value={prsi.rate} label="Flat rate" />
        <Euro name="prsi_min" value={prsi.selfEmployedMinimum} label="Class S minimum (€)" />
        <Euro name="prsi_weekly_exemption" value={prsi.weeklyExemptionThreshold} label="Weekly exemption (€)" />
        <Euro name="prsi_weekly_credit_max" value={prsi.weeklyCreditMax} label="Weekly credit max (€)" />
        <Euro name="prsi_taper_upper" value={prsi.weeklyCreditTaperUpper} label="Credit taper upper (€/wk)" />
        <Euro name="prsi_taper_divisor" value={prsi.weeklyCreditTaperDivisor} label="Credit taper divisor" />
      </div>

      <SectionTitle>Pension relief</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Euro name="pension_earnings_cap" value={rates.pension.earningsCap} label="Earnings cap (€)" />
        {PENSION_BANDS.map((b, i) => (
          <Pct key={b.name} name={b.name} value={rates.pension.ageBands[i]?.rate ?? 0} label={`Relief, ${b.label}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Age boundaries of the relief bands are fixed (&lt;30, 30–39, 40–49, 50–54,
        55–59, 60+); only the relief % is editable.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 cursor-pointer items-center rounded-none bg-primary-500 px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : `Save ${rates.year} rates`}
        </button>
        <StateNote state={state} />
      </div>
    </form>
  );
}

export function TaxRatesManager({ years }: { years: YearRates[] }) {
  return (
    <div className="flex flex-col gap-8">
      {years.map((y) => (
        <YearForm key={y.year} rates={y} />
      ))}
    </div>
  );
}
