/*
 * Local storage backend for Clinic Outreach Desk.
 *
 * The page was written against a small Firestore-style API
 * (collection().onSnapshot / doc().set / update / delete).
 * When no host runtime provides one, this shim implements the same
 * API on top of the browser's localStorage, so the app works as a
 * plain static site (GitHub Pages, a local file, any web server).
 *
 * Data never leaves the browser. Use Export / Import to back up or
 * move data between devices.
 */
(function () {
  if (window.claude && typeof window.claude.use === "function") return; // host runtime present

  var PREFIX = "clinic-outreach-desk:";
  var listeners = {}; // collection -> [fn]
  var memory = {};    // fallback when localStorage is blocked

  function load(col) {
    try {
      var raw = localStorage.getItem(PREFIX + col);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return memory[col] || {};
    }
  }
  function save(col, map) {
    memory[col] = map;
    try {
      localStorage.setItem(PREFIX + col, JSON.stringify(map));
    } catch (e) {
      if (e && e.name === "QuotaExceededError") throw { code: "quota_exceeded", message: "Browser storage is full." };
    }
    notify(col);
  }
  function snapshot(col) {
    var map = load(col);
    var docs = Object.keys(map).sort().map(function (id) {
      var body = map[id];
      return { id: id, exists: true, data: function () { return JSON.parse(JSON.stringify(body)); }, metadata: { fromCache: false, hasPendingWrites: false } };
    });
    return { docs: docs, size: docs.length, empty: docs.length === 0, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function notify(col) {
    (listeners[col] || []).slice().forEach(function (fn) {
      try { fn(snapshot(col)); } catch (e) { console.error(e); }
    });
  }
  function newId() {
    var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", s = "";
    var bytes = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(20)) : null;
    for (var i = 0; i < 20; i++) s += a[(bytes ? bytes[i] : Math.floor(Math.random() * 256)) % a.length];
    return s;
  }
  function docRef(col, id) {
    return {
      id: id,
      path: col + "/" + id,
      get: function () {
        var map = load(col);
        var body = map[id];
        return Promise.resolve({ id: id, exists: !!body, data: function () { return body ? JSON.parse(JSON.stringify(body)) : undefined; }, metadata: { fromCache: false, hasPendingWrites: false } });
      },
      set: function (data) {
        return new Promise(function (resolve, reject) {
          try { var map = load(col); map[id] = JSON.parse(JSON.stringify(data)); save(col, map); resolve(); } catch (e) { reject(e); }
        });
      },
      update: function (data) {
        return new Promise(function (resolve, reject) {
          try {
            var map = load(col);
            if (!map[id]) return reject({ code: "invalid_argument", message: "Document does not exist." });
            var patch = JSON.parse(JSON.stringify(data));
            Object.keys(patch).forEach(function (k) { map[id][k] = patch[k]; });
            save(col, map); resolve();
          } catch (e) { reject(e); }
        });
      },
      delete: function () {
        return new Promise(function (resolve, reject) {
          try { var map = load(col); delete map[id]; save(col, map); resolve(); } catch (e) { reject(e); }
        });
      }
    };
  }
  function collectionRef(col) {
    return {
      path: col,
      doc: function (id) { return docRef(col, id || newId()); },
      add: function (data) { var r = docRef(col, newId()); return r.set(data).then(function () { return r; }); },
      get: function () { return Promise.resolve(snapshot(col)); },
      onSnapshot: function (next) {
        (listeners[col] = listeners[col] || []).push(next);
        setTimeout(function () { next(snapshot(col)); }, 0);
        return function () { listeners[col] = (listeners[col] || []).filter(function (f) { return f !== next; }); };
      }
    };
  }

  var db = {
    collection: collectionRef,
    doc: function (path) { var p = path.split("/"); return docRef(p[0], p[1]); }
  };

  // Keep several open tabs in sync.
  window.addEventListener("storage", function (e) {
    if (e.key && e.key.indexOf(PREFIX) === 0) notify(e.key.slice(PREFIX.length));
  });

  window.claude = { use: function (name) { return Promise.resolve(name === "db" ? db : null); } };

  /* ---------- backup: export / import ---------- */
  var COLLECTIONS = ["clinics", "tasks", "tags"];
  window.ClinicDeskBackup = {
    exportJSON: function () {
      var out = { app: "clinic-outreach-desk", version: 1, exportedAt: new Date().toISOString() };
      COLLECTIONS.forEach(function (c) { out[c] = load(c); });
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "clinic-outreach-desk-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    },
    importJSON: function (file, mode) {
      return file.text().then(function (txt) {
        var data = JSON.parse(txt);
        if (!data || data.app !== "clinic-outreach-desk") throw new Error("This file isn't a Clinic Outreach Desk backup.");
        COLLECTIONS.forEach(function (c) {
          var incoming = data[c] || {};
          var map = mode === "replace" ? {} : load(c);
          Object.keys(incoming).forEach(function (id) { map[id] = incoming[id]; });
          save(c, map);
        });
      });
    }
  };
})();
