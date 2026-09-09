import type { Metadata } from "next";
import { Breadcrumbs, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { PersonalTabs } from "../../components/personal-tabs";
import { IrelandMortgageCalculator } from "../../components/ireland-mortgage-calculator";
import { getMortgageData } from "../../lib/mortgage-data";

export const metadata: Metadata = {
  title: "Ireland Mortgage Calculator: Compare Repayments by Lender",
  description:
    "Compare monthly mortgage repayments across Irish lenders, first-time buyer, trading up, switcher and investment rates with APRC, green mortgage and cashback offers.",
};

const notes = [
  {
    title: "Compare Irish lenders",
    body: "Monthly repayments across AIB, Haven, Bank of Ireland, Avant Money, PTSB and ICS, with each product's interest rate, APRC and incentives side by side.",
  },
  {
    title: "Every rate type",
    body: "Filter variable, 2–10 year fixed and full-term fixed rates, including green mortgage rates for energy-efficient homes and cashback offers.",
  },
  {
    title: "Central Bank guardrails",
    body: "Flags where your loan sits against the loan-to-income and loan-to-value limits, and where your term runs past typical lender age caps.",
  },
];

export default async function IrelandMortgagePage() {
  const { products, policy, ratesAsOf } = await getMortgageData();

  return (
    <>
      <PageHero
        image="deskFinance"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Personal Hub", href: "/personal/mortgage" },
              { label: "Ireland mortgage" },
            ]}
          />
        }
        title="Ireland mortgage calculator"
        lede={`Compare monthly repayments across Irish lenders: variable, fixed and green rates as of ${ratesAsOf}.`}
      />

      <Container className="py-16 sm:py-20">
        <PersonalTabs current="/personal/mortgage" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandMortgageCalculator
            products={products}
            policy={policy}
            ratesAsOf={ratesAsOf}
          />
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
