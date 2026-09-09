import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getCorporationTaxData } from "../../lib/corporation-tax-data";
import { getRecentAudit } from "../../lib/rate-audit";
import { CtRatesManager } from "./ct-rates-manager";

export const metadata: Metadata = {
  title: "Corporation tax rates",
  robots: { index: false, follow: false },
};

export default async function CtRatesPage() {
  await requireAdmin();

  // DB row when present and valid, otherwise the versioned fallback: exactly
  // what the public calculator uses.
  const [{ config }, audit] = await Promise.all([
    getCorporationTaxData(),
    getRecentAudit("corporation-tax%", 20),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Corporation tax rates</h2>
        <p className="mt-1 text-sm text-muted">
          The trading and passive rates used by the{" "}
          <a
            href="/tools/ireland-corporation-tax"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland corporation tax calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed.
        </p>
      </header>

      <CtRatesManager config={config} audit={audit} />
    </div>
  );
}
