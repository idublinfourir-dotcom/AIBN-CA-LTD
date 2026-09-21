/* Founders Hub resource requests: read + write. SERVER ONLY (imports pg).

   Nothing is emailed automatically. A visitor fills in the request form, we
   store who they are and what they want, and a team member sends the file by
   hand from /admin/toolkits and marks the request sent. */

import { query } from "./db";

export type RequestStatus = "pending" | "sent";

export interface ToolkitRequest {
  id: string;
  resourceTitle: string;
  name: string;
  phone: string;
  email: string;
  /** Requester's organisation website, stored with its scheme. */
  website: string;
  purpose: string;
  status: RequestStatus;
  sentAt: Date | null;
  createdAt: Date;
}

interface RequestRow {
  id: string;
  resource_title: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  purpose: string;
  status: RequestStatus;
  sent_at: Date | null;
  created_at: Date;
}

const fromRow = (r: RequestRow): ToolkitRequest => ({
  id: r.id,
  resourceTitle: r.resource_title,
  name: r.name,
  phone: r.phone,
  email: r.email,
  website: r.website,
  purpose: r.purpose,
  status: r.status,
  sentAt: r.sent_at,
  createdAt: r.created_at,
});

/* The per-address hourly cap used to live here as a row count over
   toolkit_requests. It moved to the shared allowPublicAction throttle in
   app/toolkits/actions.ts, which also covers the per-IP case this could not:
   varying the email defeated a count keyed on the email alone. */

export async function createRequest(input: {
  resourceTitle: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  purpose: string;
}): Promise<void> {
  await query(
    `insert into toolkit_requests
       (resource_title, name, phone, email, website, purpose)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      input.resourceTitle,
      input.name,
      input.phone,
      input.email,
      input.website,
      input.purpose,
    ],
  );
}

/** Newest first, pending ahead of sent so outstanding work surfaces at the top. */
export async function getToolkitRequests(limit = 200): Promise<ToolkitRequest[]> {
  const { rows } = await query<RequestRow>(
    `select id, resource_title, name, phone, email, website, purpose,
            status, sent_at, created_at
       from toolkit_requests
      order by (status = 'pending') desc, created_at desc
      limit $1`,
    [limit],
  );
  return rows.map(fromRow);
}

export async function countPendingRequests(): Promise<number> {
  const { rows } = await query<{ n: number }>(
    `select count(*)::int as n from toolkit_requests where status = 'pending'`,
  );
  return rows[0]?.n ?? 0;
}

/** Flip a request to sent (or back to pending) after a team member acts on it. */
export async function setRequestStatus(
  id: string,
  status: RequestStatus,
): Promise<void> {
  await query(
    `update toolkit_requests
        set status = $1,
            sent_at = case when $1 = 'sent' then now() else null end
      where id = $2`,
    [status, id],
  );
}
