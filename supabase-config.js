/* =============================================================================
   SUPABASE-KONFIGURATION
   =============================================================================
   Trage hier deine eigenen Werte aus dem Supabase-Dashboard ein:

   1. Gehe auf https://supabase.com/dashboard → dein Projekt
   2. Linke Seitenleiste → "Project Settings" (Zahnrad) → "API"
   3. Kopiere "Project URL" und den Schlüssel "anon public" hierher

   Der "anon public" Key ist dazu gedacht, im Frontend/Browser sichtbar zu
   sein (er ist KEIN Geheimnis) — die eigentliche Absicherung passiert über
   die Row-Level-Security-Regeln aus schema.sql. Verwende NIEMALS den
   "service_role" Key hier, der gehört niemals in den Browser-Code.
   ============================================================================= */
const SUPABASE_URL = "https://DEIN-PROJEKT.supabase.co";
const SUPABASE_ANON_KEY = "DEIN-ANON-PUBLIC-KEY";
