import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getTaxRates, TAX_YEARS } from "../../lib/tax-data";
import { TaxRatesManager } from "./tax-rates-manager";

export const metadata: Metadata = {
  title: "Tax rates",
  robots: { index: false, follow: false },
};

export default async function TaxRatesPage() {
  await requireAdmin();

  // Effective rates: DB row when present and valid, otherwise the versioned
  // fallback config: exactly what the public calculator uses.
  const ratesByYear = await getTaxRates();
  const years = TAX_YEARS.map((y) => ratesByYear[y]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Tax rates</h2>
        <p className="mt-1 text-sm text-muted">
          Income tax, USC, PRSI and pension-relief figures used by the{" "}
          <a
            href="/tools/ireland-income-tax"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland income tax calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed. Percentages are entered as percent (e.g. 20 or 0.5).
        </p>
      </header>

      <TaxRatesManager years={years} />
    </div>
  );
}
