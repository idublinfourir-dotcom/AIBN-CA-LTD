/* Toolkit categories, labels and slugs: PURE module, no DB imports, safe to
   import from client components. The resources themselves are a static
   catalogue in toolkit-content.ts: no file is ever uploaded or hosted, every
   copy is emailed by hand after a request. */

export const TOOLKIT_CATEGORIES = [
  { value: "memo", label: "Memos" },
  { value: "template", label: "Templates" },
  { value: "tax-form", label: "Tax forms" },
  { value: "vat-form", label: "VAT forms" },
  { value: "guide", label: "Business setup guides" },
  { value: "other", label: "Other resources" },
] as const;

export type ToolkitCategory = (typeof TOOLKIT_CATEGORIES)[number]["value"];

/* URL slug for a resource, derived from its title. The catalogue has no ids,
   so the title is what gives each entry a stable, readable request URL. */
export function toolkitSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const TOOLKIT_CATEGORY_LABELS: Record<ToolkitCategory, string> =
  Object.fromEntries(
    TOOLKIT_CATEGORIES.map((c) => [c.value, c.label]),
  ) as Record<ToolkitCategory, string>;

/* Accounting-framework badge shown on Templates/checklist cards. */
export const TOOLKIT_FRAMEWORKS = [
  "FRS 102",
  "FRS 101",
  "FRS 105",
  "IFRS",
  "UK GAAP",
] as const;

export type ToolkitFramework = (typeof TOOLKIT_FRAMEWORKS)[number];
