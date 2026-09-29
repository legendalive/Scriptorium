import type { NovelChapterNode } from '../utils/chapterHierarchy';

export interface IngestResult {
  fileName: string;
  text: string;
  nodes: NovelChapterNode[];
  wordCount: number;
  cached: boolean;
}

export type IngestProgress = (percent: number, message: string) => void;

type WorkerResponse =
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

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (r: IngestResult) => void; reject: (e: Error) => void; onProgress?: IngestProgress }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/chapterParser.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const m = e.data;
      const entry = pending.get(m.requestId);
      if (!entry) return;
      if (m.type === 'progress') {
        entry.onProgress?.(m.percent, m.message);
      } else if (m.type === 'result') {
        pending.delete(m.requestId);
        entry.resolve({
          fileName: m.fileName,
          text: m.text,
          nodes: m.nodes,
          wordCount: m.wordCount,
          cached: m.cached,
        });
      } else {
        pending.delete(m.requestId);
        entry.reject(new Error(m.message));
      }
    };
    worker.onerror = (e: ErrorEvent) => {
      const err = new Error(e.message || 'The processing worker crashed.');
      pending.forEach((p) => p.reject(err));
      pending.clear();
    };
  }
  return worker;
}

/**
 * Decodes + parses a manuscript entirely off the main thread.
 * The ArrayBuffer is TRANSFERRED (zero-copy), so the UI never stalls.
 */
export async function ingestManuscriptFile(
  file: File,
  onProgress?: IngestProgress
): Promise<IngestResult> {
  const buffer = await file.arrayBuffer();
  const requestId = ++nextId;
  const key = `${file.name}|${file.size}|${file.lastModified}`;
  return new Promise<IngestResult>((resolve, reject) => {
    pending.set(requestId, { resolve, reject, onProgress });
    getWorker().postMessage(
      { type: 'ingest', requestId, key, fileName: file.name, mime: file.type, prefix: 'Chapter', buffer },
      [buffer]
    );
  });
}
