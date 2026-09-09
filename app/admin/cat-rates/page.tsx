import type { Metadata } from "next";
import { requireAdmin } from "../../lib/supabase/guards";
import { getCatData } from "../../lib/cat-data";
import { getRecentAudit } from "../../lib/rate-audit";
import { CatRatesManager } from "./cat-rates-manager";

export const metadata: Metadata = {
  title: "CAT rates",
  robots: { index: false, follow: false },
};

export default async function CatRatesPage() {
  await requireAdmin();

  const [{ config }, audit] = await Promise.all([
    getCatData(),
    getRecentAudit("cat%", 20),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">CAT rate, thresholds &amp; reliefs</h2>
        <p className="mt-1 text-sm text-muted">
          The values used by the{" "}
          <a
            href="/tools/ireland-cat"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland CAT calculator
          </a>
          . Update these after a Budget. Changes go live immediately, with no
          deploy needed.
        </p>
      </header>

      <CatRatesManager config={config} audit={audit} />
    </div>
  );
}
