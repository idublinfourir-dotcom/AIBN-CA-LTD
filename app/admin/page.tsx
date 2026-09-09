import type { Metadata } from "next";
import Link from "next/link";
import { query } from "../lib/db";
import { requireAdmin } from "../lib/supabase/guards";
import { loadReviewStatus } from "../lib/editable-calculators";
import { markCalculatorReviewedAction } from "./review-actions";
import { ADMIN_UNREAD_SQL } from "../lib/enquiry-messages";
import { Icon } from "../components/dashboard-icons";
import {
  Avatar,
  initialsOf,
  PageHeader,
  Panel,
  SparkBars,
  StatTile,
  timeAgo,
} from "../components/dashboard-ui";

export const metadata: Metadata = {
  title: "Dashboard",
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

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const todayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

/** Bucket per-day counts into a dense 14-slot array ending today. */
function dailySeries(rows: { day: Date; n: number }[]) {
  const byDay = new Map(
    rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r.n]),
  );
  const points: number[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    points.push(byDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return points;
}

export default async function AdminPage() {
  const user = await requireAdmin();

  const [enquiriesResult, statsResult, trendResult, clientsResult, reviews] =
    await Promise.all([
      query<EnquiryRow>(
        `select e.id, e.name, e.email, e.company, e.service, e.message, e.created_at,
                ${ADMIN_UNREAD_SQL} as unread
           from enquiries e
          order by e.created_at desc
          limit 8`,
      ),
      query<{ total: number; last7: number; prev7: number; unread: number }>(
        `select count(*)::int as total,
                count(*) filter (where e.created_at >= now() - interval '7 days')::int as last7,
                count(*) filter (where e.created_at >= now() - interval '14 days'
                             and e.created_at <  now() - interval '7 days')::int as prev7,
                count(*) filter (where ${ADMIN_UNREAD_SQL})::int as unread
           from enquiries e`,
      ),
      query<{ day: Date; n: number }>(
        `select date_trunc('day', created_at) as day, count(*)::int as n
           from enquiries
          where created_at >= now() - interval '14 days'
          group by 1`,
      ),
      query<{ clients: number }>(
        `select count(*)::int as clients from public.profiles where role = 'client'`,
      ),
      loadReviewStatus(),
    ]);

  const rows = enquiriesResult.rows;
  const { total, last7, prev7, unread } = statsResult.rows[0] ?? {
    total: 0,
    last7: 0,
    prev7: 0,
    unread: 0,
  };
  const clients = clientsResult.rows[0]?.clients ?? 0;
  const trend = dailySeries(trendResult.rows);
  const dueReviews = reviews.filter((r) => r.due);
  const upToDate = reviews.length - dueReviews.length;
  const firstName = (user.user_metadata?.full_name as string | undefined)
    ?.trim()
    .split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Overview"
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        lede="What's happening across enquiries, rates and clients."
        actions={
          <span className="hidden items-center gap-2 rounded-none border border-line bg-white px-3.5 py-2 text-xs font-medium text-muted sm:inline-flex">
            <Icon name="clock" className="h-3.5 w-3.5 text-primary-500" />
            {todayFmt.format(new Date())}
          </span>
        }
      />

      {/* Action needed: overdue calculator rate reviews, consolidated */}
      {dueReviews.length > 0 && (
        <Panel className="mb-8 overflow-hidden border-l-2 border-l-primary-500">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-primary-50/60 px-5 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-primary-500 text-white">
              <Icon name="receiptPercent" className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                Action needed
              </h3>
              <p className="text-xs text-muted">
                {dueReviews.length}{" "}
                {dueReviews.length === 1
                  ? "calculator needs"
                  : "calculators need"}{" "}
                checking against Revenue before the next Budget.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {dueReviews.map((r) => {
              const reviewedLabel = r.reviewedAt
                ? dateFmt.format(new Date(r.reviewedAt))
                : null;
              return (
                <li
                  key={r.key}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={r.adminHref}
                      className="text-sm font-semibold text-ink transition-colors duration-200 hover:text-primary-600"
                    >
                      {r.label}
                    </Link>
                    <p className="text-xs text-muted">
                      {reviewedLabel
                        ? `Last reviewed ${reviewedLabel}`
                        : "Not reviewed yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={r.adminHref}
                      className="inline-flex h-8 items-center rounded-none border border-line px-3 text-xs font-semibold text-ink-body transition-colors duration-200 hover:border-ink/30 hover:text-ink"
                    >
                      Open
                    </Link>
                    <form action={markCalculatorReviewedAction}>
                      <input type="hidden"  name="key" value={r.key} />
                      <button
                        type="submit"
                        className="inline-flex h-8 cursor-pointer items-center rounded-none border border-primary-500 px-3 text-xs font-semibold text-primary-600 transition-colors duration-200 hover:bg-primary-500 hover:text-white"
                      >
                        Mark reviewed
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total enquiries"
          value={total}
          icon={<Icon name="inbox" className="h-[18px] w-[18px]" />}
        >
          <SparkBars
            points={trend}
            summary={`Enquiries per day over the last 14 days: ${trend.join(", ")}.`}
          />
        </StatTile>
        <StatTile
          label="Last 7 days"
          value={last7}
          delta={{ value: last7 - prev7, vs: "prior 7 days" }}
          icon={<Icon name="trendUp" className="h-[18px] w-[18px]" />}
        />
        <StatTile
          label="Unread"
          value={unread}
          hint={unread === 0 ? "Inbox clear" : "New client messages"}
          icon={<Icon name="chat" className="h-[18px] w-[18px]" />}
        />
        <StatTile
          label="Registered clients"
          value={clients}
          hint="Portal accounts"
          icon={<Icon name="users" className="h-[18px] w-[18px]" />}
        />
      </div>

      {/* Enquiries + rate-review health */}
      <div className="grid items-start gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                Recent enquiries
              </h3>
              {unread > 0 && (
                <span className="rounded-none bg-navy-900 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                  {unread} unread
                </span>
              )}
            </div>
            <Link
              href="/admin/enquiries"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors duration-200 hover:text-primary-500"
            >
              Open inbox
              <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-none bg-primary-50 text-primary-600">
                <Icon name="inbox" className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[15px] font-medium text-ink">
                No enquiries yet
              </p>
              <p className="mt-1 text-sm text-muted">
                When a visitor sends the contact form, it appears here
                instantly.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/admin/enquiries?id=${row.id}`}
                      className="group flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-surface-muted/70"
                    >
                      <Avatar
                        initials={initialsOf(row.name, row.email)}
                        className="h-9 w-9 text-[11px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className={`flex min-w-0 items-center gap-2 text-sm ${
                              row.unread
                                ? "font-semibold text-ink"
                                : "font-medium text-ink-body"
                            }`}
                          >
                            {row.unread && (
                              <span
                                aria-hidden="true"
                                className="h-2 w-2 shrink-0 rounded-full bg-primary-500"
                              />
                            )}
                            <span className="truncate">{row.name}</span>
                            {row.company && (
                              <span className="shrink-0 font-normal text-muted">
                                · {row.company}
                              </span>
                            )}
                          </p>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted">
                            {timeAgo(new Date(row.created_at))}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 line-clamp-1 text-xs leading-5 ${
                            row.unread ? "font-medium text-ink-body" : "text-muted"
                          }`}
                        >
                          {row.message}
                        </p>
                        {row.service && (
                          <div className="mt-1.5">
                            <span className="truncate text-[11px] font-medium text-muted">
                              {row.service}
                            </span>
                          </div>
                        )}
                      </div>
                      <Icon
                        name="arrowUpRight"
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-line transition-colors duration-200 group-hover:text-primary-600"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              {total > rows.length && (
                <div className="border-t border-line px-5 py-3 text-center">
                  <Link
                    href="/admin/enquiries"
                    className="text-xs font-semibold text-primary-600 transition-colors duration-200 hover:text-primary-500"
                  >
                    View all {total} enquiries →
                  </Link>
                </div>
              )}
            </>
          )}
        </Panel>

        {/* Rate review health: every calculator at a glance */}
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
              Rate reviews
            </h3>
            <span
              className={`rounded-none px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                dueReviews.length === 0
                  ? "bg-primary-50 text-primary-600"
                  : "bg-navy-900 text-white"
              }`}
            >
              {upToDate}/{reviews.length} up to date
            </span>
          </div>
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.key}>
                <Link
                  href={r.adminHref}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-surface-muted"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      r.due ? "bg-navy-900" : "bg-primary-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm font-medium text-ink">
                      {r.label}
                    </span>
                    <span className="block text-xs text-muted">
                      {r.reviewedAt
                        ? `Reviewed ${dateFmt.format(new Date(r.reviewedAt))}`
                        : "Not reviewed yet"}
                    </span>
                  </span>
                  {r.due && (
                    <span className="shrink-0 rounded-none bg-navy-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Due
                    </span>
                  )}
                  <Icon
                    name="arrowUpRight"
                    className="h-3.5 w-3.5 shrink-0 text-muted transition-colors duration-200 group-hover:text-primary-600"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
