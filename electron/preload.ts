import { contextBridge, ipcRenderer, webUtils } from 'electron';

export interface FileDataPayload {
  filePath: string;
  fileName: string;
  directory: string;
  content: string;
  size: number;
  updatedAt: string;
}

export type FileReadResponse =
  | { ok: true; data: FileDataPayload }
  | { ok: false; error: string };

export type RelativeFileReadResponse = FileReadResponse & { anchor?: string };

const folixAPI = {
  // Window controls
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  isWindowMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: boolean) =>
      callback(state);
    ipcRenderer.on('window:maximized-changed', listener);
    return () => ipcRenderer.removeListener('window:maximized-changed', listener);
  },

  // File operations
  openFilesDialog: (): Promise<FileReadResponse[]> =>
    ipcRenderer.invoke('dialog:open-files'),
  readFile: (filePath: string): Promise<FileReadResponse> =>
    ipcRenderer.invoke('file:read', filePath),
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

  // System theme
  getSystemTheme: (): Promise<'light' | 'dark'> =>
    ipcRenderer.invoke('theme:get-system'),
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      theme: 'light' | 'dark'
    ) => callback(theme);
    ipcRenderer.on('theme:system-changed', listener);
    return () => ipcRenderer.removeListener('theme:system-changed', listener);
  },
};

contextBridge.exposeInMainWorld('folixAPI', folixAPI);

