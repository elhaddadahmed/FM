-- =============================================================================
-- FinanzManager — Supabase Datenbank-Setup
-- =============================================================================
-- So verwendest du das:
-- 1. Gehe auf https://supabase.com und erstelle ein kostenloses Projekt.
-- 2. Im Supabase-Dashboard: linke Seitenleiste → "SQL Editor" → "New query".
-- 3. Diesen kompletten Code hier reinkopieren und auf "Run" klicken.
-- 4. Fertig — die Tabellen sind angelegt, inkl. Sicherheitsregeln, damit jeder
--    Nutzer NUR seine eigenen Daten sehen/ändern kann.
-- =============================================================================

create table if not exists public.user_data (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  buchungen jsonb not null default '[]'::jsonb,
  sparziele jsonb not null default '[]'::jsonb,
  wiederkehrend jsonb not null default '[]'::jsonb,
  konten jsonb not null default '[]'::jsonb,
  kategorien jsonb not null default '{"ausgaben":[],"einnahmen":[]}'::jsonb,
  budgets jsonb not null default '{"gesamt":null,"kategorien":[]}'::jsonb,
  monatsziel numeric,
  challenges jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"theme":"dark","lang":"de"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Nutzer sehen nur ihre eigenen Daten" on public.user_data;
create policy "Nutzer sehen nur ihre eigenen Daten"
  on public.user_data for select
  using (auth.uid() = id);

drop policy if exists "Nutzer legen nur ihre eigene Zeile an" on public.user_data;
create policy "Nutzer legen nur ihre eigene Zeile an"
  on public.user_data for insert
  with check (auth.uid() = id);

drop policy if exists "Nutzer ändern nur ihre eigenen Daten" on public.user_data;
create policy "Nutzer ändern nur ihre eigenen Daten"
  on public.user_data for update
  using (auth.uid() = id);

drop policy if exists "Nutzer löschen nur ihre eigenen Daten" on public.user_data;
create policy "Nutzer löschen nur ihre eigenen Daten"
  on public.user_data for delete
  using (auth.uid() = id);

-- Zusätzliche (additive) Policies: eingeladene Haushaltsmitglieder dürfen die
-- Daten des Eigentümers zusätzlich zu ihren eigenen sehen/ändern. Ohne diese
-- zwei Policies scheitert "Konto wechseln" im Familienkonto-Feature an RLS,
-- obwohl die Einladung selbst (household_members-Zeile) erfolgreich anlegt.
drop policy if exists "Haushaltsmitglieder sehen freigegebene Daten" on public.user_data;
create policy "Haushaltsmitglieder sehen freigegebene Daten"
  on public.user_data for select
  using (exists (
    select 1 from public.household_members hm
    where hm.household_owner_id = user_data.id and hm.member_id = auth.uid()
  ));

drop policy if exists "Haushaltsmitglieder ändern freigegebene Daten" on public.user_data;
create policy "Haushaltsmitglieder ändern freigegebene Daten"
  on public.user_data for update
  using (exists (
    select 1 from public.household_members hm
    where hm.household_owner_id = user_data.id and hm.member_id = auth.uid()
  ));

-- =============================================================================
-- ABO-PLAN (Free/Pro)
-- =============================================================================
create table if not exists public.subscriptions (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

drop policy if exists "Nutzer sehen nur ihren eigenen Plan" on public.subscriptions;
create policy "Nutzer sehen nur ihren eigenen Plan"
  on public.subscriptions for select using (auth.uid() = id);
drop policy if exists "Nutzer legen nur ihren eigenen Free-Plan an" on public.subscriptions;
create policy "Nutzer legen nur ihren eigenen Free-Plan an"
  on public.subscriptions for insert with check (auth.uid() = id and plan = 'free');
-- Bewusst KEINE Update/Delete-Policy für normale Nutzer — ein Upgrade auf
-- "pro" darf ausschließlich über eine service_role-Funktion (z.B. Stripe-
-- Webhook) passieren, die RLS umgeht. Ohne "and plan='free'" oben könnte
-- sich sonst jeder über die Browser-Konsole direkt selbst auf pro setzen.

-- =============================================================================
-- FAMILIENKONTO (Household)
-- =============================================================================
create table if not exists public.household_members (
  household_owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  member_username text,
  created_at timestamptz not null default now(),
  primary key (household_owner_id, member_id)
);
alter table public.household_members enable row level security;

drop policy if exists "Eigentümer und Mitglied sehen den Eintrag" on public.household_members;
create policy "Eigentümer und Mitglied sehen den Eintrag"
  on public.household_members for select
  using (auth.uid() = household_owner_id or auth.uid() = member_id);

drop policy if exists "Nur der Eigentümer lädt ein" on public.household_members;
create policy "Nur der Eigentümer lädt ein"
  on public.household_members for insert
  with check (auth.uid() = household_owner_id);

drop policy if exists "Eigentümer oder Mitglied kann den Eintrag löschen" on public.household_members;
create policy "Eigentümer oder Mitglied kann den Eintrag löschen"
  on public.household_members for delete
  using (auth.uid() = household_owner_id or auth.uid() = member_id);

create or replace function public.find_user_id_by_username(p_username text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(raw_user_meta_data->>'username') = lower(trim(p_username))
  limit 1;
$$;
grant execute on function public.find_user_id_by_username(text) to authenticated;

-- =============================================================================
-- LOGIN-HISTORIE (neu)
-- =============================================================================
-- Speichert die letzten Logins (Gerät/Browser, ungefähre Zeitzone, Zeitpunkt)
-- pro Nutzer, damit man in den Einstellungen sehen kann, wo/wann das eigene
-- Konto zuletzt benutzt wurde. Es werden bewusst KEINE IP-Adressen oder
-- exakten Standorte gespeichert — nur der User-Agent-String des Browsers.
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  user_agent text,
  language text,
  approx_timezone text
);
alter table public.login_history enable row level security;

drop policy if exists "Nutzer sehen nur ihre eigene Login-Historie" on public.login_history;
create policy "Nutzer sehen nur ihre eigene Login-Historie"
  on public.login_history for select using (auth.uid() = user_id);

drop policy if exists "Nutzer tragen nur eigene Logins ein" on public.login_history;
create policy "Nutzer tragen nur eigene Logins ein"
  on public.login_history for insert with check (auth.uid() = user_id);

-- Optional: alte Einträge automatisch aufräumen (älter als 1 Jahr), damit die
-- Tabelle nicht unbegrenzt wächst. Dieser Block ist rein informativ — führe
-- ihn nur aus, wenn du in deinem Supabase-Projekt pg_cron aktiviert hast
-- (Dashboard → Database → Extensions → pg_cron).
--
-- select cron.schedule('cleanup-login-history', '0 3 * * *', $$
--   delete from public.login_history where created_at < now() - interval '1 year';
-- $$);

-- =============================================================================
-- LOGIN PER BENUTZERNAME + "PASSWORT VERGESSEN"
-- =============================================================================
create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select email
  from auth.users
  where lower(raw_user_meta_data->>'username') = lower(trim(p_username))
  limit 1;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;

-- =============================================================================
-- 2FA (TOTP)
-- =============================================================================
-- Braucht KEINE eigene Tabelle — Supabase Auth verwaltet die Faktoren intern
-- (auth.mfa_factors). Im Supabase-Dashboard unter "Authentication" → "Providers"
-- muss lediglich sichergestellt sein, dass MFA/TOTP für dein Projekt aktiv ist
-- (bei den meisten Projekten ist es das standardmäßig). Die App ruft die
-- Funktionen sb.auth.mfa.enroll / challenge / verify / listFactors / unenroll
-- direkt über das Supabase-JS-SDK auf.

-- =============================================================================
-- STORAGE BUCKETS (Belege, Profilbilder)
-- =============================================================================
-- Legt die Buckets automatisch an UND die dazugehörigen Zugriffsregeln —
-- reines manuelles Anlegen im Dashboard reicht NICHT: Supabase aktiviert RLS
-- auf Storage standardmäßig, und ohne die Policies unten kann NIEMAND
-- (auch nicht der Besitzer selbst) etwas hoch-/herunterladen.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Jeder darf Profilbilder sehen" on storage.objects;
create policy "Jeder darf Profilbilder sehen"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Nutzer laden nur ihr eigenes Profilbild hoch" on storage.objects;
create policy "Nutzer laden nur ihr eigenes Profilbild hoch"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Nutzer ersetzen nur ihr eigenes Profilbild" on storage.objects;
create policy "Nutzer ersetzen nur ihr eigenes Profilbild"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Nutzer sehen nur ihre eigenen Belege" on storage.objects;
create policy "Nutzer sehen nur ihre eigenen Belege"
  on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Nutzer laden nur eigene Belege hoch" on storage.objects;
create policy "Nutzer laden nur eigene Belege hoch"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Nutzer löschen nur eigene Belege" on storage.objects;
create policy "Nutzer löschen nur eigene Belege"
  on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- ADMIN-ZUGANG
-- =============================================================================
-- Du bist automatisch "Admin", weil dir das Supabase-Projekt gehört. Alles
-- läuft über das Supabase-Dashboard (https://supabase.com/dashboard), NICHT
-- über die App selbst:
--
--   • Authentication → Users:
--       - Liste ALLER registrierten Nutzer (E-Mail/Pseudo-Adresse, Datum,
--         letzter Login).
--       - Klick auf einen Nutzer → "Reset password": du vergibst dort DIREKT
--         ein neues Passwort, ganz ohne E-Mail.
--       - Nutzer dort auch sperren oder komplett löschen (Auth + Daten dank
--         "on delete cascade" oben).
--
--   • Table Editor → user_data / login_history / subscriptions / household_members:
--       Alle Daten aller Nutzer einsehen und bearbeiten — als Tabelle, keine
--       SQL-Kenntnisse nötig.
--
--   • SQL Editor: beliebige Abfragen über alle Nutzer laufen lassen, z.B.:
--
--     select display_name, jsonb_array_length(buchungen) as anzahl_buchungen
--     from public.user_data
--     order by created_at desc;
-- =============================================================================
