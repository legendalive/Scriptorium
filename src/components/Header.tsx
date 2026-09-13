import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Settings,
  Library,
  FileDown,
  Send,
  Sparkles,
  ChevronDown,
  FileText,
  FileType,
} from 'lucide-react';
import { Project } from '../types';

interface HeaderProps {
  project: Project | null;
  onOpenConfig: () => void;
  onOpenSettings: () => void;
  onOpenProjects: () => void;
  onExportDocx: () => void;
  onExportMarkdown: () => void;
  onExportText: () => void;
  prompt: string;
  setPrompt: (val: string) => void;
  onGenerate: (p: string) => void;
  generating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onOpenConfig,
  onOpenSettings,
  onOpenProjects,
  onExportDocx,
  onExportMarkdown,
  onExportText,
  prompt,
  setPrompt,
  onGenerate,
  generating,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !generating) {
      onGenerate(prompt.trim());
      setPrompt('');
    }
  };

  return (
    <header className="h-16 shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center px-4 gap-3 z-30">
      {/* Config Button */}
      <button
        id="configBtn"
        onClick={onOpenConfig}
        className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 flex items-center gap-2 text-xs font-semibold text-zinc-200 transition-colors shrink-0"
        title="Open Project Bible & Config"
      >
        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">Config</span>
      </button>

      {/* Center Project Indicator */}
      <div className="flex-1 min-w-0 text-center px-2">
        <div className="font-bold tracking-wide text-zinc-100 text-sm sm:text-base flex items-center justify-center gap-2">
          <span>Scriptorium</span>
          {project?.type === 'series' && (
            <span className="hidden md:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Series
            </span>
          )}
        </div>
        <div
          id="projectIndicator"
          className="text-[11px] text-zinc-400 truncate cursor-pointer hover:text-amber-300 transition-colors"
          onClick={onOpenProjects}
          title="Click to switch projects"
        >
          {project
            ? project.seriesName
              ? `${project.seriesName} · ${project.bookName}`
              : project.bookName
            : 'No project loaded — Click to select'}
        </div>
      </div>

      {/* Action Buttons & Prompt */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Project Manager Button */}
        <button
          id="projectBtn"
          onClick={onOpenProjects}
          title="Manage Projects"
          className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
        >
          <Library className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          id="settingsBtn"
          onClick={onOpenSettings}
          title="Vendor & AI Settings"
          className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 text-xs font-medium transition-colors"
        >
          <Settings className="w-4 h-4 text-zinc-400" />
          <span className="hidden md:inline">Settings</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            id="exportBtn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="h-9 px-3 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 ml-0.5 text-zinc-600" />
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 top-10 w-44 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-1.5 z-30 space-y-0.5">
                <button
                  id="exportDocxOption"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportDocx();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-xs text-zinc-200 hover:text-white flex items-center gap-2"
                >
                  <FileType className="w-4 h-4 text-blue-400" />
                  <span>Word DOCX (.docx)</span>
                </button>
                <button
                  id="exportMdOption"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportMarkdown();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-xs text-zinc-200 hover:text-white flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  id="exportTxtOption"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportText();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-xs text-zinc-200 hover:text-white flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>Plain Text (.txt)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop Prompt Input */}
        <form
          onSubmit={handleSubmit}
          className="hidden lg:flex h-9 w-[360px] rounded-lg border border-zinc-700 bg-zinc-950/90 overflow-hidden focus-within:border-amber-400 transition-colors"
        >
          <input
            id="promptInput"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
            placeholder="Scripty: write, continue, describe, rewrite..."
            className="flex-1 bg-transparent outline-none px-3 text-xs text-zinc-200 placeholder:text-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            title="Send to Scripty (Ctrl+Enter)"
            className="px-3 text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 disabled:opacity-30 transition-colors flex items-center justify-center"
          >
            {generating ? (
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </header>
  );
};
