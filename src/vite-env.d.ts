/// <reference types="vite/client" />
import type {
  FileEncoding,
  FileReadResponse,
  FileSaveRequest,
  FileSaveResponse,
  LineEnding,
  RelativeFileReadResponse,
} from './types/folix';

export interface FolixAPI {
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  confirmCloseWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  onRequestCloseWindow: (callback: () => void) => () => void;
  openFilesDialog: () => Promise<FileReadResponse[]>;
  readFile: (filePath: string) => Promise<FileReadResponse>;
  saveFile: (req: FileSaveRequest) => Promise<FileSaveResponse>;
  saveFileAs: (req: {
    defaultPath?: string;
    content: string;
    encoding?: FileEncoding;
    lineEnding?: LineEnding;
  }) => Promise<FileSaveResponse>;
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
  setThemePreference: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => () => void;
}

declare global {
  interface Window {
    folixAPI: FolixAPI;
  }
}

