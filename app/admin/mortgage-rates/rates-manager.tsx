"use client";

/* Admin editor for the Ireland mortgage comparison: Central Bank policy
   numbers + the lender rate table. Saving revalidates /tools/ireland, so
   changes go live immediately, no deploy. */

import { useActionState } from "react";
import { RATE_TYPE_LABELS, type RateType } from "../../lib/ireland-mortgage";
import {
  deleteProduct,
  saveProduct,
  updateSettings,
  type ActionState,
} from "./actions";

const IDLE: ActionState = { status: "idle" };

export interface AdminProduct {
  id: string;
  lender: string;
  name: string;
  rateType: RateType;
  ratePercent: number;
  aprcPercent: number;
  maxLtvPercent: number;
  green: boolean;
  cashback: string;
  revertRatePercent: number | null;
  cashbackPercent: number | null;
  cashbackFlat: number | null;
  details: string;
  audience: string[];
  active: boolean;
}

export interface AdminSettings {
  ratesAsOf: string;
  ltiFirstTime: number;
  ltiTradingUp: number;
  maxLtvOwnerPercent: number;
  maxLtvInvestmentPercent: number;
  maxAgeAtEnd: number;
  maxTermOwner: number;
  maxTermInvestment: number;
}

const AUDIENCE_OPTIONS = [
  { value: "first-time", label: "First Time Buyer" },
  { value: "trading-up", label: "Trading up" },
  { value: "switch", label: "Switch" },
  { value: "investment", label: "Investment" },
] as const;

/* ---------- small field helpers ---------- */

const inputClass =
  "h-9 w-full rounded-none border border-line bg-white px-2.5 text-sm text-ink transition-colors duration-200 focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function StateNote({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      className={`text-xs font-medium ${
        state.status === "saved" ? "text-secondary-600" : "text-primary-600"
      }`}
    >
      {state.message}
    </p>
  );
}

/* ---------- policy settings ---------- */

function SettingsForm({ settings }: { settings: AdminSettings }) {
  const [state, action, pending] = useActionState(updateSettings, IDLE);

  return (
    <form
      action={action}
      className="rounded-none border border-line bg-white p-5"
    >
      <h3 className="font-display text-base font-semibold text-ink">
        Central Bank policy & labels
      </h3>
      <p className="mt-1 text-xs text-muted">
        When the Central Bank changes the lending rules, update the numbers
        here and the calculator applies them immediately.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Rates as of (label)" className="sm:col-span-3">
          <input name="rates_as_of" defaultValue={settings.ratesAsOf} className={inputClass} required />
        </Field>
        <Field label="First-time buyer LTI (× income)">
          <input name="lti_first_time" type="number" step="0.1" min="1" max="20" defaultValue={settings.ltiFirstTime} className={inputClass} required />
        </Field>
        <Field label="Trading-up LTI (× income)">
          <input name="lti_trading_up" type="number" step="0.1" min="1" max="20" defaultValue={settings.ltiTradingUp} className={inputClass} required />
        </Field>
        <Field label="Max age at end of term">
          <input name="max_age_at_end" type="number" step="1" min="50" max="100" defaultValue={settings.maxAgeAtEnd} className={inputClass} required />
        </Field>
        <Field label="Owner-occupier max LTV (%)">
          <input name="max_ltv_owner_percent" type="number" step="1" min="1" max="100" defaultValue={settings.maxLtvOwnerPercent} className={inputClass} required />
        </Field>
        <Field label="Investment max LTV (%)">
          <input name="max_ltv_investment_percent" type="number" step="1" min="1" max="100" defaultValue={settings.maxLtvInvestmentPercent} className={inputClass} required />
        </Field>
        <Field label="Residential max term (years)">
          <input name="max_term_owner" type="number" step="1" min="5" max="45" defaultValue={settings.maxTermOwner} className={inputClass} required />
        </Field>
        <Field label="Investment max term (years)">
          <input name="max_term_investment" type="number" step="1" min="5" max="45" defaultValue={settings.maxTermInvestment} className={inputClass} required />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 cursor-pointer items-center rounded-none bg-primary-500 px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save policy"}
        </button>
        <StateNote state={state} />
      </div>
    </form>
  );
}

/* ---------- product form (edit row / add new) ---------- */

function ProductForm({ product }: { product?: AdminProduct }) {
  const [state, action, pending] = useActionState(saveProduct, IDLE);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteProduct,
    IDLE,
  );
  const isNew = !product;

  return (
    <div className="rounded-none border border-line bg-white p-4">
      <form action={action}>
        {product && <input type="hidden" name="id" value={product.id} />}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Lender">
            <input name="lender" defaultValue={product?.lender ?? ""} className={inputClass} required />
          </Field>
          <Field label="Product name">
            <input name="name" defaultValue={product?.name ?? ""} className={inputClass} required />
          </Field>
          <Field label="Rate type">
            <select name="rate_type" defaultValue={product?.rateType ?? "fixed-3"} className={inputClass}>
              {Object.entries(RATE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cashback (optional)">
            <input name="cashback" defaultValue={product?.cashback ?? ""} placeholder="e.g. 2% cashback" className={inputClass} />
          </Field>
          <Field label="Interest rate (%)">
            <input name="rate_percent" type="number" step="0.01" min="0.01" max="99" defaultValue={product?.ratePercent ?? ""} className={inputClass} required />
          </Field>
          <Field label="APRC (%)">
            <input name="aprc_percent" type="number" step="0.01" min="0.01" max="99" defaultValue={product?.aprcPercent ?? ""} className={inputClass} required />
          </Field>
          <Field label="Max LTV (%)">
            <input name="max_ltv_percent" type="number" step="1" min="1" max="100" defaultValue={product?.maxLtvPercent ?? 90} className={inputClass} required />
          </Field>
          <Field label="Revert rate after fixed (%)">
            <input name="revert_rate_percent" type="number" step="0.01" min="0.01" max="99" defaultValue={product?.revertRatePercent ?? ""} placeholder="none, rate runs whole term" className={inputClass} />
          </Field>
          <Field label="Cashback (% of loan)">
            <input name="cashback_percent" type="number" step="0.01" min="0.01" max="99" defaultValue={product?.cashbackPercent ?? ""} placeholder="none" className={inputClass} />
          </Field>
          <Field label="Cashback (flat €)">
            <input name="cashback_flat" type="number" step="1" min="1" defaultValue={product?.cashbackFlat ?? ""} placeholder="none" className={inputClass} />
          </Field>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="green" defaultChecked={product?.green ?? false} className="h-4 w-4 accent-primary-500" />
              Green
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-primary-500" />
              Active
            </label>
          </div>
          <Field label="Offer details (shown under “See details”)" className="sm:col-span-2 lg:col-span-4">
            <textarea name="details" rows={2} defaultValue={product?.details ?? ""} placeholder="e.g. 2% of the mortgage paid in cashback shortly after closing, and a further 1% at the end of year 5." className={`${inputClass} h-auto py-2`} />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Buyer types:
          </span>
          {AUDIENCE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="checkbox"
                name="audience"
                value={opt.value}
                defaultChecked={
                  product?.audience.includes(opt.value) ??
                  opt.value !== "investment"
                }
                className="h-4 w-4 accent-primary-500"
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center rounded-none bg-primary-500 px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-600 disabled:opacity-60"
          >
            {pending ? "Saving…" : isNew ? "Add product" : "Save"}
          </button>
          <StateNote state={state} />
          <StateNote state={deleteState} />
        </div>
      </form>

      {product && (
        <form
          action={deleteAction}
          className="mt-2"
          onSubmit={(e) => {
            if (!confirm(`Delete ${product.lender} ${product.name}?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="cursor-pointer text-xs font-medium text-secondary-600 transition-colors duration-200 hover:text-secondary-500 disabled:opacity-60"
          >
            {deletePending ? "Deleting…" : "Delete product"}
          </button>
        </form>
      )}
    </div>
  );
}

/* ---------- page body ---------- */

export function RatesManager({
  products,
  settings,
}: {
  products: AdminProduct[];
  settings: AdminSettings;
}) {
  return (
    <div className="flex flex-col gap-8">
      <SettingsForm settings={settings} />

      <section>
        <h3 className="mb-3 font-display text-base font-semibold text-ink">
          Lender products ({products.length})
        </h3>
        <div className="flex flex-col gap-4">
          {products.map((p) => (
            <ProductForm key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-base font-semibold text-ink">
          Add a product
        </h3>
        <ProductForm />
      </section>
    </div>
  );
}
