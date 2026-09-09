import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getRdData } from "../../lib/rd-data";
import { getRecentAudit } from "../../lib/rate-audit";
import { RdRatesManager } from "./rd-rates-manager";

export const metadata: Metadata = {
  title: "R&D tax credit rates",
  robots: { index: false, follow: false },
};

export default async function RdRatesPage() {
  await requireAdmin();

  // DB row when present and valid, otherwise the versioned fallback: exactly
  // what the public calculator uses.
  const [{ config }, audit] = await Promise.all([
    getRdData(),
    getRecentAudit("rd-credit%", 20),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">R&amp;D tax credit rates</h2>
        <p className="mt-1 text-sm text-muted">
          The rates and instalment rule used by the{" "}
          <a
            href="/tools/ireland-rd-tax-credit"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland R&amp;D tax credit calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed.
        </p>
      </header>

      <RdRatesManager config={config} audit={audit} />
    </div>
  );
}
