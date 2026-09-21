This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Parked work and pending setup

Things that are built but not finished, so they are not lost.

### 1. Founders Hub "Request a copy" — how it works

Requesting a resource is a **manual fulfilment** flow. Nothing is emailed
automatically, and there is no email provider wired into the app.

1. A visitor clicks "Request a copy" on `/toolkits` and lands on
   `/toolkits/request/[slug]`.
2. They submit name, phone, organisation email and what they need it for. The
   request is stored in `toolkit_requests` and they see a confirmation dialog.
3. A team member opens `/admin/toolkits`, reads the request, emails the file
   from their own mailbox, and clicks **Mark sent**.

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
