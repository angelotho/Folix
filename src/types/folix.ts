export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type FontFamilyPreference = 'inter' | 'merriweather' | 'mono';
export type PageWidthPreference = 'comfortable' | 'wide' | 'expanded';

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
  size: number;
  updatedAt: string;
  scrollTop: number;
  pendingAnchor?: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
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
  size: number;
  updatedAt: string;
}

export type FileReadResponse =
  | { ok: true; data: FileDataPayload }
  | { ok: false; error: string };

export type RelativeFileReadResponse = FileReadResponse & { anchor?: string };

