/* Related-FAQ data + matcher for the contact wizard. PURE: no React/IO, so
   getRelatedFaqs is unit-testable and can be imported by both the client
   component and node --test.

   Each FAQ links to the page or calculator that answers it, so the contact form
   can quietly deflect a common question to a real answer while the user types.
   Content is drawn from the site's own service copy (audit exemption, VAT,
   payroll auto-enrolment) and the tax tools. */

export interface ContactFaq {
  /** The question, as a user might phrase it. */
  q: string;
  /** A one-line answer/teaser. */
  a: string;
  /** Where to send them for the full answer. */
  href: string;
  /** Lowercase substrings matched against the typed message. */
  keywords: string[];
}

export const CONTACT_FAQS: ContactFaq[] = [
  {
    q: "Do I need an audit?",
    a: "Most small companies are exempt if they stay under two of €15m turnover, €7.5m balance sheet and 50 employees, and file on time.",
    href: "/services/account-bookkeeping/audit-assurance",
    keywords: ["audit", "exemption", "assurance", "statutory"],
  },
  {
    q: "Do I have to register for VAT?",
    a: "The thresholds are €85,000 for goods and €42,500 for services in any 12 months. Our VAT tool shows your net position.",
    href: "/tools/ireland-vat",
    keywords: ["vat", "register for vat", "vat3", "threshold"],
  },
  {
    q: "How much Capital Gains Tax will I pay?",
    a: "CGT is 33% with indexation relief on older assets. Estimate it with the CGT calculator.",
    href: "/tools/ireland-cgt",
    keywords: ["capital gains", "cgt", "selling", "sold", "disposal", "shares"],
  },
  {
    q: "Is a gift or inheritance taxable?",
    a: "Capital Acquisitions Tax at 33% above your group threshold, with agricultural and business relief. Try the CAT calculator.",
    href: "/tools/ireland-cat",
    keywords: ["gift", "inheritance", "inherit", "cat", "estate", "family farm", "bequest"],
  },
  {
    q: "Can you run our payroll?",
    a: "Yes. We run the full cycle, from payslips and PAYE Modernisation through to pensions and year-end, and we keep you ahead of auto-enrolment (My Future Fund).",
    href: "/services/account-bookkeeping/payroll",
    keywords: ["payroll", "paye", "pension", "auto-enrolment", "auto enrolment", "wages", "employees"],
  },
  {
    q: "What Corporation Tax rate applies?",
    a: "12.5% on trading profits, 25% on passive income. The corporation tax tool totals it for you.",
    href: "/tools/ireland-corporation-tax",
    keywords: ["corporation tax", "corporate tax", "trading profit", "12.5", "company tax"],
  },
];

/**
 * Return the FAQs whose keywords appear in the message (case-insensitive
 * substring), in catalogue order, capped at `limit`. Empty or whitespace-only
 * messages match nothing.
 */
export function getRelatedFaqs(
  message: string,
  faqs: ContactFaq[] = CONTACT_FAQS,
  limit = 2,
): ContactFaq[] {
  const text = message.trim().toLowerCase();
  if (!text) return [];
  return faqs
    .filter((f) => f.keywords.some((k) => text.includes(k.toLowerCase())))
    .slice(0, limit);
}
