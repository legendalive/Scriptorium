import {
  Project,
  ProjectConfig,
  ManuscriptData,
  MainNovelData,
  ConfigEntity,
  ConfigEntityType,
} from '../types';

const DB_NAME = 'scriptorium_db';
const DB_VERSION = 2; // Incremented for robust entity structure
const STORES = ['projects', 'config', 'manuscripts', 'main_novel_content'];

let dbInstance: IDBDatabase | null = null;
let useMemoryFallback = false;
const memoryStore: Record<string, Map<string, any>> = {
  projects: new Map(),
  config: new Map(),
  manuscripts: new Map(),
  main_novel_content: new Map(),
};

export function openDB(): Promise<IDBDatabase | null> {
  if (useMemoryFallback) return Promise.resolve(null);
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported in this environment, using memory storage fallback.');
        useMemoryFallback = true;
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          STORES.forEach((store) => {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'id' });
            }
          });
        } catch (e) {
          console.warn('Error during onupgradeneeded:', e);
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB open error, falling back to in-memory store:', e);
        useMemoryFallback = true;
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('IndexedDB blocked, falling back to in-memory store.');
        useMemoryFallback = true;
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB open threw exception, falling back to memory store:', err);
      useMemoryFallback = true;
      resolve(null);
    }
  });
}

export async function dbPut<T extends { id: string }>(storeName: string, value: T): Promise<T> {
  const db = await openDB();
  if (!db || useMemoryFallback) {
    if (!memoryStore[storeName]) memoryStore[storeName] = new Map();
    memoryStore[storeName].set(value.id, value);
    return value;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => {
        // Fallback to memory
        if (!memoryStore[storeName]) memoryStore[storeName] = new Map();
        memoryStore[storeName].set(value.id, value);
        resolve(value);
      };
    } catch {
      if (!memoryStore[storeName]) memoryStore[storeName] = new Map();
      memoryStore[storeName].set(value.id, value);
      resolve(value);
    }
  });
}

export async function dbGet<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDB();
  if (!db || useMemoryFallback) {
    return memoryStore[storeName]?.get(id) || null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve((req.result as T) || memoryStore[storeName]?.get(id) || null);
      req.onerror = () => resolve(memoryStore[storeName]?.get(id) || null);
    } catch {
      resolve(memoryStore[storeName]?.get(id) || null);
    }
  });
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  if (!db || useMemoryFallback) {
    return Array.from(memoryStore[storeName]?.values() || []);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => {
        const results = (req.result as T[]) || [];
        if (results.length === 0 && memoryStore[storeName]?.size) {
          resolve(Array.from(memoryStore[storeName].values()));
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve(Array.from(memoryStore[storeName]?.values() || []));
    } catch {
      resolve(Array.from(memoryStore[storeName]?.values() || []));
    }
  });
}

export async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  if (memoryStore[storeName]) {
    memoryStore[storeName].delete(id);
  }
  if (!db || useMemoryFallback) {
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Organizes entities into structured arrays by type for storage in IndexedDB config data
 */
export function structureConfigEntities(
  config: Partial<ProjectConfig> & { id: string; projectId: string }
): ProjectConfig {
  const entities: ConfigEntity[] = config.entities || [];

  return {
    id: config.id,
    projectId: config.projectId,
    scope: config.scope || 'book',
    tone: config.tone || '',
    generalNotes: config.generalNotes || '',
    entities,
    characters: entities.filter((e) => e.type === 'character') as any,
    environments: entities.filter((e) => e.type === 'environment') as any,
    plots: entities.filter((e) => e.type === 'plot') as any,
    items: entities.filter((e) => e.type === 'item') as any,
    events: entities.filter((e) => e.type === 'event') as any,
    magicTechSystems: entities.filter((e) => e.type === 'magic_tech') as any,
    factions: entities.filter((e) => e.type === 'faction') as any,
    themes: entities.filter((e) => e.type === 'theme') as any,
  };
}

export async function saveProjectConfig(config: Partial<ProjectConfig> & { id: string; projectId: string }): Promise<ProjectConfig> {
  const structured = structureConfigEntities(config);
  await dbPut<ProjectConfig>('config', structured);
  return structured;
}

export async function getProjectConfig(configId: string, projectId: string): Promise<ProjectConfig> {
  const raw = await dbGet<any>('config', configId);
  if (!raw) {
    const fresh: ProjectConfig = structureConfigEntities({
      id: configId,
      projectId,
      entities: [],
    });
    await dbPut('config', fresh);
    return fresh;
  }

  // Handle backwards compatibility if entities was stored as raw strings or empty
  let entities: ConfigEntity[] = Array.isArray(raw.entities) ? raw.entities : [];

  // If old version had raw text fields, convert them or preserve them
  if (entities.length === 0 && (raw.characters || raw.world || raw.plot)) {
    // If raw.characters was a string, keep as generalNotes if needed
    if (typeof raw.characters === 'string' && raw.characters.trim()) {
      entities.push({
        id: 'legacy-char-1',
        type: 'character',
        fields: {
          name: 'Legacy Character Notes',
          roleArchetype: 'Imported',
          personalityTone: '',
          description: raw.characters,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    if (typeof raw.world === 'string' && raw.world.trim()) {
      entities.push({
        id: 'legacy-env-1',
        type: 'environment',
        fields: {
          settingName: 'Primary World / Setting',
          physicalAttributes: '',
          atmosphereMood: '',
          notableLocations: raw.world,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    if (typeof raw.plot === 'string' && raw.plot.trim()) {
      entities.push({
        id: 'legacy-plot-1',
        type: 'plot',
        fields: {
          arcName: 'Main Plot Arc',
          keyConflict: raw.plot,
          narrativeGoal: '',
          resolutionStatus: 'In Progress',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  return structureConfigEntities({
    ...raw,
    entities,
  });
}

/**
 * Exports all local collections as a single snapshot payload for Google Drive storage
 */
export async function exportAllDatabaseState(): Promise<{
  version: number;
  lastSyncedAt: number;
  projects: any[];
  config: any[];
  manuscripts: any[];
  main_novel_content: any[];
}> {
  const [projects, config, manuscripts, main_novel_content] = await Promise.all([
    dbGetAll<any>('projects'),
    dbGetAll<any>('config'),
    dbGetAll<any>('manuscripts'),
    dbGetAll<any>('main_novel_content'),
  ]);

  return {
    version: DB_VERSION,
    lastSyncedAt: Date.now(),
    projects,
    config,
    manuscripts,
    main_novel_content,
  };
}

/**
 * Restores entire database state from a snapshot downloaded from Google Drive
 */
export async function restoreAllDatabaseState(payload: {
  projects?: any[];
  config?: any[];
  manuscripts?: any[];
  main_novel_content?: any[];
}): Promise<void> {
  if (Array.isArray(payload.projects)) {
    for (const p of payload.projects) {
      if (p?.id) await dbPut('projects', p);
    }
  }
  if (Array.isArray(payload.config)) {
    for (const c of payload.config) {
      if (c?.id) await dbPut('config', c);
    }
  }
  if (Array.isArray(payload.manuscripts)) {
    for (const m of payload.manuscripts) {
      if (m?.id) await dbPut('manuscripts', m);
    }
  }
  if (Array.isArray(payload.main_novel_content)) {
    for (const n of payload.main_novel_content) {
      if (n?.id) await dbPut('main_novel_content', n);
    }
  }
}

