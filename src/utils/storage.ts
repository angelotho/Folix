import type {
  ReaderSettings,
  RecentFile,
  ResolvedTheme,
  ThemeMode,
} from '../types/folix';

const SETTINGS_KEY = 'folix.reader.settings.v1';
const RECENT_FILES_KEY = 'folix.recent.files.v1';
const MAX_RECENT_FILES = 8;

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'system',
  fontFamily: 'inter',
  fontSize: 100,
  pageWidth: 'comfortable',
  sidebarOpen: true,
};

export function resolveInitialTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

export function loadReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;

    const theme =
      parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
        ? parsed.theme
        : DEFAULT_SETTINGS.theme;

    const fontFamily =
      parsed.fontFamily === 'inter' ||
      parsed.fontFamily === 'merriweather' ||
      parsed.fontFamily === 'mono'
        ? parsed.fontFamily
        : DEFAULT_SETTINGS.fontFamily;

    const fontSize =
      typeof parsed.fontSize === 'number' &&
      parsed.fontSize >= 80 &&
      parsed.fontSize <= 160
        ? parsed.fontSize
        : DEFAULT_SETTINGS.fontSize;

    const pageWidth =
      parsed.pageWidth === 'comfortable' ||
      parsed.pageWidth === 'wide' ||
      parsed.pageWidth === 'expanded'
        ? parsed.pageWidth
        : DEFAULT_SETTINGS.pageWidth;

    const sidebarOpen =
      typeof parsed.sidebarOpen === 'boolean'
        ? parsed.sidebarOpen
        : DEFAULT_SETTINGS.sidebarOpen;

    return { theme, fontFamily, fontSize, pageWidth, sidebarOpen };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveReaderSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentFile =>
        Boolean(item) &&
        typeof item.filePath === 'string' &&
        typeof item.fileName === 'string' &&
        typeof item.directory === 'string' &&
        typeof item.lastOpenedAt === 'string'
    );
  } catch {
    return [];
  }
}

export function addRecentFile(file: Omit<RecentFile, 'lastOpenedAt'>): RecentFile[] {
  const existing = loadRecentFiles().filter(
    (item) => item.filePath.toLowerCase() !== file.filePath.toLowerCase()
  );
  const updated: RecentFile[] = [
    { ...file, lastOpenedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_RECENT_FILES);

  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }

  return updated;
}

export function removeRecentFile(filePath: string): RecentFile[] {
  const updated = loadRecentFiles().filter(
    (item) => item.filePath.toLowerCase() !== filePath.toLowerCase()
  );
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return updated;
}

export function clearRecentFiles(): RecentFile[] {
  try {
    localStorage.removeItem(RECENT_FILES_KEY);
  } catch {
    // Ignore
  }
  return [];
}

