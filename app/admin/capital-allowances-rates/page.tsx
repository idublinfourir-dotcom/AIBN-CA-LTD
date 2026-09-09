import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getCaData } from "../../lib/ca-data";
import { getRecentAudit } from "../../lib/rate-audit";
import { CaRatesManager } from "./ca-rates-manager";

export const metadata: Metadata = {
  title: "Capital allowances rates",
  robots: { index: false, follow: false },
};

export default async function CapitalAllowancesRatesPage() {
  await requireAdmin();

  // DB row when present and valid, otherwise the versioned fallback: exactly
  // what the public calculator uses.
  const [{ config }, audit] = await Promise.all([
    getCaData(),
    getRecentAudit("capital-allowances%", 20),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Capital allowances rates</h2>
        <p className="mt-1 text-sm text-muted">
          The per-asset rates and limits used by the{" "}
          <a
            href="/tools/ireland-capital-allowances"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland capital allowances calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed.
        </p>
      </header>

      <CaRatesManager config={config} audit={audit} />
    </div>
  );
}
