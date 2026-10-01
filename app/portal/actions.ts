"use server";

/* Client-side of the enquiry chat: a client posts a reply into one of their
   own enquiry threads. Ownership is enforced exclusively by user_id. Guest
   enquiries are claimed only at a verified auth callback boundary. */

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { query } from "../lib/db";
import { requireClient } from "../lib/supabase/guards";
import { validateEnquiryReply } from "../lib/enquiry-message-validation";
import { ADMIN_UNREAD_SQL } from "../lib/enquiry-messages";
import { notifyFirm } from "../lib/mailer";
import { clientMessageAlert } from "../lib/firm-alert-email";
import { emailOrigin } from "../lib/email-origin";
import { site } from "../lib/content";

export async function sendClientMessageAction(formData: FormData): Promise<void> {
  const user = await requireClient();

  const id = String(formData.get("id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!/^\d+$/.test(id) || validateEnquiryReply(body)) return;

  /* The enquiry must belong to this client. Read in the same query whether the
     thread is ALREADY unread for the admin, before this message lands: if it
     is, they were alerted when it became unread and will see this message when
     they open it. So one alert per unread stretch, not one per message, which
     keeps a chatty (or hostile) client from flooding the inbox or spending the
     mailbox's sending limit that signup confirmations also depend on. */
  const { rows } = await query<{
    name: string;
    service: string | null;
    admin_unread: boolean;
  }>(
    `select e.name, e.service, ${ADMIN_UNREAD_SQL} as admin_unread
       from enquiries e
      where e.id = $1 and e.user_id = $2`,
    [id, user.id],
  );
  const enquiry = rows[0];
  if (!enquiry) return;

  try {
    await query(
      `insert into enquiry_messages (enquiry_id, sender, sender_user_id, body)
       values ($1, 'client', $2, $3)`,
      [id, user.id, body],
    );
  } catch (err) {
    console.error("[portal] client reply failed:", err);
    return;
  }

  if (!enquiry.admin_unread) {
    const origin = await emailOrigin();
    after(() =>
      notifyFirm(
        clientMessageAlert({
          enquiryId: id,
          clientName: enquiry.name,
          clientEmail: user.email ?? "",
          service: enquiry.service,
          message: body,
          origin,
          firmName: site.name,
        }),
        "[portal]",
      ),
    );
  }

  revalidatePath("/portal");
  revalidatePath("/admin/enquiries");
}
