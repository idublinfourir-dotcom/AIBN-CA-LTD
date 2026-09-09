/* Generic record diff for the two-step commit preview. PURE. Reused by every
   editable calculator (Project B). */

export interface DiffEntry {
  label: string;
  from: string;
  to: string;
  kind: "changed" | "added" | "removed" | "unchanged";
}

export interface DiffField {
  key: string;
  label: string;
  /** How to render the value; defaults to String (null/undefined → "n/a"). */
  format?: (v: unknown) => string;
}

/** Compare two flat records field-by-field for a preview list. */
export function diffRecords(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
  fields: DiffField[],
): DiffEntry[] {
  return fields.map((f) => {
    const fmt = f.format ?? ((v) => (v === null || v === undefined ? "n/a" : String(v)));
    const from = fmt(current[f.key]);
    const to = fmt(next[f.key]);
    return { label: f.label, from, to, kind: from === to ? "unchanged" : "changed" };
  });
}
