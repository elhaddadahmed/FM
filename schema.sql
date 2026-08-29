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
-- LOGIN PER BENUTZERNAME + "PASSWORT VERGESSEN"
-- =============================================================================
-- Die App lässt Nutzer sich mit einem Benutzernamen statt einer E-Mail
-- anmelden. Supabase Auth selbst kennt aber nur E-Mail-Adressen. Diese
-- Funktion übersetzt "Benutzername -> hinterlegte E-Mail", damit:
--   a) der Login mit Benutzername weiterhin funktioniert, und
--   b) "Passwort vergessen" eine echte Reset-Mail verschicken kann, FALLS
--      der Nutzer bei der Registrierung eine echte E-Mail angegeben hat.
--      Hat er keine angegeben, wurde intern eine Pseudo-Adresse
--      (…@finanzmanager.local) angelegt — dorthin kann natürlich keine Mail
--      zugestellt werden; in dem Fall musst DU als Admin das Passwort über
--      das Dashboard zurücksetzen (siehe unten).
--
-- Sicherheitshinweis: Die Funktion gibt bei einem gültigen Benutzernamen die
-- zugehörige E-Mail zurück. Das ist für den beschriebenen Zweck nötig,
-- bedeutet aber auch: Wer einen Benutzernamen errät, kann herausfinden, OB
-- eine E-Mail hinterlegt ist. Für eine kleine, private App ist das ein
-- akzeptables Risiko — bei einer öffentlichen App würde man das anders lösen.
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

-- Erlaubt auch nicht eingeloggten Besuchern, diese Funktion aufzurufen
-- (nötig, weil man ja VOR dem Login die E-Mail zum Benutzernamen braucht).
grant execute on function public.get_login_email(text) to anon, authenticated;

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
--         ein neues Passwort, ganz ohne E-Mail. Das ist der Weg, wenn ein
--         Nutzer sein Passwort vergessen hat und KEINE echte E-Mail
--         hinterlegt hatte.
--       - Nutzer dort auch sperren oder komplett löschen (Auth + Daten dank
--         "on delete cascade" oben).
--
--   • Table Editor → user_data:
--       Alle Daten aller Nutzer (Buchungen, Sparziele, …) einsehen und
--       bearbeiten — als Tabelle, keine SQL-Kenntnisse nötig.
--
--   • SQL Editor: beliebige Abfragen über alle Nutzer laufen lassen, z.B.:
--
--     select display_name, jsonb_array_length(buchungen) as anzahl_buchungen
--     from public.user_data
--     order by created_at desc;
--
-- Eine zusätzliche "Admin-Rolle" INNERHALB der App (z.B. ein Admin-Tab zum
-- Verwalten anderer Nutzer direkt in der Weboberfläche) ist technisch
-- möglich, erfordert aber eine serverseitige Funktion (Supabase Edge
-- Function) mit dem service_role-Key, weil der Browser-Code aus
-- Sicherheitsgründen niemals die Daten anderer Nutzer lesen darf. Sag
-- Bescheid, falls du das zusätzlich willst.
-- =============================================================================
