import type { Metadata } from "next";
import { Breadcrumbs, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { CalculatorTabs } from "../../components/calculator-tabs";
import { IrelandIncomeTaxCalculator } from "../../components/ireland-income-tax-calculator";
import { getTaxRates } from "../../lib/tax-data";

export const metadata: Metadata = {
  title: "Ireland Income Tax Calculator (Income Tax + USC + PRSI): 2026",
  description:
    "Estimate your Irish personal tax for 2026: income tax, USC and PRSI, with pension relief, tax credits and a 2025 comparison. Republic of Ireland.",
};

const notes = [
  {
    title: "Income tax, USC & PRSI",
    body: "Your full annual position across all three deductions, with the 20%/40% band split and every tax credit itemised, so each number traces back to a rule.",
  },
  {
    title: "Pension relief, done right",
    body: "Applies the age-banded relief cap to the first €115,000 of earnings. Pension contributions reduce income tax only, never USC or PRSI, and anything above the cap attracts no relief.",
  },
  {
    title: "2026 vs 2025",
    body: "Shows both tax years side by side and the year-on-year change, so clients can see the impact of the Budget changes in USC bands and the PRSI rate.",
  },
];

export default async function IrelandIncomeTaxPage() {
  const ratesByYear = await getTaxRates();
  return (
    <>
      <PageHero
        image="deskFinance"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Tools" },
              { label: "Ireland income tax" },
            ]}
          />
        }
        title="Ireland income tax calculator"
        lede="Estimate your Irish income tax, USC and PRSI for 2026, including pension relief and tax credits, with a 2025 comparison alongside."
      />

      <Container className="py-16 sm:py-20">
        <CalculatorTabs current="/tools/ireland-income-tax" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandIncomeTaxCalculator ratesByYear={ratesByYear} />
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
