import { contextBridge, ipcRenderer, webUtils } from 'electron';

export type FileEncoding = 'utf8' | 'utf8-bom' | 'utf16le';
export type LineEnding = '\r\n' | '\n';

export interface FileDataPayload {
  filePath: string;
  fileName: string;
  directory: string;
  content: string;
  encoding?: FileEncoding;
  lineEnding?: LineEnding;
  size: number;
  updatedAt: string;
}

export type FileReadResponse =
  | { ok: true; data: FileDataPayload }
  | { ok: false; error: string };

export type RelativeFileReadResponse = FileReadResponse & { anchor?: string };

export interface FileSaveRequest {
  filePath: string;
  content: string;
  encoding?: FileEncoding;
  lineEnding?: LineEnding;
  expectedUpdatedAt?: string;
  forceOverwrite?: boolean;
}

export type FileSaveResponse =
  | { ok: true; data: FileDataPayload }
  | {
      ok: false;
      error: string;
      conflict?: boolean;
      diskUpdatedAt?: string;
      cancelled?: boolean;
    };

export type UpdateStatus =
  | { state: 'available'; version: string; canAutoInstall: boolean }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; version: string };

const folixAPI = {
  // Window controls
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  confirmCloseWindow: (): Promise<void> =>
    ipcRenderer.invoke('window:confirm-close'),
  isWindowMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: boolean) =>
      callback(state);
    ipcRenderer.on('window:maximized-changed', listener);
    return () => ipcRenderer.removeListener('window:maximized-changed', listener);
  },
  onRequestCloseWindow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('window:request-close', listener);
    return () => ipcRenderer.removeListener('window:request-close', listener);
  },

  // File operations
  openFilesDialog: (): Promise<FileReadResponse[]> =>
    ipcRenderer.invoke('dialog:open-files'),
  readFile: (filePath: string): Promise<FileReadResponse> =>
    ipcRenderer.invoke('file:read', filePath),
  saveFile: (req: FileSaveRequest): Promise<FileSaveResponse> =>
    ipcRenderer.invoke('file:save', req),
  saveFileAs: (req: {
    defaultPath?: string;
    content: string;
    encoding?: FileEncoding;
    lineEnding?: LineEnding;
    isNewDocument?: boolean;
  }): Promise<FileSaveResponse> => ipcRenderer.invoke('file:save-as', req),
  openRelativeFile: (
    baseDir: string,
    relPath: string
  ): Promise<RelativeFileReadResponse> =>
    ipcRenderer.invoke('file:open-relative', baseDir, relPath),
  getInitialFiles: (): Promise<FileReadResponse[]> =>
    ipcRenderer.invoke('app:get-initial-files'),
  onOpenFileResult: (callback: (result: FileReadResponse) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      result: FileReadResponse
    ) => callback(result);
    ipcRenderer.on('app:open-file-result', listener);
    return () => ipcRenderer.removeListener('app:open-file-result', listener);
  },
  getPathForDroppedFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },

  // PDF & Printing
  exportPdf: (options: {
    defaultFileName: string;
    documentTitle: string;
  }): Promise<{ ok: boolean; filePath?: string; cancelled?: boolean; error?: string }> =>
    ipcRenderer.invoke('file:export-pdf', options),
  printDocument: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('file:print'),

  // OS integration
  openExternal: (url: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('shell:open-external', url),
  showInFolder: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:show-in-folder', filePath),

  // System theme & preference sync
  getSystemTheme: (): Promise<'light' | 'dark'> =>
    ipcRenderer.invoke('theme:get-system'),
  setThemePreference: (theme: 'light' | 'dark' | 'system'): Promise<void> =>
    ipcRenderer.invoke('theme:set-preference', theme),
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      theme: 'light' | 'dark'
    ) => callback(theme);
    ipcRenderer.on('theme:system-changed', listener);
    return () => ipcRenderer.removeListener('theme:system-changed', listener);
  },

  // App updates (GitHub Releases)
  checkForUpdate: (): Promise<void> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),
  openUpdateDownloadPage: (): Promise<void> =>
    ipcRenderer.invoke('update:open-download-page'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) =>
      callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
};

contextBridge.exposeInMainWorld('folixAPI', folixAPI);

