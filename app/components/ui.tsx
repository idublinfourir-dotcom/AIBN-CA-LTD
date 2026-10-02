import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { images, type ImageKey } from "../lib/images";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  tone = "light",
  align = "left",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  return (
    <p
      className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] ${
        align === "center" ? "justify-center" : ""
      } ${tone === "dark" ? "text-primary-300" : "text-primary-500"}`}
    >
      <span aria-hidden="true" className="h-px w-7 bg-current opacity-60" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <Eyebrow align={align}>{eyebrow}</Eyebrow>
      <h2 className="mt-5 font-display text-4xl font-bold leading-[1.03] tracking-[-0.02em] text-balance text-ink sm:text-5xl">
        {title}
      </h2>
      {lede && <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-body sm:text-xl">{lede}</p>}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "outlineLight";

const buttonBase =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none px-7 text-sm font-semibold tracking-wide transition-[color,background-color,border-color,transform] duration-200 ease-snappy active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-primary-500",
  outline:
    "border border-ink/20 text-ink hover:border-ink/40 hover:bg-ink/5 focus-visible:outline-ink/40",
  outlineLight:
    "border border-white/30 bg-white/5 text-white backdrop-blur-sm hover:border-white/60 hover:bg-white/15 focus-visible:outline-white/60",
};

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  external?: boolean;
}) {
  const cls = `${buttonBase} ${buttonVariants[variant]} ${className}`;
  if (external) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Compact photographic hero for inner pages. */
export function PageHero({
  eyebrow,
  title,
  lede,
  image = "tower",
  breadcrumb,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: string;
  image?: ImageKey;
  breadcrumb?: ReactNode;
  action?: ReactNode;
}) {
  const style: CSSProperties = { backgroundImage: `url(${images[image]})` };
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={style}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/90 to-navy-900/55"
      />
      <Container className="py-24 sm:py-32">
        <div className="max-w-3xl">
          <span className="animate-fade-up block">
            {breadcrumb ?? (eyebrow && <Eyebrow tone="dark">{eyebrow}</Eyebrow>)}
          </span>
          {/* Fluid below sm: at a flat 48px, single words like "Transformation"
              are wider than a 320-375px screen and got clipped. */}
          <h1 className="animate-fade-up mt-6 flex flex-wrap items-center gap-3 font-display text-[length:clamp(2.25rem,11vw,3rem)] font-bold leading-[0.98] tracking-[-0.025em] text-balance [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          {lede && (
            <p className="animate-fade-up mt-6 max-w-xl text-lg leading-8 text-white/75 [animation-delay:150ms] sm:text-xl">
              {lede}
            </p>
          )}
          {action && (
            <div className="animate-fade-up mt-8 [animation-delay:220ms]">{action}</div>
          )}
        </div>
      </Container>
    </section>
  );
}

export function Breadcrumbs({
  items,
  tone = "dark",
}: {
  items: { label: string; href?: string }[];
  tone?: "light" | "dark";
}) {
  const linkCls =
    tone === "dark"
      ? "text-white/60 hover:text-white"
      : "text-muted hover:text-ink";
  const currentCls = tone === "dark" ? "text-white/90" : "text-ink";
  const sepCls = tone === "dark" ? "text-white/30" : "text-line";
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em]">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={`${linkCls} transition-colors duration-200`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={currentCls} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className={sepCls}>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 8.5l3.2 3.2L13 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
