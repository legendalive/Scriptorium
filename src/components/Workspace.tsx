import React, { useRef, useState, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Sparkles,
  Check,
  RefreshCw,
  X,
  Trash2,
  ChevronDown,
  Layers,
  Send,
  Maximize2,
  Minimize2,
  BookMarked,
} from 'lucide-react';
import { ChapterSegment, AiGenerationProgress } from '../types';
import {
  getParagraphIndices,
  getSentenceIndices,
  getCharScrollTop,
} from '../utils/scrollHelpers';
import { ChapterHierarchyDrawer } from './ChapterHierarchyDrawer';
import { parseChaptersFromText } from '../utils/chapterHierarchy';

interface WorkspaceProps {
  manuscriptText: string;
  onManuscriptChange: (val: string) => void;
  chapters: ChapterSegment[];
  onAcceptManuscript: () => void;
  novelText: string;
  onNovelChange: (val: string) => void;
  onClearNovel: () => void;
  novelWordCount: number;
  aiOutput: string;
  onAiOutputChange: (val: string) => void;
  aiProgress: AiGenerationProgress;
  onAcceptAi: () => void;
  onRewriteAi: () => void;
  onDiscardAi: () => void;
  mobilePrompt: string;
  setMobilePrompt: (val: string) => void;
  onGenerate: (p: string) => void;
  mainNovelRef: React.RefObject<HTMLTextAreaElement | null>;
  manuscriptRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  manuscriptText,
  onManuscriptChange,
  chapters,
  onAcceptManuscript,
  novelText,
  onNovelChange,
  onClearNovel,
  novelWordCount,
  aiOutput,
  onAiOutputChange,
  aiProgress,
  onAcceptAi,
  onRewriteAi,
  onDiscardAi,
  mobilePrompt,
  setMobilePrompt,
  onGenerate,
  mainNovelRef,
  manuscriptRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [col1Width, setCol1Width] = useState<number>(33); // percentage
  const [col2Width, setCol2Width] = useState<number>(34); // percentage
  const [col3Width, setCol3Width] = useState<number>(33); // percentage
  const [draggingDivider, setDraggingDivider] = useState<1 | 2 | null>(null);
  const [showChapterDrawer, setShowChapterDrawer] = useState(false);

  // Longform hierarchy & Fullscreen expand state
  const [isHierarchyOpen, setIsHierarchyOpen] = useState(false);
  const [isManuscriptExpanded, setIsManuscriptExpanded] = useState(false);

  const lastManuscriptWheel = useRef<number>(0);
  const lastNovelWheel = useRef<number>(0);

  // Escape key to exit fullscreen manuscript mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isManuscriptExpanded) {
        setIsManuscriptExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isManuscriptExpanded]);

  // Wheel listener: Manuscript scrolls paragraph by paragraph
  useEffect(() => {
    const manuscriptEl = manuscriptRef.current;
    if (!manuscriptEl) return;

    const onManuscriptWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!manuscriptEl.value.trim()) return;

      e.preventDefault();

      const now = Date.now();
      if (now - lastManuscriptWheel.current < 160) return;
      lastManuscriptWheel.current = now;

      const indices = getParagraphIndices(manuscriptEl.value);
      if (indices.length <= 1) return;

      const currentScrollTop = manuscriptEl.scrollTop;
      const scrollTops = indices.map((idx) => getCharScrollTop(manuscriptEl, idx));

      if (e.deltaY > 0) {
        // Scroll down: step to next paragraph
        const nextPos = scrollTops.find((pos) => pos > currentScrollTop + 4);
        if (nextPos !== undefined) {
          manuscriptEl.scrollTo({ top: nextPos, behavior: 'smooth' });
        } else {
          manuscriptEl.scrollTo({ top: manuscriptEl.scrollHeight, behavior: 'smooth' });
        }
      } else if (e.deltaY < 0) {
        // Scroll up: step to previous paragraph
        const prevPositions = scrollTops.filter((pos) => pos < currentScrollTop - 4);
        if (prevPositions.length > 0) {
          const prevPos = prevPositions[prevPositions.length - 1];
          manuscriptEl.scrollTo({ top: prevPos, behavior: 'smooth' });
        } else {
          manuscriptEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    manuscriptEl.addEventListener('wheel', onManuscriptWheel, { passive: false });
    return () => {
      manuscriptEl.removeEventListener('wheel', onManuscriptWheel);
    };
  }, [manuscriptRef, manuscriptText]);

  // Wheel listener: Main novel scrolls sentence by sentence
  useEffect(() => {
    const novelEl = mainNovelRef.current;
    if (!novelEl) return;

    const onNovelWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!novelEl.value.trim()) return;

      e.preventDefault();

      const now = Date.now();
      if (now - lastNovelWheel.current < 140) return;
      lastNovelWheel.current = now;

      const indices = getSentenceIndices(novelEl.value);
      if (indices.length <= 1) return;

      const currentScrollTop = novelEl.scrollTop;
      const scrollTops = indices.map((idx) => getCharScrollTop(novelEl, idx));

      if (e.deltaY > 0) {
        // Scroll down: step to next sentence
        const nextPos = scrollTops.find((pos) => pos > currentScrollTop + 2);
        if (nextPos !== undefined) {
          novelEl.scrollTo({ top: nextPos, behavior: 'smooth' });
        } else {
          novelEl.scrollTo({ top: novelEl.scrollHeight, behavior: 'smooth' });
        }
      } else if (e.deltaY < 0) {
        // Scroll up: step to previous sentence
        const prevPositions = scrollTops.filter((pos) => pos < currentScrollTop - 2);
        if (prevPositions.length > 0) {
          const prevPos = prevPositions[prevPositions.length - 1];
          novelEl.scrollTo({ top: prevPos, behavior: 'smooth' });
        } else {
          novelEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    novelEl.addEventListener('wheel', onNovelWheel, { passive: false });
    return () => {
      novelEl.removeEventListener('wheel', onNovelWheel);
    };
  }, [mainNovelRef, novelText]);

  // Navigation handlers from Chapter Hierarchy
  const handleJumpManuscript = (charIndex: number, length: number) => {
    const textarea = manuscriptRef.current;
    if (!textarea) return;
    const targetTop = getCharScrollTop(textarea, charIndex);
    textarea.scrollTo({ top: targetTop, behavior: 'smooth' });
    textarea.focus();
    textarea.setSelectionRange(charIndex, charIndex + Math.min(length, 40));
  };

  const handleJumpNovel = (charIndex: number, length: number) => {
    const textarea = mainNovelRef.current;
    if (!textarea) return;
    const targetTop = getCharScrollTop(textarea, charIndex);
    textarea.scrollTo({ top: targetTop, behavior: 'smooth' });
    textarea.focus();
    textarea.setSelectionRange(charIndex, charIndex + Math.min(length, 40));
  };

  const handleAddChapterBreak = (target: 'manuscript' | 'novel') => {
    if (target === 'novel') {
      const currentNodes = parseChaptersFromText(novelText, 'Chapter');
      const nextIdx = currentNodes.length + 1;
      const breakText = `\n\nChapter ${nextIdx}\n\n`;
      const textarea = mainNovelRef.current;
      if (textarea) {
        const start = textarea.selectionStart || novelText.length;
        const updated = novelText.slice(0, start) + breakText + novelText.slice(start);
        onNovelChange(updated);
        setTimeout(() => {
          const newPos = start + breakText.length;
          textarea.focus();
          textarea.setSelectionRange(newPos, newPos);
          textarea.scrollTo({ top: getCharScrollTop(textarea, start), behavior: 'smooth' });
        }, 50);
      } else {
        onNovelChange(novelText + breakText);
      }
    } else {
      const currentNodes = parseChaptersFromText(manuscriptText, 'Chapter');
      const nextIdx = currentNodes.length + 1;
      const breakText = `\n\nChapter ${nextIdx}\n\n`;
      const textarea = manuscriptRef.current;
      if (textarea) {
        const start = textarea.selectionStart || manuscriptText.length;
        const updated = manuscriptText.slice(0, start) + breakText + manuscriptText.slice(start);
        onManuscriptChange(updated);
        setTimeout(() => {
          const newPos = start + breakText.length;
          textarea.focus();
          textarea.setSelectionRange(newPos, newPos);
          textarea.scrollTo({ top: getCharScrollTop(textarea, start), behavior: 'smooth' });
        }, 50);
      } else {
        onManuscriptChange(manuscriptText + breakText);
      }
    }
  };

  // Dragging logic for column resizers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingDivider || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const currentX = e.clientX - rect.left;
      const pctX = (currentX / totalWidth) * 100;

      if (draggingDivider === 1) {
        const newCol1 = Math.max(15, Math.min(60, pctX));
        const diff = newCol1 - col1Width;
        const newCol2 = col2Width - diff;
        if (newCol2 >= 15) {
          setCol1Width(newCol1);
          setCol2Width(newCol2);
        }
      } else if (draggingDivider === 2) {
        const remainingForCol3 = 100 - pctX;
        const newCol3 = Math.max(15, Math.min(60, remainingForCol3));
        const diff = newCol3 - col3Width;
        const newCol2 = col2Width - diff;
        if (newCol2 >= 15) {
          setCol3Width(newCol3);
          setCol2Width(newCol2);
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingDivider(null);
    };

    if (draggingDivider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingDivider, col1Width, col2Width, col3Width]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Mobile Scripty prompt bar */}
      <div className="lg:hidden shrink-0 border-b border-zinc-800 bg-zinc-900/60 p-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mobilePrompt.trim() && aiProgress.status !== 'generating') {
              onGenerate(mobilePrompt);
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={mobilePrompt}
            onChange={(e) => setMobilePrompt(e.target.value)}
            placeholder="Command Scripty..."
            disabled={aiProgress.status === 'generating'}
            className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!mobilePrompt.trim() || aiProgress.status === 'generating'}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Main Workspace (with optional Collapsible Chapter Hierarchy Drawer) */}
      <main
        id="workspace"
        ref={containerRef}
        className="flex-1 min-h-0 flex overflow-hidden select-text relative"
      >
        {/* Collapsible Chapter & Scene Hierarchy Binder */}
        <ChapterHierarchyDrawer
          isOpen={isHierarchyOpen}
          onClose={() => setIsHierarchyOpen(false)}
          manuscriptText={manuscriptText}
          novelText={novelText}
          onJumpManuscript={handleJumpManuscript}
          onJumpNovel={handleJumpNovel}
          onAddChapterBreak={handleAddChapterBreak}
        />

        {/* ================= COLUMN 1: MANUSCRIPT ================= */}
        <section
          id="manuscriptCol"
          className={`h-full flex flex-col min-w-[200px] border-r border-zinc-800 bg-zinc-950/40 transition-all ${
            isManuscriptExpanded
              ? 'absolute inset-0 z-40 bg-zinc-950 w-full'
              : ''
          }`}
          style={isManuscriptExpanded ? { width: '100%' } : { width: `${col1Width}%` }}
        >
          {/* Header */}
          <div className="h-11 shrink-0 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Manuscript {isManuscriptExpanded && <span className="text-amber-400 lowercase font-normal">(fullscreen)</span>}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Collapsible Hierarchy Toggle Button */}
              <button
                id="toggleHierarchyBtn"
                onClick={() => setIsHierarchyOpen(!isHierarchyOpen)}
                className={`text-[11px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                  isHierarchyOpen
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                }`}
                title="Toggle Book Structure & Chapter Hierarchy"
              >
                <BookMarked className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Hierarchy</span>
              </button>

              {/* Detected Chapters Drawer Toggle */}
              <button
                id="toggleChapterDrawerBtn"
                onClick={() => setShowChapterDrawer(!showChapterDrawer)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors"
                title="View detected chapters"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>{chapters.length} ch</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    showChapterDrawer ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Small Expand to Fullscreen Button in top right */}
              <button
                id="expandManuscriptBtn"
                onClick={() => setIsManuscriptExpanded(!isManuscriptExpanded)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors ml-0.5"
                title={isManuscriptExpanded ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen Focus'}
              >
                {isManuscriptExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Editor & Chapter Drawer */}
          <div
            className={`flex-1 min-h-0 relative flex flex-col ${
              isManuscriptExpanded ? 'max-w-4xl mx-auto w-full px-4' : ''
            }`}
          >
            <textarea
              id="manuscriptEditor"
              ref={manuscriptRef}
              value={manuscriptText}
              onChange={(e) => onManuscriptChange(e.target.value)}
              spellCheck="true"
              placeholder="Paste or type raw draft chapters or research here..."
              className={`flex-1 w-full bg-transparent text-zinc-200 outline-none leading-relaxed resize-none font-serif placeholder:font-sans placeholder:text-zinc-600 overflow-y-auto ${
                isManuscriptExpanded
                  ? 'p-6 text-base sm:text-lg leading-loose'
                  : 'p-4 text-xs sm:text-sm'
              }`}
            />

            {/* Chapter Preview Drawer */}
            {showChapterDrawer && (
              <div
                id="chapterPreviewDrawer"
                className="shrink-0 max-h-48 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur p-3 overflow-y-auto space-y-2 shadow-2xl"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Detected Chapters ({chapters.length})</span>
                  <button
                    onClick={() => setShowChapterDrawer(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    Close
                  </button>
                </div>
                {chapters.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">
                    Type or paste text above to automatically detect scene boundaries.
                  </p>
                ) : (
                  chapters.map((ch) => (
                    <div
                      key={ch.index}
                      className="p-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-400/90 mb-1">
                        <span>{ch.title}</span>
                        <span className="text-zinc-500 font-mono">{ch.wordCount} words</span>
                      </div>
                      <p className="text-zinc-400 line-clamp-2 text-[11px] font-serif">
                        {ch.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bottom Accept Action */}
          <div
            className={`h-14 shrink-0 border-t border-zinc-800 p-2 bg-zinc-900/40 ${
              isManuscriptExpanded ? 'max-w-4xl mx-auto w-full px-4' : ''
            }`}
          >
            <div className="flex items-center gap-2 h-full">
              {isManuscriptExpanded && (
                <button
                  onClick={() => setIsManuscriptExpanded(false)}
                  className="h-10 px-4 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Return to Workspace</span>
                </button>
              )}
              <button
                id="acceptManuscriptBtn"
                onClick={onAcceptManuscript}
                disabled={!manuscriptText.trim()}
                className="flex-1 h-10 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-40 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Accept to Main Novel</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= DIVIDER 1 ================= */}
        {!isManuscriptExpanded && (
          <div
            id="divider1"
            onMouseDown={() => setDraggingDivider(1)}
            className={`w-[7px] shrink-0 cursor-col-resize relative bg-zinc-900 border-x border-zinc-800/80 hover:bg-zinc-700 transition-colors z-20 ${
              draggingDivider === 1 ? 'bg-amber-400' : ''
            }`}
            title="Drag to resize columns"
          >
            <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[1px] h-8 bg-zinc-600" />
          </div>
        )}

        {/* ================= COLUMN 2: MAIN NOVEL ================= */}
        {!isManuscriptExpanded && (
          <section
            id="mainCol"
            className="h-full flex flex-col min-w-[220px] bg-zinc-950/20"
            style={{ width: `${col2Width}%` }}
          >
            {/* Header */}
            <div className="h-11 shrink-0 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Main Novel
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  id="wordCount"
                  className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                >
                  {novelWordCount.toLocaleString()} {novelWordCount === 1 ? 'word' : 'words'}
                </span>

                <button
                  id="clearNovelBtn"
                  onClick={onClearNovel}
                  title="Clear Main Novel"
                  className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0 relative">
              <textarea
                id="mainNovelEditor"
                ref={mainNovelRef}
                value={novelText}
                onChange={(e) => onNovelChange(e.target.value)}
                spellCheck="true"
                placeholder="Your canon manuscript will grow here. Accept text from raw drafts or AI prompts..."
                className="w-full h-full p-5 bg-transparent text-sm sm:text-base text-zinc-100 outline-none leading-relaxed resize-none font-serif placeholder:font-sans placeholder:text-zinc-600 overflow-y-auto"
              />
            </div>
          </section>
        )}

        {/* ================= DIVIDER 2 ================= */}
        {!isManuscriptExpanded && (
          <div
            id="divider2"
            onMouseDown={() => setDraggingDivider(2)}
            className={`w-[7px] shrink-0 cursor-col-resize relative bg-zinc-900 border-x border-zinc-800/80 hover:bg-zinc-700 transition-colors z-20 ${
              draggingDivider === 2 ? 'bg-amber-400' : ''
            }`}
            title="Drag to resize columns"
          >
            <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[1px] h-8 bg-zinc-600" />
          </div>
        )}

        {/* ================= COLUMN 3: SCRIPTY (AI) ================= */}
        {!isManuscriptExpanded && (
          <section
            id="aiCol"
            className="h-full flex flex-col min-w-[200px] border-l border-zinc-800 bg-zinc-950/60"
            style={{ width: `${col3Width}%` }}
          >
            {/* Header */}
            <div className="h-11 shrink-0 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Scripty Output
                </span>
              </div>

              <div
                id="aiStatus"
                className={`text-[11px] truncate max-w-[180px] font-medium ${
                  aiProgress.status === 'generating'
                    ? 'text-amber-400 animate-pulse'
                    : aiProgress.status === 'error'
                    ? 'text-red-400'
                    : aiProgress.status === 'success'
                    ? 'text-emerald-400'
                    : 'text-zinc-500'
                }`}
                title={aiProgress.message}
              >
                {aiProgress.message || 'Idle'}
              </div>
            </div>

            {/* AI Output Editor */}
            <div className="flex-1 min-h-0 relative">
              <textarea
                id="aiOutput"
                value={aiOutput}
                onChange={(e) => onAiOutputChange(e.target.value)}
                spellCheck="true"
                placeholder="Scripty's novel prose and continuations will stream here..."
                className="w-full h-full p-4 bg-transparent text-xs sm:text-sm text-zinc-200 outline-none leading-relaxed resize-none font-serif placeholder:font-sans placeholder:text-zinc-600 overflow-y-auto"
              />
            </div>

            {/* AI Action Buttons */}
            <div className="shrink-0 border-t border-zinc-800 p-2 grid grid-cols-3 gap-2 bg-zinc-900/40">
              <button
                id="acceptAiBtn"
                onClick={onAcceptAi}
                disabled={!aiOutput.trim() || aiProgress.status === 'generating'}
                className="h-10 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Accept</span>
              </button>

              <button
                id="rewriteAiBtn"
                onClick={onRewriteAi}
                disabled={aiProgress.status === 'generating'}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                title="Rewrite current selection in Main Novel, or rewrite AI output"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    aiProgress.status === 'generating' ? 'animate-spin text-amber-400' : ''
                  }`}
                />
                <span>Rewrite</span>
              </button>

              <button
                id="discardAiBtn"
                onClick={onDiscardAi}
                disabled={!aiOutput.trim() || aiProgress.status === 'generating'}
                className="h-10 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-red-950/40 hover:border-red-900/60 hover:text-red-300 text-xs font-medium text-zinc-400 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
