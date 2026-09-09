import Link from "next/link";

/* The Ireland calculators, in one place. Drives both the on-page switcher
   below and the Accountants Hub dropdown in the site header.

   Mortgage used to live here; it moved to the Personal Hub, see
   app/components/personal-tabs.tsx. */
export const CALCULATOR_TOOLS = [
  {
    href: "/tools/ireland-income-tax",
    label: "Income tax",
    desc: "Income tax, USC & PRSI: 2026 vs 2025",
  },
  {
    href: "/tools/ireland-vat",
    label: "VAT",
    desc: "Net VAT position: payable or receivable",
  },
  {
    href: "/tools/ireland-corporation-tax",
    label: "Corporation tax",
    desc: "12.5% trading, 25% passive: total tax due",
  },
  {
    href: "/tools/ireland-rd-tax-credit",
    label: "R&D credit",
    desc: "35% credit on qualifying R&D spend",
  },
  {
    href: "/tools/ireland-capital-allowances",
    label: "Capital allowances",
    desc: "Capital allowances (tax) + working capital",
  },
  {
    href: "/tools/ireland-cgt",
    label: "CGT",
    desc: "Capital gains tax with indexation relief",
  },
  {
    href: "/tools/ireland-cat",
    label: "CAT",
    desc: "Gift & inheritance tax: thresholds & reliefs",
  },
] as const;

/* Tab body: uppercase label + two animated layers. A top/bottom rule that
   draws in and a green fill that grows down from it, turning the text white.
   Active = both layers locked on; inactive = they reveal on hover/focus. */
function TabInner({ label, active }: { label: string; active: boolean }) {
  return (
    <>
      <span
        className={`relative z-10 block px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors duration-300 ${
          active ? "text-white" : "text-ink group-hover:text-white group-focus-visible:text-white"
        }`}
      >
        {label}
      </span>
      {/* top & bottom rule */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 origin-center border-y-2 border-primary-500 transition-all duration-300 ${
          active
            ? "scale-y-100 opacity-100"
            : "scale-y-[2] opacity-0 group-hover:scale-y-100 group-hover:opacity-100 group-focus-visible:scale-y-100 group-focus-visible:opacity-100"
        }`}
      />
      {/* fill */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 inset-y-[2px] origin-top bg-primary-500 transition-all duration-300 ${
          active
            ? "scale-100 opacity-100"
            : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
        }`}
      />
    </>
  );
}

export interface ToolTab {
  readonly href: string;
  readonly label: string;
}

/** On-page switcher between the tools of one hub. `current` is the active
    tool's href; it renders as a locked (filled) tab, the rest as hover links.
    Shared so the Accountants Hub and the Personal Hub switchers stay identical. */
export function ToolTabs({
  heading,
  tools,
  current,
}: {
  heading: string;
  tools: readonly ToolTab[];
  current: string;
}) {
  return (
    <nav aria-label={heading} className="mb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {heading}
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-2">
        {tools.map((tool) => {
          const active = tool.href === current;
          return (
            <li key={tool.href}>
              {active ? (
                <span
                  aria-current="page"
                  className="group relative inline-block cursor-default"
                >
                  <TabInner label={tool.label} active />
                </span>
              ) : (
                <Link
                  href={tool.href}
                  className="group relative inline-block outline-none"
                >
                  <TabInner label={tool.label} active={false} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The Accountants Hub switcher. */
export function CalculatorTabs({ current }: { current: string }) {
  return (
    <ToolTabs
      heading="Ireland calculators"
      tools={CALCULATOR_TOOLS}
      current={current}
    />
  );
}
