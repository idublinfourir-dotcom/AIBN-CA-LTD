"use client";

/* Admin editor for the capital allowances calculator.
   Rates form: TWO-PHASE. "Review change" previews a diff, "Confirm" writes.
   Each asset class exposes its rate + write-off period; the label and note are
   read-only (they stay in code). Plus the car cost cap and the trading CT rate
   used for the cash-value line. The CO2 emission bands are statutory and aren't
   editable here. Inputs are disabled during the preview so you commit exactly
   what you saw. Recent changes: read-only audit trail. Mirrors cgt-rates-manager. */

import { useActionState } from "react";
import type { CaConfig } from "../../lib/ireland-capital-allowances";
import type { RateAuditRow } from "../../lib/rate-audit";
import type { DiffEntry } from "../../lib/rate-diff";
import { saveCapitalAllowancesSettings, type TwoPhaseState } from "./actions";

const IDLE_TWO: TwoPhaseState = { status: "idle" };

const inputClass =
  "h-9 w-full rounded-none border border-line bg-white px-2.5 text-sm text-ink tabular-nums transition-colors duration-200 focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40 disabled:opacity-60";

const primaryBtn =
  "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-none bg-primary-500 px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-600 disabled:opacity-60";
const outlineBtn =
  "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-none border border-line px-4 text-xs font-semibold text-muted transition-colors duration-200 hover:border-ink/40 hover:text-ink disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function TwoPhaseNote({ state }: { state: TwoPhaseState }) {
  if (state.status !== "saved" && state.status !== "error") return null;
  return (
    <p
      role="status"
      className={`text-xs font-medium ${state.status === "saved" ? "text-secondary-600" : "text-primary-600"}`}
    >
      {state.message}
    </p>
  );
}

function DiffList({ diff }: { diff: DiffEntry[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {diff.map((d) => {
        const text =
          d.kind === "changed" && d.from
            ? `${d.from} → ${d.to}`
            : d.kind === "unchanged" && d.from
              ? `${d.from} (unchanged)`
              : d.to || d.from || "n/a";
        return (
          <li key={d.label} className={`text-sm tabular-nums ${d.kind !== "unchanged" ? "text-ink" : "text-muted"}`}>
            {d.label}: {text}
          </li>
        );
      })}
    </ul>
  );
}

function SettingsForm({ config }: { config: CaConfig }) {
  const [state, action, pending] = useActionState(saveCapitalAllowancesSettings, IDLE_TWO);
  const previewing = state.status === "preview";

  return (
    <form action={action} className="rounded-none border border-line bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">Rates &amp; limits</h3>
      <p className="mt-1 text-xs text-muted">
        The wear-and-tear rate and write-off period for each asset class, plus the
        €24,000-style car cost cap and the trading CT rate used for the cash-value
        line. Asset labels and the CO2 emission bands are fixed in code.
      </p>

      <fieldset disabled={previewing} className="mt-4 flex flex-col gap-4 border-0 p-0">
        {config.classes.map((c) => (
          <div key={c.key} className="border border-line bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
              <Field label={c.firstYearFull ? "First-year rate (%)" : "Rate (% a year)"}>
                <input name={`rate_${c.key}`} type="number" step="any" min="0" max="100" defaultValue={c.ratePercent} className={inputClass} required />
              </Field>
              <Field label="Written off over (years)">
                <input name={`years_${c.key}`} type="number" step="1" min="1" defaultValue={c.years} className={inputClass} required />
              </Field>
            </div>
            <p className="mt-2 text-xs text-muted">{c.note}</p>
          </div>
        ))}

        <div className="border border-line bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Car &amp; cash value</p>
          <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
            <Field label="Car cost cap (€)">
              <input name="motor_cap" type="number" step="any" min="0" defaultValue={config.motorCapEur} className={inputClass} required />
            </Field>
            <Field label="Trading CT rate (%)">
              <input name="trading_ct" type="number" step="any" min="0" max="100" defaultValue={config.tradingCtPercent} className={inputClass} required />
            </Field>
          </div>
        </div>
      </fieldset>

      {state.status === "preview" && (
        <div className="mt-4 border border-line bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Confirm change</p>
          <DiffList diff={state.diff} />
          <input type="hidden" name="payload" value={state.payload} />
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {previewing ? (
          <>
            <button type="submit" disabled={pending} className={primaryBtn}>
              {pending ? "Saving…" : "Confirm"}
            </button>
            <button type="submit" name="cancel" value="1" formNoValidate disabled={pending} className={outlineBtn}>
              Cancel
            </button>
          </>
        ) : (
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "…" : "Review change"}
          </button>
        )}
        <TwoPhaseNote state={state} />
      </div>
    </form>
  );
}

const auditTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function AuditPanel({ entries }: { entries: RateAuditRow[] }) {
  return (
    <div className="rounded-none border border-line bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">Recent changes</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No changes recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-4 py-2">
              <div>
                <span className="text-sm text-ink-body">{e.summary}</span>
                <span className="mt-0.5 block text-xs text-muted">{e.changedBy ?? "Unknown"}</span>
              </div>
              <span className="shrink-0 text-xs text-muted tabular-nums">{auditTime(e.changedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CaRatesManager({
  config,
  audit,
}: {
  config: CaConfig;
  audit: RateAuditRow[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <SettingsForm config={config} />
      <AuditPanel entries={audit} />
    </div>
  );
}
