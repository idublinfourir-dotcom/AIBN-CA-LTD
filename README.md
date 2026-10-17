# AIBN Chartered Accountants Ltd

Website and client system for AIBN Chartered Accountants Ltd, live at
<https://www.aibncharteredaccountants.ie> (Vercel; every merge to `main`
deploys to production).

- Marketing site: home, about, services, contact.
- Free Irish tax calculators under `/tools/*`, plus a mortgage calculator and
  investment planner under `/personal/*`.
- Client portal (`/portal`): enquiries and a chat thread with the firm.
- Admin console (`/admin`): enquiries inbox, Founders Hub requests, and rate
  editors for every calculator.
- Founders Hub (`/toolkits`): request a document; the team emails it by hand.

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase
(Auth + Postgres), SMTP via nodemailer.

## Getting started

Needs Node 22 and a `.env.local` with the keys listed in `AGENTS.md`
(Supabase, `DATABASE_URL`, `SMTP_*`). Dev and production share one database
and one mailbox, so set `FIRM_NOTIFY_TO` to your own address before testing
forms locally.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test           # unit tests in app/lib/*.test.ts
npm run build
```

Architecture, conventions and the reasoning behind the non-obvious choices
are in **`AGENTS.md`**. Read it before changing auth, email, the database or
the calculators.

## Parked work and pending setup

Things that are built but not finished, so they are not lost.

### 1. Founders Hub "Request a copy" — how it works

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
Two earlier versions were removed — automated email (Resend, signed links) and
admin file upload (Supabase Storage) — so do not add either back without
agreeing it first. `toolkit_resources` stays in the database only for its
existing rows; nothing reads or writes it.

### 2. Founders Hub documents — 4 of 27 drafted, not in the repo

Four Irish tax memos were drafted from Revenue, gov.ie, DSP and CRO sources and
fact-checked figure by figure (three critical errors were found and corrected).
The generated PDFs are **not kept in this repo** — they live wherever the team
keeps them and get attached to an email by hand.

Still to produce: 11 templates, 4 tax forms, 3 VAT forms and 5 setup guides.
Every card on `/toolkits` comes from `app/lib/toolkit-content.ts`; adding a
resource means adding an entry there.

Any of these documents needs partner review before it goes to a client: they
carry the firm's name and were not written by a person.
