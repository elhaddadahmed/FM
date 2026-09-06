-- =============================================================================
-- FinanzManager — Enable Banking Open Banking
-- Ergänzung zu schema.sql. Kann nach dem bestehenden schema.sql ausgeführt werden.
-- =============================================================================

create table if not exists public.open_banking_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'enablebanking',
  requisition_id text,
  authorization_id text,
  session_id text,
  institution_id text not null,
  institution_name text,
  institution_logo text,
  country text not null default 'DE',
  state text,
  status text not null default 'PENDING_AUTHORIZATION',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz
);

-- Migration von der früheren GoCardless-Version, falls diese Tabelle bereits existiert.
alter table public.open_banking_connections add column if not exists provider text;
alter table public.open_banking_connections add column if not exists authorization_id text;
alter table public.open_banking_connections add column if not exists session_id text;
alter table public.open_banking_connections add column if not exists country text;
alter table public.open_banking_connections add column if not exists state text;
alter table public.open_banking_connections alter column requisition_id drop not null;
update public.open_banking_connections set provider='enablebanking' where provider is null;
update public.open_banking_connections set country='DE' where country is null;
alter table public.open_banking_connections alter column provider set default 'enablebanking';
alter table public.open_banking_connections alter column country set default 'DE';

create index if not exists idx_ob_connections_user on public.open_banking_connections(user_id);
create index if not exists idx_ob_connections_session on public.open_banking_connections(session_id);

alter table public.open_banking_connections enable row level security;
drop policy if exists "Open Banking Nutzer sehen eigene Verbindungen" on public.open_banking_connections;
create policy "Open Banking Nutzer sehen eigene Verbindungen" on public.open_banking_connections for select using (auth.uid() = user_id);
drop policy if exists "Open Banking Nutzer legen eigene Verbindungen an" on public.open_banking_connections;
create policy "Open Banking Nutzer legen eigene Verbindungen an" on public.open_banking_connections for insert with check (auth.uid() = user_id);
drop policy if exists "Open Banking Nutzer ändern eigene Verbindungen" on public.open_banking_connections;
create policy "Open Banking Nutzer ändern eigene Verbindungen" on public.open_banking_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Open Banking Nutzer löschen eigene Verbindungen" on public.open_banking_connections;
create policy "Open Banking Nutzer löschen eigene Verbindungen" on public.open_banking_connections for delete using (auth.uid() = user_id);

create table if not exists public.open_banking_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.open_banking_connections(id) on delete cascade,
  provider_account_id text not null,
  iban text,
  account_name text,
  owner_name text,
  institution_id text,
  currency text,
  current_balance numeric,
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider_account_id)
);

alter table public.open_banking_accounts add column if not exists currency text;
alter table public.open_banking_accounts add column if not exists current_balance numeric;
create index if not exists idx_ob_accounts_user on public.open_banking_accounts(user_id);
create index if not exists idx_ob_accounts_connection on public.open_banking_accounts(connection_id);
alter table public.open_banking_accounts enable row level security;
drop policy if exists "Open Banking Konten nur eigene" on public.open_banking_accounts;
create policy "Open Banking Konten nur eigene" on public.open_banking_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.open_banking_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  open_banking_account_id uuid not null references public.open_banking_accounts(id) on delete cascade,
  provider_transaction_id text,
  booking_date date,
  value_date date,
  description text,
  counterparty text,
  amount numeric not null,
  currency text not null default 'EUR',
  raw jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, open_banking_account_id, provider_transaction_id)
);

create index if not exists idx_ob_transactions_user_date on public.open_banking_transactions(user_id, booking_date desc);
alter table public.open_banking_transactions enable row level security;
drop policy if exists "Open Banking Buchungen nur eigene" on public.open_banking_transactions;
create policy "Open Banking Buchungen nur eigene" on public.open_banking_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
