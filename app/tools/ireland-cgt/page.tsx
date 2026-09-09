import type { Metadata } from "next";
import { Breadcrumbs, Container, PageHero } from "../../components/ui";
import { ContactCta } from "../../components/sections";
import { CalculatorTabs } from "../../components/calculator-tabs";
import { IrelandCgtCalculator } from "../../components/ireland-cgt-calculator";
import { getCgtData } from "../../lib/cgt-data";
import { CGT_LAST_REVIEWED } from "../../lib/ireland-cgt";

export const metadata: Metadata = {
  title: "Ireland Capital Gains Tax Calculator: 33% CGT with Indexation Relief",
  description:
    "Estimate Irish Capital Gains Tax: proceeds less the indexed acquisition cost, PPR and Entrepreneur reliefs, allowable losses and the €1,270 exemption at 33%. Includes Revenue's indexation multipliers 1974–2002 for older assets. Republic of Ireland.",
};

const notes = [
  {
    title: "Indexation for older assets",
    body: "The cost of an asset bought before 2003 is uplifted by Revenue's official multiplier for the year of purchase, so inflation is not taxed as gain. Indexation has been frozen since then, which means costs from 2003 onward get no uplift at all.",
  },
  {
    title: "Reliefs and rates",
    body: "Standard CGT is 33%. Entrepreneur Relief gives 10% on qualifying business gains up to a €1.5m lifetime cap; Principal Private Residence relief exempts the main-home proportion. Each disposal also gets a €1,270 annual exemption.",
  },
  {
    title: "Editable, verified rates",
    body: "The rates and the full multiplier table come from revenue.ie and are stored so they can be updated after each Budget without a redeploy. Treat the output as an estimate: retirement relief and the share-matching rules are not modelled.",
  },
];

export default async function IrelandCgtPage() {
  const { config, multipliers } = await getCgtData();

  return (
    <>
      <PageHero
        image="deskFinance"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Tools" },
              { label: "Ireland capital gains tax" },
            ]}
          />
        }
        title="Ireland capital gains tax calculator"
        lede={`Work out CGT on a disposal, with indexation relief for older assets, the main reliefs and the €1,270 exemption at ${config.standardRatePercent}%. Figures current as of ${CGT_LAST_REVIEWED}.`}
      />

      <Container className="py-16 sm:py-20">
        <CalculatorTabs current="/tools/ireland-cgt" />

        <div className="rounded-none border border-line bg-canvas p-6 sm:p-8 lg:p-10">
          <IrelandCgtCalculator config={config} multipliers={multipliers} />
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
