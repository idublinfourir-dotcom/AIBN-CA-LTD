# AIBN Chartered Accountants Ltd

Website and client system for **AIBN Chartered Accountants Ltd**, a
partner-led chartered accountancy practice in Ireland.

Live at <https://www.aibncharteredaccountants.ie> (Vercel). Every merge to
`main` deploys to production.

> **Working on this repo?** Read **[`AGENTS.md`](AGENTS.md)** first. It holds
> the conventions and the reasoning behind every non-obvious choice (auth,
> email, database access, calculators). This README is the overview.

## What it does

| Area | Routes | What it is |
| --- | --- | --- |
| Marketing site | `/`, `/about`, `/services/...`, `/contact` | Firm pages and a 3-step enquiry form |
| Accountants Hub | `/tools/ireland-*` | Free Irish tax calculators: income tax, CGT, VAT, corporation tax, R&D tax credit, capital allowances, CAT |
| Personal Hub | `/personal/mortgage`, `/personal/investment` | Mortgage comparison and investment planner |
| Founders Hub | `/toolkits` | Catalogue of memos, templates and guides; visitors request a copy and the team emails it by hand |
| Client portal | `/portal` | A signed-in client's enquiries, each with a chat thread with the firm; account settings |
| Admin console | `/admin` | Enquiries inbox (replies can also be emailed), Founders Hub requests, and rate editors for every calculator |
| Accounts | `/login`, `/signup`, `/forgot-password` | Email and password, or Google |

Pricing (`app/_pricing/`) is hidden until the fee model is decided. See
"Hidden for now" in `AGENTS.md` for how to bring it back.

## Tech stack

- **Next.js 16** (App Router, server actions) with **React 19** and **TypeScript**
- **Tailwind CSS v4**, brand tokens in `app/globals.css`
- **Motion** (`motion/react`) for scroll reveals and small UI animation
- **Supabase**: Auth (`@supabase/ssr`, cookie sessions) and Postgres
- **pg** for all database reads and writes (server-side only)
- **nodemailer** over SMTP (Zoho) for every email the site sends

## Getting started

Needs **Node 22 or newer** (the unit tests use `--experimental-strip-types`).

```bash
npm install
# create .env.local (see below)
npm run dev          # http://localhost:3000
```

### Environment variables

Put these in `.env.local`, which is gitignored. Production has the same keys
in the Vercel project settings. Never commit values or paste them anywhere.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Supabase pooler) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only. Signup and password reset use the Admin API |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | for email | Outbound SMTP. Without them the site still works and skips email |
| `MAIL_FROM`, `MAIL_REPLY_TO` | no | Default to `SMTP_USER` |
| `FIRM_NOTIFY_TO` | no | Where firm alerts go. Defaults to the Reply-To mailbox |
| `SITE_URL` | no | Override the host used in emailed links (e.g. a staging site) |

> **Local development uses the real database and the real mailbox.** Set
> `FIRM_NOTIFY_TO` to your own address before testing forms, or the firm's
> inbox gets your test alerts. Signing up locally sends a real confirmation
> email.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (`app/lib/*.test.ts`, Node's built-in test runner) |

CI (`.github/workflows/ci.yml`) runs lint, typecheck and unit tests on every
push and pull request.

## Project structure

```
app/
  page.tsx, about/, contact/, services/   marketing pages
  tools/, personal/, toolkits/            calculators and Founders Hub
  login/, signup/, forgot-password/, auth/   accounts and auth callbacks
  portal/                                 client area
  admin/                                  admin console and rate editors
  components/                             UI, page sections, calculators, motion
  lib/                                    pure logic (tax maths, validation,
                                          email templates) with *.test.ts beside it,
                                          plus db.ts, mailer.ts, supabase/ helpers
db/
  schema.sql                              the whole schema, safe to re-run
  migrations/                             one-off changes applied on top
scripts/                                  database helper scripts
proxy.ts                                  session refresh and gating for /portal, /admin
next.config.ts                            security headers and redirects
```

Copy and structured content live in `app/lib/content.ts`; edit there, not in
components.

## How the main pieces work

Short version; `AGENTS.md` has the detail and the reasons.

- **Roles.** Every account is a `client` except one hardcoded admin address,
  set in the `handle_new_user` trigger in `db/schema.sql`. There is no way to
  promote yourself. `/admin` and `/portal` check the role from the database on
  every page and every action.
- **Data access.** The app talks to Postgres directly through `pg` as the
  table owner. Supabase's public Data API is not used: every table has
  row-level security on and no policy, so the public API can read nothing.
  This is deliberate.
- **Email.** Signup confirmations, password-reset codes, enquiry
  acknowledgements, admin replies and firm alerts are all built in this repo
  (`app/lib/*-email.ts`, sharing `email-layout.ts`) and sent over SMTP. Sends
  never block the page, and a failed send never loses the saved data.
- **Signup and password reset.** Supabase creates the token; this app emails
  it. Password reset uses a typed code rather than a link.
- **Calculator rates.** Each calculator has its rates in code as a default,
  and an admin can override them after a Budget from `/admin/*-rates`
  without a redeploy. Changes are previewed as a diff, then confirmed, and
  logged to `rate_audit`.
- **Abuse limits.** Every public form (contact, signup, password reset,
  Founders Hub requests) is throttled per IP and per email address
  (`app/lib/rate-limit.ts`). Only hashes are stored.

## Testing

**Unit tests:** `npm test`. Covers the tax maths, rate validation, email
templates and other pure logic in `app/lib/`.

**End-to-end tests:** Playwright, in `e2e/`. The folder is gitignored and
Playwright is not a project dependency, so it lives on the machine that runs
it:

```bash
npm install --no-save playwright@1.63.0 @playwright/test@1.63.0
npm run build
npx playwright test --config e2e/playwright.config.ts
```

The config starts a local SMTP sink on `:2525` and the production server on
`:3100`, so no test email leaves the machine. The tests do use the real
database: most specs create and delete their own `pw-*@example.com` users,
but `contact-wizard.spec.ts` leaves `pw-wizard@example.com` enquiries to
clean up afterwards. Note that `npm install` removes Playwright again.

## Deployment

- Hosted on **Vercel** (project `aibn-ca-ltd`). `aibncharteredaccountants.ie`
  redirects to the `www` host.
- A push to any branch or PR gets a Preview deployment. Preview URLs sit
  behind Vercel login.
- **A merge to `main` goes straight to production.** Merge only after CI
  passes.
- To confirm a change is live, look for it on the live domain itself rather
  than trusting the deployment list.

## Database

- `db/schema.sql` describes the whole schema and can be re-run safely. Files
  in `db/migrations/` are one-off changes applied on top.
- Apply either with `node scripts/db-migrate.mjs [db/migrations/<file>.sql]`
  (no argument applies `schema.sql`). It uses `DATABASE_URL` from
  `.env.local`, which is the **production** database.
- `scripts/db-check.mjs` is a connection check. `scripts/db-roundtrip.mjs`
  creates a `connection_test` table and writes to it: do not run it against
  production.
- After any schema change, run Supabase's security advisors. Their
  "RLS enabled, no policy" notices on the app's tables are expected.
- **Do not add `grant` statements for `anon`, `authenticated` or
  `service_role`**, even though Supabase's October 2026 notice suggests it
  for new tables. The app never uses the Data API, so those grants would only
  open data to the public API. See "Table grants and the Data API" in
  `AGENTS.md`, which also records one known gap between `schema.sql` and the
  live database.

## Security

- Security headers on every route (`next.config.ts`): Content Security
  Policy, HSTS, frame blocking, nosniff, referrer and permissions policies.
- All customer data is server-only: no table is reachable through Supabase's
  public API.
- Form errors from Supabase are logged, never shown, and login answers the
  same way for a wrong password and an unknown address.
- Any `next=` redirect goes through `safeNextPath`
  (`app/lib/safe-redirect.ts`), which keeps it on this site.
  Before 17 October 2026, a crafted link such as `/login?next=/\evil.example`
  could send a client to another website straight after they signed in. That
  is fixed and verified on the live site; do not replace the helper with a
  simple "starts with /" check.
- Secrets live only in `.env.local` and Vercel. `SUPABASE_SERVICE_ROLE_KEY`
  must never get a `NEXT_PUBLIC_` prefix.

## Working together

Two people work on personal branches (`niaz`, `nidan`) that merge into `main`
through pull requests. `/admin/**` belongs to Niaz and `/portal/**` to Nidan;
shared files need a fresh pull from `main` before editing. Before pushing a
merge, `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build`
must pass. Conflict rules are in `AGENTS.md`.

## Parked work and pending setup

Things that are built but not finished, so they are not lost.

### 1. Founders Hub "Request a copy": how it works

Requesting a resource is a **manual fulfilment** flow. The firm gets an alert
email for each request, but the document itself is never emailed
automatically.

1. A visitor clicks "Request a copy" on `/toolkits` and lands on
   `/toolkits/request/[slug]`.
2. They submit name, phone, organisation email and what they need it for. The
   request is stored in `toolkit_requests`, they see a confirmation dialog, and
   the firm's inbox gets a "Founders Hub request" alert.
3. A team member emails the file from their own mailbox, then opens
   `/admin/toolkits` and clicks **Mark sent**.

Outstanding requests sort to the top and the heading shows a "to send" count.
Mark sent shows a spinner and then a confirmation, so the click is never
silent. Abuse is bounded by the shared throttle in `app/lib/rate-limit.ts`:
five an hour per email address, and fifteen an hour per IP so the cap cannot be
sidestepped by varying the address.

**There is no upload path, deliberately.** The site never hosts a Founders Hub
file: no upload form, no storage bucket, no public download link. The catalogue
on `/toolkits` is `app/lib/toolkit-content.ts` and every copy goes out by hand.
Two earlier versions were removed (automated email with Resend and signed
links, and admin file upload to Supabase Storage), so do not add either back
without agreeing it first. `toolkit_resources` stays in the database only for
its existing rows; nothing reads or writes it.

### 2. Founders Hub documents: 4 of 27 drafted, not in the repo

Four Irish tax memos were drafted from Revenue, gov.ie, DSP and CRO sources and
fact-checked figure by figure (three critical errors were found and corrected).
The generated PDFs are **not kept in this repo**: they live wherever the team
keeps them and get attached to an email by hand.

Still to produce: 11 templates, 4 tax forms, 3 VAT forms and 5 setup guides.
Every card on `/toolkits` comes from `app/lib/toolkit-content.ts`; adding a
resource means adding an entry there.

Any of these documents needs partner review before it goes to a client: they
carry the firm's name and were not written by a person.

### 3. Schema file does not fully match the live database

The live database had its public-API access removed by hand, and has one grant
the JWT role hook needs. Neither is in `db/schema.sql`, so a fresh environment
built from it differs from production. Details and the fix are under "Table
grants and the Data API" in `AGENTS.md`.
