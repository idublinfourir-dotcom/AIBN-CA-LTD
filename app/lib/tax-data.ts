/* Server-side loader for the Ireland income tax calculator.
   Reads the per-year rate config from Postgres (tax_rates, one JSONB row per
   tax year, editable in /admin/tax-rates); falls back to the versioned
   RATES_<year> configs in ireland-income-tax.ts when the DB is unreachable,
   the row is missing, or the stored JSON fails validation, so the calculator
   never renders with broken numbers.

   JSON has no Infinity: the open-ended upper bound of the last USC band and
   the last pension age band are stored as null and converted back on read. */

import { query } from "./db";
import {
  RATES_2025,
  RATES_2026,
  type PensionAgeBand,
  type UscBand,
  type YearRates,
} from "./ireland-income-tax";

export const TAX_YEARS = [2026, 2025] as const;

const FALLBACK: Record<number, YearRates> = { 2026: RATES_2026, 2025: RATES_2025 };

/* ---------- YearRates → JSON-safe object (Infinity → null) ---------- */

export function yearRatesToJson(r: YearRates): unknown {
  const band = (b: UscBand) => ({
    upTo: Number.isFinite(b.upTo) ? b.upTo : null,
    rate: b.rate,
  });
  return {
    ...r,
    usc: {
      ...r.usc,
      bands: r.usc.bands.map(band),
      reduced: { ...r.usc.reduced, bands: r.usc.reduced.bands.map(band) },
    },
    pension: {
      ...r.pension,
      ageBands: r.pension.ageBands.map((b) => ({
        maxAge: Number.isFinite(b.maxAge) ? b.maxAge : null,
        rate: b.rate,
      })),
    },
  };
}

/* ---------- stored JSON → YearRates (validated; null on any bad field) ---- */

class BadRates extends Error {}

function req(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new BadRates();
  return v;
}

/** Finite number, or null meaning "no upper bound" (→ Infinity). */
function reqBound(v: unknown): number {
  if (v === null) return Infinity;
  return req(v);
}

function obj(v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null) throw new BadRates();
  return v as Record<string, unknown>;
}

function uscBands(v: unknown): UscBand[] {
  if (!Array.isArray(v) || v.length === 0) throw new BadRates();
  return v.map((b) => {
    const o = obj(b);
    return { upTo: reqBound(o.upTo), rate: req(o.rate) };
  });
}

export function parseYearRates(year: number, raw: unknown): YearRates | null {
  try {
    const r = obj(raw);
    const it = obj(r.incomeTax);
    const srcop = obj(it.srcop);
    const credits = obj(it.credits);
    const usc = obj(r.usc);
    const reduced = obj(usc.reduced);
    const prsi = obj(r.prsi);
    const pension = obj(r.pension);
    const ageBandsRaw = pension.ageBands;
    if (!Array.isArray(ageBandsRaw) || ageBandsRaw.length === 0) throw new BadRates();
    const ageBands: PensionAgeBand[] = ageBandsRaw.map((b) => {
      const o = obj(b);
      return { maxAge: reqBound(o.maxAge), rate: req(o.rate) };
    });

    return {
      year,
      incomeTax: {
        standardRate: req(it.standardRate),
        higherRate: req(it.higherRate),
        srcop: {
          single: req(srcop.single),
          singleWithSpccc: req(srcop.singleWithSpccc),
          marriedOneIncome: req(srcop.marriedOneIncome),
          // Added after launch: rows saved before it exists default to €35,000
          // rather than throwing the whole year back to the static fallback.
          marriedBandIncrease:
            srcop.marriedBandIncrease === undefined ? 35_000 : req(srcop.marriedBandIncrease),
        },
        credits: {
          personalSingle: req(credits.personalSingle),
          personalMarried: req(credits.personalMarried),
          employeePaye: req(credits.employeePaye),
          earnedIncome: req(credits.earnedIncome),
          employmentCombinedCap: req(credits.employmentCombinedCap),
          spccc: req(credits.spccc),
          ageSingle: req(credits.ageSingle),
          ageMarried: req(credits.ageMarried),
        },
        ageCreditThreshold: req(it.ageCreditThreshold),
      },
      usc: {
        exemptionThreshold: req(usc.exemptionThreshold),
        bands: uscBands(usc.bands),
        reduced: {
          ageThreshold: req(reduced.ageThreshold),
          incomeCeiling: req(reduced.incomeCeiling),
          bands: uscBands(reduced.bands),
        },
        selfEmployedSurchargeThreshold: req(usc.selfEmployedSurchargeThreshold),
        selfEmployedSurchargeRate: req(usc.selfEmployedSurchargeRate),
      },
      prsi: {
        rate: req(prsi.rate),
        selfEmployedMinimum: req(prsi.selfEmployedMinimum),
        weeklyExemptionThreshold: req(prsi.weeklyExemptionThreshold),
        weeklyCreditMax: req(prsi.weeklyCreditMax),
        weeklyCreditTaperUpper: req(prsi.weeklyCreditTaperUpper),
        weeklyCreditTaperDivisor: req(prsi.weeklyCreditTaperDivisor),
      },
      pension: {
        earningsCap: req(pension.earningsCap),
        ageBands,
      },
    };
  } catch (err) {
    if (err instanceof BadRates) return null;
    throw err;
  }
}

/* ---------- loader ---------- */

export async function getTaxRates(): Promise<Record<number, YearRates>> {
  try {
    const { rows } = await query<{ year: number; rates: unknown }>(
      `select year, rates from tax_rates where year = any($1)`,
      [[...TAX_YEARS]],
    );
    const out: Record<number, YearRates> = { ...FALLBACK };
    for (const row of rows) {
      const parsed = parseYearRates(row.year, row.rates);
      if (parsed) out[row.year] = parsed;
      else console.error(`[tax] stored rates for ${row.year} failed validation; using fallback`);
    }
    return out;
  } catch (err) {
    console.error("[tax] DB read failed, using static rate configs:", err);
    return { ...FALLBACK };
  }
}
