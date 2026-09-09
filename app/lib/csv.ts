/* CSV helpers for the CGT indexation multiplier table: parse, serialize, and
   merge (upsert). PURE, no I/O, so every branch is unit-testable. The admin
   import/export flows and Project B reuse these.

   Contract: header `year_key,year_label,sort_order,multiplier`. */

import type { CgtMultiplier } from "./ireland-cgt";

/** Split one CSV line, honouring quoted fields and "" escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Parse a multiplier CSV. Bad rows are skipped and reported with a line number
    (1-based, counting the original file including header/blanks). */
export function parseMultiplierCsv(text: string): {
  rows: CgtMultiplier[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows: CgtMultiplier[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let seenHeader = false;

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (line.trim() === "") return;

    const cells = splitCsvLine(line).map((c) => c.trim());
    if (!seenHeader && cells[0].toLowerCase() === "year_key") {
      seenHeader = true;
      return;
    }
    if (cells.length < 4) {
      errors.push(`line ${lineNo}: expected 4 columns, got ${cells.length}`);
      return;
    }

    const [yearKey, yearLabel, sortRaw, multRaw] = cells;
    const sortOrder = Number(sortRaw);
    const multiplier = Number(multRaw);
    if (!yearKey) {
      errors.push(`line ${lineNo}: missing year_key`);
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      errors.push(`line ${lineNo}: bad sort_order "${sortRaw}"`);
      return;
    }
    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 50) {
      errors.push(`line ${lineNo}: bad multiplier "${multRaw}"`);
      return;
    }
    rows.push({ yearKey, yearLabel, sortOrder, multiplier });
  });

  return { rows, errors };
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize rows to CSV (CRLF, header first). Round-trips with parse. */
export function serializeMultiplierCsv(rows: CgtMultiplier[]): string {
  const header = "year_key,year_label,sort_order,multiplier";
  const body = rows
    .map((r) => [r.yearKey, r.yearLabel, r.sortOrder, r.multiplier].map(csvCell).join(","))
    .join("\r\n");
  return body ? `${header}\r\n${body}\r\n` : `${header}\r\n`;
}

export interface MergeResult {
  result: CgtMultiplier[];
  added: string[];
  changed: string[];
}

/** Merge (upsert) incoming rows into current by yearKey: update matching,
    add new, NEVER delete. Result is sorted by sortOrder. */
export function mergeMultipliers(
  current: CgtMultiplier[],
  incoming: CgtMultiplier[],
): MergeResult {
  const byKey = new Map(current.map((m) => [m.yearKey, m]));
  const added: string[] = [];
  const changed: string[] = [];

  for (const inc of incoming) {
    const existing = byKey.get(inc.yearKey);
    if (!existing) {
      added.push(inc.yearKey);
      byKey.set(inc.yearKey, inc);
    } else if (
      existing.multiplier !== inc.multiplier ||
      existing.yearLabel !== inc.yearLabel ||
      existing.sortOrder !== inc.sortOrder
    ) {
      changed.push(inc.yearKey);
      byKey.set(inc.yearKey, inc);
    }
  }

  const result = [...byKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  return { result, added, changed };
}
