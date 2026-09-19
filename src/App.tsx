import React, { useState, useRef } from 'react';
import { BookOpen, FolderKanban, Sparkles } from 'lucide-react';
import { Workspace } from './components/Workspace';
import { ProjectManager } from './components/ProjectManager';
import { Header } from './components/Header';
import { ChapterSegment, AiGenerationProgress, Project } from './types';
import { parseChaptersFromText } from './utils/chapterHierarchy';

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
  };

  const handleCloseProjectManager = () => {
    setIsProjectManagerOpen(false);
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setManuscriptText(project.manuscriptText || '');
    setNovelText(project.novelText || '');
    setIsProjectManagerOpen(false);
    setShowWelcomeScreen(false); // Move to workspace when project is opened
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
            
            {/* Logo Icon */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-zinc-900 border border-amber-500/30 flex items-center justify-center shadow-2xl">
              <BookOpen className="w-10 h-10 text-amber-400" />
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
            onOpenProjectManager={handleOpenProjectManager}
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

      {/* Project Manager Modal */}
      {isProjectManagerOpen && (
        <ProjectManager
          isOpen={isProjectManagerOpen}
          onClose={handleCloseProjectManager}
          onSelectProject={handleSelectProject}
        />
      )}
    </div>
  );
};

export default App;