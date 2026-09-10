## AIBN Chartered Accountants Ltd — Agent Instructions

Persistent rules for repo. Apply **every Agent session** automatically.
Git push/merge workflow: see `CLAUDE.md`.


## Project

Marketing site for **AIBN Chartered Accountants Ltd** — partner-led chartered accountancy practice (audit, tax, bookkeeping, payroll, advisory). UK copy + tone: professional, plain English, no jargon.



## Stack

- **Next.js 16** (App Router)
- **React 19**, **TypeScript**
- **Tailwind CSS v4** (`app/globals.css` with `@theme` tokens)
- **Framer Motion** (`motion` package, import from `motion/react`) — scroll reveals, count-up, accordion
- **Supabase** — Postgres (via `pg`) + **Supabase Auth** (`@supabase/ssr`, cookie sessions, RLS)
- **Fonts:** Fraunces (display), Geist (body) — loaded in `app/layout.tsx`

Commands: `npm run dev` · `npm run build` · `npm run lint`

---

## Structure

```
app/
  page.tsx, about/, contact/, services/   # marketing routes
  _pricing/          # hidden route — see "Hidden for now" below
  login/, signup/, portal/, admin/, auth/{confirm,callback}/  # auth routes
  components/      # UI, layout, sections + motion primitives
  lib/content.ts   # site config, services, pricing, copy data
  lib/images.ts    # curated Unsplash URLs (used as CSS background-image)
  lib/db.ts        # Postgres pool (pg) — contact write, admin reads
  lib/supabase/    # @supabase/ssr browser/server/admin clients, guards, session helper
  globals.css      # brand tokens, easing/animation tokens, base styles
proxy.ts           # (Next 16 middleware) refreshes session + gates /portal, /admin
```

- **Motion primitives** (client components, all reduced-motion safe):
  `reveal.tsx` (scroll fade-up), `count-up.tsx` (stats), `clip-reveal.tsx`
  (image clip), `accordion.tsx` (FAQ), `back-to-top.tsx`.

- **Pages** compose section components; keep pages thin.
- **Copy + structured data** live in `app/lib/content.ts` — edit there, don't hardcode in components.
- **Reusable UI** (`Button`, `Card`, etc.) → `app/components/ui.tsx`.
- **Page sections** (Hero, Faq, etc.) → `app/components/sections.tsx`.
- **Server actions** → colocate with route (e.g. `app/contact/actions.ts`).


## Hidden for now (since 2026-08-20)

Pricing is hidden site-wide until the fee model is decided. Nothing was
deleted — every item is a comment-out or a reversible rename, so unhiding
means undoing exactly this list. Don't re-add pricing links or fee claims
elsewhere while this stands.

| What | Where | How it was hidden |
| --- | --- | --- |
| `/pricing` route | `app/pricing/` → `app/_pricing/` | Underscore-prefixed folders are private in the App Router, so the route no longer resolves. The page, `PricingTable` and `pricingTiers`/`pricingAddons` in `app/lib/content.ts` are untouched. |
| Header nav link | `app/components/site-header.tsx` (`secondaryLinks`) | Entry removed; restore `{ href: "/pricing", label: "Pricing" }`. Covers desktop nav and mobile menu — both render the same array. |
| Footer link | `app/components/site-footer.tsx` (`firmLinks`) | Entry removed; restore `{ label: "Pricing", href: "/pricing" }`. |
| Sitemap URL | `app/sitemap.ts` | `"/pricing"` removed from `staticPages`. |
| Portal quick-link card | `app/portal/page.tsx` | "Plans & pricing" card removed. |
| Pricing FAQ | `app/components/sections.tsx` (`faqs`) | "How does your pricing work?" commented out in place. |
| Process step wording | `app/components/sections.tsx` (`steps`) | "Fixed-fee proposal" / "Clear scope, fixed monthly fee. No surprises." → "Written proposal" / "Clear scope, agreed upfront. No surprises."; original in a comment. |
| Contact next-steps bullet | `app/contact/page.tsx` (`nextSteps`) | "A fixed-fee proposal in writing" reworded to drop the fee claim; original in a comment. |

Whenever anything else gets hidden rather than deleted, add a row here.


## Conventions

- Functional React components; default exports for pages/layouts.
- Tailwind utility classes only — use brand tokens (`canvas`, `surface`, `ink`, `ink-body`, `muted`, `primary-*`, `secondary-*`, `navy-*`), not arbitrary hex in components.
- Display headings: `font-display`; body: default `font-sans`.
- Preserve accessibility: skip link, semantic HTML, focus states.
- SEO: use `metadata` exports on pages; site URL + defaults in `app/layout.tsx`.
- Minimize scope — match existing patterns; no refactor of unrelated files.
- No new dependencies unless task clearly needs them.

### Motion & imagery

- Animate with **Framer Motion** (`motion/react`) — never hand-rolled
  IntersectionObserver. Reuse primitives in `app/components/` before adding new.
- Animate `transform` / `opacity` only; custom ease-out is `ease-snappy`
  token (`cubic-bezier(0.23,1,0.32,1)`); UI ≤300ms, reveals ~600–900ms.
- Every motion respects `prefers-reduced-motion` (drop movement, keep content);
  SSR renders final/visible state for SEO + JS-off.
- **`transform` on ancestor breaks `position: sticky` on descendants** — never
  wrap sticky-aside grid in `Reveal` (or any transformed element).
- Header is **`sticky top-0` on `<header>` element itself** (not inner
  div — inner sticky child fills short parent, can't stick).
- Photos = CSS `background-image` from `lib/images.ts` over gradient scrim
  (no `next/image` remote config); verify any new Unsplash URL returns 200.

### Auth & data

- **Auth = Supabase Auth via `@supabase/ssr`.** Browser client `lib/supabase/client.ts`,
  server client `lib/supabase/server.ts`, session refresh + route gating in `proxy.ts`
  (matcher = `/portal` + `/admin` only), guards in `lib/supabase/guards.ts`
  (`requireUser`, `requireAdmin`, `requireClient`, `getSessionUser`).
- **Roles** live in `public.profiles.role` (`client` | `admin`). The `handle_new_user`
  signup trigger is **single source of truth**: sets `role='admin'` only when
  email matches one hardcoded admin address (`fineanswer2025@gmail.com`,
  case-insensitive), else `client`. Holds for every sign-in path (password
  or Google OAuth); intentionally **no profile UPDATE policy**, so a
  client can't self-promote. Change admin by editing that email in the trigger
  (via migration/MCP).
- **Signup requires verified email ownership.** `app/signup/actions.ts` uses
  normal Supabase `signUp`, returns the form's "Check your email" state, and
  fails closed (signs out + removes the new user) if the dashboard's "Confirm
  email" setting is accidentally disabled. `/auth/confirm` verifies the OTP,
  establishes the session and claims matching guest enquiries. Never restore
  Admin API `email_confirm: true` signup.
- **Google OAuth** via `signInWithOAuth` → `/auth/callback` exchanges PKCE
  code. OAuth users get `client` profile from same trigger. Provider
  enabled in Supabase dashboard (not via code/MCP). `redirectTo` =
  `window.location.origin/auth/callback` (adapts per host). Google's authorized
  redirect URI is the **Supabase** callback (`https://<ref>.supabase.co/auth/v1/callback`),
  not app URL. Supabase **Auth → URL Configuration** must allow-list both
  prod URL (`https://ca-farm.vercel.app/auth/callback`) and local
  (`http://localhost:3000/**` — note **http**). Consent screen is External: add
  test users or Publish.
- **Role in JWT:** `custom_access_token_hook` (DB function) stamps a `user_role`
  claim from `profiles`; enable "Customize Access Token (JWT) Claims" hook in
  dashboard to activate. `getSessionUser` prefers that claim, falls back to
  `profiles` lookup when absent — so header needs no per-request DB query once
  hook on.
- **Role lookups for redirect/gating use `pg`** (login action, `/auth/callback`,
  `requireAdmin`) — reading `profiles.role` via Supabase client right after
  sign-in is unreliable (RLS + session timing), so query `pg` pool by user id.
- **Enquiry ownership uses `enquiries.user_id` exclusively in the portal.**
  Matching guest enquiries by email is allowed only in
  `claimVerifiedGuestEnquiries`, called immediately after a successful email
  confirmation or Google OAuth exchange. Never add an email fallback to portal
  reads/actions: an unproved address is not an ownership boundary.
- **Header auth read SERVER-SIDE**: root layout calls `getSessionUser()`
  (local `getClaims`, no network) and passes `user` (email/name/avatar/role) to
  `<SiteHeader>`; logout is the **server action** in `app/auth/actions.ts` (clears
  cookie server-side). Do **not** read session in browser for header
  — SSR cookie not reliably readable client-side. `/admin` and `/portal` render
  own shells (sidebar + topbar); `ChromeGate` hides public header/footer there.
- **Two data paths by design:** `lib/db.ts` (`pg`) for contact write, admin
  enquiries read, all role lookups; `supabase-js` for auth/session.
- **RLS deny-all is intentional on 11 tables** — `enquiries`,
  `enquiry_messages`, `rate_audit`, `calculator_settings`, `cgt_settings`,
  `cgt_multipliers`, `mortgage_settings`, `mortgage_products`, `tax_rates`,
  `request_rate_limits`, `toolkit_resources` all keep **RLS enabled with no policy**: the
  public Supabase API (anon/`authenticated`) is denied; the server reaches them
  via the `pg` owner connection, which **bypasses RLS**. The security advisor's
  `rls_enabled_no_policy` INFO on these is **expected, not a bug** — leave it.
  **Never add a permissive policy** (e.g. `using (true)`) to silence it: on
  `enquiries` that leaks customer PII, on the rate/settings tables it lets the
  public API tamper with tax rates. Each table carries a `comment on table`
  spelling this out. Only add a policy if a specific read moves to client-side
  `supabase-js`, and then scope it read-only to that need.
- **Secrets** live in `.env.local` locally — `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`** (server-only,
  never `NEXT_PUBLIC`), and the `SMTP_*` / `MAIL_*` keys. Same keys set in **Vercel**
  project env for prod. Never echo or commit them. Run Supabase security advisors
  after any DDL.
- **Security headers** set in `next.config.ts` (`headers()`, all routes): CSP, HSTS
  (prod), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy. CSP allows
  `'unsafe-inline'` (no nonce yet) and dev-only `'unsafe-eval'` + localhost ws; it
  allow-lists Supabase (`connect-src`) and Google avatar / Unsplash image hosts.

### Editable calculator rates (CGT, VAT, Corp Tax, R&D, Capital Allowances, CAT)

- Six calculators (`ireland-cgt`, `ireland-vat`, `ireland-corporation-tax`,
  `ireland-rd-tax-credit`, `ireland-capital-allowances`, `ireland-cat`) share one
  **DB-first-with-code-fallback** pattern so an admin updates rates after a
  Budget with no redeploy:
  - Each calculator's maths + rates live in a pure `app/lib/ireland-<x>.ts`
    (`*_CONFIG_DEFAULT` is the code fallback, `parse<X>Config` validates a
    stored blob) — no React/IO, unit-tested.
  - `app/lib/<x>-data.ts` wraps the shared `getCalculatorConfig` (from
    `app/lib/calculator-settings.ts`) to read one JSONB row per calculator from
    `calculator_settings` (key = calculator slug); falls back to the code
    default on a missing row, invalid value, or DB error — never throws, never
    renders broken numbers.
  - `app/admin/<x>-rates/{page,actions,‑manager}.tsx` is a **two-phase**
    preview→confirm editor: phase 1 validates (`app/lib/<x>-guardrails.ts`) and
    returns a diff (`app/lib/rate-diff.ts`); phase 2 re-parses the previewed
    payload and writes via `saveCalculatorConfig`, then logs to `rate_audit`
    (`app/lib/rate-audit.ts`, area `<x>-settings`). `requireAdmin` re-checked on
    both phases.
  - `app/lib/editable-calculators.ts` registers each calculator (label, admin
    href, reviewed-at loader) so the admin dashboard's review-reminder + nav
    badge cover all six.
  - CGT is the one exception with extra state: it also keeps a
    `cgt_multipliers` table (indexation multipliers) alongside `cgt_settings`.
  - Adding a **new** editable calculator = clone this file set (cheapest
    reference: `ireland-cat.ts` + `cat-data.ts` + `admin/cat-rates/*`, added
    2026-07) — do not invent a new storage shape.

### Outbound email (SMTP)

- **EmailJS is gone.** Both emails the site sends now go over plain SMTP through
  `app/lib/mailer.ts` (nodemailer). `sendMail` is best-effort: it returns `false`
  and logs on a missing config or a refused send, and never throws, so a mail
  problem can never take down the database write that preceded it. It is
  server-only. The `EmailJs_*` env vars are dead and can be deleted.
- Config is `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`, plus optional
  `MAIL_FROM` and `MAIL_REPLY_TO` (both default to `SMTP_USER`). With none set,
  sending is a logged no-op and the app still works. Verified end to end
  2026-09-10 against Zoho: **`smtp.zoho.com:465`**, sending as
  `info@aibncharteredaccountants.ie`, authenticating with a 12-character Zoho
  app password. **`smtppro.zoho.com` returns `554 5.7.8 Access Restricted` for
  this account** on 465 and 587 despite being what Zoho's docs recommend for
  custom domains: do not "fix" the host to smtppro.
- Both email bodies are composed in this repo, so their layout is reviewable and
  changes in a commit: `app/lib/reply-email.ts` (admin reply to a client) and
  `app/lib/enquiry-email.ts` (new-enquiry notification to the firm). Email
  clients are hostile: tables for structure, inline styles only, no `<style>`
  blocks, 600px width. Every interpolated value goes through `escapeHtml`, and
  every message ships a plain-text alternative (its absence is a spam signal).
- **Admin replies**: `app/admin/enquiries/actions.ts` posts the reply into the
  thread, then emails the client under `after()` so the send never blocks the UI.
  Recipient is `coalesce(profiles.email, enquiries.email)`, so an enquiry owned
  by an account goes to the address that account logs in with, and a guest
  enquiry falls back to the address typed on the form.
- The reply email is **greeting + the admin's text + firm name, and nothing
  else**: no quoted enquiry, no portal link, no timestamp. That is a product
  decision, not an oversight (asked and confirmed 2026-09-10). Do not "helpfully"
  append context to it.
- **Enquiry notifications**: `app/contact/actions.ts` saves the row, then mails
  `site.enquiryInbox` (in `app/lib/content.ts`) under `after()`, with the
  enquirer as `replyTo` so hitting reply answers the customer. Note that
  `site.email` (published on the site) and `site.enquiryInbox` (where alerts
  land) are deliberately different values.
- Historical trap, now fixed: the old EmailJS template's "To email" field read
  `{{email}}`, which `app/contact/actions.ts` filled with the ENQUIRER's address,
  so notifications were addressed to the person submitting the form rather than
  to the firm. Nothing surfaced it because the send returned 200 and the failure
  path only logged. Moving to SMTP removed the class of bug: the recipient is now
  an argument in code, not a dashboard field.
- The reply email is a copy, not a channel: nothing parses inbound mail, so a
  client replying from their mail app reaches the mailbox but not the thread.
  Two-way would need an inbound provider writing a `sender = 'client'` row.
- Public signup and contact submissions use DB-backed fixed-window throttling
  from `app/lib/rate-limit.ts` (per IP + per normalised email). Only SHA-256
  identifiers are stored in `request_rate_limits`; never store raw IP/email
  throttle keys or replace this with per-process memory on serverless.
- `app/components/contact-form.tsx` is a 3-step wizard (topic → enquiry →
  details) but posts as **one native form**: every step's `<fieldset>` stays
  mounted and toggles via the `hidden` attribute, never conditional render —
  FormData only serialises mounted inputs, so unmounting a step would silently
  drop its fields from the submit. If you add a step, keep this mount-all/
  hide-inactive shape.

### Founders Hub (`/toolkits`)

- **The site never hosts a file.** No upload form, no storage bucket, no public
  download link — for memos, templates, tax/VAT forms, setup guides or anything
  else. This is a product decision, not a missing feature: do not add an upload
  path, a Supabase Storage bucket or a direct download link back.
- The catalogue **is** `app/lib/toolkit-content.ts` (a pure module, no DB).
  Adding a resource = adding an entry there. `toolkit-types.ts` holds the
  categories and the title→slug helper both the browser and the request route
  use.
- Fulfilment is manual: visitor requests on `/toolkits/request/[slug]` →
  row in `toolkit_requests` → a team member emails the file from their own
  mailbox via `/admin/toolkits` → **Mark sent**
  (`app/admin/toolkits/request-status-button.tsx`, which shows a pending
  spinner and a confirmation so the click is never silent).
- `toolkit_resources` and `toolkit_requests.resource_id` are **legacy**: kept
  for existing rows, read and written by nothing.

### Testing

- E2E via **Playwright** lives in `/e2e` (gitignored, installed `--no-save` — not a
  project dependency). Run: `npx playwright test --config e2e/playwright.config.ts`
  (spins up prod server on `:3100`). Specs: `site.spec.ts` (marketing pages,
  auth gating, login/signup/logout, role routing), `calculators.spec.ts` +
  `cgt.spec.ts` (public calculators + admin rate editors), `contact-wizard.spec.ts`
  (wizard steps, FAQ hints, validation). Creates `pw-*@example.com` users/enquiries —
  clean up via Supabase MCP after a run.

---

## Collaboration & merge conflicts

Two contributors work in parallel on personal branches (`niaz`, `nidan`) that
both merge into `main`. Two rules keep them from colliding:

**Area ownership** — route work to the owner instead of both editing one file:

| Area | Owner (branch) |
|------|----------------|
| `/admin/**` (dashboard, enquiries inbox, rate editors) | Niaz (`niaz`) |
| `/portal/**` (client dashboard, settings) | Nidan (`nidan`) |
| Shared components (`app/components/dashboard-*.tsx`), `db/schema.sql`, marketing pages | Either — pull `main` immediately before touching, keep the change additive |

If a task needs a change in the other person's area, prefer a small PR against
their branch (or a chat ping) over editing it on your own branch.

**Resolving conflicts — compose, don't pick a side.** Past incident (PRs #13/#14):
a portal conflict was resolved by taking one branch's whole file, which silently
reverted the other side's redesign to `main` and a second, duplicate fix-PR
followed. The rule since:

- A conflict between a data-layer change and a presentation change is almost
  never either/or — produce the file both authors would have written together
  (e.g. new query **under** new UI).
- Never resolve with `--ours`/`--theirs` on a file the other side rewrote for a
  different reason; diff both sides against the merge-base first and list what
  each adds.
- Appended-list conflicts (icon maps, nav arrays) are always resolved as the
  union of both sides.
- After resolving: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
  must pass before pushing, and say in the merge-commit body which side won where
  and why.

---

## When to update this file

**You do NOT need to update `AGENTS.md` before every prompt.**

| Situation | Update AGENTS.md? | What to do instead |
|-----------|-------------------|-------------------|
| Starting a new feature | **No** | Describe feature in chat prompt |
| One feature done, starting another | **No** | New prompt with next task; Agent reads codebase |
| One-off task ("fix this button") | **No** | Just ask in chat |
| Agent keeps making same mistake | **Yes** | Add rule so it stops |
| New permanent convention (e.g. all forms use X) | **Yes** | Document here |
| Architecture or stack change | **Yes** | Update relevant sections |

**Rule of thumb:** `AGENTS.md` = things true for *all* future work. Chat prompt = what you want *right now*.

---

## Skills (optional)

Repo has design skills under `.claude/skills/` (UI, banners, design system). Use when task involves visual design or new marketing assets — not required for routine code changes.
