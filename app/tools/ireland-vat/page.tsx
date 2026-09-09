import type { Metadata } from "next";
import { Breadcrumbs, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { CalculatorTabs } from "../../components/calculator-tabs";
import { IrelandVatCalculator } from "../../components/ireland-vat-calculator";
import { VAT_LAST_REVIEWED } from "../../lib/ireland-vat";
import { getVatData } from "../../lib/vat-data";

export const metadata: Metadata = {
  title: "Ireland VAT Calculator: Net VAT Payable or Receivable (VAT3)",
  description:
    "Enter your sales and purchases and see your net VAT position, payable to Revenue or receivable back, the way the VAT3 return nets output VAT against input VAT. Every Irish rate: 23%, 13.5%, 9%, 4.8% and 0%. Republic of Ireland.",
};

const notes = [
  {
    title: "Payable or receivable",
    body: "VAT charged on sales is owed to Revenue; VAT paid on purchases is reclaimable. The calculator nets the two, so charge more than you paid and the balance is payable, pay more than you charged and it comes back to you.",
  },
  {
    title: "Every Irish rate",
    body: "Standard 23%, reduced 13.5%, second reduced 9% (food, catering and hairdressing since 1 July 2026), 4.8% on livestock and 0% zero-rated. Pick what you sell and what you buy, and the right rate is applied for you.",
  },
  {
    title: "Registration thresholds",
    body: "The €85,000 goods and €42,500 services turnover limits sit alongside the result, so you can see the point at which a growing business has to register.",
  },
];

export default async function IrelandVatPage() {
  const { config } = await getVatData();

  return (
    <>
      <PageHero
        image="deskFinance"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Tools" },
              { label: "Ireland VAT" },
            ]}
          />
        }
        title="Ireland VAT calculator"
        lede={`Enter your sales and purchases and see whether VAT is payable to Revenue or receivable back, netted the way the VAT3 return works. Figures current as of ${VAT_LAST_REVIEWED}.`}
      />

      <Container className="py-16 sm:py-20">
        <CalculatorTabs current="/tools/ireland-vat" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandVatCalculator config={config} />
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
