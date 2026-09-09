/* Registry of admin-editable calculators that surface in the dashboard review
   reminder + nav badges.

   This is NOT "all calculators": income tax and mortgage have their own mature
   editors and are intentionally excluded from the reminder.

   Two-table reality: CGT stores reviewed_at in `cgt_settings` (its own loader);
   the Project-B calculators store it in `calculator_settings`. So each entry
   carries its OWN getReviewedAt loader rather than one unified query. Each phase
   appends its entry when that calculator ships, so P1 shows only CGT (parity
   with today) and the reminder grows per phase.

   `key` doubles as the audit-area prefix (`<key>-settings`). */

import { getCgtData } from "./cgt-data";
import { getCorporationTaxData } from "./corporation-tax-data";
import { getVatData } from "./vat-data";
import { getRdData } from "./rd-data";
import { getCaData } from "./ca-data";
import { getCatData } from "./cat-data";
import { isReviewDue, CGT_LAST_REVIEWED } from "./ireland-cgt";
import { CT_LAST_REVIEWED } from "./ireland-corporation-tax";
import { VAT_LAST_REVIEWED } from "./ireland-vat";
import { RD_LAST_REVIEWED } from "./ireland-rd-tax-credit";
import { CA_LAST_REVIEWED } from "./ireland-capital-allowances";
import { CAT_LAST_REVIEWED } from "./ireland-cat";

export interface EditableCalculator {
  key: string;
  label: string;
  adminHref: string;
  /** Loads this calculator's last-reviewed timestamp from its own table (null
      when it has never been saved). */
  getReviewedAt: () => Promise<string | null>;
  /** The code's last-reviewed date (`*_LAST_REVIEWED`), used as the fallback so
      an un-saved calculator still nags a year after its code was reviewed. */
  codeReviewedAt: string;
}

export const EDITABLE_CALCULATORS: EditableCalculator[] = [
  {
    key: "cgt",
    label: "CGT rates",
    adminHref: "/admin/cgt-rates",
    getReviewedAt: async () => (await getCgtData()).reviewedAt,
    codeReviewedAt: CGT_LAST_REVIEWED,
  },
  {
    key: "corporation-tax",
    label: "Corporation tax rates",
    adminHref: "/admin/ct-rates",
    getReviewedAt: async () => (await getCorporationTaxData()).reviewedAt,
    codeReviewedAt: CT_LAST_REVIEWED,
  },
  {
    key: "vat",
    label: "VAT rates",
    adminHref: "/admin/vat-rates",
    getReviewedAt: async () => (await getVatData()).reviewedAt,
    codeReviewedAt: VAT_LAST_REVIEWED,
  },
  {
    key: "rd-credit",
    label: "R&D tax credit rates",
    adminHref: "/admin/rd-rates",
    getReviewedAt: async () => (await getRdData()).reviewedAt,
    codeReviewedAt: RD_LAST_REVIEWED,
  },
  {
    key: "capital-allowances",
    label: "Capital allowances rates",
    adminHref: "/admin/capital-allowances-rates",
    getReviewedAt: async () => (await getCaData()).reviewedAt,
    codeReviewedAt: CA_LAST_REVIEWED,
  },
  {
    key: "cat",
    label: "CAT rates",
    adminHref: "/admin/cat-rates",
    getReviewedAt: async () => (await getCatData()).reviewedAt,
    codeReviewedAt: CAT_LAST_REVIEWED,
  },
];

export interface CalculatorReviewStatus {
  key: string;
  label: string;
  adminHref: string;
  reviewedAt: string | null;
  due: boolean;
}

/** Review status for every editable calculator (each loads from its own table). */
export async function loadReviewStatus(): Promise<CalculatorReviewStatus[]> {
  return Promise.all(
    EDITABLE_CALCULATORS.map(async (c) => {
      // DB timestamp when saved; otherwise the code's last-reviewed date, so an
      // un-customised calculator still nags a year after its code was reviewed.
      const reviewedAt = (await c.getReviewedAt()) ?? c.codeReviewedAt;
      return {
        key: c.key,
        label: c.label,
        adminHref: c.adminHref,
        reviewedAt,
        due: isReviewDue(reviewedAt),
      };
    }),
  );
}
