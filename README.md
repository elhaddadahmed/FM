# FinanzManager — Setup

## Enthaltene Dateien
- `index.html` — lädt die App und alle nötigen externen Bibliotheken (Supabase, XLSX, jsPDF)
- `app.js` — die komplette App-Logik (inkl. Biometrie-Sperre, 2FA/TOTP, Login-Historie, Auto-Logout)
- `style.css` — Design/Layout
- `supabase-config.js` — deine Supabase-Zugangsdaten (URL + anon key)
- `schema.sql` — komplettes Datenbank-Setup für Supabase (einmalig im SQL-Editor ausführen)

## Einrichtung

1. **Supabase-Projekt anlegen**: https://supabase.com/dashboard → "New project"
2. **Datenbank einrichten**: Im Dashboard → "SQL Editor" → `schema.sql` komplett reinkopieren → "Run"
3. **Storage-Buckets anlegen** (Dashboard → "Storage" → "New bucket"):
   - `receipts` (privat) — für Beleg-Uploads
   - `avatars` (öffentlich lesbar) — für Profilbilder
4. **Zugangsdaten eintragen**: Dashboard → "Project Settings" → "API" → `Project URL` und `anon public` Key in `supabase-config.js` eintragen (sind dort schon mit deinen Werten vorausgefüllt)
5. **2FA aktivieren**: Bei den meisten Supabase-Projekten ist TOTP/MFA standardmäßig aktiv. Falls nicht: Dashboard → "Authentication" → "Providers" prüfen.
6. **Hosten**: Alle Dateien zusammen auf einen beliebigen Webserver/Hosting-Dienst hochladen (z. B. Netlify, Vercel, GitHub Pages, eigener Server) — wichtig ist NUR, dass es über **HTTPS** läuft (nötig für Face ID / Biometrie und für Supabase Auth allgemein).

## Sicherheits-Features in dieser Version

- **Biometrie-Sperre (Face ID / Fingerabdruck / Windows Hello)**: Geräte-lokale Zusatzsperre über WebAuthn. Einrichtung in den Einstellungen unter "Gesichtserkennung / Biometrie". Ersetzt NICHT den echten Login, ist nur ein schneller Geräte-Riegel.
- **Echte Zwei-Faktor-Authentifizierung (2FA/TOTP)**: über Supabase Auth, mit jeder Standard-Authenticator-App (Google Authenticator, Authy, etc.) nutzbar. Einrichtung in den Einstellungen.
- **Login-Historie**: zeigt die letzten 10 Anmeldungen (Gerätetyp + Zeitpunkt) in den Einstellungen.
- **Automatische Abmeldung**: sperrt/loggt nach wählbarer Inaktivitätszeit (aus/5/15/30 Min) automatisch aus.

## Open Banking (Enable Banking)

Ab dieser Version ist echte Bank-Anbindung dabei (Konto per Login verbinden,
Transaktionen automatisch synchronisieren) — Zugriffstoken bzw. der private
Schlüssel liegen dabei ausschließlich in einer Supabase Edge Function, nie
im Browser-Code. Anbieter ist Enable Banking (GoCardless nimmt seit Juli
2025 keine Neuanmeldungen mehr an).

Setup: siehe `OPEN-BANKING-SETUP.md` (zusätzlich `open-banking-schema.sql`
ausführen und die Edge Function `open-banking` mit deinen Enable-Banking-
Zugangsdaten deployen). Ohne dieses Setup bleibt der manuelle CSV-Kontoauszug-
Import (Konten-Tab → "Kontoauszug importieren", erkennt Sparkasse/Volksbank/VR/
Revolut automatisch) weiterhin die einfachere Alternative.

## Deployment

Für Vercel siehe `VERCEL-DEPLOY.md`.
