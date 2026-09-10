import type { Metadata } from "next";
import Link from "next/link";
import { query } from "../../lib/db";
import { requireAdmin } from "../../lib/supabase/guards";
import { sendAdminMessageAction } from "./actions";
import { Icon } from "../../components/dashboard-icons";
import { ChatPanel, EmailCopyToggle } from "../../components/chat-panel";
import {
  ADMIN_UNREAD_SQL,
  getThreadMessages,
  markAdminRead,
} from "../../lib/enquiry-messages";
import {
  Avatar,
  initialsOf,
  PageHeader,
  Panel,
  timeAgo,
} from "../../components/dashboard-ui";

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false },
};

interface EnquiryRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  message: string;
  created_at: Date;
  unread: boolean;
}

const fmtLong = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Inbox URL preserving the active filter + search. */
function hrefWith(p: { filter?: string; q?: string; id?: string }) {
  const sp = new URLSearchParams();
  if (p.filter && p.filter !== "all") sp.set("filter", p.filter);
  if (p.q) sp.set("q", p.q);
  if (p.id) sp.set("id", p.id);
  const s = sp.toString();
  return s ? `/admin/enquiries?${s}` : "/admin/enquiries";
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; q?: string; filter?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const filter = params.filter === "unread" ? "unread" : "all";
  const idParam = params.id && /^\d+$/.test(params.id) ? params.id : null;

  // Opening a thread marks it read for the admin: do this first so the list
  // and counts below reflect it immediately (no one-render lag on the badge).
  if (idParam) await markAdminRead(idParam);

  // List query with optional unread + free-text filters. (`e` alias is required
  // by ADMIN_UNREAD_SQL.)
  const conds: string[] = [];
  const values: unknown[] = [];
  if (filter === "unread") conds.push(ADMIN_UNREAD_SQL);
  if (q) {
    values.push(`%${q}%`);
    const n = values.length;
    conds.push(
      `(e.name ilike $${n} or e.email ilike $${n} or coalesce(e.company, '') ilike $${n}
        or coalesce(e.service, '') ilike $${n} or e.message ilike $${n})`,
    );
  }
  const where = conds.length ? `where ${conds.join(" and ")}` : "";

  const [listResult, countsResult, selectedResult] = await Promise.all([
    query<EnquiryRow>(
      `select e.id, e.name, e.email, e.company, e.service, e.message, e.created_at,
              ${ADMIN_UNREAD_SQL} as unread
         from enquiries e ${where}
        order by e.created_at desc
        limit 100`,
      values,
    ),
    query<{ total: number; unread: number }>(
      `select count(*)::int as total,
              count(*) filter (where ${ADMIN_UNREAD_SQL})::int as unread
         from enquiries e`,
    ),
    idParam
      ? query<EnquiryRow>(
          `select e.id, e.name, e.email, e.company, e.service, e.message, e.created_at,
                  ${ADMIN_UNREAD_SQL} as unread
             from enquiries e where e.id = $1`,
          [idParam],
        )
      : Promise.resolve(null),
  ]);

  const rows = listResult.rows;
  const counts = countsResult.rows[0] ?? { total: 0, unread: 0 };
  const selected = selectedResult?.rows[0] ?? rows[0] ?? null;
  const explicitSelection = Boolean(selectedResult?.rows[0]);

  const thread = selected ? await getThreadMessages(selected.id) : [];

  const tabs = [
    { key: "all", label: "All", count: counts.total },
    { key: "unread", label: "Unread", count: counts.unread },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Messages"
        title="Enquiries"
        lede="Every client conversation in one place: read, reply and keep the thread going."
        actions={
          counts.unread > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-none bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-primary-400"
              />
              {counts.unread} unread
            </span>
          ) : undefined
        }
      />

      <Panel className="overflow-hidden">
        <div className="flex flex-col lg:h-[calc(100vh-19rem)] lg:min-h-[540px] lg:flex-row">
          {/* ── List pane ─────────────────────────────────────────── */}
          <div
            className={`w-full shrink-0 flex-col border-line lg:flex lg:w-[24rem] lg:border-r ${
              explicitSelection ? "hidden" : "flex"
            }`}
          >
            {/* Filters */}
            <div className="border-b border-line p-4">
              <form action="/admin/enquiries" method="get" role="search">
                {filter !== "all" && (
                  <input type="hidden" name="filter" value={filter} />
                )}
                <label className="flex h-10 items-center gap-2.5 rounded-none border border-line bg-surface-muted/60 px-3 transition-colors duration-200 focus-within:border-primary-500 focus-within:bg-white">
                  <Icon name="search" className="h-4 w-4 shrink-0 text-muted" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search name, email, message…"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                  />
                </label>
              </form>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tabs.map((tab) => {
                  const active = filter === tab.key;
                  return (
                    <Link
                      key={tab.key}
                      href={hrefWith({ filter: tab.key, q })}
                      className={`inline-flex items-center gap-1.5 rounded-none px-2.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                        active
                          ? "bg-navy-900 text-white"
                          : "bg-surface-muted text-ink-body hover:bg-primary-50 hover:text-primary-600"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`tabular-nums ${active ? "text-white/60" : "text-muted"}`}
                      >
                        {tab.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-none bg-primary-50 text-primary-600">
                    <Icon name="inbox" className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink">
                    {q || filter !== "all"
                      ? "No conversations match"
                      : "No enquiries yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {q || filter !== "all"
                      ? "Try a different search or filter."
                      : "New contact-form messages land here."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((row) => {
                    const active = selected?.id === row.id;
                    return (
                      <li key={row.id}>
                        <Link
                          href={hrefWith({ filter, q, id: row.id })}
                          aria-current={active ? "true" : undefined}
                          className={`relative block px-4 py-3.5 transition-colors duration-150 ${
                            active
                              ? "bg-primary-50/60"
                              : "hover:bg-surface-muted/70"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-0 left-0 w-0.5 ${
                              active ? "bg-primary-500" : "bg-transparent"
                            }`}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Avatar
                                initials={initialsOf(row.name, row.email)}
                                className="h-7 w-7 text-[10px]"
                              />
                              <span
                                className={`truncate text-sm ${
                                  row.unread
                                    ? "font-semibold text-ink"
                                    : "font-medium text-ink-body"
                                }`}
                              >
                                {row.name}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {row.unread && (
                                <span
                                  aria-label="Unread"
                                  title="Unread"
                                  className="h-2 w-2 rounded-full bg-primary-500"
                                />
                              )}
                              <span className="text-[11px] tabular-nums text-muted">
                                {timeAgo(new Date(row.created_at))}
                              </span>
                            </span>
                          </div>
                          <p
                            className={`mt-1.5 line-clamp-2 pl-[38px] text-xs leading-5 ${
                              row.unread ? "font-medium text-ink-body" : "text-muted"
                            }`}
                          >
                            {row.message}
                          </p>
                          {row.service && (
                            <div className="mt-2 pl-[38px]">
                              <span className="truncate text-[11px] font-medium text-muted">
                                {row.service}
                              </span>
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {rows.length === 100 && (
              <p className="border-t border-line px-4 py-2.5 text-center text-[11px] text-muted">
                Showing the latest 100. Narrow with search to see older ones.
              </p>
            )}
          </div>

          {/* ── Detail pane ───────────────────────────────────────── */}
          <div
            className={`min-w-0 flex-1 flex-col lg:flex ${
              explicitSelection ? "flex" : "hidden"
            }`}
          >
            {!selected ? (
              <div className="grid flex-1 place-items-center px-6 py-20 text-center">
                <div>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-none bg-primary-50 text-primary-600">
                    <Icon name="inbox" className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-[15px] font-medium text-ink">
                    Nothing selected
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Pick a conversation from the list to read it here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div className="border-b border-line px-5 py-4 sm:px-6">
                  <Link
                    href={hrefWith({ filter, q })}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors duration-200 hover:text-ink lg:hidden"
                  >
                    <Icon name="arrowLeft" className="h-3.5 w-3.5" />
                    Back to inbox
                  </Link>
                  <div className="flex min-w-0 items-center gap-3.5">
                    <Avatar
                      initials={initialsOf(selected.name, selected.email)}
                      className="h-11 w-11 text-sm"
                    />
                    <div className="min-w-0 leading-tight">
                      <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink">
                        {selected.name}
                      </h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                        <a
                          href={`mailto:${selected.email}`}
                          className="text-primary-600 transition-colors duration-200 hover:text-primary-500"
                        >
                          {selected.email}
                        </a>
                        {selected.company && (
                          <span className="text-muted">· {selected.company}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Meta strip */}
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Received
                      </dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {fmtLong.format(new Date(selected.created_at))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Service
                      </dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {selected.service ?? "General enquiry"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Reference
                      </dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink">
                        #{selected.id.padStart(4, "0")}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Conversation: optimistic send + pending state built in */}
                <ChatPanel
                  fill
                  viewer="admin"
                  openingMessage={selected.message}
                  openingAt={new Date(selected.created_at)}
                  messages={thread}
                  clientName={selected.name}
                  enquiryId={selected.id}
                  action={sendAdminMessageAction}
                  placeholder="Write a reply to the client…"
                  submitLabel="Send reply"
                  composerFooterStart={<EmailCopyToggle />}
                />
              </>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
