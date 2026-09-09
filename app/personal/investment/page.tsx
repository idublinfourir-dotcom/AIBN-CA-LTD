import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Button, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { PersonalTabs } from "../../components/personal-tabs";
import { IrelandInvestmentPlanner } from "../../components/ireland-investment-planner";
import { DATA_AS_OF, SOURCES } from "../../lib/ireland-investment";

/* Personal investment: the options planner plus the tax explainer behind it.
 *
 * No rate, threshold or return figure is written into this page: they all live
 * in app/lib/ireland-investment.ts, which is pure, unit-tested and carries the
 * source for every number. Keep it that way: a figure inlined here is one
 * nobody will find when the Budget moves it.
 *
 * The firm advises on the TAX of an investment, not on the investment itself.
 * The tool ranks option types by return after Irish tax and must never be
 * phrased as a personal recommendation; the disclaimers in the planner and at
 * the foot of this page are load-bearing, not boilerplate. */

export const metadata: Metadata = {
  title: "Personal Investment Tax in Ireland: What You Owe and When",
  description:
    "Compare where to invest in Ireland by return after tax: State Savings, deposits, pensions, ETFs, shares, property and private markets, filtered by timeframe and risk.",
};

/* What the finished section will cover. Each row is a distinct Irish tax
   treatment, which is the point: the wrapper decides the tax, not the asset. */
const coverage = [
  {
    title: "Shares held directly",
    body: "Gains on disposal fall under capital gains tax, with your annual personal exemption and any allowable losses set against them first. Dividends are income, taxed at your marginal rate, with withholding tax credited against the bill.",
  },
  {
    title: "Funds and ETFs",
    body: "Irish and EU funds sit outside the CGT rules entirely. They carry their own exit tax, charged on a disposal and again on a deemed disposal every eight years even if you have sold nothing, and it is the single most common surprise we see.",
  },
  {
    title: "Deposit interest",
    body: "Interest from Irish deposit accounts is taxed at source. Interest from an account held abroad is not, so it has to be declared, and that is where most non-compliance starts.",
  },
  {
    title: "Rental income",
    body: "Rent is assessed as income after allowable expenses, mortgage interest and capital allowances on fittings. A later sale of the property is a separate capital gains event.",
  },
  {
    title: "Pensions and approved schemes",
    body: "Contributions attract relief at your marginal rate within age-related limits, and the fund grows free of Irish tax until it is drawn down. For most people this is the first place a euro of investable income should go.",
  },
  {
    title: "Gifts, inheritance and transfers",
    body: "Passing an asset on is a capital acquisitions tax question for the person receiving it and, often, a capital gains question for the person giving it. The two are assessed separately on the same transaction.",
  },
];

/* The order matters: this is the sequence a client is actually walked through
   in a meeting, and the finished tool will follow it. */
const approach = [
  {
    step: "01",
    title: "Establish the wrapper",
    body: "Direct shares, a fund, a pension or a property are four different tax regimes. Identifying which one applies decides everything that follows, so it is the first question, not the last.",
  },
  {
    step: "02",
    title: "Separate income from gains",
    body: "Dividends, interest and rent are taxed as they arise. Gains are taxed when you dispose. They have different rates, different deadlines and different forms, and mixing them up is what triggers most Revenue correspondence.",
  },
  {
    step: "03",
    title: "Apply reliefs and losses",
    body: "Annual exemptions, carried-forward losses, relief on retirement or transfer of a business, and the credits already withheld at source. These are claimed, not applied automatically.",
  },
  {
    step: "04",
    title: "File the right return on time",
    body: "Capital gains have payment dates that do not line up with the income tax return, and a deemed disposal has no cash proceeds behind it. We tell you what falls due and when.",
  },
];

/* Existing tools that already answer part of the question, so this page is
   useful before its own calculator exists. */
const related = [
  {
    href: "/tools/ireland-cgt",
    label: "Capital gains tax calculator",
    body: "Gains on shares and property, with indexation relief on pre-2003 acquisitions.",
  },
  {
    href: "/tools/ireland-cat",
    label: "Gift & inheritance tax calculator",
    body: "Capital acquisitions tax thresholds, group bands and the main reliefs.",
  },
  {
    href: "/tools/ireland-income-tax",
    label: "Income tax calculator",
    body: "Income tax, USC and PRSI: the marginal rate that dividends and rent are taxed at.",
  },
  {
    href: "/personal/mortgage",
    label: "Mortgage calculator",
    body: "Compare repayments across Irish lenders before you commit capital to a home.",
  },
];

export default function PersonalInvestmentPage() {
  return (
    <>
      <PageHero
        image="forecast"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Personal Hub", href: "/personal/mortgage" },
              { label: "Personal investment" },
            ]}
          />
        }
        title="Personal investment"
        lede={`Where €1 can go in Ireland, ranked by what is left after tax. Thirty-two options across the State-backed and private sectors, current at ${DATA_AS_OF}.`}
        action={
          <Button href="/contact" variant="outlineLight">
            Talk to us about your position
          </Button>
        }
      />

      <Container className="py-16 sm:py-20">
        <PersonalTabs current="/personal/investment" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandInvestmentPlanner />
        </div>

        <div className="mt-16 max-w-3xl border-t border-line pt-12">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            The wrapper decides the tax, not the asset
          </h2>
          <p className="mt-5 text-lg leading-8 text-ink-body">
            Two people can hold the same index of shares and be taxed under
            entirely different rules: one under capital gains tax, the other
            under the exit tax regime that applies to funds. The rate, the
            deadline, the form and the treatment of losses all change with it.
            Before anything else, we work out which set of rules you are in.
          </p>
          <p className="mt-4 text-base leading-7 text-muted">
            We advise on the tax consequences of an investment you hold or are
            considering. We are not investment advisers and we do not recommend
            products. For that you need an authorised adviser, and we are happy
            to work alongside yours.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coverage.map((item) => (
            <div
              key={item.title}
              className="rounded-none border border-line bg-surface p-6"
            >
              <h3 className="font-display text-base font-medium tracking-tight text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-line pt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            How we work through it
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {approach.map((item) => (
              <div key={item.step}>
                <span className="font-display text-sm font-semibold tracking-[0.16em] text-primary-500">
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-base font-medium tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-line pt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Calculators that already cover part of this
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            The planner compares options. These put a number on the tax that
            falls due once you have picked one.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block rounded-none border border-line bg-surface p-6 transition-colors duration-200 hover:border-primary-300"
              >
                <span className="font-display text-base font-medium tracking-tight text-ink transition-colors duration-200 group-hover:text-primary-500">
                  {item.label}{" "}
                  <span aria-hidden="true" className="text-primary-500">
                    →
                  </span>
                </span>
                <span className="mt-2 block text-sm leading-6 text-muted">
                  {item.body}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-line pt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Where these figures come from
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Every rate, limit and yield in the planner, with the source it was
            taken from. All checked at {DATA_AS_OF}.
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {SOURCES.map((source) => (
              <li key={source.url} className="border-t border-line pt-3">
                <span className="block text-sm font-medium text-ink">
                  {source.topic}
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm leading-6 text-muted underline-offset-4 transition-colors duration-200 hover:text-primary-500 hover:underline"
                >
                  {source.source}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-12 max-w-3xl border-t border-line pt-6 text-sm leading-6 text-muted">
          General information only, current at the date of publication. Rates,
          thresholds and reliefs change with each Budget and Finance Act, and
          how they apply depends on your own circumstances. Take advice before
          you act on any of it.
        </p>
      </Container>

      <ContactCta />
    </>
  );
}
