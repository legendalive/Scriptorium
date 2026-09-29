import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Loader2, Upload } from 'lucide-react';
import { useBookIngestion } from '../hooks/useBookIngestion';
import type { NovelChapterNode } from '../utils/chapterHierarchy';

interface BookUploaderProps {
  prefix?: string;
  target?: 'novel' | 'manuscript';
  onReady?: (
    nodes: NovelChapterNode[],
    meta: { totalWords: number; chars: number; cached: boolean }
  ) => void;
}

export default function BookUploader({
  prefix = 'Chapter',
  target = 'novel',
  onReady,
}: BookUploaderProps) {
  const { status, progress, stage, nodes, meta, error, ingest, getChapterText } =
    useBookIngestion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const [chapterBody, setChapterBody] = useState<string | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);

  useEffect(() => {
    if (status === 'ready' && meta && onReady) onReady(nodes, meta);
  }, [status, nodes, meta, onReady]);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      setFileName(file.name);
      setOpenChapter(null);
      setChapterBody(null);
      void ingest(file, prefix, target);
    },
    [ingest, prefix, target]
  );

  const openChapterAt = useCallback(
    async (index: number) => {
      setOpenChapter(index);
      setChapterBody(null);
      setChapterLoading(true);
      try {
        const text = await getChapterText(index);
        setChapterBody(text);
      } catch (e) {
        setChapterBody(`Could not load chapter: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setChapterLoading(false);
      }
    },
    [getChapterText]
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 bg-zinc-900/40'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <Upload className="h-8 w-8 text-zinc-400" />
        <div>
          <p className="text-sm font-medium text-zinc-200">Drop your manuscript here</p>
          <p className="mt-1 text-xs text-zinc-500">
            .docx, .txt or .md — images are ignored automatically
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          disabled={status === 'working'}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.txt,.md,.markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {status === 'working' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span>
              {fileName ? `${fileName} — ` : ''}
              {stage}
            </span>
            <span className="ml-auto tabular-nums text-zinc-500">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Could not process this file</p>
            <p className="mt-1 text-red-400/90">{error}</p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="border-b border-zinc-800 p-3 text-xs text-zinc-400">
              <p className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <BookOpen className="h-3.5 w-3.5" /> {nodes.length} chapters
              </p>
              <p className="mt-1">
                {meta?.totalWords.toLocaleString()} words
                {meta?.cached ? ' · loaded from cache' : ''}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {nodes.map((node, i) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => void openChapterAt(i)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-zinc-800/60 px-3 py-2 text-left text-sm transition-colors ${
                    openChapter === i
                      ? 'bg-blue-600/20 text-blue-200'
                      : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="truncate font-medium">{node.title}</span>
                  <span className="text-xs text-zinc-500">
                    {node.wordCount.toLocaleString()} words
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            {openChapter === null ? (
              <p className="text-sm text-zinc-500">
                Select a chapter to read it. Only the chapter you open is loaded into memory.
              </p>
            ) : chapterLoading ? (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading chapter…
              </p>
            ) : (
              <article className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {chapterBody}
              </article>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { BookUploader };
