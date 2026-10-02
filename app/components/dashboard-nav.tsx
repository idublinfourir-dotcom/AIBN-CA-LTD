"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./dashboard-icons";

export interface DashNavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Match nested routes too (e.g. /admin/tax-rates/edit). */
  prefix?: boolean;
}

/**
 * Sidebar navigation shared by the admin console and the client portal.
 * Active item gets a signal-green left indicator, matching the brand accent
 * used across the marketing site.
 */
export function DashNav({
  items,
  ariaLabel,
  dueHrefs = [],
}: {
  items: DashNavItem[];
  ariaLabel: string;
  /** Hrefs that should show a "review due" dot (e.g. stale calculator rates). */
  dueHrefs?: string[];
}) {
  const pathname = usePathname();
  const dueSet = new Set(dueHrefs);
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={ariaLabel}>
      <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
        Menu
      </p>
      {items.map((item) => {
        const active = item.prefix
          ? pathname === item.href || pathname.startsWith(`${item.href}/`)
          : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              active
                ? "bg-white/10 text-white"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-0.5 transition-colors duration-200 ${
                active ? "bg-primary-400" : "bg-transparent"
              }`}
            />
            <Icon
              name={item.icon}
              className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                active ? "text-primary-300" : "text-white/40 group-hover:text-white/70"
              }`}
            />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {dueSet.has(item.href) && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400"
                title="Review due"
                aria-label="Review due"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Phone navigation for the dashboard shells. Below `md` the sidebar is hidden,
 * so this menu button opens the same sidebar content (passed as `children`)
 * as a drawer under the topbar. The open state remembers the path it was
 * opened on, so any navigation closes it; a link to the current page closes
 * it too, as does Escape or a tap on the backdrop.
 */
export function DashMobileNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPath(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="dash-mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenPath(open ? null : pathname)}
        className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-none border border-line text-ink transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d={open ? "M3 3l12 12M15 3L3 15" : "M2 4.5h14M2 9h14M2 13.5h14"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        // Starts under the h-16 sticky topbar so the toggle stays reachable.
        <div className="fixed inset-x-0 bottom-0 top-16 z-30 md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-navy-900/50"
            onClick={() => setOpenPath(null)}
          />
          <div
            id="dash-mobile-nav"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-navy-900 text-white shadow-2xl"
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpenPath(null);
            }}
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
}
