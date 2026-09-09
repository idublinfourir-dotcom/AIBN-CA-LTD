import type { Metadata } from "next";
import { Container, PageHero } from "../components/ui";
import { ContactForm } from "../components/contact-form";
import { site } from "../lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book a free 30-minute consultation with a chartered accountant. We reply within one business day.",
};

const nextSteps = [
  "We reply within one business day to arrange a call.",
  "A free 30-minute conversation about where things stand.",
  // Fee wording hidden for now; was "A fixed-fee proposal in writing: take it
  // or leave it."
  "A written proposal with the scope set out. Take it or leave it.",
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Start the conversation."
        lede="Tell us where your books stand. A partner reads every enquiry, so you will not be handed off to a sales team."
        image="teamMeeting"
      />

      <Container className="grid items-start gap-14 py-16 sm:py-20 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-none border border-line bg-surface p-6 sm:p-8">
          <ContactForm />
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-28">
          <div className="rounded-none border-t-2 border-primary-400 bg-surface p-6 shadow-sm shadow-navy-900/5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              What happens next
            </h2>
            <ol className="mt-4 flex flex-col gap-4">
              {nextSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-none bg-navy-900 text-xs font-semibold text-primary-300">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-ink-body">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-none border border-line bg-surface p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Prefer to call or visit?
            </h2>
            <address className="mt-4 text-sm not-italic leading-7 text-ink-body">
              {site.address[0]}
              <br />
              {site.address[1]}
              <br />
              <a
                href={`mailto:${site.email}`}
                className="mt-3 block font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600"
              >
                {site.email}
              </a>
              <a
                href={site.phoneHref}
                className="font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600"
              >
                {site.phone}
              </a>
            </address>
            <p className="mt-3 text-sm text-muted">{site.hours}</p>
          </div>
        </aside>
      </Container>
    </>
  );
}
