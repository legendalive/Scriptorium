import React, { useState, useRef } from 'react';
import { FolderKanban, Sparkles } from 'lucide-react';
import { ChapterSegment, AiGenerationProgress, Project } from './types';
import { parseChaptersFromText } from './utils/chapterHierarchy';

// Imports from your components folder
import { Header } from './components/Header';
import { Workspace } from './components/Workspace';

export const App: React.FC = () => {
  // Navigation / View State
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(true);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);

  // Active Project & Content State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [manuscriptText, setManuscriptText] = useState<string>('');
  const [novelText, setNovelText] = useState<string>('');
  const [aiOutput, setAiOutput] = useState<string>('');
  const [mobilePrompt, setMobilePrompt] = useState<string>('');

  // AI Progress State
  const [aiProgress, setAiProgress] = useState<AiGenerationProgress>({
    status: 'idle',
    message: '',
  });

  // Editor Refs
  const mainNovelRef = useRef<HTMLTextAreaElement | null>(null);
  const manuscriptRef = useRef<HTMLTextAreaElement | null>(null);

  // Derived state: Automatically parse chapters from manuscript text
  const chapters: ChapterSegment[] = parseChaptersFromText(manuscriptText, 'Chapter');

  // Word count helper
  const novelWordCount = novelText.trim()
    ? novelText.trim().split(/\s+/).length
    : 0;

  // Handlers
  const handleOpenProjectManager = () => {
    setIsProjectManagerOpen(true);
    setShowWelcomeScreen(false);
  };

  // Workspace Actions
  const handleAcceptManuscript = () => {
    if (!manuscriptText.trim()) return;
    const combined = novelText ? `${novelText}\n\n${manuscriptText}` : manuscriptText;
    setNovelText(combined);
  };

  const handleClearNovel = () => {
    if (window.confirm('Are you sure you want to clear the Main Novel text?')) {
      setNovelText('');
    }
  };

  const handleAcceptAi = () => {
    if (!aiOutput.trim()) return;
    const combined = novelText ? `${novelText}\n\n${aiOutput}` : aiOutput;
    setNovelText(combined);
    setAiOutput('');
  };

  const handleDiscardAi = () => {
    setAiOutput('');
    setAiProgress({ status: 'idle', message: '' });
  };

  const handleGenerate = (promptText: string) => {
    if (!promptText.trim()) return;
    setAiProgress({ status: 'generating', message: 'Scripty is crafting prose...' });
  };

  const handleRewriteAi = () => {
    if (!aiOutput.trim() && !novelText.trim()) return;
    setAiProgress({ status: 'generating', message: 'Scripty is rewriting...' });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {showWelcomeScreen ? (
        /* ================= WELCOME / LANDING SCREEN ================= */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center space-y-6">
            
            {/* App Logo */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-zinc-900 border border-amber-500/30 flex items-center justify-center shadow-2xl overflow-hidden p-2">
              <img src="/logo.png" alt="Scriptorium Logo" className="w-full h-full object-contain" />
            </div>

            {/* App Title & Tagline */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
                Scriptorium
                <Sparkles className="w-5 h-5 text-amber-400" />
              </h1>
              <p className="text-sm text-zinc-400 font-medium">
                AI-Assisted Novel Writing & Manuscript Studio
              </p>
            </div>

            {/* Action Button */}
            <div className="w-full pt-4">
              <button
                onClick={handleOpenProjectManager}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.99]"
              >
                <FolderKanban className="w-5 h-5" />
                <span>Project Manager</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* ================= MAIN WORKSPACE VIEW ================= */
        <div className="flex-1 flex flex-col min-h-0">
          <Header
            currentProjectName={currentProject?.name || 'Untitled Project'}
            onOpenProjectManager={() => setIsProjectManagerOpen(true)}
          />

          <Workspace
            manuscriptText={manuscriptText}
            onManuscriptChange={setManuscriptText}
            chapters={chapters}
            onAcceptManuscript={handleAcceptManuscript}
            novelText={novelText}
            onNovelChange={setNovelText}
            onClearNovel={handleClearNovel}
            novelWordCount={novelWordCount}
            aiOutput={aiOutput}
            onAiOutputChange={setAiOutput}
            aiProgress={aiProgress}
            onAcceptAi={handleAcceptAi}
            onRewriteAi={handleRewriteAi}
            onDiscardAi={handleDiscardAi}
            mobilePrompt={mobilePrompt}
            setMobilePrompt={setMobilePrompt}
            onGenerate={handleGenerate}
            mainNovelRef={mainNovelRef}
            manuscriptRef={manuscriptRef}
          />
        </div>
      )}
    </div>
  );
};

export default App;