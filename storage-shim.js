/* =========================================================================
   STORAGE SHIM für eigenständiges Hosting
   Bildet die window.storage-API (wie in Claude Artifacts) auf
   localStorage im Browser nach, damit die App ohne Claude läuft.
   Daten bleiben lokal im Browser des jeweiligen Besuchers gespeichert.
   ========================================================================= */
(function () {
  const PREFIX = "finanzmanager:";

  function fullKey(key, shared) {
    // "shared" wird hier ignoriert (kein Server-Backend vorhanden) —
    // alle Daten landen im localStorage des aktuellen Browsers.
    return PREFIX + key;
  }

  window.storage = {
    async get(key, shared) {
      try {
        const raw = localStorage.getItem(fullKey(key, shared));
        if (raw === null) return null;
        return { key, value: raw, shared: !!shared };
      } catch (e) {
        return null;
      }
    },
    async set(key, value, shared) {
      try {
        localStorage.setItem(fullKey(key, shared), value);
        return { key, value, shared: !!shared };
      } catch (e) {
        return null;
      }
    },
    async delete(key, shared) {
      try {
        const k = fullKey(key, shared);
        const existed = localStorage.getItem(k) !== null;
        localStorage.removeItem(k);
        return { key, deleted: existed, shared: !!shared };
      } catch (e) {
        return null;
      }
    },
    async list(prefix, shared) {
      try {
        const full = PREFIX + (prefix || "");
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(full)) keys.push(k.slice(PREFIX.length));
        }
        return { keys, prefix, shared: !!shared };
      } catch (e) {
        return null;
      }
    }
  };
})();
