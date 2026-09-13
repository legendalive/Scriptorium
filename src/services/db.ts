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

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function dbPut<T>(storeName: string, value: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGet<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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
