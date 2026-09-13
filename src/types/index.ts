export type ConfigEntityType =
  | 'character'
  | 'environment'
  | 'plot'
  | 'item'
  | 'event'
  | 'magic_tech'
  | 'faction'
  | 'theme';

export interface CharacterFields {
  name: string;
  roleArchetype: string;
  personalityTone: string;
  description: string;
}

export interface EnvironmentFields {
  settingName: string;
  physicalAttributes: string;
  atmosphereMood: string;
  notableLocations: string;
}

export interface PlotFields {
  arcName: string;
  keyConflict: string;
  narrativeGoal: string;
  resolutionStatus: string;
}

export interface ItemFields {
  itemName: string;
  significancePowers: string;
  currentHolder: string;
  physicalAppearance: string;
}

export interface EventFields {
  eventName: string;
  historicalEraTimeline: string;
  keyParticipants: string;
  impactConsequences: string;
}

export interface MagicTechFields {
  systemName: string;
  coreRulesLimits: string;
  primaryUsers: string;
  energySource: string;
}

export interface FactionFields {
  factionName: string;
  ideologyGoals: string;
  keyFigures: string;
  baseOfOperations: string;
}

export interface ThemeFields {
  themeName: string;
  centralMessage: string;
  associatedSymbols: string;
  narrativeFocus: string;
}

export type EntityFieldsMap = {
  character: CharacterFields;
  environment: EnvironmentFields;
  plot: PlotFields;
  item: ItemFields;
  event: EventFields;
  magic_tech: MagicTechFields;
  faction: FactionFields;
  theme: ThemeFields;
};

export interface ConfigEntity<T extends ConfigEntityType = ConfigEntityType> {
  id: string;
  type: T;
  fields: EntityFieldsMap[T];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectConfig {
  id: string;
  projectId: string;
  scope?: 'book' | 'series';
  tone?: string;
  generalNotes?: string;
  // All entities stored in a unified list
  entities: ConfigEntity[];
  // Structured JSON arrays by entity type stored directly in IndexedDB config data
  characters: ConfigEntity<'character'>[];
  environments: ConfigEntity<'environment'>[];
  plots: ConfigEntity<'plot'>[];
  items: ConfigEntity<'item'>[];
  events: ConfigEntity<'event'>[];
  magicTechSystems: ConfigEntity<'magic_tech'>[];
  factions: ConfigEntity<'faction'>[];
  themes: ConfigEntity<'theme'>[];
}

export interface Project {
  id: string;
  type: 'book' | 'series';
  bookName: string;
  seriesName?: string;
  configId: string;
  manuscriptId: string;
  novelId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ManuscriptData {
  id: string;
  projectId: string;
  text: string;
}

export interface MainNovelData {
  id: string;
  projectId: string;
  text: string;
}

export interface DiscoveredModel {
  id: string;
  name?: string;
  isFree?: boolean;
  pricing?: { prompt?: string | number; completion?: string | number };
  contextLength?: number;
}

export interface ProviderTier {
  id: string;
  name: string;
  vendorType: 'openrouter' | 'groq' | 'gemini' | 'openai' | 'deepseek' | 'mistral' | 'together' | 'ollama' | 'custom';
  baseUrl: string;
  apiKey: string;
  autoPickBestModel: boolean;
  preferredModel: string;
  cycleFreeModelsOnError: boolean;
  fallbackModels: string; // comma-separated fallback models
  enabled: boolean;
  cachedModels?: DiscoveredModel[];
  lastTested?: number;
  testStatus?: 'idle' | 'testing' | 'success' | 'error';
  testMessage?: string;
}

export interface ChapterSegment {
  index: number;
  title: string;
  text: string;
  wordCount: number;
}

export interface AiGenerationProgress {
  status: 'idle' | 'generating' | 'success' | 'error';
  message: string;
  activeTier?: string;
  activeModel?: string;
  attemptLog: string[];
}
