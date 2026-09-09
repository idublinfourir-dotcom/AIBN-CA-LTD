import type { Metadata } from "next";
import { Breadcrumbs, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { CalculatorTabs } from "../../components/calculator-tabs";
import { IrelandCorporationTaxCalculator } from "../../components/ireland-corporation-tax-calculator";
import { CT_LAST_REVIEWED } from "../../lib/ireland-corporation-tax";
import { getCorporationTaxData } from "../../lib/corporation-tax-data";

export const metadata: Metadata = {
  title: "Ireland Corporation Tax Calculator: 12.5% Trading, 25% Passive",
  description:
    "Estimate Irish corporation tax on trading profit (12.5%) and passive/non-trading income (25%), with the total tax due and blended effective rate. Republic of Ireland.",
};

const notes = [
  {
    title: "Two rates, your split",
    body: "12.5% on active trading profit and 25% on passive income (rent, interest, most foreign dividends). You classify each figure; the tool never guesses.",
  },
  {
    title: "Total tax & blended rate",
    body: "See the total corporation tax due and the blended effective rate across both streams, so a company with mixed income knows its real overall cost.",
  },
  {
    title: "Reliefs come next",
    body: "Chargeable gains, the R&D credit, the Knowledge Development Box, the close-company surcharge and start-up relief all change the final bill. That is a conversation to have with us, not a slider.",
  },
];

export default async function IrelandCorporationTaxPage() {
  const { config } = await getCorporationTaxData();

  return (
    <>
      <PageHero
        image="deskFinance"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Tools" },
              { label: "Ireland corporation tax" },
            ]}
          />
        }
        title="Ireland corporation tax calculator"
        lede={`Estimate the total corporation tax on trading income and passive income, with the blended effective rate, figures current as of ${CT_LAST_REVIEWED}.`}
      />

      <Container className="py-16 sm:py-20">
        <CalculatorTabs current="/tools/ireland-corporation-tax" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandCorporationTaxCalculator config={config} />
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
