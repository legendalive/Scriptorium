/// <reference lib="webworker" />
import { parseChaptersFromText, NovelChapterNode } from '../utils/chapterHierarchy';
import { pickExtractor } from '../utils/textExtractors';

export type WorkerRequest =
  | { type: 'ingest'; requestId: number; key: string; fileName: string; mime: string;
      prefix: string; target: 'novel' | 'manuscript'; buffer: ArrayBuffer }
  | { type: 'body'; requestId: number; start: number; end: number }
  | { type: 'reset' };

export type WorkerResponse =
  | { type: 'progress'; requestId: number; percent: number; message: string }
  | { type: 'nodes'; requestId: number; target: 'novel' | 'manuscript';
      nodes: NovelChapterNode[]; totalWords: number; chars: number; cached: boolean }
  | { type: 'body'; requestId: number; start: number; end: number; text: string }
  | { type: 'error'; requestId: number; message: string };

const post = (m: WorkerResponse) => (self as unknown as Worker).postMessage(m);

/** The full book text lives ONLY here, never in the UI thread. */
let currentText: string | null = null;

/* ---- best-effort IndexedDB cache: re-opening the same file is instant ---- */
const DB = 'scriptorium-cache', STORE = 'texts';
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
  } catch { return null; }
}
async function cacheSet(key: string, text: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(text, key);
      tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); tx.onabort = () => resolve();
    });
  } catch { /* cache is optional */ }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === 'reset') { currentText = null; return; }

  if (msg.type === 'body') {
    const text = currentText ?? '';
    post({ type: 'body', requestId: msg.requestId, start: msg.start, end: msg.end,
           text: text.slice(msg.start, msg.end) });
    return;
  }

  const { requestId, key, fileName, mime, prefix, target, buffer } = msg;
  try {
    let cached = false;
    let text = await cacheGet(key);
    if (text) {
      cached = true;
      post({ type: 'progress', requestId, percent: 80, message: 'Loaded from cache…' });
    } else {
      const extract = pickExtractor(fileName, mime);
      if (!extract) throw new Error(`Unsupported file type: ${fileName}`);
      post({ type: 'progress', requestId, percent: 5, message: 'Reading file…' });
      // Scale extractor progress into the 5–90% band.
      text = await extract(buffer, (p, m) =>
        post({ type: 'progress', requestId, percent: Math.round(5 + p * 0.85), message: m }));
      cacheSet(key, text); // fire-and-forget
    }

    currentText = text;
    post({ type: 'progress', requestId, percent: 92, message: 'Detecting chapters…' });
    const nodes = parseChaptersFromText(text, prefix);
    const totalWords = nodes.reduce((s, n) => s + n.wordCount, 0);
    post({ type: 'progress', requestId, percent: 100, message: 'Done' });
    post({ type: 'nodes', requestId, target, nodes, totalWords, chars: text.length, cached });
  } catch (err) {
    post({ type: 'error', requestId, message: err instanceof Error ? err.message : String(err) });
  }
};
