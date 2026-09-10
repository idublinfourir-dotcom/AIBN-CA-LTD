"use server";

/* Admin side of the enquiry chat: post a reply into a thread. Re-checks
   requireAdmin; revalidates the inbox, the dashboard and the client portal.
   A reply lands in two places: the in-app thread (the row below) and the
   client's email inbox (best-effort, see notifyClientByEmail). */

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { query } from "../../lib/db";
import { requireAdmin } from "../../lib/supabase/guards";
import { validateEnquiryReply } from "../../lib/enquiry-message-validation";
import { site } from "../../lib/content";
import { sendMail } from "../../lib/mailer";
import {
  replyHtml,
  replySubject,
  replyText,
  type ReplyEmailInput,
} from "../../lib/reply-email";

interface RecipientRow {
  name: string;
  email: string | null;
  service: string | null;
}

/**
 * Email the client a copy of an admin reply.
 *
 * Recipient is the address on their account (profiles.email, i.e. the one they
 * log in with) and falls back to the address typed on the contact form for
 * guest enquiries that were never claimed by an account.
 *
 * The email is composed in `lib/reply-email.ts` and sent over SMTP, so what the
 * client receives is defined in this repo rather than in a provider dashboard.
 *
 * Best-effort: the thread row is already committed, so a missing SMTP config or
 * a refused send is logged and the reply still stands in the portal.
 */
async function notifyClientByEmail(enquiryId: string, body: string) {
  let recipient: RecipientRow | undefined;
  try {
    const { rows } = await query<RecipientRow>(
      `select e.name,
              coalesce(nullif(p.email, ''), e.email) as email,
              e.service
         from enquiries e
         left join profiles p on p.id = e.user_id
        where e.id = $1`,
      [enquiryId],
    );
    recipient = rows[0];
  } catch (err) {
    console.error("[enquiries] recipient lookup failed:", err);
    return;
  }

  if (!recipient?.email) {
    console.warn(
      `[enquiries] no email on enquiry ${enquiryId}; reply stays in-app only`,
    );
    return;
  }

  const input: ReplyEmailInput = {
    clientName: recipient.name,
    body,
    service: recipient.service,
    firmName: site.name,
  };

  const sent = await sendMail({
    to: recipient.email,
    subject: replySubject(input),
    html: replyHtml(input),
    text: replyText(input),
    logPrefix: "[enquiries]",
  });

  // One line per successful send so the ops log shows which replies actually
  // left the building. The enquiry id only: the address stays out of the log.
  if (sent) console.info(`[enquiries] reply on #${enquiryId} emailed`);
}

/** Admin posts a reply into an enquiry thread. Sending also marks the thread
    read for the admin (they've clearly seen it). */
export async function sendAdminMessageAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!/^\d+$/.test(id) || validateEnquiryReply(body)) return;

  // An unchecked checkbox isn't submitted at all, so absence means "don't
  // email". Read before the insert so the intent is captured with the reply.
  const emailCopy = formData.get("email_copy") !== null;

  try {
    await query(
      `insert into enquiry_messages (enquiry_id, sender, sender_user_id, body)
       values ($1, 'admin', $2, $3)`,
      [id, admin.id, body],
    );
    await query(`update enquiries set admin_last_read_at = now() where id = $1`, [
      id,
    ]);
  } catch (err) {
    console.error("[enquiries] admin reply failed:", err);
    return;
  }

  // Email the client AFTER the response is sent, so the admin's send button
  // isn't waiting on the SMTP round-trip. Skipped entirely when the admin
  // unticked the copy: the reply is then portal-only.
  if (emailCopy) after(() => notifyClientByEmail(id, body));

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
  revalidatePath("/portal");
}
