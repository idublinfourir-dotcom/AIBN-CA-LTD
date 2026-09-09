import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Button, Container, Eyebrow, SectionHeading } from "./ui";
import { Reveal } from "./reveal";
import { ClipReveal } from "./clip-reveal";
import { Accordion } from "./accordion";
import { HeroVideo } from "./hero-video";
import { images } from "../lib/images";
import { industries, serviceCategories, site } from "../lib/content";

function bg(url: string): CSSProperties {
  return { backgroundImage: `url(${url})` };
}

/* ---------- hero ---------- */

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-navy-900 text-white">
      <HeroVideo
        clips={[
          { src: "/hero-1.mp4", poster: "/hero-1.jpg" },
          // Dublin Docklands / IFSC: River Liffey and the Samuel Beckett Bridge
          { src: "/hero-2.mp4", poster: "/hero-2.jpg" },
          // River Liffey toward the Samuel Beckett Bridge and Convention Centre
          { src: "/hero-3.mp4", poster: "/hero-3.jpg" },
        ]}
        className="absolute inset-0 -z-20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-navy-900/15"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/85 via-navy-900/45 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/70 via-transparent to-navy-900/20"
      />
      <Container className="py-28 sm:py-36 lg:py-44">
        <div className="max-w-4xl">
          <span className="animate-fade-up block">
            <Eyebrow tone="dark">
              Chartered Accountants &amp; Advisors · Ireland
            </Eyebrow>
          </span>
          <h1 className="animate-fade-up mt-7 font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] text-balance [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            Accountancy,{" "}
            <em className="text-primary-300 not-italic">rebuilt around AI.</em>
          </h1>
          <p className="animate-fade-up mt-7 max-w-xl text-lg leading-8 text-white/80 [animation-delay:150ms] sm:text-xl">
            Partner-led tax, audit and advisory across Ireland, with AI doing
            the heavy lifting.
          </p>
          <div className="animate-fade-up mt-10 flex flex-col items-start gap-3 [animation-delay:220ms] sm:flex-row sm:items-center sm:gap-4">
            <Button href="/contact">Book a free consultation</Button>
            <Button href="/services/ai" variant="outlineLight">
              See how we use AI
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------- quick entry (dark strip) ---------- */

type EntryIcon = "user" | "building" | "compass" | "chip";

function EntryGlyph({ name }: { name: EntryIcon }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 21h16M6 21V5l7-2v18M18 21V9l-5-1.5" />
          <path d="M9 8h0M9 11h0M9 14h0" />
        </svg>
      );
    case "compass":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
        </svg>
      );
    case "chip":
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" />
        </svg>
      );
  }
}

const quickEntries: {
  icon: EntryIcon;
  title: string;
  note: string;
  href: string;
}[] = [
  {
    icon: "user",
    title: "For individuals",
    note: "Tax planning built around your profession.",
    href: "/services/personal-finance",
  },
  {
    icon: "building",
    title: "For business",
    note: "Books, VAT, payroll and accounts, handled.",
    href: "/services/account-bookkeeping",
  },
  {
    icon: "compass",
    title: "Advisory and CFO",
    note: "A finance leader on call, without the headcount.",
    href: "/services/cfo-service",
  },
  {
    icon: "chip",
    title: "Digital and AI",
    note: "Modernise and automate the finance function.",
    href: "/services/digital-transformation",
  },
];

export function QuickEntry() {
  return (
    <section className="bg-navy-800 text-white">
      <Container className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {quickEntries.map((entry) => (
          <Link
            key={entry.title}
            href={entry.href}
            className="group flex items-start gap-4 bg-navy-800 px-5 py-7 transition-colors duration-200 hover:bg-navy-700"
          >
            <span className="mt-0.5 text-primary-300 transition-colors duration-200 group-hover:text-primary-400">
              <EntryGlyph name={entry.icon} />
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 font-display text-base font-semibold tracking-tight text-white">
                {entry.title}
                <span
                  aria-hidden="true"
                  className="translate-x-0 text-primary-300 transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
              <span className="mt-1 text-sm leading-6 text-white/60">
                {entry.note}
              </span>
            </span>
          </Link>
        ))}
      </Container>
    </section>
  );
}

/* ---------- client strip ---------- */

const clients = [
  "Northfield & Co",
  "Hartley Dairy",
  "Bloom Studio",
  "Cedar Logistics",
  "Marrow Kitchen",
  "Atlas Crane",
];

export function LogoStrip() {
  return (
    <section className="border-b border-line bg-white">
      <Container className="flex flex-col items-center gap-7 py-12">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Trusted by founders, family firms and growing teams
        </p>
        {/* accessible static list for screen readers */}
        <ul className="sr-only">
          {clients.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        {/* animated marquee: linear, pauses on hover, masked at the edges */}
        <div
          aria-hidden="true"
          className="group relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        >
          <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
            {[...clients, ...clients].map((name, index) => (
              <span
                key={index}
                className="mx-7 whitespace-nowrap font-display text-lg font-medium text-ink/35 transition-colors duration-200 hover:text-ink/60 sm:mx-10"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------- services ---------- */

export function Services() {
  return (
    <section id="services" className="scroll-mt-24 bg-canvas">
      <Container className="py-20 sm:py-28">
        <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="What we do"
            title="One firm for the whole journey."
            lede="Year-end accounts, payroll, tax, a part-time CFO. Take one service or the lot, anywhere in Ireland."
          />
          <Link
            href="/services"
            className="text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
          >
            All services <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {serviceCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/services/${category.slug}`}
              className="group relative flex items-center justify-between gap-3 bg-surface p-8 transition-colors duration-200 hover:bg-secondary-50/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-1 w-0 bg-primary-500 transition-all duration-300 group-hover:w-full"
              />
              <h3 className="flex flex-wrap items-center gap-2 font-display text-xl font-bold tracking-[-0.01em] text-ink">
                {category.title}
                {category.status === "coming-soon" && (
                  <span className="rounded-none bg-secondary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-500">
                    Soon
                  </span>
                )}
              </h3>
              <span
                aria-hidden="true"
                className="text-primary-500 transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          ))}

          {/* fills the trailing grid cell with a CTA instead of empty space */}
          <Link
            href="/contact"
            className="group flex items-center justify-between gap-3 bg-navy-900 p-8 text-white transition-colors duration-200 hover:bg-navy-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400 sm:col-span-2 lg:col-span-1"
          >
            <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-primary-300">
              Not sure where to start?
            </h3>
            <span
              aria-hidden="true"
              className="text-primary-300 transition-transform duration-200 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- promo banner (kpmg-style full-width split) ---------- */

export function PromoBanner({
  eyebrow,
  title,
  body,
  ctaHref,
  ctaLabel,
  image,
  reverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  image: keyof typeof images;
  reverse?: boolean;
}) {
  return (
    <section className="border-y border-line bg-surface">
      <div className="grid lg:grid-cols-2">
        <div
          className={`flex flex-col justify-center px-5 py-16 sm:px-8 sm:py-20 lg:py-28 ${
            reverse
              ? "lg:order-2 lg:ml-0 lg:mr-auto lg:max-w-xl lg:pl-16"
              : "lg:ml-auto lg:mr-0 lg:max-w-xl lg:pr-16"
          }`}
        >
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="mt-5 font-display text-4xl font-bold leading-[1.03] tracking-[-0.02em] text-balance text-ink sm:text-5xl">
              {title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-ink-body">{body}</p>
            <div className="mt-9">
              <Button href={ctaHref}>{ctaLabel}</Button>
            </div>
          </Reveal>
        </div>
        <div
          aria-hidden="true"
          className={`min-h-[320px] bg-cover bg-center lg:min-h-[520px] ${
            reverse ? "lg:order-1" : ""
          }`}
          style={bg(images[image])}
        />
      </div>
    </section>
  );
}

/* ---------- AI band (signature pillar) ---------- */

type AiIcon = "forecast" | "automate" | "tax";

function AiGlyph({ name }: { name: AiIcon }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "forecast":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M7 15l4-4 3 2 5-6" />
          <path d="M19 7v3.5M19 7h-3.5" />
        </svg>
      );
    case "automate":
      return (
        <svg {...common}>
          <path d="M13 3L5 13h5l-1 8 8-10h-5l1-8z" />
        </svg>
      );
    case "tax":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M13 3v5h5" />
          <path d="M9 13l2 2 3-4" />
        </svg>
      );
  }
}

const aiCapabilities: { icon: AiIcon; title: string; note: string }[] = [
  {
    icon: "forecast",
    title: "Forecasting & insight",
    note: "Cash-flow forecasts, anomaly detection and live reporting, so you see what is coming.",
  },
  {
    icon: "automate",
    title: "Automation",
    note: "Invoice capture, reconciliations and approvals that run themselves.",
  },
  {
    icon: "tax",
    title: "Tax intelligence",
    note: "Spot reliefs you’re missing, checked by a chartered accountant.",
  },
];

export function AiBand() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(var(--color-primary-300)_1px,transparent_1px),linear-gradient(90deg,var(--color-primary-300)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl"
      />
      <Container className="py-24 sm:py-32">
        <Reveal>
          <div className="max-w-2xl border-l-2 border-primary-400 pl-6 sm:pl-8">
            <Eyebrow tone="dark">AI, applied</Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-bold leading-[1.03] tracking-[-0.02em] text-balance sm:text-5xl">
              AI in the work,{" "}
              <em className="text-primary-300 not-italic">not bolted on after.</em>
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/80">
              Where AI earns its place, we use it. Where it doesn’t, we say so.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden border border-white/12 bg-white/12 sm:grid-cols-3">
            {aiCapabilities.map((cap) => (
              <div
                key={cap.title}
                className="flex flex-col bg-navy-900 px-7 py-9"
              >
                <span className="text-primary-300">
                  <AiGlyph name={cap.icon} />
                </span>
                <h3 className="mt-5 font-display text-lg font-medium tracking-tight text-white">
                  {cap.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-7 text-white/65">
                  {cap.note}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Button href="/services/ai">Explore our AI services</Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- industries ---------- */

export function Industries() {
  return (
    <section className="border-t border-line bg-white">
      <Container className="grid gap-14 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <SectionHeading
            eyebrow="Who we serve"
            title="Deep benches in the sectors we know best."
            lede="Every industry has its own tax quirks and rhythms. These are the ones we work in every day."
          />
          <ClipReveal
            url={images.meeting}
            className="mt-10 hidden h-64 w-full rounded-none lg:block"
          />
        </Reveal>
        <Reveal delay={120}>
        <ul className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
          {industries.map((industry, i) => {
            // last card spans both columns when the count is odd, no orphan cell
            const spanFull =
              industries.length % 2 === 1 && i === industries.length - 1;
            return (
              <li
                key={industry.name}
                className={`bg-surface p-6 ${spanFull ? "sm:col-span-2" : ""}`}
              >
                <h3 className="font-display text-lg font-medium tracking-tight text-ink">
                  {industry.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {industry.note}
                </p>
              </li>
            );
          })}
        </ul>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- process ---------- */

const steps = [
  {
    title: "Discovery call",
    description: "A free 30 minutes on where you stand. No pitch.",
  },
  {
    // Fee wording hidden for now; was "Fixed-fee proposal" /
    // "Clear scope, fixed monthly fee. No surprises."
    title: "Written proposal",
    description: "Clear scope, agreed upfront. No surprises.",
  },
  {
    title: "Painless onboarding",
    description: "We handle the handover. You sign one letter.",
  },
  {
    title: "Year-round care",
    description: "Monthly numbers and proactive planning, not a January scramble.",
  },
];

export function Process() {
  return (
    <section
      id="process"
      className="scroll-mt-24 border-y border-line bg-[#fafbfa]"
    >
      <Container className="py-20 sm:py-28">
        <Reveal>
        <SectionHeading
          eyebrow="How we work"
          title="A simple path to tidy books."
          lede="Switching accountants sounds painful. We’ve made it four steps, and we do the heavy lifting."
        />
        <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="relative border-t-2 border-ink/10 pt-6">
              <span
                aria-hidden="true"
                className="absolute -top-0.5 left-0 h-0.5 w-14 bg-primary-400"
              />
              <span className="font-display text-3xl font-medium text-primary-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-lg font-medium text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- testimonials ---------- */

const testimonials = [
  {
    quote:
      "AIBN Chartered Accountants Ltd took our year-end from a three-week scramble to a non-event. The books are just… done.",
    name: "Priya Shah",
    role: "Founder, Bloom Studio",
  },
  {
    quote:
      "They found €40k in R&D credits our previous accountant never mentioned. They’ve paid for themselves many times over.",
    name: "Marcus Hale",
    role: "Director, Cedar Logistics",
  },
  {
    quote:
      "Proper partner-led service. I message our accountant and get an answer the same day, not a ticket number.",
    name: "Hannah Okafor",
    role: "COO, Marrow Kitchen",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 bg-canvas">
      <Container className="py-20 sm:py-28">
        <Reveal>
        <SectionHeading eyebrow="Client stories" title="Don’t take our word for it." />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="group flex flex-col border-t-2 border-primary-400 bg-surface p-8 shadow-sm shadow-navy-900/5 transition-all duration-300 ease-snappy hover:-translate-y-1 hover:bg-navy-900 hover:shadow-xl hover:shadow-navy-900/20"
            >
              <span
                aria-hidden="true"
                className="font-display text-5xl leading-none text-primary-400/40 transition-colors duration-300 group-hover:text-primary-300"
              >
                “
              </span>
              <blockquote className="mt-3 flex-1 font-display text-lg leading-8 text-ink transition-colors duration-300 group-hover:text-white">
                {testimonial.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-line pt-5 text-sm transition-colors duration-300 group-hover:border-white/15">
                <span className="font-semibold text-ink transition-colors duration-300 group-hover:text-white">
                  {testimonial.name}
                </span>
                <span className="block text-muted transition-colors duration-300 group-hover:text-white/70">
                  {testimonial.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- faq ---------- */

const faqs = [
  {
    question: "How hard is it to switch accountants?",
    answer:
      "Not hard at all, for you. You sign one letter of engagement; we contact your previous accountant, collect handover records and pick up mid-year without missing a deadline.",
  },
  /* Pricing FAQ hidden while the fee model is being decided: restore this
     entry when pricing goes back up:
  {
    question: "How does your pricing work?",
    answer:
      "A fixed monthly fee, scoped upfront based on your size and what you need. No hourly billing, and the scope is reviewed together once a year, not whenever we feel like it.",
  },
  */
  {
    question: "Which accounting software do you support?",
    answer:
      "We’re certified partners on Xero and QuickBooks and also work with FreeAgent. If you’re on spreadsheets, we’ll migrate you and train your team as part of onboarding.",
  },
  {
    question: "Do you work with businesses like mine?",
    answer:
      "Our clients range from sole traders to €20m-turnover companies. Startups and SaaS, hospitality, retail, healthcare and professional services are our deepest benches.",
  },
  {
    question: "I’ve already missed deadlines. Can you help?",
    answer:
      "Yes. Penalty triage is routine work for us: we bring filings up to date, deal with Revenue correspondence on your behalf and appeal surcharges where there are grounds.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-line bg-white">
      <Container className="py-20 sm:py-28">
        <Reveal className="mx-auto max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Questions, answered straight." />
          <div className="mt-10">
            <Accordion items={faqs} />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- related services rail ---------- */

export function RelatedServices({
  currentSlug,
  heading = "Explore other services",
}: {
  currentSlug?: string;
  heading?: string;
}) {
  const others = serviceCategories
    .filter((category) => category.slug !== currentSlug)
    .slice(0, 4);
  return (
    <section className="border-t border-line bg-canvas">
      <Container className="py-16 sm:py-20">
        <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
            {heading}
          </h2>
          <Link
            href="/services"
            className="text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
          >
            All services <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {others.map((category) => (
            <Link
              key={category.slug}
              href={`/services/${category.slug}`}
              className="group relative flex flex-col bg-surface p-6 transition-colors duration-200 hover:bg-secondary-50/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-0.5 w-0 bg-primary-400 transition-all duration-300 group-hover:w-full"
              />
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                {category.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                {category.blurb}
              </p>
              <span className="mt-auto pt-4 text-sm font-semibold text-primary-500">
                Learn more <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- contact cta ---------- */

export function ContactCta({ children }: { children?: ReactNode }) {
  return (
    <section id="contact" className="scroll-mt-24 bg-canvas">
      <Container className="py-20 sm:py-24">
        <div className="relative isolate overflow-hidden rounded-none bg-navy-900 text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-cover bg-center opacity-40"
            style={bg(images.teamMeeting)}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/70"
          />
          <div className="px-6 py-16 text-center sm:px-16 sm:py-20">
            <Eyebrow tone="dark" align="center">
              Free 30-minute consultation
            </Eyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-medium leading-[1.12] tracking-tight text-balance sm:text-4xl">
              {children ?? "Ready to put your books on solid ground?"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">
              Tell us where things stand and we’ll tell you exactly what we’d do,
              what it costs and what you’d get back. No obligation, no jargon.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/contact">Start the conversation</Button>
              <Button href={site.phoneHref} variant="outlineLight" external>
                {site.phone}
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/50">
              We reply within one business day.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
