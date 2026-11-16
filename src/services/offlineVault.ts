export type SyncStatusState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_ERROR';

export interface QueuedMutation {
  opId: string;
  dedupeKey: string;
  uid: string;
  actionType:
    | 'syncWorkspacePatch'
    | 'upsertCloudRoom'
    | 'upsertCloudRoomsBulk'
    | 'setCloudRoomArchived'
    | 'createCloudLedgerEntry'
    | 'createCloudLedgerEntriesBulk'
    | 'updateCloudLedgerEntry'
    | 'upsertCloudOperationalRecord'
    | 'setCloudOperationalRecordArchived';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'auditshield_vault_db';
const DB_VERSION = 1;
const STORE_STATE = 'workspaceState';
const STORE_QUEUE = 'syncQueue';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const qStore = db.createObjectStore(STORE_QUEUE, { keyPath: 'opId' });
        qStore.createIndex('createdAt', 'createdAt', { unique: false });
        qStore.createIndex('dedupeKey', 'dedupeKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveWorkspaceSnapshotToIDB(
  key: string,
  data: unknown
): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readwrite');
      tx.objectStore(STORE_STATE).put({
        key,
        data,
        savedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Non-blocking fallback
  }
}

export async function loadWorkspaceSnapshotFromIDB<T>(key: string): Promise<{
  data: T;
  savedAt: string;
} | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openVaultDb();
    const record = await new Promise<{ key: string; data: T; savedAt: string } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_STATE, 'readonly');
        const req = tx.objectStore(STORE_STATE).get(key);
        req.onsuccess = () => resolve(req.result as { key: string; data: T; savedAt: string } | undefined);
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    if (!record) return null;
    return { data: record.data, savedAt: record.savedAt };
  } catch {
    return null;
  }
}

export async function enqueueSyncMutation(
  mutation: Omit<QueuedMutation, 'opId' | 'createdAt' | 'retryCount'>
): Promise<QueuedMutation> {
  const item: QueuedMutation = {
    ...mutation,
    opId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  if (!hasIndexedDb()) return item;

  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const existingReq = store.getAll();
      existingReq.onsuccess = () => {
        const existing = (existingReq.result as QueuedMutation[]) || [];
        // Conflict/duplicate coalescing for identical dedupeKey
        const dup = existing.find((e) => e.dedupeKey === item.dedupeKey && e.uid === item.uid);
        if (dup) {
          store.delete(dup.opId);
        }
        store.put(item);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB failure in restricted environments
  }
  return item;
}

export async function listPendingSyncMutations(uid?: string): Promise<QueuedMutation[]> {
  if (!hasIndexedDb()) return [];
  try {
    const db = await openVaultDb();
    const items = await new Promise<QueuedMutation[]>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as QueuedMutation[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const filtered = uid ? items.filter((i) => i.uid === uid) : items;
    return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function removePendingSyncMutation(opId: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      tx.objectStore(STORE_QUEUE).delete(opId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB errors
  }
}

export async function markSyncMutationFailed(opId: string, errMsg: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const getReq = store.get(opId);
      getReq.onsuccess = () => {
        const cur = getReq.result as QueuedMutation | undefined;
        if (cur) {
          store.put({
            ...cur,
            retryCount: cur.retryCount + 1,
            lastError: errMsg,
          });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB errors
  }
}

/**
 * Pure helper usable both at runtime and in unit tests to coalesce/deduplicate queued mutations.
 */
export function coalesceMutationQueue(queue: QueuedMutation[], incoming: QueuedMutation): QueuedMutation[] {
  const filtered = queue.filter(
    (q) => !(q.uid === incoming.uid && q.dedupeKey === incoming.dedupeKey)
  );
  return [...filtered, incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
