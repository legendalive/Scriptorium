import { getAccessToken } from './auth';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const SCRIPTORIUM_FOLDER_NAME = 'Scriptorium Studio Projects';
const SCRIPTORIUM_DATABASE_FILE = 'scriptorium_database.json';

export interface RemoteDatabasePayload {
  version: number;
  lastSyncedAt: number;
  projects: any[];
  config: any[];
  manuscripts: any[];
  main_novel_content: any[];
}

let cachedFolderId: string | null = null;
let cachedFileId: string | null = null;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Drive access token not found. Please connect your Google account.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Finds or creates the dedicated 'Scriptorium Studio Projects' root folder in user's Drive.
 */
export async function getOrCreateScriptoriumFolder(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  const headers = await getAuthHeaders();
  const query = encodeURIComponent(
    `name = '${SCRIPTORIUM_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(`${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)&spaces=drive`, {
    headers,
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Failed to search Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    cachedFolderId = searchData.files[0].id;
    return cachedFolderId!;
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: SCRIPTORIUM_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Directory for Scriptorium novel and project database backups',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Scriptorium folder in Google Drive: ${errText}`);
  }

  const folderData = await createRes.json();
  cachedFolderId = folderData.id;
  return cachedFolderId!;
}

/**
 * Finds existing database JSON file in Scriptorium folder or null.
 */
async function findDatabaseFileId(folderId: string): Promise<string | null> {
  if (cachedFileId) return cachedFileId;

  const headers = await getAuthHeaders();
  const query = encodeURIComponent(
    `name = '${SCRIPTORIUM_DATABASE_FILE}' and '${folderId}' in parents and trashed = false`
  );

  const res = await fetch(`${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,modifiedTime)&spaces=drive`, {
    headers,
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    cachedFileId = data.files[0].id;
    return cachedFileId;
  }
  return null;
}

/**
 * Downloads the entire Scriptorium database snapshot from Google Drive.
 */
export async function downloadDatabaseFromDrive(): Promise<RemoteDatabasePayload | null> {
  const headers = await getAuthHeaders();
  const folderId = await getOrCreateScriptoriumFolder();
  const fileId = await findDatabaseFileId(folderId);

  if (!fileId) {
    return null;
  }

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers,
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const errText = await res.text();
    throw new Error(`Failed to download database from Google Drive: ${errText}`);
  }

  const json = await res.json();
  return json as RemoteDatabasePayload;
}

/**
 * Saves/Uploads the Scriptorium database snapshot to Google Drive.
 * Uses multipart upload for initial creation or media update for existing.
 */
export async function uploadDatabaseToDrive(payload: RemoteDatabasePayload): Promise<{ fileId: string; syncedAt: number }> {
  const headers = await getAuthHeaders();
  const folderId = await getOrCreateScriptoriumFolder();
  let fileId = await findDatabaseFileId(folderId);

  const contentString = JSON.stringify(payload, null, 2);
  const syncedAt = Date.now();
  payload.lastSyncedAt = syncedAt;

  if (fileId) {
    // Update existing file content
    const res = await fetch(`${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: contentString,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update database on Google Drive: ${err}`);
    }

    return { fileId, syncedAt };
  } else {
    // Create new file with multipart upload to place directly in the Scriptorium folder
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: SCRIPTORIUM_DATABASE_FILE,
      mimeType: 'application/json',
      parents: [folderId],
      description: 'Scriptorium Studio synchronized database containing novels, characters, and manuscripts.',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      contentString +
      closeDelim;

    const res = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create database on Google Drive: ${err}`);
    }

    const file = await res.json();
    cachedFileId = file.id;
    return { fileId: file.id, syncedAt };
  }
}
