import Link from "next/link";
import { serviceCategories, site } from "../lib/content";
import { images } from "../lib/images";

/* Pricing link hidden site-wide for now: see app/_pricing. */
const firmLinks = [
  { label: "Services", href: "/services" },
  { label: "About the firm", href: "/about" },
  { label: "Client stories", href: "/#testimonials" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-navy-900 text-white">
      {/* photographic backdrop: Irish countryside at dusk */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-55"
        style={{ backgroundImage: `url(${images.footerLand})` }}
      />
      {/* navy scrim keeps text legible while letting the photo read through */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-900/85 via-navy-900/65 to-navy-900/90"
      />
      {/* harvest hairline at the seam */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary-400/60 to-transparent"
      />
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-white/10 font-display text-[11px] font-semibold tracking-tight text-primary-300">
                AIBN
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-lg font-semibold tracking-tight text-white">
                  AIBN
                </span>
                <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em] text-white/50">
                  Chartered Accountants Ltd
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/60">
              A partner-led chartered accountancy practice helping founders and
              family businesses across Ireland grow on solid financial ground.
            </p>
          </div>

          <nav aria-label="Services">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-300">
              Services
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/70">
              {serviceCategories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/services/${category.slug}`}
                    className="transition-colors duration-200 hover:text-white"
                  >
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Firm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-300">
              Firm
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/70">
              {firmLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-300">
              Get in touch
            </h3>
            <address className="mt-4 text-sm not-italic leading-6 text-white/70">
              {site.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <a
                href={`mailto:${site.email}`}
                className="mt-3 block transition-colors duration-200 hover:text-white"
              >
                {site.email}
              </a>
              <a
                href={site.phoneHref}
                className="transition-colors duration-200 hover:text-white"
              >
                {site.phone}
              </a>
            </address>
            <p className="mt-3 text-sm text-white/45">{site.hours}</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AIBN Chartered Accountants Ltd. All rights reserved.</p>
          <p>Chartered Accountants Ireland member firm · Dublin</p>
        </div>
      </div>
    </footer>
  );
}
