import type { Metadata } from "next";
import { requireAdmin } from "../lib/supabase/guards";
import { loadReviewStatus } from "../lib/editable-calculators";
import { loadMailHealth } from "../lib/mail-failures";
import { DashboardShell } from "../components/dashboard-ui";
import type { DashNavItem } from "../components/dashboard-nav";
import { MailHealthNotice } from "./mail-health-notice";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const navItems: DashNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home" },
  { href: "/admin/enquiries", label: "Enquiries", icon: "inbox", prefix: true },
  { href: "/admin/toolkits", label: "Toolkits", icon: "document", prefix: true },
  { href: "/admin/mortgage-rates", label: "Mortgage rates", icon: "banknotes", prefix: true },
  { href: "/admin/tax-rates", label: "Tax rates", icon: "receiptPercent", prefix: true },
  { href: "/admin/cgt-rates", label: "CGT rates", icon: "chartBar", prefix: true },
  { href: "/admin/cat-rates", label: "CAT rates", icon: "gift", prefix: true },
  { href: "/admin/ct-rates", label: "Corporation tax", icon: "buildingOffice", prefix: true },
  { href: "/admin/vat-rates", label: "VAT rates", icon: "calculator", prefix: true },
  { href: "/admin/rd-rates", label: "R&D tax credit", icon: "trendUp", prefix: true },
  { href: "/admin/capital-allowances-rates", label: "Capital allowances", icon: "cube", prefix: true },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, reviews, mailHealth] = await Promise.all([
    requireAdmin(),
    loadReviewStatus(),
    loadMailHealth(),
  ]);
  const dueHrefs = reviews.filter((r) => r.due).map((r) => r.adminHref);

  return (
    <DashboardShell
      title="Admin console"
      areaLabel="Admin"
      badge="admin"
      navItems={navItems}
      dueHrefs={dueHrefs}
      notice={<MailHealthNotice health={mailHealth} />}
      user={{
        email: user.email ?? "",
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}
