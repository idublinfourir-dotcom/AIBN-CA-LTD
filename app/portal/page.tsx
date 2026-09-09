import Link from "next/link";
import { query } from "../lib/db";
import { requireClient } from "../lib/supabase/guards";
import { getThreadsFor, markClientRead } from "../lib/enquiry-messages";
import { PortalConversation } from "../components/portal-conversation";
import { sendClientMessageAction } from "./actions";
import { Icon } from "../components/dashboard-icons";
import { Avatar, initialsOf, Panel, timeAgo } from "../components/dashboard-ui";

interface EnquiryRow {
  id: string;
  service: string | null;
  message: string;
  created_at: Date;
  client_last_read_at: Date | null;
}

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const quickActions = [
  {
    href: "/contact",
    icon: "chat",
    title: "Start an enquiry",
    body: "Message the team and get a same-day reply.",
  },
  {
    href: "/tools/ireland-income-tax",
    icon: "calculator",
    title: "Tax calculators",
    body: "Income tax, VAT, CT and more.",
  },
  // Plans & pricing card is hidden while the fee model is being decided.
  {
    href: "/portal/settings",
    icon: "settings",
    title: "Account settings",
    body: "Update your name or password.",
  },
] as const;

export default async function PortalPage() {
  const user = await requireClient();

  // Profile, the client's own enquiries and a total count: all from the pg
  // pool and fetched in parallel. Guest enquiries are linked to user_id only
  // at the verified email/OAuth callback boundary.
  const [profileResult, enquiriesResult, countsResult] = await Promise.all([
    query<{ full_name: string | null; role: string; created_at: Date }>(
      "select full_name, role, created_at from public.profiles where id = $1",
      [user.id],
    ),
    query<EnquiryRow>(
      `select id, service, message, created_at, client_last_read_at
         from enquiries
        where user_id = $1
        order by created_at desc
        limit 50`,
      [user.id],
    ),
    query<{ total: number }>(
      `select count(*)::int as total
         from enquiries
        where user_id = $1`,
      [user.id],
    ),
  ]);

  const profile = profileResult.rows[0] ?? null;
  const enquiries = enquiriesResult.rows;
  // Reply threads for the listed enquiries (one round-trip, grouped by id).
  const threads = await getThreadsFor(enquiries.map((e) => e.id));
  const { total: totalEnquiries } = countsResult.rows[0] ?? { total: 0 };

  // A thread is unread when the team has replied since the client last read it.
  // Compute BEFORE marking read so the "new reply" cues show on this visit.
  const unreadIds = new Set<string>();
  for (const e of enquiries) {
    const lastAdmin = (threads.get(e.id) ?? [])
      .filter((m) => m.sender === "admin")
      .at(-1);
    if (
      lastAdmin &&
      (!e.client_last_read_at ||
        lastAdmin.createdAt > new Date(e.client_last_read_at))
    ) {
      unreadIds.add(e.id);
    }
  }
  const unreadCount = unreadIds.size;

  // The client is viewing the portal now: mark their threads read so the cues
  // clear on the next visit.
  await markClientRead(user.id);

  const firstName = profile?.full_name?.split(" ")[0];
  const initials = initialsOf(profile?.full_name, user.email ?? "");
  const latest = enquiries[0] ? new Date(enquiries[0].created_at) : null;

  const heroStats = [
    {
      label: "Enquiries sent",
      value: String(totalEnquiries),
      hint: totalEnquiries === 0 ? "None yet" : "All time",
    },
    {
      label: "New replies",
      value: String(unreadCount),
      hint: unreadCount === 0 ? "You're all caught up" : "Unread from the team",
    },
    {
      label: "Last activity",
      value: latest ? timeAgo(latest) : "None yet",
      hint: latest ? fmt.format(latest) : "No activity yet",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero: dark brand card with greeting, CTAs and a stats strip */}
      <section className="relative overflow-hidden rounded-none bg-navy-900 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl"
        />
        <div className="relative px-6 pt-8 sm:px-10 sm:pt-10">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">
            <span aria-hidden="true" className="h-px w-7 bg-current opacity-60" />
            Client portal
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-white">
                {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                Track your enquiries, run the tax calculators and keep
                everything about your account in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-none bg-primary-500 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-400"
              >
                <Icon name="plus" className="h-4 w-4" />
                New enquiry
              </Link>
              <Link
                href="/tools/ireland-income-tax"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-none border border-white/20 px-5 text-sm font-semibold text-white/80 transition-colors duration-200 hover:border-white/45 hover:text-white"
              >
                <Icon name="calculator" className="h-4 w-4" />
                Calculators
              </Link>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-y-1 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="py-4 lg:px-8 lg:py-5 lg:first:pl-0 lg:last:pr-0"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  {stat.label}
                </dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xl font-semibold tabular-nums tracking-tight text-white">
                    {stat.value}
                  </span>
                  <span className="text-xs text-white/45">{stat.hint}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Quick actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group relative flex flex-col rounded-none border border-line bg-white p-5 transition-colors duration-200 hover:border-ink/20"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-0.5 bg-primary-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-none bg-primary-50 text-primary-600">
                <Icon name={action.icon} className="h-5 w-5" />
              </span>
              <Icon
                name="arrowUpRight"
                className="h-4 w-4 text-muted transition-colors duration-200 group-hover:text-primary-600"
              />
            </div>
            <p className="mt-4 font-display text-sm font-semibold tracking-tight text-ink">
              {action.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">{action.body}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* My enquiries */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                Your enquiries
              </h3>
              {totalEnquiries > 0 && (
                <p className="mt-0.5 text-xs text-muted">
                  {totalEnquiries} total
                  {unreadCount > 0 &&
                    ` · ${unreadCount} new ${unreadCount === 1 ? "reply" : "replies"}`}. Tap
                  one to read the conversation and reply.
                  {totalEnquiries > enquiries.length &&
                    ` Showing the latest ${enquiries.length}.`}
                </p>
              )}
            </div>
            <Link
              href="/contact"
              className="text-sm font-semibold text-primary-600 transition-colors duration-200 hover:text-primary-500"
            >
              New enquiry →
            </Link>
          </div>

          {enquiries.length === 0 ? (
            <div className="mt-5 rounded-none border border-dashed border-line bg-white p-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-none bg-primary-50 text-primary-600">
                <Icon name="chat" className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[15px] font-medium text-ink">
                No enquiries yet
              </p>
              <p className="mt-1 text-sm text-muted">
                When you send us a message it&apos;ll show here, and the team&apos;s
                replies land in the same thread.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-none bg-primary-500 px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
              >
                Start an enquiry
              </Link>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-4">
              {enquiries.map((enquiry) => (
                <li key={enquiry.id}>
                  <PortalConversation
                    enquiryId={enquiry.id}
                    service={enquiry.service ?? "General enquiry"}
                    refLabel={`Ref #${enquiry.id.padStart(4, "0")}`}
                    dateLabel={fmt.format(new Date(enquiry.created_at))}
                    openingMessage={enquiry.message}
                    openingAt={new Date(enquiry.created_at)}
                    messages={threads.get(enquiry.id) ?? []}
                    unread={unreadIds.has(enquiry.id)}
                    action={sendClientMessageAction}
                    defaultOpen={unreadIds.has(enquiry.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right rail: account + documents */}
        <aside className="flex flex-col gap-6">
          <Panel accent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Your account
              </h3>
              <Link
                href="/portal/settings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 transition-colors duration-200 hover:text-primary-500"
              >
                <Icon name="settings" className="h-3.5 w-3.5" />
                Settings
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Avatar initials={initials} className="h-11 w-11 text-sm" />
              <div className="min-w-0 leading-tight">
                <p className="truncate font-medium text-ink">
                  {profile?.full_name ?? "Name not set"}
                </p>
                <p className="truncate text-sm text-muted">{user.email}</p>
              </div>
            </div>
            <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Member since</dt>
                <dd className="font-medium text-ink">
                  {profile?.created_at
                    ? fmt.format(new Date(profile.created_at))
                    : "Not recorded"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Account type</dt>
                <dd className="font-medium text-ink">Client</dd>
              </div>
            </dl>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Documents
              </h3>
              <span className="rounded-none bg-secondary-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-500">
                Coming soon
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Statements, returns and signed accounts will appear here once your
              accountant shares them.
            </p>
          </Panel>

          <Panel className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Need a hand?
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Questions about tax, VAT or your accounts: the team replies the
              same working day.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors duration-200 hover:text-primary-500"
            >
              Contact the team
              <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
            </Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
