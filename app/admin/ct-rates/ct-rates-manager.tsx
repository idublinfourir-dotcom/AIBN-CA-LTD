"use client";

/* Admin editor for the corporation tax calculator.
   Rates form: TWO-PHASE. "Review change" previews a diff, "Confirm" writes.
   Inputs are disabled during the preview so you commit exactly what you saw.
   Recent changes: read-only audit trail. Saving upserts the DB and revalidates
   the public calculator, no deploy. Mirrors cgt-rates-manager. */

import { useActionState } from "react";
import type { CtConfig } from "../../lib/ireland-corporation-tax";
import type { RateAuditRow } from "../../lib/rate-audit";
import type { DiffEntry } from "../../lib/rate-diff";
import { saveCorporationTaxSettings, type TwoPhaseState } from "./actions";

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

function SettingsForm({ config }: { config: CtConfig }) {
  const [state, action, pending] = useActionState(saveCorporationTaxSettings, IDLE_TWO);
  const previewing = state.status === "preview";

  return (
    <form action={action} className="rounded-none border border-line bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">Rates</h3>
      <p className="mt-1 text-xs text-muted">
        The trading (active business) and passive (rent, interest, most foreign
        dividends) rates. The 15% Pillar Two minimum is fixed in statute for large
        groups and not editable here.
      </p>

      <fieldset disabled={previewing} className="mt-4 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
        <Field label="Trading rate (%)">
          <input name="trading_rate" type="number" step="any" min="0" max="100" defaultValue={config.tradingPercent} className={inputClass} required />
        </Field>
        <Field label="Passive rate (%)">
          <input name="passive_rate" type="number" step="any" min="0" max="100" defaultValue={config.passivePercent} className={inputClass} required />
        </Field>
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

export function CtRatesManager({
  config,
  audit,
}: {
  config: CtConfig;
  audit: RateAuditRow[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <SettingsForm config={config} />
      <AuditPanel entries={audit} />
    </div>
  );
}
