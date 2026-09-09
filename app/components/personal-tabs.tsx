import { ToolTabs } from "./calculator-tabs";

/* The Personal Hub tools, in one place. Drives both the on-page switcher
   below and the Personal Hub dropdown in the site header, the same shape
   CALCULATOR_TOOLS has for the Accountants Hub.

   Mortgage moved here from the Accountants Hub: it is a personal-finance
   decision, not a practice calculator. Its old URL (/tools/ireland) is a
   permanent redirect in next.config.ts, so existing links still land. */
export const PERSONAL_TOOLS = [
  {
    href: "/personal/mortgage",
    label: "Mortgage",
    desc: "Compare repayments across Irish lenders",
  },
  {
    href: "/personal/investment",
    label: "Personal investment",
    desc: "Compare options by return after Irish tax",
  },
] as const;

/** The Personal Hub switcher. */
export function PersonalTabs({ current }: { current: string }) {
  return (
    <ToolTabs heading="Personal Hub" tools={PERSONAL_TOOLS} current={current} />
  );
}
