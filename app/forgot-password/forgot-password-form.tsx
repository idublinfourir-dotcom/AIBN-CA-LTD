"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestResetCode,
  resetPasswordWithCode,
  type ResetConfirmState,
  type ResetRequestState,
} from "./actions";
import { PasswordInput } from "../components/password-input";

const inputClasses =
  "w-full rounded-none border border-line bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500";

const buttonClasses =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-primary-500 px-7 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-default disabled:opacity-60";

const requestInitial: ResetRequestState = {};
const confirmInitial: ResetConfirmState = {};

/* Two steps, two separate <form>s posting to two separate server actions, so
   each step is conditionally rendered. This is NOT the contact-form wizard
   shape, and it does not need to be: that form keeps every step mounted and
   toggles `hidden` because it posts ONE FormData, which would silently drop the
   fields of an unmounted step. Here each step submits on its own, so there is
   nothing to drop. */
export function ForgotPasswordForm() {
  const [request, requestAction, requesting] = useActionState(
    requestResetCode,
    requestInitial,
  );
  const [confirm, confirmAction, confirming] = useActionState(
    resetPasswordWithCode,
    confirmInitial,
  );

  const email = confirm.email ?? request.email ?? "";

  if (request.sent) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
            Enter your code
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-muted">
            If{" "}
            <span className="font-medium text-ink">{email}</span> has an account
            with us, a code is on its way. It expires in an hour.
          </p>
          {/* Same reason as the signup screen: a first message from this sender
              carrying a code is exactly what a spam filter holds back. */}
          <p className="mt-2 text-sm leading-6 text-muted">
            Can&apos;t find it? Check your spam or junk folder. We will never
            ask you for this code.
          </p>
        </div>

        {confirm.error && (
          <p
            role="alert"
            className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {confirm.error}
          </p>
        )}

        <form action={confirmAction} noValidate className="flex flex-col gap-5">
          <input type="hidden" name="email" value={email} />

          <div>
            <label
              htmlFor="token"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Code from your email
            </label>
            <input
              id="token"
              name="token"
              type="text"
              inputMode="numeric"
              /* Lets iOS and Safari offer the code straight from the mail app. */
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              required
              className={`${inputClasses} font-mono text-lg tracking-[0.3em]`}
              placeholder="Paste it here"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              New password{" "}
              <span className="font-normal text-muted">(8+ characters)</span>
            </label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Confirm new password
            </label>
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <button type="submit" disabled={confirming} className={buttonClasses}>
            {confirming ? "Setting password…" : "Set new password"}
          </button>
        </form>

        {/* Re-running step 1 is how you get another code: the action throttles
            it, so this cannot be used to spam an address. */}
        <form action={requestAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={requesting}
            className="cursor-pointer text-sm font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600 disabled:cursor-default disabled:opacity-60"
          >
            {requesting ? "Sending…" : "Send another code"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Reset your password
        </h2>
        <p className="mt-2 text-[15px] leading-7 text-muted">
          Tell us the email address on your account and we&apos;ll send a
          code to set a new password.
        </p>
      </div>

      {request.error && (
        <p
          role="alert"
          className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {request.error}
        </p>
      )}

      <form action={requestAction} noValidate className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={email}
            className={inputClasses}
            placeholder="jane@company.co"
          />
        </div>

        <button type="submit" disabled={requesting} className={buttonClasses}>
          {requesting ? "Sending code…" : "Send me a code"}
        </button>

        <p className="text-sm text-muted">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
