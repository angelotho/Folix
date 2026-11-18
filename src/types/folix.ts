export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type FontFamilyPreference = 'inter' | 'merriweather' | 'mono';
export type PageWidthPreference = 'comfortable' | 'wide' | 'expanded';
export type FileEncoding = 'utf8' | 'utf8-bom' | 'utf16le';
export type LineEnding = '\r\n' | '\n';
export type DocumentMode = 'read' | 'edit';
export type EditorLayout = 'editor' | 'split';

export interface ReaderSettings {
  theme: ThemeMode;
  fontFamily: FontFamilyPreference;
  fontSize: number; // percentage: 80..160 (default 100)
  pageWidth: PageWidthPreference;
  sidebarOpen: boolean;
}

export interface DocumentTab {
  id: string;
  filePath: string;
  fileName: string;
  directory: string;
  content: string;
  savedContent: string;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  size: number;
  updatedAt: string;
  scrollTop: number;
  editorScrollTop?: number;
  mode?: DocumentMode;
  pendingAnchor?: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
  line: number;
}

export interface RecentFile {
  filePath: string;
  fileName: string;
  directory: string;
  lastOpenedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
}

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

