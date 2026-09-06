create table if not exists public.open_banking_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'gocardless',
  requisition_id text not null unique,
  institution_id text not null,
  institution_name text,
  institution_logo text,
  status text not null default 'CR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz
);
create index if not exists idx_ob_connections_user on public.open_banking_connections(user_id);
alter table public.open_banking_connections enable row level security;
create policy "Open Banking Nutzer sehen eigene Verbindungen" on public.open_banking_connections for select using (auth.uid() = user_id);
create policy "Open Banking Nutzer legen eigene Verbindungen an" on public.open_banking_connections for insert with check (auth.uid() = user_id);
create policy "Open Banking Nutzer ändern eigene Verbindungen" on public.open_banking_connections for update using (auth.uid() = user_id);
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
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider_account_id)
);
create index if not exists idx_ob_accounts_user on public.open_banking_accounts(user_id);
alter table public.open_banking_accounts enable row level security;
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
create policy "Open Banking Buchungen nur eigene" on public.open_banking_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
