"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { serviceCategories, site } from "../lib/content";
import { CALCULATOR_TOOLS } from "./calculator-tabs";
import type { SessionUser } from "../lib/supabase/guards";

/* Pricing is hidden site-wide while the fee model is being decided; restore
   { href: "/pricing", label: "Pricing" } here to bring it back. */
const secondaryLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/* Founders Hub resource categories, shown in the nav dropdown. Each links to
   the single /toolkits page (which carries its own category tabs). */
const FOUNDER_RESOURCES = [
  { label: "Memos", desc: "Technical notes on common questions" },
  { label: "Templates", desc: "Statements, workings and checklists" },
  { label: "Tax forms", desc: "Revenue form walkthroughs" },
  { label: "VAT forms", desc: "Registration and the returns cycle" },
  { label: "Setup guides", desc: "Starting and running a company" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SoonTag() {
  return (
    <span className="rounded-none bg-secondary-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-500">
      Soon
    </span>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2.5 4.5L6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UtilIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-primary-300"
    >
      {children}
    </svg>
  );
}

const PhoneIcon = (
  <UtilIcon>
    <path d="M5.5 2.5 3 3c-.3 2 .6 4.4 2.3 6.1S9 12.3 11 12l.5-2.5-2.3-1.1-1 1.1A8 8 0 0 1 5.6 6.8l1.1-1L5.5 2.5Z" />
  </UtilIcon>
);

const ClockIcon = (
  <UtilIcon>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3l2 1.3" />
  </UtilIcon>
);

const MailIcon = (
  <UtilIcon>
    <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
    <path d="m2.5 4.5 5.5 4 5.5-4" />
  </UtilIcon>
);

const PinIcon = (
  <UtilIcon>
    <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" />
    <circle cx="8" cy="6.5" r="1.5" />
  </UtilIcon>
);

function Avatar({ user, size = 36 }: { user: SessionUser; size?: number }) {
  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase();
  const dim = { width: size, height: size };
  if (user.avatarUrl) {
    // Plain <img> (avatar host isn't in next/image remote config); Google's
    // CDN needs no-referrer to serve the picture.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        style={dim}
        className="rounded-full object-cover ring-1 ring-line"
      />
    );
  }
  return (
    <span
      style={dim}
      className="grid place-items-center rounded-full bg-primary-500 text-sm font-semibold text-white"
    >
      {initial || "U"}
    </span>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="flex items-center" onClick={onClick}>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          AIBN
        </span>
        {/* tracking tightened from 0.16em: "Chartered Accountants Ltd" is 4
            characters longer and the nav row is already tight at xl. */}
        <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
          Chartered Accountants Ltd
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileFoundersOpen, setMobileFoundersOpen] = useState(false);
  const [servicesClosed, setServicesClosed] = useState(false);
  const [toolsClosed, setToolsClosed] = useState(false);
  const [foundersClosed, setFoundersClosed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const pathname = usePathname();
  const servicesActive = isActive(pathname, "/services");
  const toolsActive = isActive(pathname, "/tools");
  const foundersActive = isActive(pathname, "/toolkits");

  // Force an open dropdown shut after a link is clicked (otherwise the clicked
  // link keeps focus / hover and the panel stays open on the new page).
  function closeServices(e: React.MouseEvent<HTMLElement>) {
    setServicesClosed(true);
    e.currentTarget.blur();
  }
  function closeTools(e: React.MouseEvent<HTMLElement>) {
    setToolsClosed(true);
    e.currentTarget.blur();
  }
  function closeFounders(e: React.MouseEvent<HTMLElement>) {
    setFoundersClosed(true);
    e.currentTarget.blur();
  }

  const firstName =
    user?.name?.trim().split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Account";

  // Auto-hide: slide the header away on scroll-down, reveal it on scroll-up.
  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const goingDown = y > lastY.current;
      // ignore tiny jitter; never hide near the very top or while the menu is open
      if (Math.abs(y - lastY.current) > 6) {
        setHidden(goingDown && y > 120 && !menuOpen);
      }
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  function closeMobile() {
    setMenuOpen(false);
    setMobileServicesOpen(false);
    setMobileToolsOpen(false);
    setMobileFoundersOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-transform duration-300 ease-snappy ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* tier 1: contact bar (navy, desktop only) */}
      <div className="hidden bg-navy-900 text-[13px] text-white/70 md:block">
        <div className="mx-auto flex h-10 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <a
              href={site.phoneHref}
              className="flex items-center gap-2 font-medium text-white/90 transition-colors duration-200 hover:text-white"
            >
              {PhoneIcon}
              {site.phone}
            </a>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="flex items-center gap-2 text-white/55">
              {ClockIcon}
              {site.hours}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-white/55 lg:flex">
              {PinIcon}
              {site.address[1]}
            </span>
            <span className="hidden h-3.5 w-px bg-white/15 lg:block" aria-hidden="true" />
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-2 text-white/90 transition-colors duration-200 hover:text-white"
            >
              {MailIcon}
              {site.email}
            </a>
          </div>
        </div>
      </div>

      {/* tier 2: main nav (warm paper) */}
      <div
        className={`border-b backdrop-blur-md transition-all duration-300 ease-snappy ${
          scrolled
            ? "border-line bg-canvas/95 shadow-[0_8px_24px_-12px] shadow-navy-900/25"
            : "border-line/70 bg-canvas/85"
        }`}
      >
        {/* max-w-7xl: the nav row (logo + 6 links + sign-in + CTA) needs
            ~1110px: it stopped fitting the 6xl container when the
            Entrepreneur Toolkits link was added. */}
        <nav
          aria-label="Main"
          className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Logo onClick={closeMobile} />

          {/* xl breakpoint: with "Entrepreneur Toolkits" the full nav no longer
              fits at 1024px: below xl the hamburger menu takes over. */}
          <div className="hidden items-center gap-6 xl:flex">
            {/* Services mega-menu (CSS hover + focus-within) */}
            <div
              className="group relative"
              onMouseEnter={() => setServicesClosed(false)}
              onFocus={() => setServicesClosed(false)}
            >
              <Link
                href="/services"
                aria-current={servicesActive ? "page" : undefined}
                onClick={closeServices}
                className={`relative flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors duration-200 ${
                  servicesActive
                    ? "text-primary-600"
                    : "text-ink-body hover:text-ink"
                }`}
              >
                Services
                <Chevron className="text-muted transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                <span
                  className={`pointer-events-none absolute -bottom-1.5 left-0 h-0.5 w-full origin-left bg-primary-500 transition-transform duration-200 ease-snappy ${
                    servicesActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>

              <div
                className={`invisible absolute left-1/2 top-full z-50 w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
                  servicesClosed
                    ? "!invisible !opacity-0"
                    : ""
                }`}
              >
                <div className="rounded-none border border-line bg-white p-6 shadow-2xl shadow-navy-900/15">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
                    {serviceCategories.map((category) => (
                      <div key={category.slug}>
                        <Link
                          href={`/services/${category.slug}`}
                          onClick={closeServices}
                          className="flex items-center gap-2 font-display text-sm font-semibold text-ink transition-colors duration-200 hover:text-primary-500"
                        >
                          {category.title}
                          {category.status === "coming-soon" && <SoonTag />}
                        </Link>
                        {category.items.length > 0 ? (
                          <ul className="mt-2.5 flex flex-col gap-1.5">
                            {category.items.map((item) => (
                              <li key={item.slug}>
                                <Link
                                  href={`/services/${category.slug}/${item.slug}`}
                                  onClick={closeServices}
                                  className="text-[13px] leading-5 text-muted transition-colors duration-200 hover:text-primary-500"
                                >
                                  {item.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1.5 text-[13px] leading-5 text-muted">
                            {category.blurb}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-line pt-4">
                    <Link
                      href="/services"
                      onClick={closeServices}
                      className="text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
                    >
                      View all services <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Tools dropdown (CSS hover + focus-within) */}
            <div
              className="group relative"
              onMouseEnter={() => setToolsClosed(false)}
              onFocus={() => setToolsClosed(false)}
            >
              <Link
                href="/tools/ireland-income-tax"
                aria-current={toolsActive ? "page" : undefined}
                onClick={closeTools}
                className={`relative flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors duration-200 ${
                  toolsActive ? "text-primary-600" : "text-ink-body hover:text-ink"
                }`}
              >
                Accountants Hub
                <Chevron className="text-muted transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                <span
                  className={`pointer-events-none absolute -bottom-1.5 left-0 h-0.5 w-full origin-left bg-primary-500 transition-transform duration-200 ease-snappy ${
                    toolsActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>

              <div
                className={`invisible absolute left-1/2 top-full z-50 w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
                  toolsClosed ? "!invisible !opacity-0" : ""
                }`}
              >
                <div className="rounded-none border border-line bg-white p-6 shadow-2xl shadow-navy-900/15">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Ireland calculators
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-3">
                    {CALCULATOR_TOOLS.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={closeTools}
                        aria-current={pathname === tool.href ? "page" : undefined}
                        className="group/item block"
                      >
                        <span className="font-display text-sm font-semibold text-ink transition-colors duration-200 group-hover/item:text-primary-500">
                          {tool.label}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-5 text-muted">
                          {tool.desc}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-line pt-4">
                    <Link
                      href="/tools/ireland-income-tax"
                      onClick={closeTools}
                      className="text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
                    >
                      Open the calculators <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Founders Hub mega-menu (matches Services) */}
            <div
              className="group relative"
              onMouseEnter={() => setFoundersClosed(false)}
              onFocus={() => setFoundersClosed(false)}
            >
              <Link
                href="/toolkits"
                aria-current={foundersActive ? "page" : undefined}
                onClick={closeFounders}
                className={`relative flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors duration-200 ${
                  foundersActive ? "text-primary-600" : "text-ink-body hover:text-ink"
                }`}
              >
                Founders Hub
                <Chevron className="text-muted transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                <span
                  className={`pointer-events-none absolute -bottom-1.5 left-0 h-0.5 w-full origin-left bg-primary-500 transition-transform duration-200 ease-snappy ${
                    foundersActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>

              <div
                className={`invisible absolute left-1/2 top-full z-50 w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
                  foundersClosed ? "!invisible !opacity-0" : ""
                }`}
              >
                <div className="rounded-none border border-line bg-white p-6 shadow-2xl shadow-navy-900/15">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Founder resources
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-3">
                    {FOUNDER_RESOURCES.map((res) => (
                      <Link
                        key={res.label}
                        href="/toolkits"
                        onClick={closeFounders}
                        className="group/item block"
                      >
                        <span className="font-display text-sm font-semibold text-ink transition-colors duration-200 group-hover/item:text-primary-500">
                          {res.label}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-5 text-muted">
                          {res.desc}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-line pt-4">
                    <Link
                      href="/toolkits"
                      onClick={closeFounders}
                      className="text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
                    >
                      Browse the Founders Hub <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {secondaryLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative whitespace-nowrap text-sm font-medium transition-colors duration-200 ${
                    active ? "text-primary-600" : "text-ink-body hover:text-ink"
                  }`}
                >
                  {link.label}
                  <span
                    className={`pointer-events-none absolute -bottom-1.5 left-0 h-0.5 w-full origin-left bg-primary-500 transition-transform duration-200 ease-snappy ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4">
            {user ? (
              <Link
                href={user.role === "admin" ? "/admin" : "/portal"}
                aria-label={
                  user.role === "admin" ? "Admin dashboard" : "My dashboard"
                }
                className="group flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1 pr-1.5 shadow-sm transition-all duration-200 hover:border-primary-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:pr-4"
              >
                <span className="rounded-full ring-2 ring-primary-300/60 ring-offset-2 ring-offset-surface">
                  <Avatar user={user} size={34} />
                </span>
                <span className="hidden flex-col pr-1 leading-tight sm:flex">
                  <span className="text-sm font-semibold text-ink">
                    {firstName}
                  </span>
                  <span className="text-xs font-medium text-primary-600 transition-colors duration-200 group-hover:text-primary-500">
                    {user.role === "admin" ? "Admin dashboard" : "My dashboard"}
                  </span>
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 cursor-pointer items-center whitespace-nowrap rounded-none border border-line px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-secondary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/contact"
              className="hidden h-10 cursor-pointer items-center rounded-none bg-primary-500 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:inline-flex"
            >
              Book a consultation
            </Link>
            <button
              type="button"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-none border border-line text-ink transition-colors duration-200 hover:bg-secondary-50 xl:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <path
                    d="M3 3l12 12M15 3L3 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M2 4.5h14M2 9h14M2 13.5h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div
            id="mobile-menu"
            className="max-h-[calc(100vh-4.75rem)] overflow-y-auto border-t border-line bg-canvas px-5 py-4 xl:hidden"
          >
            <div className="flex flex-col gap-1">
              {/* Services accordion */}
              <button
                type="button"
                aria-expanded={mobileServicesOpen}
                onClick={() => setMobileServicesOpen((open) => !open)}
                className={`flex items-center justify-between rounded-none px-3 py-2.5 text-[15px] font-medium transition-colors duration-200 ${
                  servicesActive
                    ? "bg-secondary-50 font-semibold text-primary-500"
                    : "text-ink-body hover:bg-secondary-50"
                }`}
              >
                Services
                <Chevron
                  className={`text-muted transition-transform duration-200 ${
                    mobileServicesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileServicesOpen && (
                <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-line pl-3">
                  <Link
                    href="/services"
                    onClick={closeMobile}
                    className="rounded-none px-3 py-2 text-sm font-medium text-ink-body transition-colors duration-200 hover:bg-secondary-50"
                  >
                    All services
                  </Link>
                  {serviceCategories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/services/${category.slug}`}
                      onClick={closeMobile}
                      className="flex items-center gap-2 rounded-none px-3 py-2 text-sm text-muted transition-colors duration-200 hover:bg-secondary-50 hover:text-primary-500"
                    >
                      {category.title}
                      {category.status === "coming-soon" && <SoonTag />}
                    </Link>
                  ))}
                </div>
              )}

              {/* Tools accordion */}
              <button
                type="button"
                aria-expanded={mobileToolsOpen}
                onClick={() => setMobileToolsOpen((open) => !open)}
                className={`flex items-center justify-between rounded-none px-3 py-2.5 text-[15px] font-medium transition-colors duration-200 ${
                  toolsActive
                    ? "bg-secondary-50 font-semibold text-primary-500"
                    : "text-ink-body hover:bg-secondary-50"
                }`}
              >
                Accountants Hub
                <Chevron
                  className={`text-muted transition-transform duration-200 ${
                    mobileToolsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileToolsOpen && (
                <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-line pl-3">
                  {CALCULATOR_TOOLS.map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={closeMobile}
                      aria-current={pathname === tool.href ? "page" : undefined}
                      className="rounded-none px-3 py-2 text-sm text-muted transition-colors duration-200 hover:bg-secondary-50 hover:text-primary-500"
                    >
                      {tool.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Founders Hub accordion */}
              <button
                type="button"
                aria-expanded={mobileFoundersOpen}
                onClick={() => setMobileFoundersOpen((open) => !open)}
                className={`flex items-center justify-between rounded-none px-3 py-2.5 text-[15px] font-medium transition-colors duration-200 ${
                  foundersActive
                    ? "bg-secondary-50 font-semibold text-primary-500"
                    : "text-ink-body hover:bg-secondary-50"
                }`}
              >
                Founders Hub
                <Chevron
                  className={`text-muted transition-transform duration-200 ${
                    mobileFoundersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileFoundersOpen && (
                <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-line pl-3">
                  {FOUNDER_RESOURCES.map((res) => (
                    <Link
                      key={res.label}
                      href="/toolkits"
                      onClick={closeMobile}
                      className="rounded-none px-3 py-2 text-sm text-muted transition-colors duration-200 hover:bg-secondary-50 hover:text-primary-500"
                    >
                      {res.label}
                    </Link>
                  ))}
                </div>
              )}

              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={`rounded-none px-3 py-2.5 text-[15px] font-medium transition-colors duration-200 ${
                    isActive(pathname, link.href)
                      ? "bg-secondary-50 font-semibold text-primary-500"
                      : "text-ink-body hover:bg-secondary-50"
                  }`}
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={site.phoneHref}
                className="rounded-none px-3 py-2.5 text-[15px] font-medium text-ink-body transition-colors duration-200 hover:bg-secondary-50"
                onClick={closeMobile}
              >
                {site.phone}
              </a>
              <Link
                href="/contact"
                className="mt-2 inline-flex h-11 items-center justify-center rounded-none bg-primary-500 px-5 text-sm font-semibold text-white"
                onClick={closeMobile}
              >
                Book a consultation
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
