import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getVatData } from "../../lib/vat-data";
import { getRecentAudit } from "../../lib/rate-audit";
import { VatRatesManager } from "./vat-rates-manager";

export const metadata: Metadata = {
  title: "VAT rates",
  robots: { index: false, follow: false },
};

export default async function VatRatesPage() {
  await requireAdmin();

  // DB row when present and valid, otherwise the versioned fallback: exactly
  // what the public calculator uses.
  const [{ config }, audit] = await Promise.all([
    getVatData(),
    getRecentAudit("vat%", 20),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">VAT rates &amp; thresholds</h2>
        <p className="mt-1 text-sm text-muted">
          The rates and registration thresholds used by the{" "}
          <a
            href="/tools/ireland-vat"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland VAT calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed.
        </p>
      </header>

      <VatRatesManager config={config} audit={audit} />
    </div>
  );
}
