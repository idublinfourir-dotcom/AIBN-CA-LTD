import Link from "next/link";
import { Icon } from "../components/dashboard-icons";
import { timeAgo } from "../components/dashboard-ui";
import type { MailHealth } from "../lib/mail-failures";
import { explainMailFailure, mailKindLabel, safeAdminHref } from "../lib/mail-health";
import { dismissMailFailuresAction } from "./mail-actions";

/* The admin's email warning: a red strip under the topbar on every /admin
   page (rendered by the admin layout through DashboardShell's `notice`).

   Two states, which can overlap:
   - switched off: required SMTP settings are missing on this deployment, so
     every send is skipped. Read from the environment on each render; there is
     nothing to dismiss, it clears when the settings are added.
   - failed sends: open rows in mail_failures. Listed newest first with a link
     to the enquiry where there is one, until the admin dismisses them.

   Renders nothing when neither applies. */

const sinceFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Dublin",
});

export function MailHealthNotice({ health }: { health: MailHealth }) {
  const { missingKeys, failures, openCount, since } = health;
  const switchedOff = missingKeys.length > 0;
  if (!switchedOff && openCount === 0) return null;

  const emails = (n: number) => `${n} ${n === 1 ? "email" : "emails"}`;

  const title = switchedOff
    ? "Email is switched off"
    : `${emails(openCount)} could not be sent`;

  return (
    <section
      aria-labelledby="mail-health-title"
      className="border-b border-red-200 bg-red-50 px-5 py-4 sm:px-8"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-red-700 text-white">
          <Icon name="envelope" className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 flex-1 basis-64">
          <h2
            id="mail-health-title"
            className="font-display text-base font-semibold tracking-tight text-red-700"
          >
            {title}
          </h2>
          {switchedOff ? (
            <p className="mt-0.5 text-sm text-ink-body">
              This site has no mail settings (missing{" "}
              <span className="font-mono text-xs">{missingKeys.join(", ")}</span>
              ), so nothing is emailed: no alerts to you, no replies to clients,
              no signup or password-reset emails. Enquiries and messages still
              save here. Whoever looks after the website needs to add the
              settings and redeploy.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-ink-body">
              Since {since ? sinceFmt.format(new Date(since)) : "recently"}.
              Each one is saved here, but the person it was for never got the
              email, so follow up by hand where it matters. Dismiss this once
              you have.
            </p>
          )}

          {failures.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-red-700">
                Show the {emails(openCount)} not sent
              </summary>
              <ul className="mt-2 divide-y divide-red-200 border border-red-200 bg-white">
                {failures.map((f) => {
                  const href = safeAdminHref(f.adminHref);
                  return (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="text-sm font-medium text-ink">
                          {mailKindLabel(f.kind)}
                        </p>
                        <p className="text-xs text-muted">
                          {timeAgo(new Date(f.createdAt))}.{" "}
                          {explainMailFailure(f.reason, f.detail)}
                          {f.detail && (
                            <>
                              {" "}
                              The server said:{" "}
                              <span className="break-words font-mono">{f.detail}</span>
                            </>
                          )}
                        </p>
                      </div>
                      {href && (
                        <Link
                          href={href}
                          className="inline-flex h-8 shrink-0 items-center rounded-none border border-line px-3 text-xs font-semibold text-ink-body transition-colors duration-200 hover:border-ink/30 hover:text-ink"
                        >
                          Open
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {openCount > failures.length && (
                <p className="mt-1 text-xs text-muted">
                  Showing the newest {failures.length} of {openCount}.
                </p>
              )}
            </details>
          )}
        </div>

        {/* Not while switched off: the list is still growing then, and
            "Dismiss" beside that title would read as hiding the outage. */}
        {!switchedOff && openCount > 0 && (
          <form action={dismissMailFailuresAction} className="shrink-0">
            <button
              type="submit"
              className="inline-flex h-8 cursor-pointer items-center rounded-none border border-red-700 px-3 text-xs font-semibold text-red-700 transition-colors duration-200 hover:bg-red-700 hover:text-white"
            >
              Dismiss
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
