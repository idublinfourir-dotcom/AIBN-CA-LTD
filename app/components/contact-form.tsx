"use client";

/* Contact enquiry: a 3-step wizard (Topic → Enquiry → Details) that posts to
   the unchanged submitEnquiry server action. Rebuilt in the site's design
   system (no shadcn/lucide).

   Mechanism (see spec 2026-07-09-contact-wizard-design): ONE <form noValidate>.
   Every step's fieldset is always mounted; inactive ones use the `hidden`
   attribute, NOT conditional render, because FormData serialises only mounted
   inputs, so unmounting a step would drop its fields from the final POST. Hidden
   inputs still submit; they are never `disabled`. Only the button row is
   conditionally rendered, so no hidden submit button can post from an earlier
   step; onSubmit also guards Enter. All validation is manual (noValidate). */

import { useActionState, useEffect, useRef, useState } from "react";
import { submitEnquiry, type EnquiryState } from "../contact/actions";
import { serviceCategories } from "../lib/content";
import { getRelatedFaqs } from "../lib/contact-faqs";

const initialState: EnquiryState = { status: "idle" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_META = [
  {
    title: "Topic",
    prompt: "What can we help you with?",
    sub: "Pick the closest area. You can explain in detail on the next step.",
  },
  {
    title: "Your enquiry",
    prompt: "How can we help?",
    sub: "A sentence or two on where things stand and what you want to happen.",
  },
  {
    title: "Your details",
    prompt: "How should we contact you?",
    sub: "A partner reads every enquiry and replies within one business day.",
  },
];

function Check({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 10.5l4 4L16 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const inputClasses =
  "w-full rounded-none border border-line bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500";

const primaryBtn =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-primary-500 px-7 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-default disabled:opacity-60";
const ghostBtn =
  "inline-flex h-12 cursor-pointer items-center justify-center rounded-none border border-line px-6 text-sm font-semibold text-muted transition-colors duration-200 hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-700">
      {message}
    </p>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-3" role="group" aria-label={`Step ${step} of ${STEP_META.length}`}>
      <ol className="grid grid-cols-3 gap-3">
        {STEP_META.map((s, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={s.title} className="flex min-w-0 items-center gap-2.5">
              <span
                aria-current={active ? "step" : undefined}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-none text-xs font-semibold transition-colors duration-300 ${
                  active
                    ? "bg-navy-900 text-primary-300"
                    : done
                      ? "bg-primary-500 text-white"
                      : "border border-line text-muted"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span
                className={`truncate text-xs font-semibold uppercase tracking-[0.14em] ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {STEP_META.map((s, i) => (
          <span
            key={s.title}
            className={`h-1 transition-colors duration-300 ${
              i + 1 <= step ? "bg-primary-500" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SuccessCard() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-none border-t-2 border-primary-400 bg-surface p-8 shadow-sm shadow-navy-900/5">
      <span className="grid h-12 w-12 place-items-center rounded-none bg-navy-900 text-primary-300">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 10.5l4 4L16 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
        Thank you, we’ve got it.
      </h2>
      <p className="text-[15px] leading-7 text-muted">
        Your enquiry is in. A partner, not an autoresponder, will reply within
        one business day.
      </p>
    </div>
  );
}

export function ContactForm() {
  const [step, setStep] = useState(1);
  const [state, formAction, isPending] = useActionState(
    async (prev: EnquiryState, formData: FormData) => {
      const next = await submitEnquiry(prev, formData);
      // If the server rejects, jump to the step holding the errored field.
      if (next.status === "error" && next.errors) {
        if (next.errors.message) setStep(2);
        else if (next.errors.name || next.errors.email) setStep(3);
      }
      return next;
    },
    initialState,
  );
  const [service, setService] = useState("Not sure yet");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the step prompt whenever the step changes (a11y).
  useEffect(() => {
    promptRef.current?.focus();
  }, [step]);

  if (state.status === "success") return <SuccessCard />;

  const related = getRelatedFaqs(message);
  const serverErrors = state.errors ?? {};

  const validateStep = (s: number): string | null => {
    if (s === 2 && message.trim().length < 10)
      return "Tell us a little more: a sentence or two is plenty.";
    if (s === 3) {
      if (name.trim().length < 2) return "Please tell us your name.";
      if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address.";
    }
    return null; // step 1: the default topic is always valid.
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (e) {
      setError(e);
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEP_META.length, s + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  // Guard implicit/Enter submission: only the final step may actually submit.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (step < STEP_META.length) {
      e.preventDefault();
      handleNext();
      return;
    }
    const err = validateStep(STEP_META.length);
    if (err) {
      e.preventDefault();
      setError(err);
    }
  };

  return (
    <form action={formAction} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Stepper step={step} />

      <div className="border-t border-line pt-6">
        <h2
          ref={promptRef}
          tabIndex={-1}
          className="font-display text-2xl font-medium tracking-tight text-ink outline-none"
        >
          {STEP_META[step - 1].prompt}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">{STEP_META[step - 1].sub}</p>
      </div>

      {/* Step 1: topic */}
      <fieldset hidden={step !== 1} className="border-0 p-0">
        <legend className="sr-only">Choose a topic</legend>
        <div className="flex flex-wrap gap-2.5">
          {["Not sure yet", ...serviceCategories.map((c) => c.title)].map((t) => {
            const selected = service === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={selected}
                onClick={() => setService(t)}
                className={`inline-flex items-center gap-2 rounded-none border px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
                  selected
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-line bg-canvas text-ink-body hover:border-primary-400 hover:text-ink"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
                {t}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="service" value={service} />
      </fieldset>

      {/* Step 2: the enquiry + related FAQs */}
      <fieldset hidden={step !== 2} className="flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">Describe your enquiry</legend>
        <label htmlFor="message" className="block text-sm font-medium text-ink">
          Your enquiry
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={Boolean(serverErrors.message)}
          aria-describedby={serverErrors.message ? "message-error" : undefined}
          className={`${inputClasses} resize-y`}
          placeholder="Where are your books today, and what’s the goal?"
        />
        <FieldError id="message-error" message={serverErrors.message} />

        {related.length > 0 && (
          <div className="rounded-none border-l-[3px] border-primary-400 bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              While you’re here, this might help
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {related.map((faq) => (
                <li key={faq.href}>
                  <a
                    href={faq.href}
                    className="group block"
                  >
                    <span className="text-sm font-medium text-primary-600 transition-colors duration-200 group-hover:text-primary-500">
                      {faq.q}
                    </span>
                    <span className="block text-xs leading-5 text-muted">{faq.a}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      {/* Step 3: contact details */}
      <fieldset hidden={step !== 3} className="flex flex-col gap-5 border-0 p-0">
        <legend className="sr-only">Your contact details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(serverErrors.name)}
              aria-describedby={serverErrors.name ? "name-error" : undefined}
              className={inputClasses}
              placeholder="Jane Smith"
            />
            <FieldError id="name-error" message={serverErrors.name} />
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(serverErrors.email)}
              aria-describedby={serverErrors.email ? "email-error" : undefined}
              className={inputClasses}
              placeholder="jane@company.co"
            />
            <FieldError id="email-error" message={serverErrors.email} />
          </div>
        </div>
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-ink">
            Company <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputClasses}
            placeholder="Company Ltd"
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {state.formError}
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-line pt-5">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={handleBack} className={ghostBtn}>
              Back
            </button>
          )}
          {step < STEP_META.length && (
            <button type="button" onClick={handleNext} className={primaryBtn}>
              Next
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M4 10h11m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {step === STEP_META.length && (
            <button type="submit" disabled={isPending} className={primaryBtn}>
              {isPending && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {isPending ? "Sending…" : "Send enquiry"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          A partner replies within one business day. No newsletters, no spam.
        </p>
      </div>
    </form>
  );
}
