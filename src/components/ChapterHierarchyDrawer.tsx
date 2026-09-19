import React, { useState, useMemo } from 'react';
import {
  BookMarked,
  X,
  FileText,
  BookOpen,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { parseChaptersFromText, NovelChapterNode } from '../utils/chapterHierarchy';

interface ChapterHierarchyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptText?: string;
  novelText?: string;
  onJumpManuscript: (charIndex: number, length: number) => void;
  onJumpNovel: (charIndex: number, length: number) => void;
  onAddChapterBreak: (target: 'manuscript' | 'novel') => void;
}

export const ChapterHierarchyDrawer: React.FC<ChapterHierarchyDrawerProps> = ({
  isOpen,
  onClose,
  manuscriptText = '',
  novelText = '',
  onJumpManuscript,
  onJumpNovel,
  onAddChapterBreak,
}) => {
  const [activeTab, setActiveTab] = useState<'novel' | 'manuscript'>('novel');

  const safeNovelText = novelText || '';
  const safeManuscriptText = manuscriptText || '';

  const novelChapters = useMemo(
    () => parseChaptersFromText(safeNovelText, 'Chapter'),
    [safeNovelText]
  );

  const manuscriptChapters = useMemo(
    () => parseChaptersFromText(safeManuscriptText, 'Draft Section'),
    [safeManuscriptText]
  );

  const currentChapters = activeTab === 'novel' ? novelChapters : manuscriptChapters;
  const currentTotalWords = (currentChapters || []).reduce((acc, c) => acc + (c?.wordCount || 0), 0);

  if (!isOpen) return null;

  return (
    <aside
      id="chapterHierarchyDrawer"
      className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col z-30 transition-all duration-200 select-none animate-in slide-in-from-left"
    >
      {/* Header */}
      <div className="h-11 shrink-0 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Structure & Chapters
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Collapse Hierarchy Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Selector Tabs */}
      <div className="p-2 border-b border-zinc-800/80 bg-zinc-900/30 flex gap-1">
        <button
          onClick={() => setActiveTab('novel')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'novel'
              ? 'bg-zinc-800 text-amber-400 shadow-sm border border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          <span>Main Novel ({novelChapters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manuscript')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'manuscript'
              ? 'bg-zinc-800 text-amber-400 shadow-sm border border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Manuscript ({manuscriptChapters.length})</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-3 py-1.5 border-b border-zinc-800/60 bg-zinc-900/10 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{currentChapters.length} {currentChapters.length === 1 ? 'Chapter' : 'Chapters'}</span>
        <span className="font-mono text-zinc-300">{currentTotalWords.toLocaleString()} words</span>
      </div>

      {/* Chapter List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {currentChapters.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs italic">
            No chapters detected yet. Add a chapter heading or start typing to begin organizing.
          </div>
        ) : (
          currentChapters.map((node: NovelChapterNode) => (
            <div
              key={node.id}
              onClick={() => {
                const titleLength = (node.title || '').length;
                if (activeTab === 'novel') {
                  onJumpNovel(node.charIndex, titleLength);
                } else {
                  onJumpManuscript(node.charIndex, titleLength);
                }
              }}
              className="group p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/80 hover:border-zinc-700 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-amber-500/80 shrink-0">
                    #{node.index}
                  </span>
                  <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-amber-300 transition-colors">
                    {node.title || 'Untitled'}
                  </span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors mt-0.5" />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                <span className="font-mono text-zinc-400">{(node.wordCount || 0).toLocaleString()} w</span>
                {node.preview && (
                  <span className="truncate max-w-[150px] text-zinc-500 italic text-[10px]">
                    {node.preview}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action: Add Chapter Break */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-900/40 shrink-0">
        <button
          onClick={() => onAddChapterBreak(activeTab)}
          className="w-full py-2 px-3 rounded-lg border border-zinc-700/80 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Insert Chapter Break</span>
        </button>
      </div>
    </aside>
  );
};