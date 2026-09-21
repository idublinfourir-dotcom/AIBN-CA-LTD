import type { Metadata } from "next";
import { Container, PageHero } from "../components/ui";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description:
    "Reset the password on your AIBN Chartered Accountants Ltd client account.",
  // A utility page, not a landing page: keep it out of the index and out of
  // sitemap.ts for the same reason.
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHero
        eyebrow="Client area"
        title="Forgotten your password?"
        lede="We'll email you a code. Type it in with a new password and you're back in."
        image="tower"
      />
      <Container className="py-16 sm:py-20">
        <div className="mx-auto max-w-md rounded-none border border-line bg-surface p-6 shadow-sm shadow-navy-900/5 sm:p-8">
          <ForgotPasswordForm />
        </div>
      </Container>
    </>
  );
}
