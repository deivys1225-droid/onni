/** Tope global de precarga en aula (/coliseo): 10 MB, se recicla lo más antiguo. */
export const CLASS_VIDEO_PREFETCH_MAX_BYTES = 10 * 1024 * 1024;

const DB_NAME = "onniverso.classVideoPrefetch";
const STORE = "chunks";
const MIN_FETCH_BYTES = 256 * 1024;

type CacheEntry = {
  url: string;
  blob: Blob;
  size: number;
  updatedAt: number;
  /** Solo true si el archivo completo cabía en el presupuesto (reproducible vía blob). */
  complete: boolean;
};

const objectUrlBySource = new Map<string, string>();

function normalizeUrl(url: string): string {
  return url.trim();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "url" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getEntry(url: string): Promise<CacheEntry | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(normalizeUrl(url));
      r.onsuccess = () => resolve((r.result as CacheEntry | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

async function listEntries(): Promise<CacheEntry[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).getAll();
      r.onsuccess = () => resolve((r.result as CacheEntry[]) ?? []);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return [];
  }
}

async function getTotalStoredBytes(): Promise<number> {
  const entries = await listEntries();
  return entries.reduce((sum, item) => sum + item.size, 0);
}

async function deleteEntry(url: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(normalizeUrl(url));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* silencioso */
  }
}

export function revokeCachedObjectUrl(url: string): void {
  const key = normalizeUrl(url);
  const existing = objectUrlBySource.get(key);
  if (existing) URL.revokeObjectURL(existing);
  objectUrlBySource.delete(key);
}

async function evictOldestUntil(needBytes: number): Promise<void> {
  if (needBytes <= 0) return;
  const entries = await listEntries();
  entries.sort((a, b) => a.updatedAt - b.updatedAt);
  let freed = 0;
  for (const entry of entries) {
    if (freed >= needBytes) break;
    revokeCachedObjectUrl(entry.url);
    await deleteEntry(entry.url);
    freed += entry.size;
  }
}

async function storeEntry(entry: CacheEntry): Promise<void> {
  const total = await getTotalStoredBytes();
  const existing = await getEntry(entry.url);
  const extra = entry.size - (existing?.size ?? 0);
  if (extra > 0 && total + extra > CLASS_VIDEO_PREFETCH_MAX_BYTES) {
    await evictOldestUntil(total + extra - CLASS_VIDEO_PREFETCH_MAX_BYTES);
  }
  revokeCachedObjectUrl(entry.url);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readContentLength(url: string): Promise<number> {
  try {
    const head = await fetch(url, { method: "HEAD", mode: "cors", credentials: "omit" });
    if (!head.ok) return 0;
    const raw = head.headers.get("content-length");
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function fetchPartial(url: string, maxBytes: number): Promise<Blob | null> {
  if (maxBytes < MIN_FETCH_BYTES) return null;
  const end = maxBytes - 1;
  try {
    const ranged = await fetch(url, {
      method: "GET",
      headers: { Range: `bytes=0-${end}` },
      mode: "cors",
      credentials: "omit",
    });
    if (ranged.ok) {
      const blob = await ranged.blob();
      if (blob.size > 0) return blob.size > maxBytes ? blob.slice(0, maxBytes) : blob;
    }
  } catch {
    /* intentar GET completo abajo */
  }
  try {
    const full = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!full.ok) return null;
    const blob = await full.blob();
    if (blob.size > maxBytes) return blob.slice(0, maxBytes);
    return blob;
  } catch {
    return null;
  }
}

async function prefetchOne(url: string, budgetBytes: number): Promise<number> {
  const key = normalizeUrl(url);
  if (!/^https?:\/\//i.test(key) || budgetBytes < MIN_FETCH_BYTES) return 0;

  const contentLength = await readContentLength(url);
  if (contentLength > 0 && contentLength <= budgetBytes) {
    try {
      const res = await fetch(key, { mode: "cors", credentials: "omit" });
      if (!res.ok) return 0;
      const blob = await res.blob();
      await storeEntry({
        url: key,
        blob,
        size: blob.size,
        updatedAt: Date.now(),
        complete: true,
      });
      return blob.size;
    } catch {
      return 0;
    }
  }

  const chunkBytes = Math.min(budgetBytes, contentLength > 0 ? contentLength : budgetBytes);
  const partial = await fetchPartial(key, chunkBytes);
  if (!partial || partial.size === 0) return 0;
  // Trozo parcial: calienta red/caché; no se usa como src (MP4 incompleto no reproduce bien).
  return partial.size;
}

/**
 * Precarga en segundo plano la playlist de la clase (prioriza el índice activo).
 * No lanza errores visibles; fallos silenciosos en Drive u orígenes sin CORS.
 */
export async function prefetchClassVideoPlaylist(urls: string[], priorityIndex: number): Promise<void> {
  const unique = Array.from(new Set(urls.map(normalizeUrl).filter((u) => /^https?:\/\//i.test(u))));
  if (unique.length === 0) return;

  const ordered = [...unique];
  const priorityUrl = unique[Math.max(0, Math.min(priorityIndex, unique.length - 1))];
  ordered.sort((a, b) => {
    if (a === priorityUrl) return -1;
    if (b === priorityUrl) return 1;
    return 0;
  });

  let remaining = CLASS_VIDEO_PREFETCH_MAX_BYTES;
  const share = Math.max(MIN_FETCH_BYTES, Math.floor(CLASS_VIDEO_PREFETCH_MAX_BYTES / ordered.length));

  for (const url of ordered) {
    if (remaining < MIN_FETCH_BYTES) break;
    const budget = Math.min(remaining, share);
    const used = await prefetchOne(url, budget);
    remaining -= used;
  }
}

/** URL blob solo si el archivo completo quedó en caché (≤ presupuesto al descargar). */
export async function getCachedPlaybackUrl(url: string): Promise<string | null> {
  const entry = await getEntry(url);
  if (!entry?.complete) return null;
  const key = normalizeUrl(url);
  const existing = objectUrlBySource.get(key);
  if (existing) return existing;
  const objectUrl = URL.createObjectURL(entry.blob);
  objectUrlBySource.set(key, objectUrl);
  return objectUrl;
}
