"use server";

/* Founders Hub admin actions. Fulfilment is manual by design: no file is
   uploaded or hosted, a team member emails the resource from their own mailbox
   and then marks the request sent here. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase/guards";
import { setRequestStatus } from "../../lib/toolkit-requests";

export interface ActionState {
  status: "idle" | "saved" | "error";
  message?: string;
}

/** Mark a request sent (or put it back to pending). The returned state is what
    the button renders as its confirmation, so it always says what happened. */
export async function setRequestStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!/^\d+$/.test(id) || (status !== "pending" && status !== "sent")) {
    return { status: "error", message: "Could not update: the request was malformed." };
  }

  try {
    await setRequestStatus(id, status);
  } catch (err) {
    console.error("[toolkits] could not update request status:", err);
    return { status: "error", message: "Could not update. Please try again." };
  }

  revalidatePath("/admin/toolkits");
  return {
    status: "saved",
    message:
      status === "sent"
        ? "Marked as sent."
        : "Moved back to pending.",
  };
}
