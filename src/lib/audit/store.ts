/**
 * IndexedDB-backed audit log. Persists locally so the synthesised feed
 * survives page reloads within the same browser profile. Capped at
 * MAX_ENTRIES — oldest entries are trimmed when the cap is exceeded.
 *
 * IndexedDB is async by nature; we wrap every operation in a Promise so
 * callers don't have to deal with request/transaction events. SSR-safe:
 * every public function checks for `indexedDB` first and resolves to a
 * no-op shape during build / tests.
 */

import type { AuditEntry } from "./types";

const DB_NAME = "deligo-admin-audit";
const STORE = "entries";
const DB_VERSION = 1;
export const MAX_ENTRIES = 500;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("at", "at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>,
): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      fn(store)
        .then((value) => {
          tx.oncomplete = () => resolve(value);
          tx.onabort = () => reject(tx.error);
          tx.onerror = () => reject(tx.error);
        })
        .catch(reject);
    });
  });
}

function readAllSorted(): Promise<AuditEntry[]> {
  return withStore("readonly", (store) => {
    return new Promise<AuditEntry[]>((resolve) => {
      const items: AuditEntry[] = [];
      const cursorReq = store.index("at").openCursor(null, "prev");
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve(items);
          return;
        }
        items.push(cursor.value as AuditEntry);
        cursor.continue();
      };
      cursorReq.onerror = () => resolve(items);
    });
  }).then((v) => v ?? []);
}

export async function listAuditEntries(): Promise<AuditEntry[]> {
  return readAllSorted();
}

export async function pushAuditEntry(entry: AuditEntry): Promise<void> {
  await withStore("readwrite", async (store) => {
    store.put(entry);
    // Trim oldest if over cap.
    return new Promise<void>((resolve) => {
      const countReq = store.count();
      countReq.onsuccess = () => {
        const excess = countReq.result - MAX_ENTRIES;
        if (excess <= 0) {
          resolve();
          return;
        }
        // Delete the `excess` oldest entries (ascending by `at`).
        const cursorReq = store.index("at").openCursor(null, "next");
        let deleted = 0;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor || deleted >= excess) {
            resolve();
            return;
          }
          cursor.delete();
          deleted += 1;
          cursor.continue();
        };
        cursorReq.onerror = () => resolve();
      };
      countReq.onerror = () => resolve();
    });
  });
}

export async function clearAuditEntries(): Promise<void> {
  await withStore("readwrite", async (store) => {
    return new Promise<void>((resolve) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });
}
