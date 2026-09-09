import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  Button,
  Container,
  Eyebrow,
  PageHero,
  CheckIcon,
} from "../../../components/ui";
import { ContactCta } from "../../../components/sections";
import { Reveal } from "../../../components/reveal";
import { site, getCategory, getServiceParams } from "../../../lib/content";

export function generateStaticParams() {
  return getServiceParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const cat = getCategory(category);
  const item = cat?.items.find((i) => i.slug === slug);
  if (!cat || !item) return {};
  return { title: `${item.title} | ${cat.title}`, description: item.blurb };
}

export default async function SubServicePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const cat = getCategory(category);
  if (!cat || cat.status === "coming-soon") notFound();
  const index = cat.items.findIndex((i) => i.slug === slug);
  if (index === -1) notFound();
  const item = cat.items[index];
  const isPersona = cat.kind === "personas";
  const siblings = cat.items.filter((i) => i.slug !== slug).slice(0, 3);

  return (
    <>
      <PageHero
        image="architecture"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: cat.title, href: `/services/${cat.slug}` },
              { label: item.title },
            ]}
          />
        }
        title={item.title}
        lede={item.blurb}
        action={
          <Button href="/contact">
            Talk to us about {item.title.toLowerCase()}
          </Button>
        }
      />

      <Container className="grid items-start gap-12 py-14 sm:py-16 lg:grid-cols-[1fr_22rem]">
        <Reveal>
          <p className="max-w-2xl border-l-[3px] border-primary-500 pl-6 font-display text-xl font-light leading-9 text-ink sm:text-[1.7rem] sm:leading-[2.6rem]">
            {item.overview}
          </p>
          <div className="mt-12 flex items-baseline justify-between gap-4 border-t border-line pt-6">
            <Eyebrow>{isPersona ? "What we handle" : "What’s included"}</Eyebrow>
            <span className="font-display text-sm font-semibold text-primary-500">
              {String(item.included.length).padStart(2, "0")} items
            </span>
          </div>
          <ul className="mt-2 divide-y divide-line border-b border-line">
            {item.included.map((entry) => {
              const [label, ...rest] = entry.split(": ");
              const detail = rest.join(": ");
              return (
                <li
                  key={entry}
                  className="group flex items-baseline gap-4 py-5 transition-colors duration-200 hover:bg-secondary-50/40"
                >
                  <span className="mt-1 shrink-0 text-primary-500">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[15px] leading-7 text-muted">
                    <span className="font-display font-semibold text-ink">
                      {label}
                    </span>
                    {detail && <>: {detail}</>}
                  </p>
                </li>
              );
            })}
          </ul>

          {item.context && (
            <div className="mt-12 border-t border-line pt-10">
              <Eyebrow>What you should know</Eyebrow>
              <div className="mt-5 max-w-2xl space-y-5 text-[15px] leading-7 text-ink-body">
                {item.context.split("\n\n").map((para) => (
                  <p key={para.slice(0, 32)}>{para}</p>
                ))}
              </div>
            </div>
          )}
        </Reveal>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-28">
          <div className="rounded-none bg-navy-900 p-7 text-white">
            <h2 className="font-display text-lg font-medium tracking-tight">
              Talk to us about {item.title.toLowerCase()}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              A partner-led conversation, scoped to your situation. No pitch, no
              obligation.
            </p>
            <Button href="/contact" className="mt-5 w-full">
              Book a free consultation
            </Button>
            <a
              href={site.phoneHref}
              className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-primary-300 transition-colors duration-200 hover:text-primary-400"
            >
              {site.phone}
            </a>
          </div>

          <div className="rounded-none border-t-2 border-primary-400 bg-surface p-6 shadow-sm shadow-navy-900/5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {isPersona ? "Ideal if" : "Best for"}
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {item.bestFor.map((entry) => (
                <li
                  key={entry}
                  className="border-l-2 border-primary-400 pl-3 text-sm leading-6 text-ink-body"
                >
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </Container>

      {siblings.length > 0 && (
        <section className="border-t border-line bg-canvas">
          <Container className="py-14 sm:py-16">
            <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
                More in {cat.title}
              </h2>
              <Link
                href={`/services/${cat.slug}`}
                className="text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
              >
                View all <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
              {siblings.map((sibling) => (
                <Link
                  key={sibling.slug}
                  href={`/services/${cat.slug}/${sibling.slug}`}
                  className="group relative flex flex-col bg-surface p-6 transition-colors duration-200 hover:bg-secondary-50/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-0.5 w-0 bg-primary-400 transition-all duration-300 group-hover:w-full"
                  />
                  <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                    {sibling.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                    {sibling.blurb}
                  </p>
                  <span className="mt-auto pt-4 text-sm font-semibold text-primary-500">
                    Details <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
            </Reveal>
          </Container>
        </section>
      )}

      <ContactCta />
    </>
  );
}
