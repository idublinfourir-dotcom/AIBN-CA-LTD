/* Unit tests for the Ireland investment options engine.
   Run: node --test app/lib/ireland-investment.test.ts   (Node 22.6+ strips types)

   Covers dataset integrity across all 32 options, the workbook's own net
   returns and 10-year projections, pension capacity, every filter (horizon,
   risk, sector, guarantee, minimum), ranking, the per-option flags and the
   plan-level warnings. */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DGS_LIMIT,
  HORIZON_BY_VALUE,
  INVESTMENT_OPTIONS,
  RISK_LEVELS,
  TAX,
  DEFAULT_INPUTS,
  effectiveTaxRate,
  grossEquivalent,
  grossMid,
  maxPersonalPensionContribution,
  netReturn,
  pensionAgePercent,
  planInvestments,
  projectValue,
  type PlannerInputs,
} from "./ireland-investment.ts";

const inputs = (over: Partial<PlannerInputs> = {}): PlannerInputs => ({
  ...DEFAULT_INPUTS,
  ...over,
});

const byId = (id: string) => {
  const option = INVESTMENT_OPTIONS.find((o) => o.id === id);
  assert.ok(option, `no option ${id}`);
  return option;
};

/* ---------- dataset integrity ---------- */

test("carries all 32 options with unique ids", () => {
  assert.equal(INVESTMENT_OPTIONS.length, 32);
  assert.equal(new Set(INVESTMENT_OPTIONS.map((o) => o.id)).size, 32);
});

test("every option is internally consistent", () => {
  for (const o of INVESTMENT_OPTIONS) {
    assert.ok(o.grossLow <= o.grossHigh, `${o.id}: gross range inverted`);
    assert.ok(o.risk >= 1 && o.risk <= 5, `${o.id}: risk out of band`);
    assert.ok(o.lockYears >= 0, `${o.id}: negative lock`);
    assert.ok(o.minimum >= 0, `${o.id}: negative minimum`);
    assert.ok(o.note.length > 0 && o.cap.length > 0, `${o.id}: missing copy`);
    if (o.effectiveTax !== "marginal") {
      assert.ok(o.effectiveTax >= 0 && o.effectiveTax <= 1, `${o.id}: tax rate out of band`);
    }
  }
});

/* ---------- the workbook's own numbers ---------- */

test("reproduces the workbook's net returns", () => {
  const m = 0.52;
  // Post Office 1.25% less 33% DIRT = 0.8375%
  assert.ok(Math.abs(netReturn(byId("posb-deposit"), m) - 0.008375) < 1e-9);
  // 10-yr Solidarity Bond is tax-free, so net === gross
  assert.ok(Math.abs(netReturn(byId("state-savings-10yr-solidarity"), m) - 0.0266) < 1e-9);
  // Global equity ETF 6.5% mid less 38% exit tax = 4.03%
  assert.ok(Math.abs(netReturn(byId("global-equity-etf"), m) - 0.0403) < 1e-9);
  // Investment trust 6.5% mid less 33% CGT = 4.355%
  assert.ok(Math.abs(netReturn(byId("investment-trusts"), m) - 0.04355) < 1e-9);
  // Raisin 3.245% mid less 33% DIRT = 2.17415%
  assert.ok(Math.abs(netReturn(byId("raisin-fixed-term"), m) - 0.0217415) < 1e-9);
});

test("marginal-rate options follow the investor's own rate", () => {
  const bond = byId("irish-govt-bonds");
  assert.equal(bond.effectiveTax, "marginal");
  assert.equal(effectiveTaxRate(bond, 0.52), 0.52);
  assert.equal(effectiveTaxRate(bond, 0.2), 0.2);
  // 3.295% mid less 52% = 1.5816%, the workbook's figure
  assert.ok(Math.abs(netReturn(bond, 0.52) - 0.015816) < 1e-9);
  // A standard-rate taxpayer keeps more of the same coupon.
  assert.ok(netReturn(bond, 0.2) > netReturn(bond, 0.52));
});

test("reproduces the workbook's 10-year projection on 100,000", () => {
  /* The projection tab quotes its own gross rate per route rather than the
     option mid-point: it prices the pillar bank at the best of the three
     rates, and the pension row at an equity return inside the wrapper rather
     than at the pension range's mid. So this pins the maths against the tab's
     stated inputs; the test below covers projection from the option mid. */
  const route = (gross: number, tax: number) => projectValue(100_000, gross * (1 - tax), 10);
  assert.ok(Math.abs(route(0.0125, TAX.dirt) - 108_697.79) < 0.5); // pillar bank
  assert.ok(Math.abs(route(0.034, TAX.dirt) - 125_262.84) < 0.5); // Raisin 1-year
  assert.ok(Math.abs(route(0.0229, 0) - 125_409.89) < 0.5); // 5-year Certificate
  assert.ok(Math.abs(route(0.0266, 0) - 130_020.73) < 0.5); // 10-year Solidarity Bond
  assert.ok(Math.abs(route(0.0339, 0.52) - 117_516.7) < 0.5); // Irish government bond
  assert.ok(Math.abs(route(0.065, TAX.exit) - 148_451.98) < 0.5); // global equity ETF
  assert.ok(Math.abs(route(0.065, TAX.cgt) - 153_155.51) < 0.5); // investment trust
  assert.ok(Math.abs(route(0.065, 0) - 187_713.75) < 0.5); // the same equities in a pension
});

test("the plan projects each option from its own mid-range net return", () => {
  const plan = planInvestments(inputs({ amount: 100_000, risk: 5, horizon: "medium" }));
  const etf = plan.results.find((r) => r.option.id === "global-equity-etf");
  const trust = plan.results.find((r) => r.option.id === "investment-trusts");
  assert.ok(etf && trust);
  // Both mid at 6.5% gross, so they meet the workbook's projection exactly.
  assert.ok(Math.abs(etf.projectedValue - 148_451.98) < 0.5);
  assert.ok(Math.abs(trust.projectedValue - 153_155.51) < 0.5);
  // The 33% CGT wrapper is worth this much more than the 38% fund wrapper.
  assert.ok(trust.projectedValue - etf.projectedValue > 4_500);
});

test("grossEquivalent restates a tax-free rate for a DIRT payer", () => {
  // 2.29% tax-free is worth 3.42% gross at 33% DIRT
  assert.ok(Math.abs(grossEquivalent(0.0229, TAX.dirt) - 0.0341791) < 1e-6);
  assert.ok(Math.abs(grossEquivalent(0.0266, TAX.dirt) - 0.0397015) < 1e-6);
});

/* ---------- pension capacity ---------- */

test("pension age bands match the 2026 table", () => {
  assert.equal(pensionAgePercent(25), 0.15);
  assert.equal(pensionAgePercent(35), 0.2);
  assert.equal(pensionAgePercent(42), 0.25);
  assert.equal(pensionAgePercent(52), 0.3);
  assert.equal(pensionAgePercent(57), 0.35);
  assert.equal(pensionAgePercent(64), 0.4);
});

test("personal pension relief is capped by the lower of salary and 115,000", () => {
  // Age 42 on a 100,000 salary: 25% of 100,000
  assert.equal(maxPersonalPensionContribution(42, 100_000), 25_000);
  // The same age on 200,000 is capped at 25% of 115,000
  assert.equal(maxPersonalPensionContribution(42, 200_000), 28_750);
});

/* ---------- filtering ---------- */

test("horizon rules out anything locked for longer", () => {
  const short = planInvestments(inputs({ horizon: "short", risk: 5 }));
  for (const r of short.results) {
    assert.ok(
      r.option.lockYears <= HORIZON_BY_VALUE.short.maxLockYears,
      `${r.option.id} locks past a short horizon`,
    );
  }
  // The 10-year Solidarity Bond cannot appear on a 0-3 year horizon.
  assert.ok(!short.results.some((r) => r.option.id === "state-savings-10yr-solidarity"));
  // It does on a long one.
  const long = planInvestments(inputs({ horizon: "long", risk: 5 }));
  assert.ok(long.results.some((r) => r.option.id === "state-savings-10yr-solidarity"));
});

test("risk level is an upper bound", () => {
  for (const level of RISK_LEVELS) {
    const plan = planInvestments(inputs({ risk: level.value, horizon: "long" }));
    for (const r of plan.results) {
      assert.ok(r.option.risk <= level.value);
    }
  }
});

test("risk 1 returns only guaranteed cash-like options", () => {
  const plan = planInvestments(inputs({ risk: 1, horizon: "long", amount: 50_000 }));
  assert.ok(plan.results.length > 0);
  for (const r of plan.results) {
    assert.equal(r.option.risk, 1);
  }
});

test("the guarantee filter drops everything unguaranteed", () => {
  const plan = planInvestments(inputs({ guaranteedOnly: true, risk: 5, horizon: "long" }));
  assert.ok(plan.results.length > 0);
  for (const r of plan.results) {
    assert.notEqual(r.option.guarantee, "none");
  }
});

test("the sector filter splits State-backed from private", () => {
  const state = planInvestments(inputs({ sector: "state", risk: 5, horizon: "long" }));
  for (const r of state.results) {
    assert.ok(["state", "state-subsidised"].includes(r.option.sector));
  }
  const priv = planInvestments(inputs({ sector: "private", risk: 5, horizon: "long" }));
  for (const r of priv.results) {
    assert.ok(!["state", "state-subsidised"].includes(r.option.sector));
  }
  // A credit union is member-owned, so it sits on the private side.
  assert.ok(priv.results.some((r) => r.option.id === "credit-union"));
});

test("options below their minimum are excluded with a reason", () => {
  const plan = planInvestments(inputs({ amount: 1_000, risk: 5, horizon: "long" }));
  assert.ok(!plan.results.some((r) => r.option.id === "buy-to-let"));
  const reason = plan.excluded.find((e) => e.option.id === "buy-to-let")?.reason;
  assert.match(reason ?? "", /at least/);
});

test("every option is either shown or explained, never dropped silently", () => {
  for (const risk of [1, 3, 5] as const) {
    for (const horizon of ["short", "medium", "long"] as const) {
      const plan = planInvestments(inputs({ risk, horizon, amount: 250_000 }));
      assert.equal(
        plan.results.length + plan.excluded.length,
        INVESTMENT_OPTIONS.length,
        `risk ${risk} / ${horizon} loses options`,
      );
    }
  }
});

/* ---------- ranking and flags ---------- */

test("results are ranked by net return, highest first", () => {
  const plan = planInvestments(inputs({ risk: 5, horizon: "long" }));
  for (let i = 1; i < plan.results.length; i += 1) {
    assert.ok(plan.results[i - 1].netReturn >= plan.results[i].netReturn);
  }
});

test("tax-free State Savings beat a higher taxed deposit on net return", () => {
  const plan = planInvestments(inputs({ risk: 1, horizon: "long", amount: 50_000 }));
  const solidarity = plan.results.find((r) => r.option.id === "state-savings-10yr-solidarity");
  const raisin = plan.results.find((r) => r.option.id === "raisin-fixed-term");
  assert.ok(solidarity && raisin);
  // 3.40% gross taxed at 33% loses to 2.66% tax-free.
  assert.ok(raisin.grossMid > solidarity.grossMid);
  assert.ok(solidarity.netReturn > raisin.netReturn);
});

test("a balance above the deposit guarantee is flagged", () => {
  const plan = planInvestments(inputs({ amount: DGS_LIMIT + 1, risk: 1, horizon: "short" }));
  const bank = plan.results.find((r) => r.option.id === "pillar-bank-deposit");
  assert.ok(bank);
  assert.ok(bank.flags.some((f) => f.includes("Deposit guarantee")));
  assert.ok(plan.warnings.some((w) => w.includes("Deposit guarantee")));
  // At or below the limit there is nothing to warn about.
  const small = planInvestments(inputs({ amount: DGS_LIMIT, risk: 1, horizon: "short" }));
  assert.ok(!small.warnings.some((w) => w.includes("Deposit guarantee")));
});

test("a hard per-person cap is flagged when the amount exceeds it", () => {
  const plan = planInvestments(inputs({ amount: 500_000, risk: 1, horizon: "long" }));
  const solidarity = plan.results.find((r) => r.option.id === "state-savings-10yr-solidarity");
  assert.ok(solidarity?.flags.some((f) => f.includes("Caps at")));
});

test("the regular-saver is flagged as unable to take a lump sum", () => {
  const plan = planInvestments(inputs({ risk: 1, horizon: "long", amount: 50_000 }));
  const instalment = plan.results.find((r) => r.option.id === "state-savings-instalment");
  assert.ok(instalment?.flags.some((f) => f.includes("lump sum")));
});

test("pension rows carry the relief-in / taxed-out caveat", () => {
  const plan = planInvestments(inputs({ risk: 3, horizon: "long" }));
  const pensions = plan.results.filter((r) => r.option.category === "pension");
  assert.ok(pensions.length > 0);
  for (const p of pensions) {
    assert.ok(p.flags.some((f) => f.includes("tax relief going in")));
  }
});

/* ---------- warnings ---------- */

test("an impossible combination returns nothing, with an explanation", () => {
  /* State-backed, guaranteed, needed within three years, but only €10 of it:
     the Post Office account needs €50 and Prize Bonds €25, and every State
     Savings product locks for three years or more. */
  const plan = planInvestments(
    inputs({ risk: 1, horizon: "short", sector: "state", guaranteedOnly: true, amount: 10 }),
  );
  assert.equal(plan.results.length, 0);
  assert.ok(plan.warnings.some((w) => w.includes("Nothing matches")));
});

test("a cash-only plan that loses to inflation says so", () => {
  const plan = planInvestments(
    inputs({ risk: 1, horizon: "short", sector: "state", amount: 50_000 }),
  );
  // Post Office at 0.8375% net and Prize Bonds at 0.75% are both under 2%.
  assert.ok(plan.results.every((r) => r.realReturn <= 0));
  assert.ok(plan.warnings.some((w) => w.includes("loses purchasing power")));
});

test("risk 5 warns about total loss", () => {
  const plan = planInvestments(inputs({ risk: 5, horizon: "long" }));
  assert.ok(plan.warnings.some((w) => w.includes("losing the entire amount")));
});

/* ---------- projection ---------- */

test("the projection compounds over the horizon's own term", () => {
  assert.equal(planInvestments(inputs({ horizon: "short" })).years, 3);
  assert.equal(planInvestments(inputs({ horizon: "medium" })).years, 10);
  assert.equal(planInvestments(inputs({ horizon: "long" })).years, 20);
});

test("gain is the projected value less the amount invested", () => {
  const plan = planInvestments(inputs({ amount: 200_000, risk: 4, horizon: "medium" }));
  for (const r of plan.results) {
    assert.ok(Math.abs(r.gain - (r.projectedValue - 200_000)) < 1e-6);
    assert.ok(Math.abs(r.netReturn - grossMid(r.option) * (1 - r.effectiveTaxRate)) < 1e-12);
  }
});

test("pension wrappers stay out of anything shorter than a 10-year horizon", () => {
  for (const horizon of ["short", "medium"] as const) {
    const plan = planInvestments(inputs({ horizon, risk: 5, amount: 250_000 }));
    assert.ok(
      !plan.results.some((r) => r.option.category === "pension"),
      `a pension surfaced on a ${horizon} horizon`,
    );
    assert.ok(
      plan.excluded.some(
        (e) => e.option.id === "executive-pension" && /Locks capital/.test(e.reason),
      ),
    );
  }
  // On a long horizon they are the whole point, and rank at the top.
  const long = planInvestments(inputs({ horizon: "long", risk: 5 }));
  assert.ok(long.results.some((r) => r.option.category === "pension"));
});

test("every option links somewhere an Irish resident can actually go", () => {
  for (const o of INVESTMENT_OPTIONS) {
    assert.ok(o.link.label.length > 0, `${o.id}: no link label`);
    assert.match(o.link.url, /^https:\/\//, `${o.id}: link is not https`);
    // No placeholder or example hosts: these are live destinations.
    assert.doesNotMatch(o.link.url, /example\.|localhost|TODO/i, `${o.id}: placeholder link`);
  }
});

test("State Savings products link to their own product page, not a generic one", () => {
  const stateSavings = INVESTMENT_OPTIONS.filter((o) => o.id.startsWith("state-savings-"));
  assert.equal(stateSavings.length, 4);
  const urls = new Set(stateSavings.map((o) => o.link.url));
  // Four products, four distinct pages.
  assert.equal(urls.size, 4);
  for (const o of stateSavings) {
    assert.match(o.link.url, /statesavings\.ie\/our-products\//);
  }
});

test("the plan carries the link through to each result", () => {
  const plan = planInvestments(inputs({ risk: 5, horizon: "long" }));
  assert.ok(plan.results.length > 0);
  for (const r of plan.results) {
    assert.equal(r.option.link.url, byId(r.option.id).link.url);
  }
});
