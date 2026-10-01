import React, { useState, useEffect } from 'react';
import { ChapterHierarchyDrawer } from './components/ChapterHierarchyDrawer';
import { NovelChapterNode, parseChaptersFromText } from './utils/chapterHierarchy';

export const EditorContainer: React.FC = () => {
  // 1. Core Workflow States
  const [manuscriptText, setManuscriptText] = useState<string>('');
  const [aiOutputText, setAiOutputText] = useState<string>('');
  const [novelText, setNovelText] = useState<string>('');

  // 2. Structural Chapter States
  const [novelChapters, setNovelChapters] = useState<NovelChapterNode[]>([]);
  const [manuscriptChapters, setManuscriptChapters] = useState<NovelChapterNode[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  // Debounced parsing for Main Novel (Final Draft)
  // We parse directly here since the text is already in memory. 
  // The Web Worker is now reserved exclusively for heavy file ingestion in ProjectModal.
  useEffect(() => {
    const timer = setTimeout(() => {
      setNovelChapters(parseChaptersFromText(novelText, 'Chapter'));
    }, 400);
    return () => clearTimeout(timer);
  }, [novelText]);

  // Debounced parsing for Manuscript (Working Draft)
  useEffect(() => {
    const timer = setTimeout(() => {
      setManuscriptChapters(parseChaptersFromText(manuscriptText, 'Section'));
    }, 400);
    return () => clearTimeout(timer);
  }, [manuscriptText]);

  // Actions for Workflow Transitions
  const handleAcceptAiOutput = () => {
    setNovelText((prev) => (prev ? `${prev}\n\n${aiOutputText}` : aiOutputText));
    setAiOutputText('');
  };

  const handleDiscardAiOutput = () => {
    setAiOutputText('');
  };

  const handleJumpToChar = (target: 'novel' | 'manuscript', charIndex: number) => {
    const element = document.getElementById(
      target === 'novel' ? 'novelEditor' : 'manuscriptEditor'
    );
    if (element) {
      element.focus();
      if ('setSelectionRange' in element) {
        (element as HTMLTextAreaElement).setSelectionRange(charIndex, charIndex);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Chapter Hierarchy Drawer */}
      <ChapterHierarchyDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        novelChapters={novelChapters}
        manuscriptChapters={manuscriptChapters}
        onJumpNovel={(idx) => handleJumpToChar('novel', idx)}
        onJumpManuscript={(idx) => handleJumpToChar('manuscript', idx)}
        onAddChapterBreak={(target) => {
          const breakText = '\n\n# Chapter \n\n';
          if (target === 'novel') {
            setNovelText((prev) => prev + breakText);
          } else {
            setManuscriptText((prev) => prev + breakText);
          }
        }}
      />

      {/* Main Multi-Pane Workspace */}
      <main className="flex-1 flex min-w-0 h-full divide-x divide-zinc-800">
        {/* Pane 1: Manuscript Area (Raw/Existing Draft) */}
        <section className="flex-1 flex flex-col min-w-0 bg-zinc-900/40">
          <div className="h-10 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/80">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              1. Manuscript (Working Draft)
            </span>
          </div>
          <textarea
            id="manuscriptEditor"
            value={manuscriptText}
            onChange={(e) => setManuscriptText(e.target.value)}
            placeholder="Type or paste your raw draft here..."
            className="flex-1 p-4 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-zinc-200 placeholder-zinc-600"
          />
        </section>

        {/* Pane 2: AI Output Area (Staging / Polishing) */}
        <section className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          <div className="h-10 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/80">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              2. AI Output (Review Stage)
            </span>
            {aiOutputText && (
              <div className="flex gap-2">
                <button
                  onClick={handleDiscardAiOutput}
                  className="px-2 py-1 rounded text-xs bg-red-950/60 text-red-300 border border-red-800 hover:bg-red-900/50"
                >
                  Discard
                </button>
                <button
                  onClick={handleAcceptAiOutput}
                  className="px-2 py-1 rounded text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/50"
                >
                  Accept to Novel
                </button>
              </div>
            )}
          </div>
          <textarea
            value={aiOutputText}
            onChange={(e) => setAiOutputText(e.target.value)}
            placeholder="AI suggestions or rewrites will appear here for review..."
            className="flex-1 p-4 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-zinc-300 placeholder-zinc-600"
          />
        </section>

        {/* Pane 3: Main Novel Area (Final Master Draft) */}
        <section className="flex-1 flex flex-col min-w-0 bg-zinc-900/40">
          <div className="h-10 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/80">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              3. Main Novel (Final Draft)
            </span>
          </div>
          <textarea
            id="novelEditor"
            value={novelText}
            onChange={(e) => setNovelText(e.target.value)}
            placeholder="Final assembled chapters reside here..."
            className="flex-1 p-4 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-zinc-200 placeholder-zinc-600"
          />
        </section>
      </main>
    </div>
  );
};
