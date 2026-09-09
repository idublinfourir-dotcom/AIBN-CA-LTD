import type { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "../auth/actions";
import { LogoutButton } from "./logout-button";
import { Icon } from "./dashboard-icons";
import { DashNav, type DashNavItem } from "./dashboard-nav";

/** First letters of up to two words: "Jane Doe" → "JD", "jane@x.com" → "J". */
export function initialsOf(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  initials,
  className = "h-9 w-9 text-xs",
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-primary-50 font-semibold text-primary-600 ring-1 ring-primary-500/20 ${className}`}
    >
      {initials}
    </span>
  );
}

const relDateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

/** "just now", "4m ago", "3h ago", "2d ago", then "12 Mar". */
export function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return relDateFmt.format(d);
}

const badgeTones = {
  admin: "bg-primary-50 text-primary-600 ring-primary-500/20",
  client: "bg-secondary-50 text-secondary-600 ring-secondary-500/20",
} as const;

/**
 * Shared chrome for /admin and /portal: dark sidebar with icon nav, white
 * topbar with the signed-in user, muted content canvas. Mirrors the marketing
 * site's language: sharp corners, navy-900 dark surface, signal-green accent.
 */
export function DashboardShell({
  title,
  areaLabel,
  badge,
  navItems,
  dueHrefs,
  user,
  children,
}: {
  /** Topbar heading, e.g. "Admin console". */
  title: string;
  /** aria-label for the sidebar nav, e.g. "Admin". */
  areaLabel: string;
  badge: keyof typeof badgeTones;
  navItems: DashNavItem[];
  /** Nav hrefs flagged with a "review due" dot. */
  dueHrefs?: string[];
  user: { email: string; name?: string | null };
  children: ReactNode;
}) {
  const initials = initialsOf(user.name, user.email);
  const badgeLabel = badge === "admin" ? "Admin" : "Client";

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 text-white md:flex">
        <Link
          href="/"
          className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5 transition-colors duration-200 hover:bg-white/5"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-none bg-primary-500 font-display text-[10px] font-semibold tracking-tight text-white">
            AIBN
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight">
              AIBN
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
              {title}
            </span>
          </span>
        </Link>

        <DashNav items={navItems} ariaLabel={areaLabel} dueHrefs={dueHrefs} />

        <div className="mt-auto border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <Avatar initials={initials} className="h-8 w-8 text-[11px]" />
            <span className="min-w-0 leading-tight">
              {user.name && (
                <span className="block truncate text-sm font-medium text-white">
                  {user.name}
                </span>
              )}
              <span className="block truncate text-xs text-white/45">
                {user.email}
              </span>
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-none px-3 py-2 text-sm text-white/55 transition-colors duration-200 hover:bg-white/5 hover:text-white"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-none bg-navy-900 font-display text-[10px] font-semibold tracking-tight text-primary-400 md:hidden">
              AIBN
            </span>
            <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <span
              className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 sm:inline ${badgeTones[badge]}`}
            >
              {badgeLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              <Avatar initials={initials} />
              <div className="text-left leading-tight">
                <p className="text-sm font-medium text-ink">
                  {user.name ?? user.email}
                </p>
                {user.name && <p className="text-xs text-muted">{user.email}</p>}
              </div>
            </div>
            <form action={signOutAction}>
              <LogoutButton />
            </form>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

/** Page header matching the marketing site's eyebrow + display-title pattern. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">
          <span aria-hidden="true" className="h-px w-7 bg-current opacity-60" />
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        {lede && <p className="mt-2 max-w-2xl text-sm text-muted">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}

/**
 * KPI tile. Value in semibold sans with tabular figures; optional delta vs a
 * named period (green when positive is good); optional trend/icon slot.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  icon,
  children,
}: {
  label: string;
  value: string | number;
  /** e.g. { value: +4, vs: "prior 7 days" } */
  delta?: { value: number; vs: string };
  hint?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="group relative flex flex-col rounded-none border border-line bg-white p-5 transition-all duration-200 hover:border-ink/20 hover:shadow-sm hover:shadow-navy-900/5">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-primary-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-primary-50 text-primary-600">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      {(delta || hint) && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          {delta && (
            <span
              className={`inline-flex items-center gap-1 rounded-none px-1.5 py-0.5 font-semibold ${
                delta.value > 0
                  ? "bg-primary-50 text-primary-600"
                  : delta.value < 0
                    ? "bg-surface-muted text-ink-body"
                    : "bg-surface-muted text-muted"
              }`}
            >
              {delta.value > 0 ? "▲" : delta.value < 0 ? "▼" : "–"}
              <span className="tabular-nums">
                {delta.value > 0 ? `+${delta.value}` : delta.value}
              </span>
            </span>
          )}
          {delta ? `vs ${delta.vs}` : hint}
        </p>
      )}
      {children}
    </div>
  );
}

/**
 * 14-point mini bar trend. Single series in the brand green: past periods in
 * a de-emphasised tint, the current period solid. Values carried by the
 * sr-only summary, not by the bars alone.
 */
export function SparkBars({
  points,
  summary,
}: {
  points: number[];
  summary: string;
}) {
  const max = Math.max(...points, 1);
  const barW = 100 / points.length;
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      role="img"
      aria-label={summary}
      className="mt-3 h-9 w-full"
    >
      {points.map((v, i) => {
        const h = v === 0 ? 1.5 : Math.max((v / max) * 30, 3);
        const last = i === points.length - 1;
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.15}
            y={32 - h}
            width={barW * 0.7}
            height={h}
            className={last ? "fill-primary-500" : "fill-primary-500/25"}
          />
        );
      })}
    </svg>
  );
}

const chipTones = {
  /** Fresh / positive: brand green tint. */
  green: { chip: "bg-secondary-50 text-secondary-500", dot: "bg-secondary-400" },
  /** Active / needs attention: solid dark. */
  dark: { chip: "bg-navy-900 text-white", dot: "bg-primary-400" },
  /** Settled / archived: quiet grey. */
  muted: { chip: "bg-surface-muted text-muted", dot: "bg-muted/60" },
} as const;

export type StatusTone = keyof typeof chipTones;

/** Small status chip used on enquiry rows/cards. */
export function StatusChip({
  label,
  tone = "green",
}: {
  label: string;
  tone?: StatusTone;
}) {
  const t = chipTones[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-none px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${t.chip}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
}

/** Bordered white panel with the brand's top-accent variant. */
export function Panel({
  accent = false,
  className = "",
  children,
}: {
  accent?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-none bg-white ${
        accent
          ? "border-t-2 border-primary-400 shadow-sm shadow-navy-900/5"
          : "border border-line"
      } ${className}`}
    >
      {children}
    </div>
  );
}
