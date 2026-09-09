-- Contact form submissions ("UserCollection" in Mongo terms = a table here).
-- Re-runnable: "if not exists" means running the migration twice is safe.
create table if not exists enquiries (
  id          bigint generated always as identity primary key,
  name        text        not null,
  email       text        not null,
  company     text,
  service     text,
  message     text        not null,
  created_at  timestamptz not null default now()
);

-- Speeds up "newest first" listing in the dashboard / admin.
create index if not exists enquiries_created_at_idx on enquiries (created_at desc);

-- Triage state for the admin inbox: new → in_progress → resolved.
-- "if not exists" keeps the migration re-runnable on databases created
-- before the column was introduced.
alter table enquiries add column if not exists status text not null default 'new'
  check (status in ('new', 'in_progress', 'resolved'));

-- Links an enquiry to the client account that owns it (null for guest/
-- pre-signup submissions). A verified auth callback may claim matching guest
-- rows; portal reads and writes use this id exclusively.
alter table enquiries add column if not exists user_id uuid;

-- Chat read tracking: when each side last opened the thread. A thread is
-- "unread" for a side when the other side has posted since this timestamp
-- (null = never opened → unread). Replaces the old new/in_progress/resolved
-- triage as the inbox signal.
alter table enquiries add column if not exists admin_last_read_at  timestamptz;
alter table enquiries add column if not exists client_last_read_at timestamptz;

-- ── Enquiry chat ────────────────────────────────────────────────────────────
-- Two-way conversation on an enquiry: the client (portal) and admin (inbox)
-- exchange messages, all stored here. The enquiry's original `message` column
-- is the first line of the thread; every reply after that is a row below.
create table if not exists enquiry_messages (
  id             bigint generated always as identity primary key,
  enquiry_id     bigint not null references enquiries (id) on delete cascade,
  -- Which side wrote it. 'client' shows left in the portal / right in admin.
  sender         text not null check (sender in ('admin', 'client')),
  -- The auth user who sent it (null tolerated for older/guest rows).
  sender_user_id uuid,
  body           text not null constraint enquiry_messages_body_length_check
                   check (char_length(body) <= 4000),
  created_at     timestamptz not null default now()
);

-- Thread read in chronological order, scoped to one enquiry.
create index if not exists enquiry_messages_thread_idx
  on enquiry_messages (enquiry_id, created_at asc);

-- Upgrade path: enforce the cap for new writes without rejecting a migration
-- because of any oversized historical row.
do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.enquiry_messages'::regclass
       and conname = 'enquiry_messages_body_length_check'
  ) then
    alter table public.enquiry_messages
      add constraint enquiry_messages_body_length_check
      check (char_length(body) <= 4000) not valid;
  end if;
end $$;

-- ── Ireland mortgage comparison ─────────────────────────────────────────────
-- Lender rate products shown on /tools/ireland, editable in /admin/mortgage-rates
-- so a repricing never needs a code deploy. Seeded below only when empty.

create table if not exists mortgage_products (
  id           bigint generated always as identity primary key,
  lender       text not null,
  name         text not null,
  rate_type    text not null check (rate_type in
    ('variable','fixed-1','fixed-2','fixed-3','fixed-4','fixed-5','fixed-7','fixed-10','fixed-full')),
  rate_percent numeric(5,2) not null check (rate_percent >= 0 and rate_percent < 100),
  aprc_percent numeric(5,2) not null check (aprc_percent >= 0 and aprc_percent < 100),
  max_ltv      numeric(4,3) not null default 0.9 check (max_ltv > 0 and max_ltv <= 1),
  green        boolean not null default false,
  cashback     text,
  -- Variable rate the loan rolls to when the fixed period ends. Null → the
  -- product rate is quoted for the whole term (variables, full-term fixed).
  revert_rate_percent numeric(5,2) check (revert_rate_percent > 0 and revert_rate_percent < 100),
  -- Structured cashback: % of the loan at drawdown and/or a flat € amount.
  -- The free-text `cashback` column stays as the badge/narrative.
  cashback_percent    numeric(5,2) check (cashback_percent > 0 and cashback_percent < 100),
  cashback_flat       numeric(10,2) check (cashback_flat > 0),
  -- Longer offer description shown in the calculator's per-product details.
  details      text,
  -- Which buyer types may use the product: first-time / trading-up / switch / investment.
  audience     text[] not null default '{first-time,trading-up,switch}',
  active       boolean not null default true,
  updated_at   timestamptz not null default now()
);

-- Upgrade path for databases created before the revert-rate / cashback fields.
alter table mortgage_products add column if not exists revert_rate_percent numeric(5,2) check (revert_rate_percent > 0 and revert_rate_percent < 100);
alter table mortgage_products add column if not exists cashback_percent    numeric(5,2) check (cashback_percent > 0 and cashback_percent < 100);
alter table mortgage_products add column if not exists cashback_flat       numeric(10,2) check (cashback_flat > 0);
alter table mortgage_products add column if not exists details             text;

-- Allow 1-year fixed products (constraint predates the fixed-1 rate type).
alter table mortgage_products drop constraint if exists mortgage_products_rate_type_check;
alter table mortgage_products add constraint mortgage_products_rate_type_check check (rate_type in
  ('variable','fixed-1','fixed-2','fixed-3','fixed-4','fixed-5','fixed-7','fixed-10','fixed-full'));

-- Central Bank policy numbers + the "rates as of" label. Single row (id = 1).
create table if not exists mortgage_settings (
  id                  smallint primary key default 1 check (id = 1),
  rates_as_of         text not null,
  lti_first_time      numeric(4,2) not null default 4.0,
  lti_trading_up      numeric(4,2) not null default 3.5,
  max_ltv_owner       numeric(4,3) not null default 0.9,
  max_ltv_investment  numeric(4,3) not null default 0.7,
  max_age_at_end      int not null default 70,
  -- Longest term lenders offer: residential vs buy-to-let/investment.
  max_term_owner      int not null default 35,
  max_term_investment int not null default 25,
  updated_at          timestamptz not null default now()
);

-- Upgrade path for databases created before the per-type term caps existed.
alter table mortgage_settings add column if not exists max_term_owner      int not null default 35;
alter table mortgage_settings add column if not exists max_term_investment int not null default 25;

insert into mortgage_settings (id, rates_as_of)
values (1, 'July 2026')
on conflict (id) do nothing;

-- Seed the July 2026 snapshot, only when the table is empty (re-runnable).
-- revert = variable rate the fixed product rolls to; cb% = cashback % of loan.
insert into mortgage_products
  (lender, name, rate_type, rate_percent, aprc_percent, max_ltv, green, cashback, revert_rate_percent, cashback_percent, audience)
select * from (values
  ('Haven (AIB Group)', '4 Year Fixed',            'fixed-4',    3.20, 3.90, 0.9, true,  null::text,     3.95::numeric, null::numeric, '{first-time,trading-up,switch}'::text[]),
  ('AIB',               '5 Year Fixed',            'fixed-5',    3.25, 3.86, 0.9, true,  null,           3.75, null, '{first-time,trading-up,switch}'),
  ('Avant Money',       'Full-term Fixed',         'fixed-full', 3.40, 3.48, 0.9, false, '1% cashback',  null, 1,    '{first-time,trading-up,switch}'),
  ('Avant Money',       '4 Year Fixed',            'fixed-4',    3.40, 3.70, 0.9, false, '2% cashback',  3.85, 2,    '{first-time,trading-up,switch}'),
  ('Avant Money',       '3 Year Fixed',            'fixed-3',    3.60, 3.80, 0.9, false, null,           3.85, null, '{first-time,trading-up,switch}'),
  ('Avant Money',       '7 Year Fixed',            'fixed-7',    3.45, 3.60, 0.8, false, null,           3.85, null, '{first-time,trading-up,switch}'),
  ('Avant Money',       '10 Year Fixed',           'fixed-10',   3.50, 3.60, 0.8, false, null,           3.85, null, '{first-time,trading-up,switch}'),
  ('Bank of Ireland',   '2 Year Fixed',            'fixed-2',    3.65, 4.00, 0.9, false, '2% cashback',  4.15, 2,    '{first-time,trading-up,switch}'),
  ('Bank of Ireland',   '4 Year Fixed',            'fixed-4',    3.45, 3.90, 0.9, false, '2% cashback',  4.15, 2,    '{first-time,trading-up,switch}'),
  ('Bank of Ireland',   'Standard Variable',       'variable',   4.15, 4.30, 0.9, false, null,           null, null, '{first-time,trading-up,switch}'),
  ('PTSB',              '3 Year Fixed',            'fixed-3',    3.70, 4.10, 0.9, false, '2% cashback',  4.70, 2,    '{first-time,trading-up,switch}'),
  ('PTSB',              '5 Year Fixed',            'fixed-5',    3.60, 4.00, 0.9, false, '2% cashback',  4.70, 2,    '{first-time,trading-up,switch}'),
  ('AIB',               'Standard Variable',       'variable',   3.75, 3.90, 0.9, false, null,           null, null, '{first-time,trading-up,switch}'),
  ('Haven (AIB Group)', 'Variable',                'variable',   3.95, 4.10, 0.9, false, null,           null, null, '{first-time,trading-up,switch}'),
  ('ICS Mortgages',     '3 Year Fixed',            'fixed-3',    3.95, 4.20, 0.9, false, null,           4.30, null, '{first-time,trading-up,switch}'),
  ('ICS Mortgages',     'Buy-to-Let 5 Year Fixed', 'fixed-5',    4.55, 4.80, 0.7, false, null,           5.00, null, '{investment}'),
  ('Avant Money',       'Buy-to-Let Variable',     'variable',   4.75, 4.90, 0.7, false, null,           null, null, '{investment}'),
  ('Bank of Ireland',   'Buy-to-Let 2 Year Fixed', 'fixed-2',    4.65, 4.90, 0.7, false, null,           4.95, null, '{investment}')
) as seed(lender, name, rate_type, rate_percent, aprc_percent, max_ltv, green, cashback, revert_rate_percent, cashback_percent, audience)
where not exists (select 1 from mortgage_products);

-- Backfill revert/cashback for rows seeded before those fields existed.
-- Only touches nulls, so admin edits are never overwritten (re-runnable).
update mortgage_products p
   set revert_rate_percent = coalesce(p.revert_rate_percent, b.revert),
       cashback_percent    = coalesce(p.cashback_percent, b.cb)
  from (values
    ('Haven (AIB Group)', '4 Year Fixed',            3.95::numeric, null::numeric),
    ('AIB',               '5 Year Fixed',            3.75, null),
    ('Avant Money',       'Full-term Fixed',         null, 1),
    ('Avant Money',       '4 Year Fixed',            3.85, 2),
    ('Avant Money',       '3 Year Fixed',            3.85, null),
    ('Avant Money',       '7 Year Fixed',            3.85, null),
    ('Avant Money',       '10 Year Fixed',           3.85, null),
    ('Bank of Ireland',   '2 Year Fixed',            4.15, 2),
    ('Bank of Ireland',   '4 Year Fixed',            4.15, 2),
    ('PTSB',              '3 Year Fixed',            4.70, 2),
    ('PTSB',              '5 Year Fixed',            4.70, 2),
    ('ICS Mortgages',     '3 Year Fixed',            4.30, null),
    ('ICS Mortgages',     'Buy-to-Let 5 Year Fixed', 5.00, null),
    ('Bank of Ireland',   'Buy-to-Let 2 Year Fixed', 4.95, null)
  ) as b(lender, name, revert, cb)
 where p.lender = b.lender and p.name = b.name
   and (p.revert_rate_percent is null or p.cashback_percent is null);

-- ── Ireland income tax calculator rates ─────────────────────────────────────
-- One JSONB row per tax year holding the full YearRates config (income tax
-- bands/credits, USC, PRSI, pension relief), editable in /admin/tax-rates so
-- a Budget change never needs a deploy. The hardcoded RATES_<year> configs in
-- app/lib/ireland-income-tax.ts are the fallback when a row is missing or
-- fails validation. JSON has no Infinity: open-ended upper bounds (last USC
-- band, last pension age band) are stored as null.

create table if not exists tax_rates (
  year       smallint primary key,
  rates      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Shared editable calculator settings ─────────────────────────────────────
-- One nullable JSONB config per calculator. config may be null when an admin
-- has reviewed the code defaults without overriding them.

create table if not exists calculator_settings (
  key         text primary key,
  config      jsonb,
  reviewed_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- CGT has a singleton config plus an independently editable multiplier table.
create table if not exists cgt_settings (
  id          integer primary key default 1 check (id = 1),
  config      jsonb not null,
  updated_at  timestamptz not null default now(),
  reviewed_at timestamptz not null default now()
);

create table if not exists cgt_multipliers (
  year_key   text primary key,
  year_label text not null,
  sort_order integer not null,
  multiplier numeric not null,
  updated_at timestamptz not null default now()
);

-- Best-effort history for every admin rate change.
create table if not exists rate_audit (
  id         bigint generated always as identity primary key,
  area       text not null,
  action     text not null,
  summary    text,
  details    jsonb,
  changed_by text,
  changed_at timestamptz not null default now()
);

-- Shared, server-side fixed-window throttling for public actions. Identifiers
-- are SHA-256 hashes; raw email addresses and IPs are never stored.
create table if not exists request_rate_limits (
  action       text not null,
  key_hash     text not null,
  window_start timestamptz not null,
  count        integer not null default 1 check (count > 0),
  primary key (action, key_hash, window_start)
);

create index if not exists request_rate_limits_window_idx
  on request_rate_limits (window_start);

-- ── Auth: profiles, roles and the admin allow-list ──────────────────────────
-- Tracks what is live in Supabase (originally created in the dashboard SQL
-- editor). Re-runnable. One profile row per auth.users row; `role` drives the
-- /admin vs /portal split (see app/lib/supabase/guards.ts).

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Security-definer helper lives outside `public` so PostgREST never exposes it.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Users read their own profile; admins read all.
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (auth.uid() = id or private.is_admin());

-- The auth server needs to read roles when stamping JWT claims (token hook).
drop policy if exists auth_admin_read_roles on public.profiles;
create policy auth_admin_read_roles on public.profiles
  for select to supabase_auth_admin using (true);

-- Creates the profile row on signup. THE ADMIN EMAIL ALLOW-LIST LIVES HERE:
-- add an email to the `in (...)` list to make that account an admin from its
-- first login. Existing accounts instead need:
--   update public.profiles set role = 'admin' where lower(email) = '<email>';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when lower(new.email) = 'fineanswer2025@gmail.com'
         then 'admin' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reconcile the current and former allow-list addresses.
-- Existing JWTs may retain their old claim until refreshed, but every
-- privileged server guard reads the role from this table.
update public.profiles
   set role = case
     when lower(email) = 'fineanswer2025@gmail.com' then 'admin'
     else 'client'
   end
 where lower(email) in (
   'fineanswer2025@gmail.com',
   'idublinfourir@gmail.com'
 );

-- Stamps the `user_role` claim into every JWT so the app can authorise from
-- the locally-verified token. Must also be enabled in the Supabase dashboard:
-- Authentication → Hooks → Custom Access Token → this function.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path to ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_role text;
begin
  begin
    select role into v_role
      from public.profiles
     where id = (event ->> 'user_id')::uuid;
  exception when others then
    v_role := null;
  end;

  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'client')));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- ── Entrepreneur Toolkits (legacy, no longer written) ───────────────────────
-- The Founders Hub no longer hosts files: the catalogue lives in
-- app/lib/toolkit-content.ts and every copy is emailed by hand (see
-- toolkit_requests below). This table is kept only for the rows already in it
-- and for the toolkit_requests.resource_id foreign key; the app neither reads
-- nor writes it. Do not add an upload path back without agreeing it first.

create table if not exists toolkit_resources (
  id          bigint generated always as identity primary key,
  title       text not null,
  description text,
  category    text not null check (category in
    ('memo','template','tax-form','vat-form','guide','other')),
  file_url    text not null,
  -- Storage object path from the removed upload path; nothing writes it now.
  file_path   text,
  -- Original filename shown on the download button.
  file_name   text,
  -- Accounting framework badge (FRS 102 / FRS 101 / IFRS …); null when N/A.
  framework   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Upgrade path for databases created before the framework badge existed.
alter table toolkit_resources add column if not exists framework text;

create index if not exists toolkit_resources_category_idx
  on toolkit_resources (category, created_at desc);

-- ── Public API boundary ──────────────────────────────────────────────────────
-- Application data is server-only and reached through the pg owner connection.
-- RLS with no policy intentionally denies anon/authenticated PostgREST access.
alter table public.enquiries enable row level security;
alter table public.enquiry_messages enable row level security;
alter table public.mortgage_products enable row level security;
alter table public.mortgage_settings enable row level security;
alter table public.tax_rates enable row level security;
alter table public.calculator_settings enable row level security;
alter table public.cgt_settings enable row level security;
alter table public.cgt_multipliers enable row level security;
alter table public.rate_audit enable row level security;
alter table public.request_rate_limits enable row level security;
alter table public.toolkit_resources enable row level security;

comment on table public.enquiries is
  'Server-only customer enquiries. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.enquiry_messages is
  'Server-only customer conversation data. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.mortgage_products is
  'Server-managed calculator rates. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.mortgage_settings is
  'Server-managed calculator settings. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.tax_rates is
  'Server-managed calculator rates. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.calculator_settings is
  'Server-managed calculator settings. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.cgt_settings is
  'Server-managed CGT settings. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.cgt_multipliers is
  'Server-managed CGT multipliers. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.rate_audit is
  'Server-only rate change history. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.request_rate_limits is
  'Hashed server-side action throttles. RLS deny-all is intentional; pg owner access bypasses RLS.';
comment on table public.toolkit_resources is
  'Legacy toolkit metadata, no longer read or written by the app. RLS deny-all is intentional; pg owner access bypasses RLS.';

-- ── Founders Hub file requests ──────────────────────────────────────────────
-- Someone on /toolkits fills in the request form for a resource. Nothing is
-- sent automatically: a team member reads the request in /admin/toolkits and
-- emails the file over, then marks it sent. The log doubles as a lead list.

create table if not exists toolkit_requests (
  id          bigint generated always as identity primary key,
  -- Legacy column, always null on new rows: the catalogue has no ids and
  -- resource_title holds what the visitor actually asked for.
  resource_id bigint references toolkit_resources (id) on delete set null,
  resource_title text not null,
  name        text not null,
  phone       text not null,
  email       text not null,
  -- Requester's organisation website, stored with its scheme (https://…). The
  -- default only ever catches a deploy running older code (see the 20260731
  -- migration); the app always supplies a real value.
  website     text not null default '(not captured)',
  purpose     text not null,
  -- 'pending' until a team member has emailed the file, then 'sent'.
  status      text not null default 'pending' check (status in ('pending', 'sent')),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Upgrade path from the earlier auto-email version of this table, which had
-- (resource_id not null, email, status sent/failed, error) and no requester
-- details. Safe to re-run.
alter table toolkit_requests add column if not exists resource_title text;
alter table toolkit_requests add column if not exists name    text;
alter table toolkit_requests add column if not exists phone   text;
alter table toolkit_requests add column if not exists purpose text;
alter table toolkit_requests add column if not exists sent_at timestamptz;
alter table toolkit_requests add column if not exists website text not null default '(not captured)';
alter table toolkit_requests drop column if exists error;

do $$ begin
  -- resource_id becomes optional, and must survive its resource being deleted.
  alter table toolkit_requests alter column resource_id drop not null;
  alter table toolkit_requests drop constraint if exists toolkit_requests_resource_id_fkey;
  alter table toolkit_requests add constraint toolkit_requests_resource_id_fkey
    foreign key (resource_id) references toolkit_resources (id) on delete set null;
exception when others then
  raise notice 'toolkit_requests resource_id already relaxed: %', sqlerrm;
end $$;

-- Backfill the new NOT NULLs before enforcing them, so an existing row from the
-- old shape cannot block the migration.
update toolkit_requests set resource_title = coalesce(resource_title, '(unknown)') where resource_title is null;
update toolkit_requests set name    = coalesce(name, '(not captured)')    where name is null;
update toolkit_requests set phone   = coalesce(phone, '(not captured)')   where phone is null;
update toolkit_requests set purpose = coalesce(purpose, '(not captured)') where purpose is null;

do $$ begin
  alter table toolkit_requests alter column resource_title set not null;
  alter table toolkit_requests alter column name    set not null;
  alter table toolkit_requests alter column phone   set not null;
  alter table toolkit_requests alter column purpose set not null;
  alter table toolkit_requests alter column website set not null;
exception when others then
  raise notice 'toolkit_requests not-null tightening skipped: %', sqlerrm;
end $$;

-- Status moves from the old send-result values to fulfilment tracking.
do $$ begin
  update toolkit_requests set status = 'pending' where status not in ('pending', 'sent');
  alter table toolkit_requests drop constraint if exists toolkit_requests_status_check;
  alter table toolkit_requests add constraint toolkit_requests_status_check
    check (status in ('pending', 'sent'));
  alter table toolkit_requests alter column status set default 'pending';
exception when others then
  raise notice 'toolkit_requests status migration skipped: %', sqlerrm;
end $$;

-- Admin list ("newest first"), the pending-first view, and the per-email
-- lookup used for rate limiting.
create index if not exists toolkit_requests_created_at_idx
  on toolkit_requests (created_at desc);
create index if not exists toolkit_requests_email_idx
  on toolkit_requests (lower(email), created_at desc);
create index if not exists toolkit_requests_status_idx
  on toolkit_requests (status, created_at desc);
