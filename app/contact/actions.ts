"use server";

import { after } from "next/server";
import { query } from "../lib/db";
import { createClient } from "../lib/supabase/server";
import { allowPublicAction } from "../lib/rate-limit";
import { site } from "../lib/content";
import { sendMail } from "../lib/mailer";
import { ackHtml, ackSubject, ackText } from "../lib/enquiry-email";

export interface EnquiryState {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "message", string>>;
  formError?: string;
  values?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Acknowledge the enquiry to the person who sent it.
 *
 * Goes to the customer, not to the firm: new enquiries surface in
 * /admin/enquiries with an unread badge, so no alert email is needed. Reply-To
 * is left at the default (the firm's own address), so answering the
 * acknowledgement reaches a human here.
 *
 * Best-effort: the DB row is the source of truth, so a failed email is logged
 * but doesn't fail the submission.
 */
async function sendEnquiryAck(values: { name: string; email: string }) {
  const sent = await sendMail({
    to: values.email,
    subject: ackSubject(),
    html: ackHtml({ name: values.name, firmName: site.name }),
    text: ackText({ name: values.name, firmName: site.name }),
    logPrefix: "[enquiry]",
  });
  if (sent) console.info("[enquiry] acknowledgement emailed");
}

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    service: String(formData.get("service") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  const errors: EnquiryState["errors"] = {};
  if (values.name.length < 2) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(values.email))
    errors.email = "Please enter a valid email address.";
  if (values.message.length < 10)
    errors.message = "Tell us a little more: a sentence or two is plenty.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const allowed = await allowPublicAction({
    action: "contact",
    identity: values.email,
    ip: { max: 10, windowSeconds: 60 * 60 },
    identityLimit: { max: 5, windowSeconds: 60 * 60 },
  });
  if (!allowed) {
    return {
      status: "error",
      formError:
        "Too many enquiries have been sent recently. Please wait an hour or contact us by email.",
      values,
    };
  }

  // Stamp the enquiry with the signed-in user's id when a session exists;
  // logged-out (public) submissions stay null. Read via the SSR server client.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch (err) {
    console.error("[enquiry] session read failed (continuing anonymous):", err);
  }

  // Save to Postgres (Supabase). Parameterised query ($1..$6), never string
  // interpolation, so user input can't be used for SQL injection.
  try {
    await query(
      `insert into enquiries (name, email, company, service, message, user_id)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        values.name,
        values.email,
        values.company || null,
        values.service || null,
        values.message.slice(0, 4000),
        userId,
      ],
    );
  } catch (err) {
    console.error("[enquiry] failed to save:", err);
    return { status: "error", values };
  }

  // Send the acknowledgement AFTER the response is returned, so the form
  // submission isn't blocked by the SMTP round-trip (best-effort).
  after(() => sendEnquiryAck(values));

  return { status: "success" };
}
