/// <reference types="vite/client" />
import type { FileReadResponse, RelativeFileReadResponse } from './types/folix';

export interface FolixAPI {
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  openFilesDialog: () => Promise<FileReadResponse[]>;
  readFile: (filePath: string) => Promise<FileReadResponse>;
  openRelativeFile: (
    baseDir: string,
    relPath: string
  ) => Promise<RelativeFileReadResponse>;
  getInitialFiles: () => Promise<FileReadResponse[]>;
  onOpenFileResult: (callback: (result: FileReadResponse) => void) => () => void;
  getPathForDroppedFile: (file: File) => string;
  exportPdf: (options: {
    defaultFileName: string;
    documentTitle: string;
  }) => Promise<{ ok: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  printDocument: () => Promise<{ ok: boolean; error?: string }>;
  openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>;
  showInFolder: (filePath: string) => Promise<boolean>;
  getSystemTheme: () => Promise<'light' | 'dark'>;
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => () => void;
}

declare global {
  interface Window {
    folixAPI: FolixAPI;
  }
}

