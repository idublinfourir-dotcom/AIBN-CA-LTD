/* Unit tests for the Irish income tax engine.
   Run: node --test app/lib/ireland-income-tax.test.ts   (Node 22.6+ strips types)

   Two known-good cases:
   (a) simple PAYE employee sanity check,
   (b) the VERIFIED REFERENCE CASE captured from the live Deloitte calculator:
       every line must reproduce exactly. It was chosen to exercise the pension
       cap, the combined employment-credit cap, and the self-employed USC
       surcharge all at once. If any line is off, there is a bug. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeIrishTax,
  type IncomeTaxInput,
} from "./ireland-income-tax.ts";

/** Displayed figures are whole euros: compare rounded, like the UI shows them. */
const round = (n: number) => Math.round(n);

test("(a) simple: single PAYE employee, €50,000, age 30, no children", () => {
  const input: IncomeTaxInput = {
    maritalStatus: "single",
    hasChildOnChildBenefit: false,
    isPrincipalCarerOfDependentChild: false,
    age: 30,
    employmentIncome: 50_000,
    selfEmploymentOrOtherIncome: 0,
    pensionContribution: 0,
  };
  const r = computeIrishTax(input, 2026);

  // Income tax: 20% × 44,000 = 8,800; 40% × 6,000 = 2,400; less €4,000 credits.
  assert.equal(round(r.incomeTax.netTax), 7_200);
  // USC: 0.5%×12,012 + 2%×16,688 + 3%×21,300 = 1,032.82 → €1,033.
  assert.equal(round(r.usc.total), 1_033);
});

test("(b) VERIFIED REFERENCE CASE: €4M employment + €1M self-emp + €2M pension, age 30", () => {
  const input: IncomeTaxInput = {
    maritalStatus: "single",
    hasChildOnChildBenefit: false,
    isPrincipalCarerOfDependentChild: false,
    age: 30,
    employmentIncome: 4_000_000,
    selfEmploymentOrOtherIncome: 1_000_000,
    pensionContribution: 2_000_000,
  };
  const r = computeIrishTax(input, 2026);

  assert.equal(round(r.grossIncome), 5_000_000, "Total income");
  assert.equal(round(r.pension.qualifying), 23_000, "Qualifying Pension Deduction");
  assert.equal(round(r.incomeTax.taxAtStandard), 8_800, "Tax @ 20%");
  assert.equal(round(r.incomeTax.taxAtHigher), 1_973_200, "Tax @ 40%");
  assert.equal(round(r.incomeTax.totalCredits), 4_000, "Tax Credits");
  assert.equal(round(r.incomeTax.netTax), 1_978_000, "Net Tax");
  assert.equal(round(r.usc.total), 423_031, "USC");
  assert.equal(round(r.netIncomeBeforePrsi), 2_575_969, "Net income before PRSI");
  assert.equal(round(r.prsi.total), 210_000, "PRSI");
  assert.equal(round(r.netIncome), 2_365_969, "Annual Net Income");

  // Combined employment credit must NOT stack (2,000, not 4,000): both income types.
  const employmentCredit = r.incomeTax.credits.find((c) =>
    c.name.includes("Earned Income") || c.name.includes("PAYE"),
  );
  assert.equal(employmentCredit?.amount, 2_000, "Combined employment credit capped at €2,000");

  // USC surcharge slice: 3% × (1,000,000 − 100,000) = 27,000.
  assert.equal(round(r.usc.selfEmployedSurcharge), 27_000, "Self-employed USC surcharge");
});

test("(c) married, two incomes: €80,000 + €30,000 spouse, age 40, 2026", () => {
  const input: IncomeTaxInput = {
    maritalStatus: "married",
    hasChildOnChildBenefit: false,
    isPrincipalCarerOfDependentChild: false,
    age: 40,
    employmentIncome: 80_000,
    selfEmploymentOrOtherIncome: 0,
    pensionContribution: 0,
    spouseEmploymentIncome: 30_000,
    spouseSelfEmploymentOrOtherIncome: 0,
  };
  const r = computeIrishTax(input, 2026);

  assert.equal(round(r.grossIncome), 110_000, "Household income");
  assert.equal(round(r.yourIncome), 80_000, "Your income");
  assert.equal(round(r.spouseIncome), 30_000, "Spouse income");

  // SRCOP: 53,000 + min(35,000, 30,000) = 83,000.
  assert.equal(r.incomeTax.standardRateCutOff, 83_000, "Joint SRCOP");
  // 20% × 83,000 = 16,600; 40% × 27,000 = 10,800.
  assert.equal(round(r.incomeTax.taxAtStandard), 16_600, "Tax @ 20%");
  assert.equal(round(r.incomeTax.taxAtHigher), 10_800, "Tax @ 40%");
  // Credits: married personal 4,000 + your PAYE 2,000 + spouse PAYE 2,000.
  assert.equal(round(r.incomeTax.totalCredits), 8_000, "Tax credits");
  assert.equal(round(r.incomeTax.netTax), 19_400, "Net tax");

  // USC per person: yours on 80,000 = 2,430.62; spouse on 30,000 = 432.82.
  assert.equal(round(r.usc.total), 2_431, "Your USC");
  assert.equal(round(r.spouseUsc.total), 433, "Spouse USC");

  // PRSI per person at 4.2%: 3,360 + 1,260.
  assert.equal(round(r.prsi.total), 3_360, "Your PRSI");
  assert.equal(round(r.spousePrsi.total), 1_260, "Spouse PRSI");

  // Net: 110,000 − 19,400 − 2,863.44 − 4,620 = 83,116.56.
  assert.equal(round(r.netIncome), 83_117, "Household net income");
});

test("(d) married, one income: spouse fields empty keep the €53,000 band", () => {
  const input: IncomeTaxInput = {
    maritalStatus: "married",
    hasChildOnChildBenefit: false,
    isPrincipalCarerOfDependentChild: false,
    age: 40,
    employmentIncome: 60_000,
    selfEmploymentOrOtherIncome: 0,
    pensionContribution: 0,
  };
  const r = computeIrishTax(input, 2026);

  assert.equal(r.incomeTax.standardRateCutOff, 53_000, "One-income married SRCOP");
  // 20% × 53,000 = 10,600; 40% × 7,000 = 2,800; credits 4,000 + 2,000.
  assert.equal(round(r.incomeTax.netTax), 7_400, "Net tax");
  assert.equal(round(r.spouseUsc.total), 0, "No spouse USC");
  assert.equal(round(r.spousePrsi.total), 0, "No spouse PRSI");
});

test("(e) spouse income ignored unless married", () => {
  const input: IncomeTaxInput = {
    maritalStatus: "single",
    hasChildOnChildBenefit: false,
    isPrincipalCarerOfDependentChild: false,
    age: 30,
    employmentIncome: 50_000,
    selfEmploymentOrOtherIncome: 0,
    pensionContribution: 0,
    spouseEmploymentIncome: 30_000,
  };
  const r = computeIrishTax(input, 2026);
  assert.equal(round(r.grossIncome), 50_000, "Spouse income not counted");
  assert.equal(round(r.spouseIncome), 0);
  assert.equal(round(r.incomeTax.netTax), 7_200, "Same as single case (a)");
});
