// =============================================================================
// Supabase Edge Function: open-banking (Enable Banking Edition)
// =============================================================================
// Ersetzt die vorherige GoCardless-Version, weil GoCardless seit Juli 2025
// keine Neuanmeldungen für "Bank Account Data" mehr annimmt.
//
// AUTH-MODELL VON ENABLE BANKING (anders als GoCardless!):
// Enable Banking nutzt KEIN einfaches Secret-ID/Secret-Key-Paar, sondern pro
// Anfrage ein selbst signiertes JWT (RS256), signiert mit einem privaten
// RSA-Schlüssel, der zu deiner registrierten Application gehört.
//
// Benötigte Supabase-Secrets:
//   ENABLEBANKING_APPLICATION_ID  — die Application-ID aus dem Enable
//                                   Banking Control Panel (UUID)
//   ENABLEBANKING_PRIVATE_KEY     — der komplette Inhalt der .pem-Datei,
//                                   die du beim Registrieren der App
//                                   heruntergeladen hast (siehe Hinweis
//                                   zu PKCS8 unten!)
//
// WICHTIG — PKCS8 vs. PKCS1:
// Falls du deinen privaten Schlüssel selbst mit `openssl genrsa` erzeugt
// hast, liegt er im alten PKCS1-Format vor ("-----BEGIN RSA PRIVATE
// KEY-----") — das kann die Web-Crypto-API (die dieser Code nutzt) NICHT
// direkt einlesen. Falls du beim Registrieren der App im Enable Banking
// Control Panel die Option "Generate in the browser (using SubtleCrypto)
// and export private key" gewählt hast, ist der Schlüssel bereits im
// richtigen PKCS8-Format ("-----BEGIN PRIVATE KEY-----") — dann ist alles
// gut. Falls nicht, einmalig konvertieren:
//   openssl pkcs8 -topk8 -nocrypt -in private.key -out private_pkcs8.pem
// und den Inhalt von private_pkcs8.pem als Secret hinterlegen.
//
// DEPLOYEN:
//   supabase functions deploy open-banking
//   supabase secrets set ENABLEBANKING_APPLICATION_ID=deine-app-id
//   supabase secrets set ENABLEBANKING_PRIVATE_KEY="$(cat private_pkcs8.pem)"
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const BASE = "https://api.enablebanking.com";
const APPLICATION_ID = Deno.env.get("ENABLEBANKING_APPLICATION_ID")!;
const PRIVATE_KEY_PEM = Deno.env.get("ENABLEBANKING_PRIVATE_KEY")!;
const DEFAULT_CONSENT_DAYS = 90;

const out = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: cors });

// --- Base64url-Hilfsfunktionen (JWT braucht base64url, nicht normales base64) ---
function base64url(input: Uint8Array | string): string {
  const base64 = typeof input === "string" ? btoa(input) : btoa(String.fromCharCode(...input));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// --- Privaten PEM-Schlüssel (PKCS8) für Web Crypto importieren ---
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (pem.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(
      "Der private Schlüssel liegt im alten PKCS1-Format vor (RSA PRIVATE KEY). " +
      "Bitte konvertieren: openssl pkcs8 -topk8 -nocrypt -in private.key -out private_pkcs8.pem " +
      "und den Inhalt als ENABLEBANKING_PRIVATE_KEY-Secret neu setzen."
    );
  }
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// --- JWT für Enable Banking erzeugen (RS256, 1h gültig) ---
let cachedKey: CryptoKey | null = null;
async function createJwt(): Promise<string> {
  if (!cachedKey) cachedKey = await importPrivateKey(PRIVATE_KEY_PEM);
  const header = { typ: "JWT", alg: "RS256", kid: APPLICATION_ID };
  const iat = Math.floor(Date.now() / 1000);
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp: iat + 3600 };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    cachedKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

// --- Enable-Banking-API-Aufruf mit automatischem JWT ---
async function eb(path: string, opts: RequestInit = {}) {
  const jwt = await createJwt();
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) {
    throw new Error(data?.message || data?.error || data?.detail || `Enable Banking HTTP ${r.status}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // --- Nutzer authentifizieren ---
    const ah = req.headers.get("Authorization");
    if (!ah?.startsWith("Bearer ")) return out({ error: "Nicht angemeldet" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const pk = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const uc = createClient(url, pk, { global: { headers: { Authorization: ah } } });
    const { data: { user }, error } = await uc.auth.getUser();
    if (error || !user) return out({ error: "Ungültige Sitzung" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "");
    const b = await req.json().catch(() => ({}));
    const a = b.action;

    // --- 1) Liste der Banken für ein Land ---
    if (a === "institutions") {
      const country = encodeURIComponent(String(b.country || "de").toUpperCase());
      const data = await eb(`/aspsps?country=${country}`);
      // Frontend erwartet ein flaches Array; Enable Banking liefert {aspsps:[...]}.
      // Da Banken hier über (name, country) statt einer einzelnen ID identifiziert
      // werden, bauen wir eine zusammengesetzte ID fürs Frontend.
      const banks = (data.aspsps || []).map((x: any) => ({
        id: `${x.name}|${x.country}`,
        name: x.name,
        bic: x.bic,
        logo: x.logo,
        country: x.country,
        maximum_consent_validity: x.maximum_consent_validity,
      }));
      return out(banks);
    }

    // --- 2) Autorisierung bei der Bank starten ---
    if (a === "create-requisition") {
      const [instName, instCountry] = String(b.institution_id).split("|");
      const state = crypto.randomUUID();
      const maxSeconds = Number(b.maximum_consent_validity) || DEFAULT_CONSENT_DAYS * 86400;
      const validSeconds = Math.min(maxSeconds, DEFAULT_CONSENT_DAYS * 86400);
      const validUntil = new Date(Date.now() + validSeconds * 1000).toISOString();

      const authResp = await eb("/auth", {
        method: "POST",
        body: JSON.stringify({
          access: { valid_until: validUntil, balances: true, transactions: true },
          aspsp: { name: instName, country: instCountry },
          state,
          redirect_url: String(b.redirect),
          psu_type: "personal",
        }),
      });

      const { data: c, error: e } = await admin.from("open_banking_connections").insert({
        user_id: user.id,
        provider: "enablebanking",
        requisition_id: state, // "state" übernimmt hier die Rolle der Korrelations-ID
        institution_id: b.institution_id,
        institution_name: instName,
        institution_logo: b.institution_logo || null,
        status: "CR",
      }).select().single();
      if (e) throw e;

      return out({ connection_id: c.id, requisition_id: state, link: authResp.url, status: "CR" });
    }

    // --- 3) Nach Rückkehr von der Bank: Code gegen Sitzung + Konten tauschen ---
    if (a === "get-accounts") {
      const cid = String(b.connection_id);
      const stateVal = String(b.requisition_id); // siehe Kommentar oben
      const code = String(b.code || "");
      if (!code) return out({ error: "Kein Autorisierungs-Code erhalten. Bitte erneut versuchen." }, 400);

      const { data: c } = await uc.from("open_banking_connections").select("*")
        .eq("id", cid).eq("requisition_id", stateVal).single();
      if (!c) return out({ error: "Verbindung nicht gefunden" }, 404);

      const session = await eb("/sessions", { method: "POST", body: JSON.stringify({ code }) });
      const accounts = (session.accounts || []).map((acc: any) => ({
        provider_account_id: acc.uid,
        iban: acc.account_id?.iban || null,
        account_name: acc.name || acc.product || "Bankkonto",
        owner_name: null,
        institution_id: c.institution_id,
      }));

      for (const acc of accounts) {
        await admin.from("open_banking_accounts").upsert({
          user_id: user.id,
          connection_id: cid,
          provider_account_id: acc.provider_account_id,
          iban: acc.iban,
          account_name: acc.account_name,
          owner_name: acc.owner_name,
          institution_id: acc.institution_id,
          selected: true,
        }, { onConflict: "user_id,provider_account_id" });
      }
      await admin.from("open_banking_connections").update({
        status: "LN", session_id: session.session_id, updated_at: new Date().toISOString(),
      }).eq("id", cid).eq("user_id", user.id);

      return out({ status: "LN", accounts });
    }

    // --- 4) Transaktionen für ausgewählte Konten synchronisieren ---
    if (a === "sync") {
      const cid = String(b.connection_id);
      const ids: string[] = Array.isArray(b.account_ids) ? b.account_ids : [];
      const { data: c } = await uc.from("open_banking_connections").select("*")
        .eq("id", cid).eq("user_id", user.id).single();
      if (!c) return out({ error: "Verbindung nicht gefunden" }, 404);

      const { data: accounts } = await uc.from("open_banking_accounts").select("*")
        .eq("connection_id", cid).eq("user_id", user.id)
        .in("provider_account_id", ids.length ? ids : ["__none__"]);

      const inserted: any[] = [];
      for (const acc of accounts || []) {
        let continuationKey: string | null = null;
        let pages = 0;
        do {
          const qs = continuationKey ? `?continuation_key=${encodeURIComponent(continuationKey)}` : "";
          const data = await eb(`/accounts/${encodeURIComponent(acc.provider_account_id)}/transactions${qs}`);
          for (const x of data.transactions || []) {
            // Nur gebuchte (nicht schwebende) Transaktionen übernehmen
            if (x.status && x.status !== "BOOK") continue;
            const amount = Number(x.transaction_amount?.amount);
            if (!Number.isFinite(amount)) continue;
            const isIncome = x.credit_debit_indicator === "CRDT";
            const pid = x.transaction_id || x.entry_reference ||
              [x.booking_date || "", x.transaction_amount?.amount || "", (x.remittance_information || []).join(" ")].join("|");
            const counterpartyName = isIncome ? x.debtor?.name : x.creditor?.name;
            const desc = (x.remittance_information || []).join(" ") || counterpartyName || "Bankbuchung";

            const row = {
              user_id: user.id,
              open_banking_account_id: acc.id,
              provider_transaction_id: pid,
              booking_date: x.booking_date || x.value_date || null,
              value_date: x.value_date || null,
              description: desc,
              counterparty: counterpartyName || null,
              amount,
              currency: x.transaction_amount?.currency || "EUR",
              raw: x,
            };
            const { data: created, error: e } = await admin.from("open_banking_transactions")
              .upsert(row, { onConflict: "user_id,open_banking_account_id,provider_transaction_id", ignoreDuplicates: true })
              .select().maybeSingle();
            if (!e && created) {
              inserted.push({ ...created, account_id: acc.id, account_name: acc.account_name, iban: acc.iban, istEinnahme: isIncome });
            }
          }
          continuationKey = data.continuation_key || null;
          pages++;
        } while (continuationKey && pages < 5);
      }

      await admin.from("open_banking_connections").update({
        status: "LN", last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", cid).eq("user_id", user.id);

      return out({ connection_id: cid, imported_count: inserted.length, transactions: inserted });
    }

    return out({ error: "Unbekannte action", allowed: ["institutions", "create-requisition", "get-accounts", "sync"] }, 400);
  } catch (e) {
    console.error(e);
    return out({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
