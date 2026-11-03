"use server";

/* "Dismiss" on the admin's email warning (mail-health-notice.tsx). Hides every
   open failed-send row on this deployment; the rows stay in mail_failures as
   history. It cannot hide "Email is switched off": that state is read from the
   environment on each render and clears only when the settings are added.
   Re-checks requireAdmin. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib/supabase/guards";
import { dismissMailFailures } from "../lib/mail-failures";

export async function dismissMailFailuresAction(): Promise<void> {
  await requireAdmin();
  try {
    await dismissMailFailures();
  } catch (err) {
    console.error("[mailer] could not dismiss failed sends:", err);
    return;
  }
  // The warning lives in the admin layout, so refresh it on every admin page.
  revalidatePath("/admin", "layout");
}
