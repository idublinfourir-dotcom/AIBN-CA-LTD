"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "./actions";
import { PasswordInput } from "../components/password-input";
import { GoogleButton } from "../components/google-button";

const inputClasses =
  "w-full rounded-none border border-line bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  if (state.checkEmail) {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-none bg-navy-900 text-primary-300">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
            <path
              d="M3 5l7 5 7-5M3 5v10h14V5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Check your email
        </h2>
        <p className="text-[15px] leading-7 text-muted">
          We sent a confirmation link to{" "}
          <span className="font-medium text-ink">{state.values?.email}</span>.
          Click it to activate your account and open the client portal.
        </p>
        {/* Said plainly because it is the most common outcome, not an edge
            case: a first message from a new sender, carrying a link, is
            exactly what a spam filter holds back. */}
        <p className="text-sm leading-6 text-muted">
          Can&apos;t find it? Check your spam or junk folder, and mark it as
          not spam so future messages reach your inbox.
        </p>
        <Link
          href="/login"
          className="font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const values = state.values ?? {};

  return (
    <div className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <GoogleButton />

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={formAction} noValidate className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="full_name"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            defaultValue={values.fullName}
            className={inputClasses}
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={values.email}
            className={inputClasses}
            placeholder="jane@company.co"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Password{" "}
            <span className="font-normal text-muted">(8+ characters)</span>
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-primary-500 px-7 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-default disabled:opacity-60"
        >
          {isPending ? "Creating account…" : "Create account"}
        </button>

        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
