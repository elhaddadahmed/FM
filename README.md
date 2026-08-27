# FinanzManager — Web Edition

Eine vollständige Web-Version deines Java-FinanzManagers: Login, Einnahmen/Ausgaben,
Sparziele, wiederkehrende Zahlungen, Gehaltsrechner (deutsche Lohnsteuer), KI-Tipps,
Dark/Light/Neon-Design, Deutsch/Englisch.

## Dateien

```
index.html        Hauptseite (HTML-Struktur)
style.css         Alle Styles (Dark/Light/Neon Themes)
storage-shim.js   Speicher-Schicht (siehe unten) — MUSS vor app.js geladen werden
app.js            Gesamte App-Logik
```

## Wie die Daten gespeichert werden

Die App speichert alles über `window.storage`. Diese Version enthält `storage-shim.js`,
der `window.storage` mit dem `localStorage` des Browsers nachbildet:

- Die Daten bleiben **im Browser des jeweiligen Besuchers** gespeichert (wie bei den
  meisten kleinen Web-Apps ohne eigenes Backend).
- Löscht ein Nutzer seine Browserdaten / nutzt er einen anderen Browser oder ein
  anderes Gerät, sind die Daten dort nicht verfügbar — es gibt keinen Server, der
  synchronisiert.
- Für ein "echtes" Mehrgeräte-Backend (z. B. damit du von Handy und PC auf dieselben
  Daten zugreifen kannst) bräuchtest du zusätzlich eine kleine Server-Komponente
  (z. B. Firebase, Supabase oder ein eigenes Backend). Sag Bescheid, wenn du das
  möchtest — das kann ich ergänzen.

## Hosten — die einfachsten Optionen

Es ist eine **reine Client-Web-App** (kein Server-Code nötig). Jede Möglichkeit,
statische Dateien auszuliefern, reicht:

### Option A — Netlify (kostenlos, per Drag & Drop)
1. Gehe auf https://app.netlify.com/drop
2. Ziehe den gesamten Ordner (alle 4 Dateien) in das Browserfenster.
3. Fertig — du bekommst sofort eine URL wie `https://dein-projekt.netlify.app`.

### Option B — GitHub Pages
1. Erstelle ein neues GitHub-Repository und lade die Dateien hoch.
2. Repository → Settings → Pages → "Deploy from branch" → `main` / `/root` auswählen.
3. Die Seite ist danach unter `https://<benutzername>.github.io/<repo>` erreichbar.

### Option C — Vercel
1. https://vercel.com → "Add New Project" → Ordner hochladen oder Repo verbinden.
2. Kein Build-Schritt nötig (Framework: "Other").

### Option D — Eigener Server / Webspace
Lade einfach alle 4 Dateien per FTP/SFTP in ein Verzeichnis deines Webspace
(z. B. `public_html/finanzmanager/`). Kein PHP, keine Datenbank, kein Build nötig.

### Lokal zum Testen
```bash
cd finanzmanager
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

## Wichtig

- **HTTPS empfohlen**: Für die Passwort-Hash-Funktion (`crypto.subtle`) verlangen
  manche Browser einen sicheren Kontext (HTTPS oder `localhost`). Bei den oben
  genannten Hosting-Optionen (Netlify, GitHub Pages, Vercel) ist HTTPS automatisch
  aktiv.
- Diese Passwort-"Sicherheit" (SHA-256-Hash im Browser) ist wie im Original-Java-Programm
  ein einfacher Schutz, kein Ersatz für ein echtes Auth-System mit Server-Backend.
  Für eine öffentlich zugängliche App mit sensiblen Daten würde ich ein richtiges
  Backend empfehlen.
