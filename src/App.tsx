import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Project,
  ProjectConfig,
  ProviderTier,
  ChapterSegment,
  AiGenerationProgress,
} from './types';
import {
  openDB,
  dbGetAll,
  dbPut,
  dbDelete,
  getProjectConfig,
  saveProjectConfig,
} from './services/db';
import {
  loadProviders,
  buildProjectBible,
  executeMultiVendorAi,
} from './services/ai';
import { segmentManuscript } from './services/segmenter';
import { exportToDocx, exportToMarkdown, exportToPlainText } from './services/exporter';
import { Header } from './components/Header';
import { Workspace } from './components/Workspace';
import { ConfigModal } from './components/ConfigModal';
import { SettingsModal } from './components/SettingsModal';
import { ProjectModal } from './components/ProjectModal';
import { Toast, ToastMessage } from './components/Toast';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [config, setConfig] = useState<ProjectConfig>({
    id: 'default-config',
    projectId: 'default',
    entities: [],
    characters: [],
    environments: [],
    plots: [],
    items: [],
    events: [],
    magicTechSystems: [],
    factions: [],
    themes: [],
  });

  const [manuscriptText, setManuscriptText] = useState('');
  const [novelText, setNovelText] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [chapters, setChapters] = useState<ChapterSegment[]>([]);

  const [prompt, setPrompt] = useState('');
  const [mobilePrompt, setMobilePrompt] = useState('');
  const [lastUserPrompt, setLastUserPrompt] = useState('');

  const [providers, setProviders] = useState<ProviderTier[]>(() => loadProviders());
  const [aiProgress, setAiProgress] = useState<AiGenerationProgress>({
    status: 'idle',
    message: 'Ready',
    attemptLog: [],
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const mainNovelRef = useRef<HTMLTextAreaElement>(null);
  const manuscriptRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Re-segment manuscript chapters whenever manuscript changes
  useEffect(() => {
    const segs = segmentManuscript(manuscriptText, 6);
    setChapters(segs);
  }, [manuscriptText]);

  // Boot logic: open DB, load projects, or seed initial demo project
  useEffect(() => {
    async function boot() {
      try {
        await openDB();
        const allProjects = await dbGetAll<Project>('projects');
        allProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        if (allProjects.length > 0) {
          setProjects(allProjects);
          const savedActiveId = localStorage.getItem('scriptorium_active_project');
          const found = allProjects.find((p) => p.id === savedActiveId) || allProjects[0];
          await switchProject(found);
        } else {
          // Initialize starter project with structured entities
          const starterId = 'proj-starter-1';
          const starterConfigId = `book-config-${starterId}`;
          const starterProj: Project = {
            id: starterId,
            type: 'book',
            bookName: 'The Glass Orchard',
            configId: starterConfigId,
            manuscriptId: `manuscript-${starterId}`,
            novelId: `novel-${starterId}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await dbPut('projects', starterProj);

          // Seed default entities
          const seededConfig = await saveProjectConfig({
            id: starterConfigId,
            projectId: starterId,
            tone: 'Third-person limited. Lyrical, atmospheric gothic fantasy with sharp, naturalistic dialogue.',
            generalNotes: 'The glass fruit must never be harvested before the winter solstice.',
            entities: [
              {
                id: 'char-1',
                type: 'character',
                fields: {
                  name: 'Caelen Vane',
                  roleArchetype: 'The Blind Glassblower / Protagonist',
                  personalityTone: 'Quiet, observational, carries a dry gallows humor; speaks with deliberateness.',
                  description: 'Mid-thirties, fingers permanently calloused and silvered from silica dust, silver-gray hair kept back with a leather cord.',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              {
                id: 'env-1',
                type: 'environment',
                fields: {
                  settingName: 'The Winter Glasshouse of Marrowfen',
                  physicalAttributes: 'Vaulted wrought-iron ribs holding five thousand panes of cloudy cathedral glass over frozen black loam.',
                  atmosphereMood: 'Perpetual winter twilight, the scent of sulfur and freezing river water.',
                  notableLocations: 'The Annealing Kilns, The Frost-Trellis, The Sunken Cistern.',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              {
                id: 'plot-1',
                type: 'plot',
                fields: {
                  arcName: 'The Fracture of the North Gable',
                  keyConflict: 'An early freeze threatens to shatter the unharvested crystal orchards.',
                  narrativeGoal: 'Caelen must negotiate with the Guild of Stoking to secure furnace anthracite.',
                  resolutionStatus: 'Rising Action',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              {
                id: 'item-1',
                type: 'item',
                fields: {
                  itemName: 'The Vitreous Compass',
                  significancePowers: 'Points toward thermal vents and faults in crystal matrixes.',
                  currentHolder: 'Caelen Vane',
                  physicalAppearance: 'Spindle-cut prism inside a brass gimbal cage.',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
          });

          await dbPut('manuscripts', {
            id: starterProj.manuscriptId,
            projectId: starterId,
            text: `Chapter 1: The Frost on the Panes\n\nThe cold arrived not as a sudden gasp, but as a slow thickening of the shadows between the trees.\n\nInside the glasshouse, Caelen ran a scarred palm along the cooling curve of the blowpipe. Outside, the fog had begun to crystalize upon the iron gables, ticking against the glass like thousands of tiny needles.`,
          });

          await dbPut('main_novel_content', {
            id: starterProj.novelId,
            projectId: starterId,
            text: `PROLOGUE: THE FOUNDATION STONE\n\nBefore there were trees of glass, there was only the brine and the black shale of the estuary.\n\nThey came in high-hulled galleasses, their holds weighted with bags of crushed potash and lead oxide, looking for a coast where the sand was white enough to melt into clear lenses. When they found Marrowfen, they did not build castles; they built ovens.`,
          });

          setProjects([starterProj]);
          await switchProject(starterProj);
          addToast('Welcome to Scriptorium. Initialized "The Glass Orchard" project.', 'info');
        }
      } catch (err: any) {
        console.error('Boot error:', err);
        addToast(`Failed to initialize storage: ${err.message}`, 'error');
      }
    }

    boot();
  }, [addToast]);

  const switchProject = async (p: Project) => {
    setActiveProject(p);
    localStorage.setItem('scriptorium_active_project', p.id);

    try {
      const cfg = await getProjectConfig(p.configId, p.id);
      setConfig(cfg);

      const m = await dbGetAll<any>('manuscripts');
      const foundM = m.find((x) => x.id === p.manuscriptId || x.projectId === p.id);
      setManuscriptText(foundM?.text || '');

      const n = await dbGetAll<any>('main_novel_content');
      const foundN = n.find((x) => x.id === p.novelId || x.projectId === p.id);
      setNovelText(foundN?.text || '');

      setAiOutput('');
      setAiProgress({ status: 'idle', message: 'Idle', attemptLog: [] });
    } catch (err: any) {
      console.error('Error switching project:', err);
      addToast(`Error loading project data: ${err.message}`, 'error');
    }
  };

  // Auto-save project data to IndexedDB
  const autoSave = useCallback(
    (newMText: string, newNText: string) => {
      if (!activeProject) return;

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          const now = Date.now();
          const updatedProj = { ...activeProject, updatedAt: now };

          await Promise.all([
            dbPut('projects', updatedProj),
            dbPut('manuscripts', {
              id: activeProject.manuscriptId,
              projectId: activeProject.id,
              text: newMText,
            }),
            dbPut('main_novel_content', {
              id: activeProject.novelId,
              projectId: activeProject.id,
              text: newNText,
            }),
          ]);

          setActiveProject(updatedProj);
          setProjects((prev) =>
            prev.map((pr) => (pr.id === updatedProj.id ? updatedProj : pr))
          );
        } catch (e: any) {
          console.error('Auto-save error:', e);
        }
      }, 700);
    },
    [activeProject]
  );

  const handleManuscriptChange = (val: string) => {
    setManuscriptText(val);
    autoSave(val, novelText);
  };

  const handleNovelChange = (val: string) => {
    setNovelText(val);
    autoSave(manuscriptText, val);
  };

  // Helper to append text with clean paragraph breaks
  const appendProse = (base: string, addition: string): string => {
    const a = base.trim();
    const b = addition.trim();
    if (!b) return a;
    if (!a) return b;
    return `${a}\n\n${b}`;
  };

  const handleAcceptManuscript = () => {
    if (!manuscriptText.trim()) return;
    const combined = appendProse(novelText, manuscriptText);
    setNovelText(combined);
    setManuscriptText('');
    autoSave('', combined);
    addToast('Manuscript text accepted into the Main Novel.', 'success');
  };

  const handleAcceptAi = () => {
    if (!aiOutput.trim()) return;
    const combined = appendProse(novelText, aiOutput);
    setNovelText(combined);
    setAiOutput('');
    setAiProgress({ status: 'idle', message: 'Idle', attemptLog: [] });
    autoSave(manuscriptText, combined);
    addToast('Scripty prose accepted into the Main Novel.', 'success');
  };

  const handleDiscardAi = () => {
    setAiOutput('');
    setAiProgress({ status: 'idle', message: 'Idle', attemptLog: [] });
    addToast('AI draft discarded.', 'info');
  };

  const handleClearNovel = async () => {
    if (!activeProject) return;
    if (!window.confirm('Are you sure you want to clear the entire Main Novel content?')) {
      return;
    }
    setNovelText('');
    autoSave(manuscriptText, '');
    addToast('Main Novel cleared.', 'info');
  };

  // Rewrite logic: handles selected text or previous AI generation
  const handleRewriteAi = () => {
    if (aiProgress.status === 'generating') return;

    let selectedText = '';
    let sourceLabel = '';

    // Priority 1: Text selected in Manuscript Editor (Column 1)
    if (
      manuscriptRef.current &&
      manuscriptRef.current.selectionStart !== manuscriptRef.current.selectionEnd
    ) {
      selectedText = manuscriptRef.current.value
        .substring(manuscriptRef.current.selectionStart, manuscriptRef.current.selectionEnd)
        .trim();
      if (selectedText) sourceLabel = 'manuscript draft';
    } else if (
      mainNovelRef.current &&
      mainNovelRef.current.selectionStart !== mainNovelRef.current.selectionEnd
    ) {
      // Priority 2: Text selected in Main Novel Editor (Column 2)
      selectedText = mainNovelRef.current.value
        .substring(mainNovelRef.current.selectionStart, mainNovelRef.current.selectionEnd)
        .trim();
      if (selectedText) sourceLabel = 'main novel passage';
    }

    if (selectedText) {
      const rewritePrompt = `Rewrite and enhance this selected ${sourceLabel}. Heighten the sensory depth, pacing, and voice while strictly preserving Project Bible continuity:\n\n"${selectedText}"`;
      handleGenerate(rewritePrompt);
    } else if (aiOutput.trim()) {
      const rewritePrompt = `Rewrite the previous output to be sharper, more atmospheric, and compelling. Enhance dialogue subtext and pacing:\n\n${aiOutput.trim()}`;
      handleGenerate(rewritePrompt);
    } else if (manuscriptText.trim()) {
      const rewritePrompt = `Rewrite the manuscript draft into evocative, publication-ready novel prose, adhering strictly to the characters, tone, and world rules in the Project Bible.`;
      handleGenerate(rewritePrompt);
    } else if (lastUserPrompt) {
      handleGenerate(`Re-attempt and generate an alternate version of: ${lastUserPrompt}`);
    } else {
      addToast('Highlight a passage in the Manuscript or Main Novel, or enter text to rewrite.', 'info');
    }
  };

  // Main Generation Handler with multi-tier dynamic fallback
  const handleGenerate = async (userPromptText: string) => {
    if (!userPromptText.trim()) return;
    if (!activeProject) {
      addToast('Select or create a project first.', 'error');
      setIsProjectOpen(true);
      return;
    }

    setLastUserPrompt(userPromptText);
    setAiProgress({
      status: 'generating',
      message: 'Consulting Project Bible & checking tiers...',
      attemptLog: [],
    });

    try {
      // 1. Build authoritative Project Bible from all dynamic entities & config
      const systemPrompt = buildProjectBible(
        config,
        activeProject.bookName,
        activeProject.seriesName
      );

      // 2. Check for active selection in either editor
      let selectedText = '';
      let selectionSource = '';

      if (
        manuscriptRef.current &&
        manuscriptRef.current.selectionStart !== manuscriptRef.current.selectionEnd
      ) {
        selectedText = manuscriptRef.current.value
          .substring(manuscriptRef.current.selectionStart, manuscriptRef.current.selectionEnd)
          .trim();
        if (selectedText) selectionSource = 'Manuscript Draft (Column 1)';
      } else if (
        mainNovelRef.current &&
        mainNovelRef.current.selectionStart !== mainNovelRef.current.selectionEnd
      ) {
        selectedText = mainNovelRef.current.value
          .substring(mainNovelRef.current.selectionStart, mainNovelRef.current.selectionEnd)
          .trim();
        if (selectedText) selectionSource = 'Main Novel Canon (Column 2)';
      }

      const promptTrimmed = userPromptText.trim();
      const promptLower = promptTrimmed.toLowerCase();

      // Check if user is asking to rewrite, transform, change POV/tense, change style, shorten, or expand
      const isRewriteOrTransform =
        /\b(rewrite|re-write|rephrase|reword|paraphrase|transform|convert|translate|adapt|restyle|revise)\b/i.test(
          promptLower
        ) ||
        /\b(third person|first person|second person|past tense|present tense)\b/i.test(
          promptLower
        ) ||
        /\b(old english|shakespearean|victorian|poetic|archaic|gothic|noir|modern|dialogue)\b/i.test(
          promptLower
        ) ||
        /\b(shorten|condense|tighten|abridge|summarize|trim|cut down)\b/i.test(promptLower) ||
        /\b(expand|elaborate|lengthen|flesh out|develop|enrich|add detail)\b/i.test(
          promptLower
        ) ||
        /\b(polish|enhance|improve|sharpen|punch up|elevate)\b/i.test(promptLower);

      let contextualUserPrompt = `USER INSTRUCTION:\n${promptTrimmed}\n`;

      // If user highlighted a specific passage, prioritize it as the exact target
      if (selectedText) {
        contextualUserPrompt += `\n--- TARGET SELECTED PASSAGE (${selectionSource}) ---\n${selectedText}\n`;
      } else if (manuscriptText.trim()) {
        // Provide the Manuscript draft (Column 1) - up to 45,000 characters
        contextualUserPrompt += `\n--- SOURCE MANUSCRIPT DRAFT (COLUMN 1) ---\n${manuscriptText.trim().slice(0, 45000)}\n`;
      }

      // If Main Novel (Column 2) exists and wasn't the target selection, provide recent novel text for continuity
      if (novelText.trim() && !selectedText) {
        contextualUserPrompt += `\n--- CANON NOVEL CONTEXT (COLUMN 2) ---\n${novelText.trim().slice(-8000)}\n`;
      } else if (!manuscriptText.trim() && !selectedText && aiOutput.trim() && isRewriteOrTransform) {
        // If manuscript is empty, but previous AI draft exists, revise that
        contextualUserPrompt += `\n--- PREVIOUS AI DRAFT TO REVISE ---\n${aiOutput.trim()}\n`;
      }

      contextualUserPrompt += `\n--- SCRIPTORIUM EXECUTION DIRECTIVES ---
• Execute the user instruction ("${promptTrimmed}") on the provided source text (the target selection, the source manuscript draft, or the canon novel passage).
• If the instruction requests rewriting in a specific perspective (e.g. third person), style/dialect (e.g. Old English, Victorian, gothic), or adjusting length/density (shorten, expand, heighten imagery), execute that transformation completely while strictly preserving the lore, character traits, names, and rules from the Project Bible.
• Output ONLY the rewritten or generated prose directly ready for insertion. Do NOT include greetings, intro phrases (e.g. "Here is the rewritten text:"), conversational chatter, or meta-explanations.`;

      // 3. Execute multi-vendor fallback
      const result = await executeMultiVendorAi(
        providers,
        systemPrompt,
        contextualUserPrompt,
        (progress) => {
          setAiProgress(progress);
        }
      );

      setAiOutput(result.text.trim());
      setAiProgress({
        status: 'success',
        message: `Generated via ${result.tierName} [${result.modelName}]`,
        attemptLog: [],
      });
      addToast(`Scripty generated novel text via ${result.tierName}!`, 'success');
    } catch (err: any) {
      console.error('Generation error:', err);
      setAiProgress({
        status: 'error',
        message: 'All vendor tiers failed.',
        attemptLog: [err.message],
      });
      addToast(err.message || 'Generation failed across all tiers.', 'error');
    }
  };

  // Project Creation & Deletion
  const handleCreateProject = async (
    type: 'book' | 'series',
    bookName: string,
    seriesName?: string,
    initialManuscript?: string
  ) => {
    const id = `proj-${Date.now()}`;
    const configId = type === 'series' ? `series-config-${id}` : `book-config-${id}`;
    const newProj: Project = {
      id,
      type,
      bookName,
      seriesName: type === 'series' ? seriesName : undefined,
      configId,
      manuscriptId: `manuscript-${id}`,
      novelId: `novel-${id}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const manuscriptContent = initialManuscript || '';

    await dbPut('projects', newProj);
    await saveProjectConfig({
      id: configId,
      projectId: id,
      scope: type,
      entities: [],
    });
    await dbPut('manuscripts', { id: newProj.manuscriptId, projectId: id, text: manuscriptContent });
    await dbPut('main_novel_content', { id: newProj.novelId, projectId: id, text: '' });

    setProjects([newProj, ...projects]);
    await switchProject(newProj);
    setIsProjectOpen(false);

    if (manuscriptContent) {
      const words = manuscriptContent.split(/\s+/).filter(Boolean).length;
      addToast(`Created "${bookName}" with uploaded manuscript (${words.toLocaleString()} words).`, 'success');
    } else {
      addToast(`Created "${bookName}" with a blank manuscript.`, 'success');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    await Promise.all([
      dbDelete('projects', proj.id),
      dbDelete('config', proj.configId),
      dbDelete('manuscripts', proj.manuscriptId),
      dbDelete('main_novel_content', proj.novelId),
    ]);

    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);

    if (activeProject?.id === projectId) {
      if (remaining.length > 0) {
        await switchProject(remaining[0]);
      } else {
        setActiveProject(null);
        setManuscriptText('');
        setNovelText('');
        setAiOutput('');
      }
    }
    addToast(`Deleted "${proj.bookName}".`, 'info');
  };

  // Exports
  const handleExportDocx = async () => {
    if (!activeProject) return;
    try {
      await exportToDocx(activeProject, novelText);
      addToast('Word DOCX file exported successfully.', 'success');
    } catch (e: any) {
      addToast(`DOCX export failed: ${e.message}`, 'error');
    }
  };

  const handleExportMarkdown = () => {
    if (!activeProject) return;
    exportToMarkdown(activeProject, novelText);
    addToast('Markdown file exported.', 'success');
  };

  const handleExportText = () => {
    if (!activeProject) return;
    exportToPlainText(activeProject, novelText);
    addToast('Plain text file exported.', 'success');
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter to run Scripty
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const textToSubmit = prompt.trim() || mobilePrompt.trim();
        if (textToSubmit && aiProgress.status !== 'generating') {
          e.preventDefault();
          handleGenerate(textToSubmit);
          setPrompt('');
          setMobilePrompt('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, mobilePrompt, aiProgress.status]);

  const novelWordCount = novelText.trim()
    ? novelText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100 antialiased select-none">
      {/* Top Header */}
      <Header
        project={activeProject}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProjects={() => setIsProjectOpen(true)}
        onExportDocx={handleExportDocx}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        generating={aiProgress.status === 'generating'}
      />

      {/* 3-Column Main Workspace */}
      <Workspace
        manuscriptText={manuscriptText}
        onManuscriptChange={handleManuscriptChange}
        chapters={chapters}
        onAcceptManuscript={handleAcceptManuscript}
        novelText={novelText}
        onNovelChange={handleNovelChange}
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

      {/* Dynamic Config Entities Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        project={activeProject}
        config={config}
        onConfigUpdated={(newCfg) => setConfig(newCfg)}
        onToast={addToast}
      />

      {/* Dynamic AI Vendor Fallback Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
        onProvidersUpdated={(newProviders) => setProviders(newProviders)}
        onToast={addToast}
      />

      {/* Project Manager Modal */}
      <ProjectModal
        isOpen={isProjectOpen}
        onClose={() => setIsProjectOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => {
          switchProject(p);
          setIsProjectOpen(false);
        }}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Toast Host */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}