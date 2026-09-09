import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getCgtData } from "../../lib/cgt-data";
import { getRecentAudit } from "../../lib/rate-audit";
import { CgtRatesManager } from "./cgt-rates-manager";

export const metadata: Metadata = {
  title: "CGT rates",
  robots: { index: false, follow: false },
};

export default async function CgtRatesPage() {
  await requireAdmin();

  // DB row when present and valid, otherwise the versioned fallback: exactly
  // what the public calculator uses. Audit trail covers all cgt-* areas.
  const [{ config, multipliers }, audit] = await Promise.all([
    getCgtData(),
    getRecentAudit("cgt-%", 20),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">CGT rates &amp; indexation</h2>
        <p className="mt-1 text-sm text-muted">
          Rates and the indexation multiplier table used by the{" "}
          <a
            href="/tools/ireland-cgt"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland capital gains tax calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed.
        </p>
      </header>

      <CgtRatesManager config={config} multipliers={multipliers} audit={audit} />
    </div>
  );
}
