# FinanzManager — mit echter Datenbank (Supabase)

Diese Version speichert nicht mehr im Browser (`localStorage`), sondern in
einer **echten Postgres-Datenbank bei Supabase**. Damit funktioniert das
Login von jedem Browser und jedem Gerät aus mit denselben Daten — Brave,
Chrome, Firefox, Handy, PC, alles zeigt dieselben Buchungen.

## Setup (einmalig, ca. 5 Minuten)

### 1. Supabase-Projekt erstellen
1. Gehe auf **https://supabase.com** → "Start your project" → kostenlos registrieren.
2. "New Project" → Namen vergeben, Datenbank-Passwort setzen (merken, brauchst du selten), Region wählen (z.B. Frankfurt).
3. Warte ~1–2 Minuten, bis das Projekt fertig eingerichtet ist.

### 2. Datenbank-Tabelle anlegen
1. Im Supabase-Dashboard: linke Seitenleiste → **SQL Editor** → "New query".
2. Öffne die Datei `schema.sql` aus diesem Ordner, kopiere den kompletten Inhalt hinein.
3. Klick auf **"Run"**. Fertig — die Tabelle `user_data` mit allen Sicherheitsregeln ist angelegt.

### 3. Zugangsdaten eintragen
1. Im Dashboard: **Project Settings** (Zahnrad-Symbol) → **API**.
2. Kopiere die **Project URL** und den Key **"anon public"**.
3. Öffne `supabase-config.js` in diesem Ordner und trage beide Werte ein:
   ```js
   const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```

### 4. E-Mail-Bestätigung ausschalten (empfohlen für den Eigenbedarf)
Standardmäßig verlangt Supabase eine Bestätigungs-E-Mail bei der Registrierung.
Da die App intern mit Pseudo-Adressen arbeitet (kein echtes Postfach), solltest
du das ausschalten:
1. Dashboard → **Authentication** → **Providers** → **Email**.
2. Häkchen bei **"Confirm email"** entfernen → Speichern.

### 5. Hosten
Genau wie vorher — es ist weiterhin eine reine statische Seite:
- **Netlify**: Ordner auf https://app.netlify.com/drop ziehen
- **GitHub Pages**: Dateien ins Repo, Pages aktivieren
- **Vercel**: Ordner hochladen
- Alle 4 Dateien gehören zusammen: `index.html`, `style.css`, `app.js`, `supabase-config.js`

## Warum das jetzt überall funktioniert

Vorher: Jeder Browser hatte seinen eigenen `localStorage` — Brave und Chrome
sahen sich gegenseitig nie. Jetzt: Beim Login fragt die App **Supabase** (einen
zentralen Server), nicht den eigenen Browser. Alle Geräte/Browser sprechen
mit demselben Server → dieselben Daten überall.

## Admin-Zugang

Du bist automatisch Admin, weil dir das Supabase-Projekt gehört:
- **Authentication → Users**: alle registrierten Nutzer sehen, sperren, löschen
- **Table Editor → user_data**: alle Daten aller Nutzer einsehen/bearbeiten
- **SQL Editor**: eigene Abfragen über alle Nutzer laufen lassen

Details und Beispiel-SQL dazu stehen als Kommentar am Ende von `schema.sql`.

Ein eigener Admin-**Tab innerhalb der App** (um andere Nutzer direkt aus der
Weboberfläche zu verwalten) ist zusätzlich möglich, aber nicht Teil dieser
Version — sag Bescheid, falls gewünscht.

## Kosten

Der Supabase-Kostenlos-Tarif reicht für eine private/kleine Nutzung locker aus
(500 MB Datenbank, 50.000 aktive Nutzer/Monat, im "Free Plan" enthalten).

## Dateien in diesem Ordner

```
index.html            Hauptseite
style.css              Styles
app.js                 App-Logik (jetzt mit Supabase statt localStorage)
supabase-config.js      DEINE Zugangsdaten (musst du ausfüllen, siehe oben)
schema.sql              SQL-Setup zum einmaligen Ausführen im Supabase SQL-Editor
```
