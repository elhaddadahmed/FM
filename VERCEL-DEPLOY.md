# FinanzManager – Vercel Deployment

1. Diesen gesamten Ordner als Vercel-Projekt hochladen.
2. Framework Preset: `Other` bzw. kein Framework.
3. Build Command: leer lassen.
4. Output Directory: leer lassen.
5. Root Directory: der Ordner, in dem `index.html` liegt.
6. Deploy.

Enthalten:
- index.html
- app.js
- style.css
- supabase-config.js
- schema.sql
- README.md
- vercel.json
- favicon.ico
- manifest.json
- icons/ (logo.svg, icon-16.png, icon-32.png, icon-180.png, icon-192.png, icon-512.png)

Wichtig:
- In Supabase zuerst `schema.sql` vollständig im SQL Editor ausführen.
- Die Buckets `receipts` (privat) und `avatars` (öffentlich) anlegen.
- Die aktuelle `sb_publishable_...` Client-Key-Variante ist für Browser-Apps geeignet.
