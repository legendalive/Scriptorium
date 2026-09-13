import React, { useState, useRef } from 'react';
import {
  X,
  Book,
  Library,
  Plus,
  Trash2,
  FolderOpen,
  Calendar,
  Upload,
  FileText,
  FileCheck,
  Check,
  AlertCircle,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { Project } from '../types';
import { parseManuscriptFile } from '../services/importer';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onCreateProject: (
    type: 'book' | 'series',
    bookName: string,
    seriesName?: string,
    initialManuscript?: string
  ) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}) => {
  const [view, setView] = useState<'list' | 'create_book' | 'create_series'>('list');
  const [bookName, setBookName] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);

  // Manuscript choice: 'upload' vs 'blank'
  const [manuscriptMode, setManuscriptMode] = useState<'upload' | 'blank'>('blank');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [manuscriptText, setManuscriptText] = useState('');
  const [manuscriptWords, setManuscriptWords] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setBookName('');
    setSeriesName('');
    setManuscriptMode('blank');
    setUploadedFileName('');
    setManuscriptText('');
    setManuscriptWords(0);
    setIsParsing(false);
    setIsDragging(false);
    setParseError('');
    setShowPasteBox(false);
    setView('list');
  };

  const handleFileProcess = async (file: File) => {
    setParseError('');
    setIsParsing(true);
    try {
      const result = await parseManuscriptFile(file);
      setUploadedFileName(result.fileName);
      setManuscriptText(result.text);
      setManuscriptWords(result.wordCount);
      setManuscriptMode('upload');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError(err.message || 'Failed to read file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearUploadedFile = () => {
    setUploadedFileName('');
    setManuscriptText('');
    setManuscriptWords(0);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim()) return;
    if (view === 'create_series' && !seriesName.trim()) return;

    const initialManuscript = manuscriptMode === 'upload' ? manuscriptText.trim() : '';

    onCreateProject(
      view === 'create_series' ? 'series' : 'book',
      bookName.trim(),
      view === 'create_series' ? seriesName.trim() : undefined,
      initialManuscript
    );

    resetForm();
  };

  return (
    <div
      id="projectModalBackdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div>
            <h2 className="text-base font-bold tracking-tight text-zinc-100">Project Manager</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select an active writing project or start a new book or series.
            </p>
          </div>
          <button
            id="closeProjectModalBtn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {view === 'list' ? (
            <div className="space-y-6">
              {/* Project list */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Your Projects ({projects.length})
                </div>

                {projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-400">
                    No books created yet. Click below to start your first project!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {projects.map((p) => {
                      const isActive = activeProject?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          id={`projectItem_${p.id}`}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                            isActive
                              ? 'border-amber-400 bg-amber-400/10'
                              : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                          }`}
                        >
                          <button
                            onClick={() => onSelectProject(p)}
                            className="flex-1 text-left min-w-0 flex items-start gap-3"
                          >
                            <div
                              className={`p-2 rounded-lg mt-0.5 ${
                                p.type === 'series'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-amber-400/20 text-amber-300'
                              }`}
                            >
                              {p.type === 'series' ? (
                                <Library className="w-4 h-4" />
                              ) : (
                                <Book className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-zinc-100 truncate">
                                {p.bookName}
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                {p.seriesName ? (
                                  <span className="text-purple-300/90 font-medium truncate">
                                    Series: {p.seriesName}
                                  </span>
                                ) : (
                                  <span>Independent Book</span>
                                )}
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(p.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 ml-3">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-zinc-950 uppercase tracking-wider">
                                Active
                              </span>
                            ) : (
                              <button
                                onClick={() => onSelectProject(p)}
                                className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1"
                              >
                                <FolderOpen className="w-3 h-3" />
                                Open
                              </button>
                            )}

                            <button
                              id={`deleteProjectBtn_${p.id}`}
                              onClick={() => setProjectPendingDelete(p)}
                              title={`Delete "${p.bookName}"`}
                              className="w-7 h-7 rounded hover:bg-red-950/40 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Create Options */}
              <div className="pt-4 border-t border-zinc-800">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Start a New Project
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    id="newBookCardBtn"
                    onClick={() => {
                      resetForm();
                      setView('create_book');
                    }}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-zinc-200 group-hover:text-amber-300">
                      <Book className="w-4 h-4 text-amber-400" />
                      <span>Single Book</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Independent novel. You can upload an existing manuscript or start from a blank page.
                    </p>
                  </button>

                  <button
                    id="newSeriesCardBtn"
                    onClick={() => {
                      resetForm();
                      setView('create_series');
                    }}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-zinc-200 group-hover:text-purple-300">
                      <Library className="w-4 h-4 text-purple-400" />
                      <span>Novel in a Series</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Part of an ongoing universe. Upload an existing manuscript or start blank.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Creation Form with Manuscript Upload Option */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>
                    {view === 'create_series' ? 'New Novel in a Series' : 'New Single Book'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Back to List
                </button>
              </div>

              {view === 'create_series' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Series Universe / Cycle Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                    placeholder="e.g. The Caldera Chronicles"
                    className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Book / Novel Title *
                </label>
                <input
                  type="text"
                  required
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="e.g. The Glass Orchard"
                  className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 outline-none focus:border-amber-400"
                />
              </div>

              {/* Manuscript Starting Option */}
              <div className="pt-2 border-t border-zinc-800/80">
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Manuscript Setup:
                </label>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Option 1: Start with Blank Manuscript */}
                  <button
                    type="button"
                    onClick={() => setManuscriptMode('blank')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      manuscriptMode === 'blank'
                        ? 'border-amber-400 bg-amber-400/10 shadow-sm'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        Start Without
                      </span>
                      {manuscriptMode === 'blank' && (
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Fresh blank canvas. Begin writing from scratch or with Scripty.
                    </p>
                  </button>

                  {/* Option 2: Upload Manuscript */}
                  <button
                    type="button"
                    onClick={() => setManuscriptMode('upload')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      manuscriptMode === 'upload'
                        ? 'border-amber-400 bg-amber-400/10 shadow-sm'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        Upload Manuscript
                      </span>
                      {manuscriptMode === 'upload' && (
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Import Word (.docx), Markdown (.md), or text file.
                    </p>
                  </button>
                </div>

                {/* Upload Zone when manuscriptMode === 'upload' */}
                {manuscriptMode === 'upload' && (
                  <div className="space-y-3 p-3.5 rounded-xl border border-zinc-700/80 bg-zinc-900/90">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept=".docx,.txt,.md,.markdown,.rtf"
                      className="hidden"
                    />

                    {!uploadedFileName && !manuscriptText ? (
                      /* Drag & Drop zone */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                          isDragging
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/60'
                        }`}
                      >
                        <Upload className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                        <div className="text-xs font-semibold text-zinc-200">
                          {isParsing ? 'Reading and extracting manuscript...' : 'Drop your manuscript here or click to browse'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          Supports Word (.docx), Markdown (.md), and Plain Text (.txt)
                        </div>
                      </div>
                    ) : (
                      /* Uploaded file preview */
                      <div className="p-3 rounded-lg border border-emerald-800/80 bg-emerald-950/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-200 truncate">
                              {uploadedFileName || 'Pasted Manuscript'}
                            </div>
                            <div className="text-[10px] text-emerald-400/90">
                              {manuscriptWords.toLocaleString()} words loaded & ready to segment
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={clearUploadedFile}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {parseError && (
                      <div className="text-[11px] text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{parseError}</span>
                      </div>
                    )}

                    {/* Or paste directly toggle */}
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(!showPasteBox)}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>{showPasteBox ? 'Hide text editor' : 'Or paste text directly from clipboard'}</span>
                      </button>

                      {manuscriptWords > 0 && (
                        <span className="text-zinc-400 font-mono">
                          {manuscriptWords.toLocaleString()} words
                        </span>
                      )}
                    </div>

                    {showPasteBox && (
                      <textarea
                        rows={4}
                        value={manuscriptText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManuscriptText(val);
                          setManuscriptWords(val.trim() ? val.trim().split(/\s+/).filter(Boolean).length : 0);
                        }}
                        placeholder="Paste your raw chapter or manuscript text here..."
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs text-zinc-200 font-mono outline-none focus:border-amber-400 resize-y"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="h-9 px-4 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submitCreateProjectBtn"
                  className="h-9 px-5 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 text-xs font-bold shadow-sm"
                >
                  Create Book
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* In-App Confirmation Modal for Deleting a Book */}
      {projectPendingDelete && (
        <div
          id="deleteConfirmationOverlay"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProjectPendingDelete(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 shrink-0 mt-0.5 border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-zinc-100">Delete Book?</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-zinc-200">"{projectPendingDelete.bookName}"</strong>? This will permanently delete this book, its manuscript text, and all Project Bible configuration.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="cancelDeleteProjectBtn"
                onClick={() => setProjectPendingDelete(null)}
                className="h-8 px-4 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirmDeleteBookBtn"
                onClick={() => {
                  const id = projectPendingDelete.id;
                  setProjectPendingDelete(null);
                  onDeleteProject(id);
                }}
                className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-md shadow-red-950/40 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Book</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
