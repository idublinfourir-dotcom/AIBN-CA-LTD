import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container, PageHero } from "../../../components/ui";
import { ResourceRequestForm } from "../../../components/resource-request-form";
import { findRequestableResourceBySlug } from "../../../lib/toolkit-content";
import { TOOLKIT_CATEGORY_LABELS } from "../../../lib/toolkit-types";

export const metadata: Metadata = {
  title: "Request a copy | Founders Hub",
  description:
    "Request a copy of an AIBN Founders Hub resource and we will email it to you.",
  robots: { index: false, follow: true },
};

export default async function RequestResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = findRequestableResourceBySlug(slug);
  if (!resource) notFound();

  return (
    <>
      <PageHero
        image="office"
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Founders Hub", href: "/toolkits" },
              { label: "Request a copy" },
            ]}
          />
        }
        title="Request a copy"
        lede="Tell us where to send it and one of our team will email the file over."
      />

      <Container className="py-16 sm:py-20">
        <div className="mx-auto max-w-xl">
          {/* What they are asking for, so the form is never ambiguous. */}
          <div className="rounded-none border-l-2 border-primary-500 bg-surface-muted p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              You are requesting
            </p>
            <h2 className="mt-1.5 font-display text-lg font-medium tracking-tight text-ink">
              {resource.title}
            </h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
              {TOOLKIT_CATEGORY_LABELS[resource.category]}
              {resource.framework ? ` · ${resource.framework}` : ""}
            </p>
            {resource.description && (
              <p className="mt-2.5 text-sm leading-6 text-muted">
                {resource.description}
              </p>
            )}
          </div>

          <div className="mt-8">
            <ResourceRequestForm slug={slug} />
          </div>

          <p className="mt-8 text-xs leading-5 text-muted">
            We use these details only to send you this resource and to answer any
            follow-up. We do not add you to a marketing list.
          </p>
        </div>
      </Container>
    </>
  );
}
