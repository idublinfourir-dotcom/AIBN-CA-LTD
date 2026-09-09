"use client";

/* Admin editor for the CGT calculator.
   - Rates form: TWO-PHASE. "Review change" previews a diff, "Confirm" writes.
     Inputs are disabled during the preview so you commit exactly what you saw.
   - Multiplier table: edit / add / delete rows, each immediate + audited.
   - Recent changes: read-only audit trail.
   Saving upserts the DB and revalidates the public calculator, no deploy. */

import { useActionState } from "react";
import type { CgtConfig, CgtMultiplier } from "../../lib/ireland-cgt";
import type { RateAuditRow } from "../../lib/rate-audit";
import type { DiffEntry } from "../../lib/rate-diff";
import {
  saveCgtSettings,
  saveCgtMultiplierRow,
  deleteCgtMultiplierRow,
  addCgtMultiplier,
  importCgtMultipliers,
  resetCgtDefaults,
  type ActionState,
  type TwoPhaseState,
} from "./actions";

const IDLE: ActionState = { status: "idle" };
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

function StateNote({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      className={`text-xs font-medium ${state.status === "saved" ? "text-secondary-600" : "text-primary-600"}`}
    >
      {state.message}
    </p>
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

/* ---------- rates: two-phase ---------- */

function SettingsForm({ config }: { config: CgtConfig }) {
  const [state, action, pending] = useActionState(saveCgtSettings, IDLE_TWO);
  const previewing = state.status === "preview";

  return (
    <form action={action} className="rounded-none border border-line bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">Rates &amp; exemption</h3>
      <p className="mt-1 text-xs text-muted">
        The standard rate, annual exemption and Entrepreneur Relief. Foreign-life (40%)
        and VC-fund (15%) rates are fixed in statute and not editable here.
      </p>

      <fieldset disabled={previewing} className="mt-4 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
        <Field label="Standard CGT rate (%)">
          <input name="standard_rate" type="number" step="any" min="0" max="100" defaultValue={config.standardRatePercent} className={inputClass} required />
        </Field>
        <Field label="Annual exemption (€)">
          <input name="annual_exemption" type="number" step="any" min="0" defaultValue={config.annualExemptionEur} className={inputClass} required />
        </Field>
        <Field label="Entrepreneur Relief rate (%)">
          <input name="entrepreneur_rate" type="number" step="any" min="0" max="100" defaultValue={config.entrepreneurRatePercent} className={inputClass} required />
        </Field>
        <Field label="Entrepreneur Relief lifetime cap (€)">
          <input name="entrepreneur_cap" type="number" step="any" min="0" defaultValue={config.entrepreneurLifetimeCapEur} className={inputClass} required />
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

/* ---------- multiplier table: immediate CRUD ---------- */

const rowBtn =
  "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-none px-3 text-xs font-semibold transition-colors duration-200 disabled:opacity-60";

function MultiplierRow({ m }: { m: CgtMultiplier }) {
  const [state, action, pending] = useActionState(saveCgtMultiplierRow, IDLE);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 border-b border-line py-2 last:border-0">
      <input type="hidden" name="year_key" value={m.yearKey} />
      <span className="w-44 shrink-0 text-sm text-ink">{m.yearLabel}</span>
      <input name="multiplier" type="number" step="any" min="0" defaultValue={m.multiplier} className={`${inputClass} max-w-[7rem]`} required />
      <button type="submit" disabled={pending} className={`${rowBtn} bg-primary-500 text-white hover:bg-primary-600`}>
        {pending ? "…" : "Save"}
      </button>
      <button
        type="submit"
        formAction={deleteCgtMultiplierRow}
        formNoValidate
        onClick={(e) => {
          if (!confirm(`Delete ${m.yearLabel}? The calculator will drop this year.`)) e.preventDefault();
        }}
        className={`${rowBtn} border border-line text-muted hover:border-primary-600 hover:text-primary-600`}
      >
        Delete
      </button>
      <StateNote state={state} />
    </form>
  );
}

function AddYearForm() {
  const [state, action, pending] = useActionState(addCgtMultiplier, IDLE);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
      <Field label="New year label">
        <input name="year_label" placeholder="e.g. 2003" className={`${inputClass} max-w-[10rem]`} required />
      </Field>
      <Field label="Multiplier">
        <input name="multiplier" type="number" step="any" min="0" placeholder="1.000" className={`${inputClass} max-w-[7rem]`} required />
      </Field>
      <button type="submit" disabled={pending} className={`${rowBtn} bg-primary-500 text-white hover:bg-primary-600`}>
        {pending ? "Adding…" : "Add year"}
      </button>
      <StateNote state={state} />
    </form>
  );
}

function ImportForm() {
  const [state, action, pending] = useActionState(importCgtMultipliers, IDLE_TWO);
  const previewing = state.status === "preview";
  return (
    <form action={action} className="mt-6 border-t border-line pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bulk update (CSV)</p>
      <p className="mt-1 text-xs text-muted">
        Download the current table, edit in Excel, and re-upload. Import merges
        by year: it updates and adds rows, never deletes.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href="/admin/cgt-rates/export" className={outlineBtn}>
          Download CSV
        </a>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          disabled={previewing}
          className="max-w-full text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-none file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
        />
      </div>
      {state.status === "preview" && (
        <div className="mt-3 border border-line bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Confirm import</p>
          <DiffList diff={state.diff} />
          <input type="hidden" name="payload" value={state.payload} />
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        {previewing ? (
          <>
            <button type="submit" disabled={pending} className={primaryBtn}>
              {pending ? "Importing…" : "Confirm import"}
            </button>
            <button type="submit" name="cancel" value="1" formNoValidate disabled={pending} className={outlineBtn}>
              Cancel
            </button>
          </>
        ) : (
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Reading…" : "Preview import"}
          </button>
        )}
        <TwoPhaseNote state={state} />
      </div>
    </form>
  );
}

function MultipliersForm({ multipliers }: { multipliers: CgtMultiplier[] }) {
  return (
    <div className="rounded-none border border-line bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">Indexation multipliers</h3>
      <p className="mt-1 text-xs text-muted">
        Revenue&rsquo;s multiplier for each acquisition year. Edit a value, delete
        a year, or add a new one. Frozen since 2003, but if indexation is ever extended
        you can add 2003 onward here, no redeploy.
      </p>
      <div className="mt-4 flex flex-col">
        {multipliers.map((m) => (
          <MultiplierRow key={m.yearKey} m={m} />
        ))}
      </div>
      <AddYearForm />
      <ImportForm />
    </div>
  );
}

/* ---------- audit trail ---------- */

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

function ResetForm() {
  const [state, action, pending] = useActionState(resetCgtDefaults, IDLE_TWO);
  const previewing = state.status === "preview";
  return (
    <form action={action} className="rounded-none border border-line bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">Reset to Revenue defaults</h3>
      <p className="mt-1 text-xs text-muted">
        Restore the standard rates and the official 1974–2002 multiplier table. This
        replaces the whole table, so any years you added are removed.
      </p>
      {state.status === "preview" && (
        <div className="mt-3 border border-line bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Confirm reset</p>
          <DiffList diff={state.diff} />
          <input type="hidden" name="payload" value="defaults" />
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        {previewing ? (
          <>
            <button type="submit" disabled={pending} className={primaryBtn}>
              {pending ? "Resetting…" : "Confirm reset"}
            </button>
            <button type="submit" name="cancel" value="1" formNoValidate disabled={pending} className={outlineBtn}>
              Cancel
            </button>
          </>
        ) : (
          <button type="submit" disabled={pending} className={outlineBtn}>
            {pending ? "…" : "Reset to defaults"}
          </button>
        )}
        <TwoPhaseNote state={state} />
      </div>
    </form>
  );
}

export function CgtRatesManager({
  config,
  multipliers,
  audit,
}: {
  config: CgtConfig;
  multipliers: CgtMultiplier[];
  audit: RateAuditRow[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <SettingsForm config={config} />
      <MultipliersForm multipliers={multipliers} />
      <ResetForm />
      <AuditPanel entries={audit} />
    </div>
  );
}
