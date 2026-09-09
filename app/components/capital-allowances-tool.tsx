"use client";

/* Two-in-one tool on the Capital Allowances page:
   • Capital allowances (tax): wear & tear / writing-down allowances.
   • Working capital (finance): assets − liabilities + liquidity ratios.
   A sub-tab switches between them; the explainer cards below follow the mode. */

import { useState } from "react";
import { IrelandCapitalAllowancesCalculator } from "./ireland-capital-allowances-calculator";
import { WorkingCapitalCalculator } from "./working-capital-calculator";
import type { CaConfig } from "../lib/ireland-capital-allowances";

type Mode = "tax" | "finance";

const NOTES: Record<Mode, { title: string; body: string }[]> = {
  tax: [
    {
      title: "Rates by asset",
      body: "Plant & machinery: 12.5% a year over 8 years. Industrial buildings: 4% over 25 years. Energy-efficient equipment on the SEAI Triple-E register: 100% in year one (accelerated), extended to 31 December 2030.",
    },
    {
      title: "Cars are capped",
      body: "Car allowances are capped at €24,000 and further restricted by emissions: full relief up to 155 g/km, half relief from 156 to 190 g/km, and none above 190 g/km. The emissions bands change again on 1 January 2027.",
    },
    {
      title: "The cash value",
      body: "Allowances reduce taxable profit, so the cash saving is the allowance times your tax rate, shown here at the 12.5% trading rate. Disposals can trigger a balancing allowance or charge later.",
    },
  ],
  finance: [
    {
      title: "Working capital",
      body: "Current assets minus current liabilities. That difference is the buffer that funds day-to-day trading: a surplus covers your short-term obligations, a deficit points to a funding gap.",
    },
    {
      title: "The two ratios",
      body: "Current ratio = assets ÷ liabilities. The quick (acid-test) ratio strips out stock, so it is (assets − inventory) ÷ liabilities. Anything from 1.5 to 3 is the usual rule of thumb, though the comfortable range varies by industry.",
    },
    {
      title: "Read it in context",
      body: "It's a point-in-time snapshot. Seasonality, the cash-conversion cycle and your sector all shape what's comfortable, so pair it with cash-flow forecasting.",
    },
  ],
};

export function CapitalAllowancesTool({ config }: { config: CaConfig }) {
  const [mode, setMode] = useState<Mode>("tax");

  return (
    <>
      <div
        role="tablist"
        aria-label="Calculator mode"
        className="mb-6 flex flex-wrap gap-1.5 rounded-none border border-line bg-surface-muted p-1"
      >
        {(
          [
            ["tax", "Capital allowances (tax)"],
            ["finance", "Working capital (finance)"],
          ] as [Mode, string][]
        ).map(([m, label]) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m)}
              className={`flex-1 cursor-pointer rounded-none px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
                active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
        {mode === "tax" ? (
          <IrelandCapitalAllowancesCalculator config={config} />
        ) : (
          <WorkingCapitalCalculator />
        )}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {NOTES[mode].map((note) => (
          <div key={note.title} className="rounded-none border border-line bg-surface p-6">
            <h2 className="font-display text-base font-medium tracking-tight text-ink">
              {note.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{note.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
