import type { Metadata } from "next";
import { query } from "../../lib/db";
import { requireAdmin } from "../../lib/supabase/guards";
import {
  DEFAULT_POLICY,
  RATES_AS_OF,
  type RateType,
} from "../../lib/ireland-mortgage";
import { RatesManager, type AdminProduct, type AdminSettings } from "./rates-manager";

export const metadata: Metadata = {
  title: "Mortgage rates",
  robots: { index: false, follow: false },
};

interface ProductRow {
  id: string;
  lender: string;
  name: string;
  rate_type: RateType;
  rate_percent: string;
  aprc_percent: string;
  max_ltv: string;
  green: boolean;
  cashback: string | null;
  revert_rate_percent: string | null;
  cashback_percent: string | null;
  cashback_flat: string | null;
  details: string | null;
  audience: string[];
  active: boolean;
}

interface SettingsRow {
  rates_as_of: string;
  lti_first_time: string;
  lti_trading_up: string;
  max_ltv_owner: string;
  max_ltv_investment: string;
  max_age_at_end: number;
  max_term_owner: number;
  max_term_investment: number;
}

export default async function MortgageRatesPage() {
  await requireAdmin();

  const [{ rows: productRows }, { rows: settingsRows }] = await Promise.all([
    query<ProductRow>(
      `select id, lender, name, rate_type, rate_percent, aprc_percent,
              max_ltv, green, cashback, revert_rate_percent, cashback_percent,
              cashback_flat, details, audience, active
         from mortgage_products
        order by lender asc, rate_percent asc`,
    ),
    query<SettingsRow>(
      `select rates_as_of, lti_first_time, lti_trading_up,
              max_ltv_owner, max_ltv_investment, max_age_at_end,
              max_term_owner, max_term_investment
         from mortgage_settings
        where id = 1`,
    ),
  ]);

  const products: AdminProduct[] = productRows.map((r) => ({
    id: r.id,
    lender: r.lender,
    name: r.name,
    rateType: r.rate_type,
    ratePercent: Number(r.rate_percent),
    aprcPercent: Number(r.aprc_percent),
    maxLtvPercent: Math.round(Number(r.max_ltv) * 100),
    green: r.green,
    cashback: r.cashback ?? "",
    revertRatePercent:
      r.revert_rate_percent == null ? null : Number(r.revert_rate_percent),
    cashbackPercent: r.cashback_percent == null ? null : Number(r.cashback_percent),
    cashbackFlat: r.cashback_flat == null ? null : Number(r.cashback_flat),
    details: r.details ?? "",
    audience: r.audience,
    active: r.active,
  }));

  const s = settingsRows[0];
  const settings: AdminSettings = s
    ? {
        ratesAsOf: s.rates_as_of,
        ltiFirstTime: Number(s.lti_first_time),
        ltiTradingUp: Number(s.lti_trading_up),
        maxLtvOwnerPercent: Math.round(Number(s.max_ltv_owner) * 100),
        maxLtvInvestmentPercent: Math.round(Number(s.max_ltv_investment) * 100),
        maxAgeAtEnd: s.max_age_at_end,
        maxTermOwner: s.max_term_owner,
        maxTermInvestment: s.max_term_investment,
      }
    : {
        ratesAsOf: RATES_AS_OF,
        ltiFirstTime: DEFAULT_POLICY.ltiFirstTime,
        ltiTradingUp: DEFAULT_POLICY.ltiTradingUp,
        maxLtvOwnerPercent: Math.round(DEFAULT_POLICY.maxLtvOwner * 100),
        maxLtvInvestmentPercent: Math.round(DEFAULT_POLICY.maxLtvInvestment * 100),
        maxAgeAtEnd: DEFAULT_POLICY.maxAgeAtEnd,
        maxTermOwner: DEFAULT_POLICY.maxTermOwner,
        maxTermInvestment: DEFAULT_POLICY.maxTermInvestment,
      };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Mortgage rates
        </h2>
        <p className="mt-1 text-sm text-muted">
          Lender products and Central Bank policy shown on the{" "}
          <a
            href="/tools/ireland"
            className="font-medium text-primary-600 transition-colors duration-200 hover:text-primary-500"
          >
            Ireland mortgage calculator
          </a>
          . Changes go live immediately, with no deploy needed.
          {products.length === 0 && (
            <>
              {" "}
              No products in the database yet. Run{" "}
              <code className="rounded-none bg-surface-muted px-1.5 py-0.5 text-xs">
                node scripts/db-migrate.mjs
              </code>{" "}
              to create and seed the tables.
            </>
          )}
        </p>
      </header>

      <RatesManager products={products} settings={settings} />
    </div>
  );
}
