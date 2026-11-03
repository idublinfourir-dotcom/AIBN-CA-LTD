/* The failure log behind the admin's email warning. SERVER ONLY (pg via ./db).

   mailer.ts writes a row whenever a send is skipped for missing settings or
   refused by the server; the admin layout reads the open rows back and shows
   them on every /admin page until someone dismisses them. A row holds what
   kind of email it was, why it failed and where in /admin to follow up. It
   never holds the recipient or the message: the enquiry it links to already
   has those. Pure decisions (labels, redaction, wording) live in
   mail-health.ts.

   Both directions are best-effort. A failed write is logged and dropped, and
   a failed read shows no warning, so the log can never break a send or an
   admin page, including before its table exists. */

import { query } from "./db";
import {
  mailEnvironment,
  missingMailKeys,
  type MailFailureReason,
  type MailKind,
} from "./mail-health";

export async function recordMailFailure(failure: {
  kind: MailKind;
  reason: MailFailureReason;
  detail?: string;
  adminHref?: string;
}): Promise<void> {
  try {
    await query(
      `insert into mail_failures (kind, reason, detail, admin_href, environment)
       values ($1, $2, $3, $4, $5)`,
      [
        failure.kind,
        failure.reason,
        failure.detail ?? null,
        failure.adminHref ?? null,
        mailEnvironment(process.env),
      ],
    );
  } catch (err) {
    console.error("[mailer] could not record the failed send:", err);
  }
}

export interface MailFailure {
  id: string;
  kind: string;
  reason: string;
  detail: string | null;
  adminHref: string | null;
  createdAt: Date;
}

export interface MailHealth {
  /** Required SMTP keys this deployment lacks. Non-empty = sending is off. */
  missingKeys: string[];
  /** Newest open failures, at most SHOWN. */
  failures: MailFailure[];
  /** All open failures on this deployment, not just the ones shown. */
  openCount: number;
  /** When the oldest open failure happened. */
  since: Date | null;
}

const SHOWN = 5;

/** Open (undismissed) failures on this deployment, plus whether it can send
    at all. Never throws. */
export async function loadMailHealth(): Promise<MailHealth> {
  const missingKeys = missingMailKeys(process.env);
  try {
    const { rows } = await query<{
      id: string;
      kind: string;
      reason: string;
      detail: string | null;
      admin_href: string | null;
      created_at: Date;
      open_count: number;
      since: Date;
    }>(
      `select id::text, kind, reason, detail, admin_href, created_at,
              count(*) over ()::int as open_count,
              min(created_at) over () as since
         from mail_failures
        where environment = $1 and dismissed_at is null
        order by created_at desc
        limit ${SHOWN}`,
      [mailEnvironment(process.env)],
    );
    return {
      missingKeys,
      failures: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        reason: r.reason,
        detail: r.detail,
        adminHref: r.admin_href,
        createdAt: r.created_at,
      })),
      openCount: rows[0]?.open_count ?? 0,
      since: rows[0]?.since ?? null,
    };
  } catch (err) {
    console.error("[mailer] could not read the failed-send log:", err);
    return { missingKeys, failures: [], openCount: 0, since: null };
  }
}

/** The admin has seen them: hide every open failure on this deployment. */
export async function dismissMailFailures(): Promise<void> {
  await query(
    `update mail_failures set dismissed_at = now()
      where environment = $1 and dismissed_at is null`,
    [mailEnvironment(process.env)],
  );
}
