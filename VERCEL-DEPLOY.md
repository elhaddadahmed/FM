# FinanzManager – Vercel Deployment

1. Diesen gesamten Ordner als Vercel-Projekt hochladen.
2. Framework Preset: `Other` bzw. kein Framework.
3. Build Command: leer lassen.
4. Output Directory: leer lassen.
5. Root Directory: der Ordner, in dem `index.html` liegt.
6. Deploy.

Enthalten:
- index.html
- script.js
- style.css
- supabase-config.js
- schema.sql
- open-banking.js
- open-banking-schema.sql
- OPEN-BANKING-SETUP.md
- README.md
- vercel.json

⚠️ **Wichtig**: `open-banking.js` wird von `index.html` aktiv nachgeladen
(nach `script.js`). Fehlt die Datei beim Deploy, bekommst du beim Klick auf
"Bank verbinden" einen Fehler ("openOpenBankingModal is not defined"), weil
die Funktion dann nirgends definiert ist.

Wichtig:
- In Supabase zuerst `schema.sql` **vollständig** im SQL Editor ausführen
  (legt jetzt auch die Storage-Buckets `receipts`/`avatars` inkl. Regeln
  automatisch an — dafür musst du nichts mehr manuell im Dashboard anlegen).
- Danach zusätzlich `open-banking-schema.sql` ausführen.
- Die aktuelle `sb_publishable_...` Client-Key-Variante ist für Browser-Apps geeignet.
- Für Open Banking: `GOCARDLESS_SECRET_ID` und `GOCARDLESS_SECRET_KEY` als
  Supabase Edge Function Secrets setzen (siehe OPEN-BANKING-SETUP.md) und
  `supabase functions deploy open-banking` ausführen.
