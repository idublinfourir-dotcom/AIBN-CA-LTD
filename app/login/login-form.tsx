"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "./actions";
import { PasswordInput } from "../components/password-input";
import { GoogleButton } from "../components/google-button";

const inputClasses =
  "w-full rounded-none border border-line bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500";

const linkClasses =
  "font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600";

const initialState: AuthState = {};

export function LoginForm({
  next,
  notice,
}: {
  next?: string;
  notice?: string;
}) {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const email = state.values?.email ?? "";

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <p className="rounded-none border border-primary-300 bg-primary-50 px-4 py-3 text-sm text-primary-600">
          {notice}
        </p>
      )}
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
        <input type="hidden" name="next" value={next ?? ""} />

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
            defaultValue={email}
            className={inputClasses}
            placeholder="jane@company.co"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-primary-500 px-7 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-default disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>

        {/* Every secondary route out of this form lives here, under the
            primary action, rather than beside a field label where it competes
            with the label for attention. */}
        <div className="flex flex-col gap-1.5 text-sm text-muted">
          <p>
            New client?{" "}
            <Link href="/signup" className={linkClasses}>
              Create an account
            </Link>
          </p>
          <p>
            <Link href="/forgot-password" className={linkClasses}>
              Forgot your password?
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
