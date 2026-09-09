"use client";

/* Chat thread + composer, shared by the admin inbox and the client portal.

   - Optimistic send: the message appears instantly (dimmed, "Sending…") the
     moment you hit Send, then firms up when the server confirms, so there's
     never a dead pause wondering if it worked.
   - Pending state: the button shows a spinner + "Sending…" and both the box
     and button disable while the request is in flight.

   `import type` keeps the server-only enquiry-messages module (pg) out of this
   client bundle. */

import { useOptimistic, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "./dashboard-icons";
import type { EnquiryMessage, MessageSender } from "../lib/enquiry-messages";
import { ENQUIRY_MESSAGE_MAX_LENGTH } from "../lib/enquiry-message-validation";

const time = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface ThreadItem {
  id: string;
  sender: MessageSender;
  body: string;
  createdAt: Date;
  pending?: boolean;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const s = (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return s.toUpperCase() || "?";
}

function Bubble({
  item,
  viewer,
  clientName,
}: {
  item: ThreadItem;
  viewer: MessageSender;
  clientName: string;
}) {
  const mine = item.sender === viewer;
  // Short mark, not the full legal name: this caption repeats under every
  // admin message and the full name wraps the bubble column.
  const label = item.sender === "admin" ? "AIBN" : clientName;
  return (
    <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      <span
        aria-hidden="true"
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-semibold ${
          item.sender === "admin"
            ? "bg-navy-900 text-[8px] tracking-tight text-white"
            : "bg-primary-100 text-[10px] text-primary-700"
        }`}
      >
        {item.sender === "admin" ? "AIBN" : initials(clientName)}
      </span>
      <div className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-lg px-3.5 py-2 text-sm leading-6 whitespace-pre-line ${
            mine
              ? "rounded-br-none bg-primary-500 text-white"
              : item.sender === "admin"
                ? "rounded-bl-none bg-navy-900 text-white"
                : "rounded-bl-none border border-line bg-surface text-ink-body"
          } ${item.pending ? "opacity-60" : ""}`}
        >
          {item.body}
        </div>
        <span className="mt-1 px-0.5 text-[11px] text-muted">
          {label} · {item.pending ? "Sending…" : time.format(new Date(item.createdAt))}
        </span>
      </div>
    </div>
  );
}

function ComposerInner({
  placeholder,
  submitLabel,
  footerStart,
}: {
  placeholder: string;
  submitLabel: string;
  footerStart?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <textarea
        name="body"
        rows={2}
        required
        maxLength={ENQUIRY_MESSAGE_MAX_LENGTH}
        disabled={pending}
        placeholder={placeholder}
        className="w-full resize-none rounded-none border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-400/40 disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        {footerStart ?? <span />}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 min-w-[7.5rem] cursor-pointer items-center justify-center gap-2 rounded-none bg-primary-500 px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Sending…
            </>
          ) : (
            <>
              <Icon name="chat" className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </>
  );
}

export function ChatPanel({
  viewer,
  openingMessage,
  openingAt,
  clientName = "Client",
  messages,
  enquiryId,
  action,
  placeholder = "Write a message…",
  submitLabel = "Send",
  composerFooterStart,
  fill = false,
  className = "",
}: {
  viewer: MessageSender;
  openingMessage: string;
  openingAt: Date;
  clientName?: string;
  messages: EnquiryMessage[];
  enquiryId: string;
  /** Server action: (FormData with `id` + `body`) → void. */
  action: (formData: FormData) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  composerFooterStart?: React.ReactNode;
  /** Fill the parent's height (admin detail pane) vs size to content (portal). */
  fill?: boolean;
  className?: string;
}) {
  const base: ThreadItem[] = [
    { id: "opening", sender: "client", body: openingMessage, createdAt: openingAt },
    ...messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
    })),
  ];

  const [items, addOptimistic] = useOptimistic(base, (state, body: string) => [
    ...state,
    {
      id: `pending-${state.length}`,
      sender: viewer,
      body,
      createdAt: new Date(),
      pending: true,
    },
  ]);

  const formRef = useRef<HTMLFormElement>(null);

  async function submit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;
    addOptimistic(body);
    formRef.current?.reset();
    await action(formData);
  }

  return (
    <div className={`${fill ? "flex min-h-0 flex-1 flex-col" : ""} ${className}`}>
      <div
        className={`flex flex-col gap-3.5 ${
          fill
            ? "flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            : "max-h-[24rem] overflow-y-auto"
        }`}
      >
        {items.map((item) => (
          <Bubble key={item.id} item={item} viewer={viewer} clientName={clientName} />
        ))}
      </div>
      <form
        ref={formRef}
        action={submit}
        className={fill ? "border-t border-line px-5 py-3 sm:px-6" : "mt-4 border-t border-line pt-4"}
      >
        <input type="hidden" name="id" value={enquiryId} />
        <ComposerInner
          placeholder={placeholder}
          submitLabel={submitLabel}
          footerStart={composerFooterStart}
        />
      </form>
    </div>
  );
}
