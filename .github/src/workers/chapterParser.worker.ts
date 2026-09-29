/// <reference lib="webworker" />
import { parseChaptersFromText, fastWordCount, NovelChapterNode } from '../utils/chapterHierarchy';
import { pickExtractor } from '../utils/textExtractors';

export type WorkerRequest = {
  type: 'ingest';
  requestId: number;
  key: string;
  fileName: string;
  mime: string;
  prefix: string;
  buffer: ArrayBuffer;
};

export type WorkerResponse =
  | { type: 'progress'; requestId: number; percent: number; message: string }
  | {
      type: 'result';
      requestId: number;
      fileName: string;
      text: string;
      nodes: NovelChapterNode[];
      wordCount: number;
      cached: boolean;
    }
  | { type: 'error'; requestId: number; message: string };

const post = (m: WorkerResponse) => (self as unknown as Worker).postMessage(m);

/* ---- IndexedDB cache: re-importing the same file is instant ---- */
const DB = 'scriptorium-cache';
const STORE = 'texts';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => { rq.result.createObjectStore(STORE); };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}
async function cacheGet(key: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      rq.onsuccess = () => resolve(typeof rq.result === 'string' ? rq.result : null);
      rq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
async function cacheSet(key: string, text: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(text, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* cache is best-effort */
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { requestId, key, fileName, mime, prefix, buffer } = e.data;
  try {
    let cached = false;
    let text = await cacheGet(key);
    if (text) {
      cached = true;
      post({ type: 'progress', requestId, percent: 70, message: 'Loaded from cache…' });
    } else {
      const extract = pickExtractor(fileName, mime);
      if (!extract) throw new Error(`Unsupported file type: ${fileName}`);
      post({ type: 'progress', requestId, percent: 5, message: 'Reading file…' });
      text = await extract(buffer, (p, m) =>
        post({ type: 'progress', requestId, percent: Math.round(5 + p * 0.75), message: m })
      );
      cacheSet(key, text);
    }
    post({ type: 'progress', requestId, percent: 85, message: 'Detecting chapters…' });
    const nodes = parseChaptersFromText(text, prefix);
    const wordCount = fastWordCount(text);
    post({ type: 'progress', requestId, percent: 100, message: 'Done' });
    post({ type: 'result', requestId, fileName, text, nodes, wordCount, cached });
  } catch (err) {
    post({ type: 'error', requestId, message: err instanceof Error ? err.message : String(err) });
  }
};
