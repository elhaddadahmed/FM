# Open Banking – FinanzManager (Enable Banking Edition)

> **Hinweis:** GoCardless hat seit Juli 2025 keine Neuanmeldungen mehr für
> die kostenlose "Bank Account Data"-API angenommen. Diese Version nutzt
> stattdessen **Enable Banking** (enablebanking.com), aktuell der gängigste
> Ersatz mit einem kostenlosen Modus für eigene Konten ("Restricted
> Production" / Whitelisted Accounts).

## Ablauf

Bank auswählen → Bank-/SCA-Login → Konto auswählen → Transaktionen synchronisieren.

Die Browser-App sammelt kein Bankpasswort. Alle Geheimnisse (privater
Schlüssel, Application-ID) liegen ausschließlich in der Supabase Edge
Function, nie im Frontend-Code.

## 1. Enable-Banking-Konto & App registrieren

1. Auf https://enablebanking.com/sign-in/ mit deiner E-Mail-Adresse anmelden
   (Login-Link per Mail, kein Passwort nötig).
2. Im Control Panel (https://enablebanking.com/cp/applications) eine neue
   Application registrieren:
   - Umgebung: `SANDBOX` zum Testen, `PRODUCTION` für echte Bankkonten.
   - **Wichtig beim privaten Schlüssel**: die Option **"Generate in the
     browser (using SubtleCrypto) and export private key"** wählen — dann
     ist der Schlüssel automatisch im richtigen Format (PKCS8). Erzeugst du
     den Schlüssel stattdessen selbst per `openssl genrsa`, bekommst du das
     ältere PKCS1-Format, das zusätzlich konvertiert werden muss (siehe
     Kommentar oben in `index.ts`).
   - Redirect-URL: deine Live-Domain, z.B. `https://deine-domain.vercel.app/`
3. Für `PRODUCTION` ohne eigene eIDAS-Zertifikate: eigene Konten unter
   "Whitelisted accounts" freischalten (siehe
   https://enablebanking.com/docs/api/linked-accounts/) — das ist der
   kostenlose Weg, um mit den eigenen echten Bankkonten zu testen, ohne eine
   vollständige TPP-Lizenz zu benötigen.
4. Nach der Registrierung bekommst du eine **Application-ID** (UUID) — die
   brauchst du gleich als Secret.

## 2. SQL ausführen

1. `schema.sql` ausführen.
2. `open-banking-schema.sql` ausführen.

## 3. Supabase Secrets setzen

- `ENABLEBANKING_APPLICATION_ID` — deine Application-ID aus Schritt 1
- `ENABLEBANKING_PRIVATE_KEY` — kompletter Inhalt deiner privaten `.pem`-Datei

Die Secrets gehören nicht in `supabase-config.js`.

## 4. Edge Function deployen

```bash
supabase functions deploy open-banking
supabase secrets set ENABLEBANKING_APPLICATION_ID=deine-app-id
supabase secrets set ENABLEBANKING_PRIVATE_KEY="$(cat private_pkcs8.pem)"
```

Alternativ ganz ohne Terminal über das Supabase-Dashboard: "Edge Functions"
→ "Deploy a new function" → "Via Editor" für den Code, "Secrets" für die
zwei Werte oben (Copy-Paste des kompletten PEM-Inhalts inkl.
`-----BEGIN/END PRIVATE KEY-----`-Zeilen funktioniert dort problemlos, auch
mehrzeilig).

## 5. Test

Im `SANDBOX`-Modus stellt Enable Banking eigene Test-Banken bereit (siehe
https://enablebanking.com/docs/api/sandbox/). Für echte eigene Konten:
`PRODUCTION`-App + Whitelisting wie in Schritt 1.4.

## Redirect

Die App verwendet die aktuelle Domain plus `?openbanking=callback` als
Rücksprungziel — muss exakt als `redirect_urls` bei der App-Registrierung
hinterlegt sein.

## Sicherheit / Produktion

Enable Banking, Datenschutz, Einwilligung/Widerruf, Datenaufbewahrung und
mögliche regulatorische Anforderungen vor dem Live-Betrieb prüfen. Der
private Schlüssel darf niemals in Frontend-Dateien oder ins Git-Repository
gelangen — ausschließlich als Supabase-Secret.
