import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  FolderSync,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  auth,
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../services/auth';
import {
  downloadDatabaseFromDrive,
  uploadDatabaseToDrive,
  getOrCreateScriptoriumFolder,
} from '../services/drive';
import {
  exportAllDatabaseState,
  restoreAllDatabaseState,
} from '../services/db';

interface GoogleDriveSyncProps {
  onSyncCompleted: () => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({
  onSyncCompleted,
  onToast,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [hasToken, setHasToken] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('scriptorium_drive_last_sync');
    return saved ? parseInt(saved, 10) : null;
  });
  const [storageMode, setStorageMode] = useState<'drive' | 'local'>(() => {
    return (localStorage.getItem('scriptorium_storage_preference') as 'drive' | 'local') || 'drive';
  });

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
      },
      () => {
        setCurrentUser(auth.currentUser);
        getAccessToken().then((token) => setHasToken(!!token));
      }
    );

    // Initial check
    getAccessToken().then((token) => {
      setHasToken(!!token);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        setStorageMode('drive');
        localStorage.setItem('scriptorium_storage_preference', 'drive');
        onToast('Connected to Google Drive! Storage location set to Google Drive.', 'success');
      }
    } catch (err: any) {
      console.error('Google Drive sign-in error:', err);
      onToast(`Sign-in failed: ${err.message || 'Access popup closed or cancelled'}`, 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setHasToken(false);
      setStorageMode('local');
      localStorage.setItem('scriptorium_storage_preference', 'local');
      onToast('Disconnected from Google Drive. Switched to local storage.', 'info');
    } catch (err: any) {
      onToast(`Sign out error: ${err.message}`, 'error');
    }
  };

  const handleBackupToDrive = async () => {
    if (!hasToken) {
      onToast('Please sign in with Google first.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const snapshot = await exportAllDatabaseState();
      const result = await uploadDatabaseToDrive(snapshot);
      setLastSyncTime(result.syncedAt);
      localStorage.setItem('scriptorium_drive_last_sync', result.syncedAt.toString());
      onToast('Successfully backed up all projects & manuscripts to Google Drive!', 'success');
    } catch (err: any) {
      console.error('Upload to Drive error:', err);
      onToast(`Backup error: ${err.message || 'Failed to upload to Drive'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!hasToken) {
      onToast('Please sign in with Google first.', 'error');
      return;
    }
    if (!window.confirm('Restore database from Google Drive? This will merge and update your projects with the Drive cloud version.')) {
      return;
    }

    setIsSyncing(true);
    try {
      const remoteData = await downloadDatabaseFromDrive();
      if (!remoteData) {
        onToast('No existing Scriptorium backup found in your Google Drive folder.', 'info');
        return;
      }

      await restoreAllDatabaseState(remoteData);
      setLastSyncTime(remoteData.lastSyncedAt || Date.now());
      localStorage.setItem('scriptorium_drive_last_sync', (remoteData.lastSyncedAt || Date.now()).toString());
      onToast('Projects and manuscripts restored successfully from Google Drive!', 'success');
      onSyncCompleted();
    } catch (err: any) {
      console.error('Restore from Drive error:', err);
      onToast(`Restore error: ${err.message || 'Failed to download from Drive'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Storage Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google Drive Option */}
        <div
          onClick={() => {
            setStorageMode('drive');
            localStorage.setItem('scriptorium_storage_preference', 'drive');
            if (!hasToken) {
              handleSignIn();
            }
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            storageMode === 'drive'
              ? 'border-amber-400 bg-amber-400/10 shadow-sm'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cloud className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">Google Drive</span>
            </div>
            {storageMode === 'drive' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                Active Choice
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Store and sync novel projects, entities, and drafts in your private Google Drive in a dedicated Scriptorium folder.
          </p>
        </div>

        {/* Local Storage Option */}
        <div
          onClick={() => {
            setStorageMode('local');
            localStorage.setItem('scriptorium_storage_preference', 'local');
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            storageMode === 'local'
              ? 'border-amber-400 bg-amber-400/10 shadow-sm'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-zinc-700/30 text-zinc-300 border border-zinc-700">
                <HardDrive className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">Local Browser Storage</span>
            </div>
            {storageMode === 'local' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                Active Choice
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Keep data cached in this browser's local IndexedDB offline storage without cloud synchronization.
          </p>
        </div>
      </div>

      {/* Google Account Connection Status Card */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'Google Account'}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                <Cloud className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>{currentUser ? currentUser.displayName || currentUser.email : 'Google Drive Disconnected'}</span>
                {currentUser && hasToken && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                )}
                {currentUser && !hasToken && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Permission Needed
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                {currentUser?.email || 'Sign in with Google to grant Drive access for your projects.'}
              </div>
            </div>
          </div>

          <div>
            {!currentUser || !hasToken ? (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {/* Official Google Icon SVG */}
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Controls when connected */}
        {hasToken && (
          <div className="pt-3 border-t border-zinc-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-2">
              <span>
                Target Folder:{' '}
                <strong className="text-zinc-200">Google Drive &gt; Scriptorium Studio Projects</strong>
              </span>
              {lastSyncTime && (
                <span className="text-[11px] text-zinc-500">
                  Last synced: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleBackupToDrive}
                disabled={isSyncing}
                className="h-9 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>Save/Push to Drive</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreFromDrive}
                disabled={isSyncing}
                className="h-9 px-3.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4 text-blue-400" />
                <span>Restore/Pull from Drive</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
