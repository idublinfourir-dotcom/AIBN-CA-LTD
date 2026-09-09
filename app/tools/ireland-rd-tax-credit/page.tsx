import type { Metadata } from "next";
import { Breadcrumbs, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { CalculatorTabs } from "../../components/calculator-tabs";
import { IrelandRdTaxCreditCalculator } from "../../components/ireland-rd-tax-credit-calculator";
import { RD_LAST_REVIEWED } from "../../lib/ireland-rd-tax-credit";
import { getRdData } from "../../lib/rd-data";

export const metadata: Metadata = {
  title: "Ireland R&D Tax Credit Calculator: 35% Credit & 3-Year Instalments",
  description:
    "Estimate the Irish R&D Corporation Tax Credit at 35% of qualifying expenditure, with the three-year instalment schedule and the ~47.5% combined benefit. Republic of Ireland.",
};

const notes = [
  {
    title: "35% of qualifying spend",
    body: "The credit is 35% of qualifying R&D expenditure, and the same spend still attracts the 12.5% trading deduction, so the combined benefit lands around 47.5%. This rate applies to accounting periods starting on or after 1 January 2026.",
  },
  {
    title: "Paid over three years",
    body: "The first €87,500, or 50% of the credit if that is greater, is payable in year one, and the balance follows across years two and three. You elect either a cash refund or an offset against tax due; it is not netted against corporation tax first.",
  },
  {
    title: "Qualifying is the hard part",
    body: "A real claim turns on the science test, the eligible cost categories, subcontractor and grant limits, and the capital/revenue split, and Revenue can audit all of it. Use this to size the benefit, then let us build the claim.",
  },
];

export default async function IrelandRdTaxCreditPage() {
  const { config } = await getRdData();

  return (
    <>
      <PageHero
        image="deskFinance"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Tools" },
              { label: "Ireland R&D tax credit" },
            ]}
          />
        }
        title="Ireland R&D tax credit calculator"
        lede={`Estimate the ${config.ratePercent}% R&D Corporation Tax Credit and how it's paid out over three years, figures current as of ${RD_LAST_REVIEWED}.`}
      />

      <Container className="py-16 sm:py-20">
        <CalculatorTabs current="/tools/ireland-rd-tax-credit" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandRdTaxCreditCalculator config={config} />
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {notes.map((note) => (
            <div key={note.title} className="rounded-none border border-line bg-surface p-6">
              <h2 className="font-display text-base font-medium tracking-tight text-ink">
                {note.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">{note.body}</p>
            </div>
          ))}
        </div>
      </Container>

      <ContactCta />
    </>
  );
}
