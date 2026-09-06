# FinanzManager + Enable Banking (Sandbox)

## 1. Supabase SQL

Im Supabase SQL Editor zuerst `schema.sql` und danach `open-banking-schema.sql` ausführen.

## 2. Supabase Edge Function

Der Ordner `supabase/functions/open-banking/index.ts` enthält die Enable-Banking-Integration.

Deploy:

```bash
supabase functions deploy open-banking
```

## 3. Secrets

In Supabase unter **Edge Functions → Secrets** anlegen:

- `ENABLE_BANKING_APP_ID` = deine Enable-Banking Application-ID
- `ENABLE_BANKING_PRIVATE_KEY` = kompletter Inhalt der heruntergeladenen `.pem`-Datei

Die `.pem`-Datei niemals in GitHub, Vercel-Frontend oder Chat hochladen.

Supabase benötigt außerdem seine normalen Edge-Function-Umgebungsvariablen (`SUPABASE_URL` und einen serverseitigen Service-Key für die Datenbankverwaltung). In einer normalen Supabase Edge Function sind diese bereits vorhanden; der Service-Key bleibt ausschließlich serverseitig.

## 4. Enable Banking

Die Anwendung muss als **Sandbox** registriert sein. Redirect URL:

`https://fm-teal.vercel.app/?openbanking=callback`

Die URL muss exakt zu der URL passen, die beim `/auth`-Request verwendet wird.

## 5. Vercel

Das Frontend ist weiterhin eine statische App. `index.html` lädt `app.js` und danach `open-banking.js`.

## 6. Sandbox-Test

Für Deutschland stellt Enable Banking u. a. Aachener Bank, Berliner Volksbank, DKB, Dortmunder Volksbank, Triodos und Mock ASPSP als Sandbox-Integrationen bereit. Die jeweiligen Sandbox-Zugangsdaten stehen in der Enable-Banking-Dokumentation.

## Sicherheit

- Private RSA-Key bleibt in Supabase Secrets.
- Browser erhält niemals den Enable-Banking Private Key.
- Bankdaten werden userbezogen in Supabase gespeichert.
- RLS schützt `open_banking_*` Tabellen.
