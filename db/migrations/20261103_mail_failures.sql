begin;

-- The failure log behind the admin's email warning (app/lib/mail-failures.ts).
--
-- From launch until 3 Nov 2026 the live site had no SMTP settings. Enquiries
-- saved, so /admin looked healthy, but no alert, acknowledgement, reply,
-- signup link or reset code was ever sent, and the only trace was a log line
-- that Vercel keeps for an hour. Now every skipped or refused send writes a
-- row here, and /admin shows the open ones until the admin dismisses them.
--
-- No recipient, subject or body is stored: `kind` says what the email was,
-- `admin_href` points at the enquiry that holds the rest, and `detail` is the
-- server's reply with every address replaced (describeSmtpError).
-- `environment` is VERCEL_ENV or 'local': dev, preview and production share
-- this database, and each deployment shows only its own failures.
--
-- Additive and safe to apply before the code ships: nothing reads or writes
-- the table until then, and the code treats a missing table as "no failures".
--
-- Apply with: node scripts/db-migrate.mjs db/migrations/20261103_mail_failures.sql

create table if not exists mail_failures (
  id           bigint generated always as identity primary key,
  kind         text not null,
  reason       text not null,
  detail       text,
  admin_href   text,
  environment  text not null,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists mail_failures_open_idx
  on mail_failures (environment, created_at desc)
  where dismissed_at is null;

-- Same public API boundary as every application table (see db/schema.sql).
alter table public.mail_failures enable row level security;

comment on table public.mail_failures is
  'Server-only log of emails the site failed to send (no addresses or bodies). RLS deny-all is intentional; pg owner access bypasses RLS.';

commit;
