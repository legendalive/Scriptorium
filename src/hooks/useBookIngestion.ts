import { useCallback, useEffect, useRef, useState } from 'react';
import type { NovelChapterNode } from '../utils/chapterHierarchy';
import type { WorkerResponse } from '../workers/chapterParser.worker';

export type IngestStatus = 'idle' | 'working' | 'ready' | 'error';

export function useBookIngestion() {
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const pending = useRef(new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>());
  const nodesRef = useRef<NovelChapterNode[]>([]);

  const [status, setStatus] = useState<IngestStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [nodes, setNodes] = useState<NovelChapterNode[]>([]);
  const [meta, setMeta] = useState<{ totalWords: number; chars: number; cached: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/chapterParser.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const m = e.data;
        if (m.type === 'progress') { setProgress(m.percent); setStage(m.message); }
        else if (m.type === 'nodes') {
          nodesRef.current = m.nodes;
          setNodes(m.nodes);
          setMeta({ totalWords: m.totalWords, chars: m.chars, cached: m.cached });
          setProgress(100);
          setStatus('ready');
        } else if (m.type === 'body') {
          const p = pending.current.get(m.requestId);
          if (p) { pending.current.delete(m.requestId); p.resolve(m.text); }
        } else if (m.type === 'error') {
          const p = pending.current.get(m.requestId);
          if (p) { pending.current.delete(m.requestId); p.reject(new Error(m.message)); }
          setError(m.message);
          setStatus('error');
        }
      };
    }
    return workerRef.current;
  }, []);

  const ingest = useCallback(async (file: File, prefix = 'Chapter', target: 'novel' | 'manuscript' = 'novel') => {
    const w = getWorker();
    setStatus('working'); setError(null); setProgress(0); setStage('Reading file…'); setNodes([]);
    const buffer = await file.arrayBuffer(); // async, non-blocking
    const key = `${file.name}|${file.size}|${file.lastModified}`;
    const requestId = ++reqId.current;
    w.postMessage(
      { type: 'ingest', requestId, key, fileName: file.name, mime: file.type, prefix, target, buffer },
      [buffer] // transfer ownership: zero-copy, no structured-clone freeze
    );
  }, [getWorker]);

  /** Fetch one chapter's body on demand. The UI never holds the whole book. */
  const getChapterText = useCallback((index: number): Promise<string> => {
    const list = nodesRef.current;
    const node = list[index];
    if (!node) return Promise.reject(new Error(`Chapter ${index} not found`));
    const end = index + 1 < list.length ? list[index + 1].charIndex : Number.MAX_SAFE_INTEGER;
    const w = getWorker();
    const requestId = ++reqId.current;
    return new Promise((resolve, reject) => {
      pending.current.set(requestId, { resolve, reject });
      w.postMessage({ type: 'body', requestId, start: node.charIndex, end });
    });
  }, [getWorker]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  return { status, progress, stage, nodes, meta, error, ingest, getChapterText };
}
