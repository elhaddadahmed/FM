-- =============================================================================
-- FinanzManager — Supabase Datenbank-Setup
-- =============================================================================
-- So verwendest du das:
-- 1. Gehe auf https://supabase.com und erstelle ein kostenloses Projekt.
-- 2. Im Supabase-Dashboard: linke Seitenleiste → "SQL Editor" → "New query".
-- 3. Diesen kompletten Code hier reinkopieren und auf "Run" klicken.
-- 4. Fertig — die Tabelle "user_data" ist angelegt, inkl. Sicherheitsregeln,
--    damit jeder Nutzer NUR seine eigenen Daten sehen/ändern kann.
-- =============================================================================

-- Eine Zeile pro registriertem Nutzer. Die eigentlichen Buchungen, Sparziele
-- usw. liegen als JSON in den jeweiligen Spalten — das hält die App einfach,
-- ist aber trotzdem eine "echte" SQL/Postgres-Tabelle, die du im Supabase-
-- Dashboard unter "Table Editor" jederzeit einsehen und bearbeiten kannst.
create table if not exists public.user_data (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  buchungen jsonb not null default '[]'::jsonb,
  sparziele jsonb not null default '[]'::jsonb,
  wiederkehrend jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"theme":"dark","lang":"de"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security aktivieren: OHNE die folgenden Policies könnte sonst
-- niemand (außer dir als Admin über den Dashboard) überhaupt auf die
-- Tabelle zugreifen. MIT den Policies kann jeder eingeloggte Nutzer nur
-- seine EIGENE Zeile lesen/ändern — nie die eines anderen Nutzers.
alter table public.user_data enable row level security;

create policy "Nutzer sehen nur ihre eigenen Daten"
  on public.user_data for select
  using (auth.uid() = id);

create policy "Nutzer legen nur ihre eigene Zeile an"
  on public.user_data for insert
  with check (auth.uid() = id);

create policy "Nutzer ändern nur ihre eigenen Daten"
  on public.user_data for update
  using (auth.uid() = id);

create policy "Nutzer löschen nur ihre eigenen Daten"
  on public.user_data for delete
  using (auth.uid() = id);

-- =============================================================================
-- ADMIN-ZUGANG
-- =============================================================================
-- Du bist automatisch "Admin", weil dir das Supabase-Projekt gehört:
--   • Authentication → Users:  alle registrierten Nutzer sehen, sperren, löschen
--   • Table Editor → user_data: alle Daten aller Nutzer einsehen und bearbeiten
--   • SQL Editor: beliebige Abfragen über alle Nutzer laufen lassen, z.B.:
--
--     select display_name, jsonb_array_length(buchungen) as anzahl_buchungen
--     from public.user_data
--     order by created_at desc;
--
-- Eine zusätzliche "Admin-Rolle" INNERHALB der App (z.B. ein Admin-Tab zum
-- Verwalten anderer Nutzer direkt in der Weboberfläche) ist technisch
-- möglich, aber ein eigenes Stück Arbeit — sag Bescheid, falls gewünscht.
-- =============================================================================
