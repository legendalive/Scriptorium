import React, { useState, useEffect, useId } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  User,
  MapPin,
  GitBranch,
  Package,
  Calendar,
  Zap,
  Shield,
  Compass,
  FileJson,
  Check,
  Search,
  BookOpen,
} from 'lucide-react';
import {
  Project,
  ProjectConfig,
  ConfigEntity,
  ConfigEntityType,
  EntityFieldsMap,
} from '../types';
import { saveProjectConfig } from '../services/db';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  config: ProjectConfig;
  onConfigUpdated: (newConfig: ProjectConfig) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

interface EntityTypeMeta {
  type: ConfigEntityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: 'input' | 'textarea' | 'select'; options?: string[] }[];
}

export const ENTITY_TYPES: EntityTypeMeta[] = [
  {
    type: 'character',
    label: 'Character',
    icon: User,
    description: 'Protagonists, antagonists, supporting cast, mentors',
    fields: [
      { key: 'name', label: 'Name', placeholder: 'e.g. Elena Vance', type: 'input' },
      { key: 'roleArchetype', label: 'Role / Archetype', placeholder: 'e.g. Reluctant Protagonist, Arcane Scholar', type: 'input' },
      { key: 'personalityTone', label: 'Personality & Tone', placeholder: 'Cynical yet fiercely loyal, speaks in clipped, analytical sentences...', type: 'textarea' },
      { key: 'description', label: 'Description', placeholder: 'Tall, auburn braid, severe steel-rimmed glasses, burned left palm...', type: 'textarea' },
    ],
  },
  {
    type: 'environment',
    label: 'Environment',
    icon: MapPin,
    description: 'Settings, geography, atmosphere, and key locations',
    fields: [
      { key: 'settingName', label: 'Setting Name', placeholder: 'e.g. The Sunken Spire of Oakhaven', type: 'input' },
      { key: 'physicalAttributes', label: 'Physical Attributes', placeholder: 'Black basalt towers submerged in marsh water, bioluminescent moss, narrow iron gangways...', type: 'textarea' },
      { key: 'atmosphereMood', label: 'Atmosphere / Mood', placeholder: 'Oppressive dampness, eerie quiet interrupted by distant bell chimes, decaying grandeur...', type: 'textarea' },
      { key: 'notableLocations', label: 'Notable Locations', placeholder: 'The Drowned Reliquary, the Bell Tower Rookery, the Salt Gate...', type: 'textarea' },
    ],
  },
  {
    type: 'plot',
    label: 'Plot',
    icon: GitBranch,
    description: 'Arcs, key conflicts, narrative goals, and milestones',
    fields: [
      { key: 'arcName', label: 'Arc Name', placeholder: 'e.g. Act II: The Breach of the Salt Gate', type: 'input' },
      { key: 'keyConflict', label: 'Key Conflict', placeholder: 'The guard captains refuse to open the sluice gate while the storm tides rise...', type: 'textarea' },
      { key: 'narrativeGoal', label: 'Narrative Goal', placeholder: 'Force Elena to forge an uneasy alliance with the Guild of Shrouds...', type: 'textarea' },
      {
        key: 'resolutionStatus',
        label: 'Resolution Status',
        placeholder: 'Select status',
        type: 'select',
        options: ['Unresolved / Active', 'Rising Action', 'Climax Approaching', 'Resolved / Aftermath'],
      },
    ],
  },
  {
    type: 'item',
    label: 'Item',
    icon: Package,
    description: 'Artifacts, weapons, heirlooms, and key props',
    fields: [
      { key: 'itemName', label: 'Item Name', placeholder: 'e.g. The Obsidian Astrolabe', type: 'input' },
      { key: 'significancePowers', label: 'Significance / Powers', placeholder: 'Bypasses spatial warding; whispers coordinates of ancient ley lines when exposed to starlight...', type: 'textarea' },
      { key: 'currentHolder', label: 'Current Holder', placeholder: 'e.g. Master Corvus (hidden in iron trunk)', type: 'input' },
      { key: 'physicalAppearance', label: 'Physical Appearance', placeholder: 'Heavy circular bronze casing inset with interlocking rings of smoky glass and runic etchings...', type: 'textarea' },
    ],
  },
  {
    type: 'event',
    label: 'Event',
    icon: Calendar,
    description: 'Historical occurrences, battles, catalysts, and timelines',
    fields: [
      { key: 'eventName', label: 'Event Name', placeholder: 'e.g. The Night of Red Ash', type: 'input' },
      { key: 'historicalEraTimeline', label: 'Historical Era / Timeline', placeholder: 'e.g. Twelve years before chapter 1 (Year 412 of the Caldera)', type: 'input' },
      { key: 'keyParticipants', label: 'Key Participants', placeholder: 'The Royal Inquisitors, the Ashguard rebels, Elena’s family...', type: 'textarea' },
      { key: 'impactConsequences', label: 'Impact / Consequences', placeholder: 'Outlawed pyromancy throughout the northern provinces; triggered Elena’s exile...', type: 'textarea' },
    ],
  },
  {
    type: 'magic_tech',
    label: 'Magic / Tech System',
    icon: Zap,
    description: 'Rules, constraints, costs, and sources of power',
    fields: [
      { key: 'systemName', label: 'System Name', placeholder: 'e.g. Resonance Weaving', type: 'input' },
      { key: 'coreRulesLimits', label: 'Core Rules / Limits', placeholder: 'Sound waves are manipulated to bend light and solidify air; cannot be performed in total silence or near heavy lead...', type: 'textarea' },
      { key: 'primaryUsers', label: 'Primary Users', placeholder: 'Tuned Chimeras, Spire Navigators, Bell-Keepers...', type: 'input' },
      { key: 'energySource', label: 'Energy Source', placeholder: 'Vocal cords harmonized with distilled pitchblende vials...', type: 'input' },
    ],
  },
  {
    type: 'faction',
    label: 'Faction / Group',
    icon: Shield,
    description: 'Guilds, governments, cults, and military orders',
    fields: [
      { key: 'factionName', label: 'Faction Name', placeholder: 'e.g. The Iron Ledger Syndicate', type: 'input' },
      { key: 'ideologyGoals', label: 'Ideology / Goals', placeholder: 'Absolute monopolization of trade waterways; believe debts survive death...', type: 'textarea' },
      { key: 'keyFigures', label: 'Key Figures', placeholder: 'Grand Arbitress Maren, Coinwarden Finch, Silent Bailiff Kael...', type: 'textarea' },
      { key: 'baseOfOperations', label: 'Base of Operations', placeholder: 'The High Vaults of Caelum Port...', type: 'input' },
    ],
  },
  {
    type: 'theme',
    label: 'Theme / Motif',
    icon: Compass,
    description: 'Central messages, recurring symbolism, and narrative focus',
    fields: [
      { key: 'themeName', label: 'Theme Name', placeholder: 'e.g. The Cost of Memory', type: 'input' },
      { key: 'centralMessage', label: 'Central Message', placeholder: 'Preserving trauma ensures survival, but clinging to vengeance petrifies the spirit...', type: 'textarea' },
      { key: 'associatedSymbols', label: 'Associated Symbols', placeholder: 'Faded silver daguerreotypes, broken mirrors, ticking pocket watches with no hands...', type: 'textarea' },
      { key: 'narrativeFocus', label: 'Narrative Focus', placeholder: 'Echo this whenever Elena chooses between strategic advantage and emotional closure...', type: 'textarea' },
    ],
  },
];

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  project,
  config,
  onConfigUpdated,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'entities' | 'prose' | 'raw_json'>('entities');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingEntity, setEditingEntity] = useState<ConfigEntity | null>(null);
  const [editingType, setEditingType] = useState<ConfigEntityType | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [toneGuidelines, setToneGuidelines] = useState(config.tone || '');
  const [generalNotes, setGeneralNotes] = useState(config.generalNotes || '');

  const searchInputId = useId();
  const toneTextareaId = useId();
  const notesTextareaId = useId();

  useEffect(() => {
    setToneGuidelines(config.tone || '');
    setGeneralNotes(config.generalNotes || '');
  }, [config]);

  if (!isOpen) return null;

  const currentMeta = editingType ? ENTITY_TYPES.find((m) => m.type === editingType) : null;

  const startAddEntity = (type: ConfigEntityType) => {
    const meta = ENTITY_TYPES.find((m) => m.type === type);
    const initial: Record<string, string> = {};
    meta?.fields.forEach((f) => {
      initial[f.key] = f.type === 'select' && f.options ? f.options[0] : '';
    });
    setEditingEntity(null);
    setEditingType(type);
    setFormFields(initial);
    setShowAddMenu(false);
  };

  const startEditEntity = (entity: ConfigEntity) => {
    setEditingEntity(entity);
    setEditingType(entity.type);
    setFormFields({ ...(entity.fields as any) });
  };

  const cancelEdit = () => {
    setEditingEntity(null);
    setEditingType(null);
    setFormFields({});
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormFields((prev) => ({ ...prev, [key]: value }));
  };

  const saveEntityForm = async () => {
    if (!editingType || !project) return;

    const currentEntities = [...(config.entities || [])];
    const now = Date.now();

    if (editingEntity) {
      // Update existing
      const updatedList = currentEntities.map((e) =>
        e.id === editingEntity.id
          ? {
              ...e,
              fields: { ...formFields } as any,
              updatedAt: now,
            }
          : e
      );
      const updatedConfig = await saveProjectConfig({
        ...config,
        tone: toneGuidelines,
        generalNotes,
        entities: updatedList,
      });
      onConfigUpdated(updatedConfig);
      onToast(`Updated ${currentMeta?.label || 'Entity'}.`, 'success');
    } else {
      // Create new
      const newEntity: ConfigEntity = {
        id: `entity-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type: editingType,
        fields: { ...formFields } as any,
        createdAt: now,
        updatedAt: now,
      };
      const updatedConfig = await saveProjectConfig({
        ...config,
        tone: toneGuidelines,
        generalNotes,
        entities: [newEntity, ...currentEntities],
      });
      onConfigUpdated(updatedConfig);
      onToast(`Added new ${currentMeta?.label || 'Entity'}.`, 'success');
    }

    cancelEdit();
  };

  const deleteEntity = async (id: string, name: string) => {
    if (!project) return;
    if (!window.confirm(`Delete "${name || 'this entity'}"?`)) return;

    const filtered = (config.entities || []).filter((e) => e.id !== id);
    const updatedConfig = await saveProjectConfig({
      ...config,
      tone: toneGuidelines,
      generalNotes,
      entities: filtered,
    });
    onConfigUpdated(updatedConfig);
    onToast('Entity removed from project bible.', 'info');
  };

  const saveProseSettings = async () => {
    if (!project) return;
    const updatedConfig = await saveProjectConfig({
      ...config,
      tone: toneGuidelines,
      generalNotes,
      entities: config.entities || [],
    });
    onConfigUpdated(updatedConfig);
    onToast('Prose guidelines saved.', 'success');
  };

  const getEntityTitle = (entity: ConfigEntity): string => {
    const f: any = entity.fields;
    return f.name || f.settingName || f.arcName || f.itemName || f.eventName || f.systemName || f.factionName || f.themeName || 'Untitled';
  };

  const getEntitySubtitle = (entity: ConfigEntity): string => {
    const f: any = entity.fields;
    return f.roleArchetype || f.atmosphereMood || f.resolutionStatus || f.currentHolder || f.historicalEraTimeline || f.primaryUsers || f.ideologyGoals || f.centralMessage || '';
  };

  const filteredEntities = (config.entities || []).filter((entity) => {
    if (selectedFilter !== 'all' && entity.type !== selectedFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = getEntityTitle(entity).toLowerCase();
    const sub = getEntitySubtitle(entity).toLowerCase();
    const jsonStr = JSON.stringify(entity.fields).toLowerCase();
    return title.includes(q) || sub.includes(q) || jsonStr.includes(q);
  });

  return (
    <div
      id="configModalBackdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">Project Bible & Config</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {project?.seriesName
                ? `Series: ${project.seriesName} · Book: ${project.bookName}`
                : project?.bookName
                ? `Active Book: ${project.bookName}`
                : 'Project Configuration'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="closeConfigModalBtn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-nav Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex gap-4">
            <button
              id="tabEntitiesBtn"
              onClick={() => {
                cancelEdit();
                setActiveTab('entities');
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'entities'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              Dynamic Entities ({config.entities?.length || 0})
            </button>
            <button
              id="tabProseBtn"
              onClick={() => {
                cancelEdit();
                setActiveTab('prose');
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'prose'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Prose & Tone Guidelines
            </button>
            <button
              id="tabRawJsonBtn"
              onClick={() => {
                cancelEdit();
                setActiveTab('raw_json');
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'raw_json'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileJson className="w-4 h-4" />
              IndexedDB JSON Inspector
            </button>
          </div>

          {/* Prominent "+" Add Entity Button with Dropdown */}
          {activeTab === 'entities' && !editingType && (
            <div className="relative">
              <button
                id="addEntityBtn"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="h-8 px-3 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Entity</span>
              </button>

              {showAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowAddMenu(false)}
                  />
                  <div className="absolute right-0 top-10 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-2 z-30 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Select Entity Type to Add
                    </div>
                    {ENTITY_TYPES.map((meta) => {
                      const Icon = meta.icon;
                      return (
                        <button
                          key={meta.type}
                          id={`selectEntityType_${meta.type}`}
                          onClick={() => startAddEntity(meta.type)}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-800 flex items-start gap-2.5 transition-colors group"
                        >
                          <div className="p-1.5 rounded-md bg-zinc-800 group-hover:bg-amber-400/20 group-hover:text-amber-300 text-zinc-300 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                              {meta.label}
                            </div>
                            <div className="text-[11px] text-zinc-500 line-clamp-1">
                              {meta.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {activeTab === 'entities' && (
            <>
              {/* If Form is Active */}
              {editingType && currentMeta ? (
                <div id="dynamicEntityFormContainer" className="rounded-xl border border-zinc-700 bg-zinc-900/90 p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-400/10 text-amber-300">
                        <currentMeta.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">
                          {editingEntity ? `Edit ${currentMeta.label}` : `Add New ${currentMeta.label}`}
                        </h3>
                        <p className="text-xs text-zinc-400">{currentMeta.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {currentMeta.fields.map((field) => {
                      const inputFieldId = `field_${field.key}`;
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <label htmlFor={inputFieldId} className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                            <span>{field.label}</span>
                          </label>

                          {field.type === 'select' ? (
                            <select
                              id={inputFieldId}
                              value={formFields[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-200 outline-none focus:border-amber-400 transition-colors"
                            >
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'input' ? (
                            <input
                              id={inputFieldId}
                              type="text"
                              value={formFields[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-200 outline-none focus:border-amber-400 transition-colors"
                            />
                          ) : (
                            <textarea
                              id={inputFieldId}
                              rows={3}
                              value={formFields[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-200 outline-none focus:border-amber-400 transition-colors resize-y leading-relaxed"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="h-9 px-4 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="saveEntityBtn"
                      onClick={saveEntityForm}
                      className="h-9 px-5 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{editingEntity ? 'Update Entity' : 'Save Entity to IndexedDB'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Entity Browser / List */
                <div className="space-y-4">
                  {/* Filter Pills & Search */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                      <button
                        onClick={() => setSelectedFilter('all')}
                        className={`h-7 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                          selectedFilter === 'all'
                            ? 'bg-zinc-200 text-zinc-900'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        All ({config.entities?.length || 0})
                      </button>
                      {ENTITY_TYPES.map((t) => {
                        const count = (config.entities || []).filter((e) => e.type === t.type).length;
                        return (
                          <button
                            key={t.type}
                            onClick={() => setSelectedFilter(t.type)}
                            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                              selectedFilter === t.type
                                ? 'bg-amber-400 text-zinc-950'
                                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                            }`}
                          >
                            {t.label} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                      <input
                        id={searchInputId}
                        type="text"
                        placeholder="Search entities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Entities Grid */}
                  {filteredEntities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center flex flex-col items-center justify-center">
                      <Compass className="w-10 h-10 text-zinc-600 mb-2" />
                      <h4 className="text-sm font-semibold text-zinc-400">No entities found</h4>
                      <p className="text-xs text-zinc-600 max-w-sm mt-1">
                        {searchQuery
                          ? 'Try changing your search query or filter.'
                          : 'Click the "+ Add Entity" button above to dynamically configure characters, environments, plot arcs, and lore.'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => setShowAddMenu(true)}
                          className="mt-4 h-8 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add First Entity
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredEntities.map((entity) => {
                        const meta = ENTITY_TYPES.find((m) => m.type === entity.type);
                        const Icon = meta?.icon || Compass;
                        const title = getEntityTitle(entity);
                        const subtitle = getEntitySubtitle(entity);
                        const fieldsList = Object.entries(entity.fields).filter(
                          ([k, v]) => v && !['name', 'settingName', 'arcName', 'itemName', 'eventName', 'systemName', 'factionName', 'themeName'].includes(k)
                        );

                        return (
                          <div
                            key={entity.id}
                            id={`entityCard_${entity.id}`}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 hover:border-zinc-700 transition-colors flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 rounded-md bg-zinc-800 text-amber-400 shrink-0">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-zinc-100 truncate">{title}</h4>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                                      {meta?.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    id={`editEntityBtn_${entity.id}`}
                                    onClick={() => startEditEntity(entity)}
                                    title="Edit entity"
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`deleteEntityBtn_${entity.id}`}
                                    onClick={() => deleteEntity(entity.id, title)}
                                    title="Delete entity"
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {subtitle && (
                                <p className="text-xs text-amber-200/80 italic mb-2 line-clamp-1">
                                  {subtitle}
                                </p>
                              )}

                              <div className="space-y-1 mt-2 text-[11px] text-zinc-400 line-clamp-3">
                                {fieldsList.slice(0, 2).map(([key, val]) => (
                                  <div key={key}>
                                    <span className="text-zinc-400 capitalize font-medium">
                                      {key.replace(/([A-Z])/g, ' $1')}:{' '}
                                    </span>
                                    <span className="text-zinc-300">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                              <span>Saved in IndexedDB</span>
                              <span>{new Date(entity.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'prose' && (
            <div className="space-y-5">
              <div>
                <label htmlFor={toneTextareaId} className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Prose Style, POV & Tone Guidelines
                </label>
                <textarea
                  id={toneTextareaId}
                  rows={5}
                  value={toneGuidelines}
                  onChange={(e) => setToneGuidelines(e.target.value)}
                  placeholder="e.g. Third-person limited (past tense). Intimate, noir-inflected literary fiction. Rich sensory descriptions of weather, light, and decay. Dialog should be sharp and elliptical. Avoid purple adjectives."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-xs text-zinc-200 outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              <div>
                <label htmlFor={notesTextareaId} className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  General Project Notes & Constraints
                </label>
                <textarea
                  id={notesTextareaId}
                  rows={4}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="e.g. Target length 90,000 words. Key themes include industrial pollution and generational loss. Do not introduce fast travel or telepathy."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-xs text-zinc-200 outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  id="saveProseGuidelinesBtn"
                  onClick={saveProseSettings}
                  className="h-10 px-5 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Save Guidelines
                </button>
              </div>
            </div>
          )}

          {activeTab === 'raw_json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  Live JSON structure saved inside IndexedDB store <code className="text-amber-300 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">config</code> (record key: <code className="text-zinc-300 font-mono">{config.id}</code>):
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                    onToast('Config JSON copied to clipboard!', 'success');
                  }}
                  className="h-7 px-2.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300"
                >
                  Copy JSON
                </button>
              </div>

              <pre className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/90 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[500px]">
                {JSON.stringify(
                  {
                    id: config.id,
                    projectId: config.projectId,
                    scope: config.scope,
                    tone: config.tone,
                    entitiesTotal: config.entities?.length || 0,
                    characters: config.characters || [],
                    environments: config.environments || [],
                    plots: config.plots || [],
                    items: config.items || [],
                    events: config.events || [],
                    magicTechSystems: config.magicTechSystems || [],
                    factions: config.factions || [],
                    themes: config.themes || [],
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
