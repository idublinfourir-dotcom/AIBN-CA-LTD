/* Change-audit log, shared by every editable calculator (Project B reuses it).
   recordAudit never throws: an audit failure must not block the actual change.
   Reads/writes go through the pg pool (app/lib/db.ts). */

import { query } from "./db";

export interface RateAuditEntry {
  /** e.g. "cgt-settings", "cgt-multipliers". */
  area: string;
  /** e.g. "update", "add", "delete", "import", "reset", "reviewed". */
  action: string;
  summary: string;
  /** Field-level old→new (or the affected row). Stored as jsonb. */
  details?: unknown;
  /** Admin email. */
  changedBy: string;
}

export interface RateAuditRow {
  id: number;
  area: string;
  action: string;
  summary: string | null;
  changedBy: string | null;
  changedAt: string;
}

export async function recordAudit(e: RateAuditEntry): Promise<void> {
  try {
    await query(
      `insert into rate_audit (area, action, summary, details, changed_by)
       values ($1, $2, $3, $4, $5)`,
      [e.area, e.action, e.summary, e.details === undefined ? null : JSON.stringify(e.details), e.changedBy],
    );
  } catch (err) {
    console.error("[audit] record failed:", err);
  }
}

/** Recent changes for an area LIKE pattern (e.g. "cgt-%"), newest first. */
export async function getRecentAudit(areaLike: string, limit = 20): Promise<RateAuditRow[]> {
  try {
    const { rows } = await query<{
      id: number;
      area: string;
      action: string;
      summary: string | null;
      changed_by: string | null;
      changed_at: string;
    }>(
      `select id, area, action, summary, changed_by, changed_at
         from rate_audit where area like $1
        order by changed_at desc limit $2`,
      [areaLike, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      area: r.area,
      action: r.action,
      summary: r.summary,
      changedBy: r.changed_by,
      changedAt: r.changed_at,
    }));
  } catch (err) {
    console.error("[audit] read failed:", err);
    return [];
  }
}
