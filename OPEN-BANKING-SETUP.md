# Open Banking – FinanzManager

## Ablauf

Bank auswählen → Bank-/SCA-Login → Konto auswählen → Transaktionen synchronisieren.

Die Browser-App sammelt kein Bankpasswort. Die Provider-Geheimnisse liegen ausschließlich in der Supabase Edge Function.

## SQL

1. `schema.sql` ausführen.
2. `open-banking-schema.sql` ausführen.

## Supabase Secrets

Setzen:

- `GOCARDLESS_SECRET_ID`
- `GOCARDLESS_SECRET_KEY`

Die Secrets gehören nicht in `supabase-config.js`.

## Edge Function

```bash
supabase functions deploy open-banking
supabase secrets set GOCARDLESS_SECRET_ID=...
supabase secrets set GOCARDLESS_SECRET_KEY=...
```

## Test

GoCardless bietet eine Sandbox Finance Institution (`SANDBOXFINANCE_SFIN0000`) für den Test des Account-Information-Flows.

## Redirect

Die App verwendet die aktuelle Vercel-Domain plus `?openbanking=callback` als Rücksprungziel. Diese Redirect-URL muss im verwendeten Open-Banking-Setup zugelassen sein.

## Sicherheit / Produktion

Provider-Vertrag, Datenschutz, Einwilligung/Widerruf, Datenaufbewahrung und mögliche regulatorische Anforderungen vor dem Live-Betrieb prüfen. Die Provider-Secret-Keys dürfen niemals in Frontend-Dateien stehen.
