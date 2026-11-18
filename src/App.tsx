import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { EditorState } from '@codemirror/state';
import { Minimize2, Upload } from 'lucide-react';
import type {
  DocumentMode,
  DocumentTab,
  EditorLayout,
  FileReadResponse,
  ReaderSettings,
  RecentFile,
  ResolvedTheme,
  ToastMessage,
  ViewportSyncAnchor,
} from './types/folix';
import { extractTocFromMarkdown, getDocumentTitle } from './utils/slug';
import {
  applyAnchorToViewer,
  captureViewerSyncAnchor,
  resolveActiveHeadingForLine,
} from './utils/scrollSync';
import {
  addRecentFile,
  clearRecentFiles,
  loadReaderSettings,
  loadRecentFiles,
  removeRecentFile,
  resolveInitialTheme,
  saveReaderSettings,
} from './utils/storage';
import {
  applyDomThemeAttributes,
  runSmoothThemeTransition,
} from './utils/themeTransition';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SidebarToc } from './components/SidebarToc';
import { MarkdownViewer } from './components/MarkdownViewer';
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from './components/MarkdownEditor';
import { SearchBar } from './components/SearchBar';
import { ImageLightbox } from './components/ImageLightbox';
import { DocumentLoader } from './components/DocumentLoader';
import { SettingsModal } from './components/SettingsModal';
import {
  UnsavedChangesModal,
  type PendingConfirmAction,
} from './components/UnsavedChangesModal';
import { SplashScreen } from './components/SplashScreen';
import { ToastContainer } from './components/ToastContainer';

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getFileNameHint(filePath: string): string | undefined {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1];
}

export default function App() {
  const [settings, setSettings] = useState<ReaderSettings>(() =>
    loadReaderSettings()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    resolveInitialTheme('system')
  );
  const [isMaximized, setIsMaximized] = useState(false);

  const [tabs, setTabs] = useState<DocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() =>
    loadRecentFiles()
  );

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [editorLayout, setEditorLayout] = useState<EditorLayout>('editor');
  const editorLayoutRef = useRef(editorLayout);
  editorLayoutRef.current = editorLayout;
  const [viewerSyncRevision, setViewerSyncRevision] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmAction | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt?: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashStillLoading, setSplashStillLoading] = useState(false);
  const [loadingDocInfo, setLoadingDocInfo] = useState<{
    fileName?: string;
  } | null>(null);

  const loadingDocTimerRef = useRef<number | null>(null);
  const loadingRequestIdRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const systemThemeRef = useRef(systemTheme);
  systemThemeRef.current = systemTheme;
  const showSplashRef = useRef(showSplash);
  showSplashRef.current = showSplash;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const requestCloseAppRef = useRef<() => void>(() => {});
  const dragCounterRef = useRef(0);
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const editorScrollPositionsRef = useRef<Map<string, number>>(new Map());
  const editorStatesRef = useRef<Map<string, EditorState>>(new Map());
  const pendingEditorSyncRef = useRef<Map<string, ViewportSyncAnchor>>(new Map());
  const pendingViewerSyncRef = useRef<Map<string, ViewportSyncAnchor>>(new Map());
  const suppressViewerRevealRef = useRef<Set<string>>(new Set());
  const editorHandleRef = useRef<MarkdownEditorHandle>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  const resolvedTheme: ResolvedTheme =
    settings.theme === 'system' ? systemTheme : settings.theme;

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const [debouncedPreview, setDebouncedPreview] = useState<{
    tabId: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (!activeTab) {
      setDebouncedPreview(null);
      return;
    }
    if ((activeTab.mode ?? 'read') === 'read') {
      setDebouncedPreview({ tabId: activeTab.id, content: activeTab.content });
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedPreview({ tabId: activeTab.id, content: activeTab.content });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [activeTab?.id, activeTab?.content, activeTab?.mode]);

  const effectivePreviewContent = useMemo(() => {
    if (!activeTab) return '';
    if (isPreparingPrint || (activeTab.mode ?? 'read') === 'read') {
      return activeTab.content;
    }
    if (debouncedPreview && debouncedPreview.tabId === activeTab.id) {
      return debouncedPreview.content;
    }
    return activeTab.content;
  }, [activeTab, debouncedPreview, isPreparingPrint]);

  const previewTab = useMemo(() => {
    if (!activeTab) return null;
    if (effectivePreviewContent === activeTab.content) return activeTab;
    return { ...activeTab, content: effectivePreviewContent };
  }, [activeTab, effectivePreviewContent]);

  const tocItems = useMemo(
    () =>
      effectivePreviewContent
        ? extractTocFromMarkdown(effectivePreviewContent)
        : [],
    [activeTab?.id, effectivePreviewContent]
  );
  const tocItemsRef = useRef(tocItems);
  tocItemsRef.current = tocItems;

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>, durationMs = 4500) => {
      const id = makeId();
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, durationMs);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    const current = settingsRef.current;
    const next: ReaderSettings = { ...current, ...patch };
    const currentSys = systemThemeRef.current;
    const prevResolved: ResolvedTheme =
      current.theme === 'system' ? currentSys : current.theme;
    const nextResolved: ResolvedTheme =
      next.theme === 'system' ? currentSys : next.theme;

    saveReaderSettings(next);
    settingsRef.current = next;

    if (prevResolved !== nextResolved) {
      runSmoothThemeTransition(
        nextResolved,
        () => {
          setSettings(next);
        },
        { skipAnimation: showSplashRef.current }
      );
    } else {
      setSettings(next);
    }
  }, []);

  const applySystemTheme = useCallback((nextSysTheme: ResolvedTheme) => {
    if (systemThemeRef.current === nextSysTheme) return;
    systemThemeRef.current = nextSysTheme;

    if (settingsRef.current.theme === 'system') {
      runSmoothThemeTransition(
        nextSysTheme,
        () => {
          setSystemTheme(nextSysTheme);
        },
        { skipAnimation: showSplashRef.current }
      );
    } else {
      setSystemTheme(nextSysTheme);
    }
  }, []);

  // Ensure DOM theme attributes stay synchronized on mount and fallback renders
  useEffect(() => {
    applyDomThemeAttributes(resolvedTheme);
  }, [resolvedTheme]);

  // Keep Electron main process background color & persisted startup preference synced
  useEffect(() => {
    window.folixAPI.setThemePreference(settings.theme);
  }, [settings.theme]);

  // Update window title with subtle unsaved indicator
  useEffect(() => {
    if (!activeTab) {
      document.title = 'Folix';
      return;
    }
    const dirtyPrefix =
      activeTab.content !== activeTab.savedContent ? '● ' : '';
    document.title = `${dirtyPrefix}${activeTab.fileName} — Folix`;
  }, [activeTab?.fileName, activeTab?.content, activeTab?.savedContent]);

  // Open file payload into tab (reusing existing tab if same path)
  const applyFileReadResult = useCallback(
    (
      result: FileReadResponse,
      anchor?: string,
      allowOverwriteDirty = false
    ) => {
      if (!result.ok) {
        pushToast({
          type: 'error',
          title: 'Não foi possível abrir o documento',
          description: result.error,
        });
        return;
      }

      const payload = result.data;
      const canonicalContent = payload.content.replace(/\r\n/g, '\n');

      setRecentFiles(
        addRecentFile({
          filePath: payload.filePath,
          fileName: payload.fileName,
          directory: payload.directory,
        })
      );

      setTabs((prevTabs) => {
        const existing = prevTabs.find(
          (t) => t.filePath.toLowerCase() === payload.filePath.toLowerCase()
        );
        if (existing) {
          setActiveTabId(existing.id);
          if (!allowOverwriteDirty && existing.content !== existing.savedContent) {
            return anchor
              ? prevTabs.map((t) =>
                  t.id === existing.id ? { ...t, pendingAnchor: anchor } : t
                )
              : prevTabs;
          }
          editorStatesRef.current.delete(existing.id);
          pendingEditorSyncRef.current.delete(existing.id);
          pendingViewerSyncRef.current.delete(existing.id);
          suppressViewerRevealRef.current.delete(existing.id);
          return prevTabs.map((t) =>
            t.id === existing.id
              ? {
                  ...t,
                  fileName: payload.fileName,
                  directory: payload.directory,
                  content: canonicalContent,
                  savedContent: canonicalContent,
                  encoding: payload.encoding || 'utf8',
                  lineEnding: payload.lineEnding || '\n',
                  size: payload.size,
                  updatedAt: payload.updatedAt,
                  pendingAnchor: anchor,
                }
              : t
          );
        }

        const newId = makeId();
        const newTab: DocumentTab = {
          id: newId,
          filePath: payload.filePath,
          fileName: payload.fileName,
          directory: payload.directory,
          content: canonicalContent,
          savedContent: canonicalContent,
          encoding: payload.encoding || 'utf8',
          lineEnding: payload.lineEnding || '\n',
          size: payload.size,
          updatedAt: payload.updatedAt,
          scrollTop: 0,
          mode: 'read',
          pendingAnchor: anchor,
        };
        setActiveTabId(newId);
        return [...prevTabs, newTab];
      });
    },
    [pushToast]
  );

  // Sync Electron window state, system theme, Explorer launch files, and real startup readiness
  useEffect(() => {
    let mounted = true;
    let exitTimer: number | null = null;

    const stillLoadingTimer = window.setTimeout(() => {
      if (mounted) setSplashStillLoading(true);
    }, 2700);

    const maxStatePromise = window.folixAPI
      .isWindowMaximized()
      .then((state) => {
        if (mounted) setIsMaximized(state);
      })
      .catch(() => undefined);

    const systemThemePromise = window.folixAPI
      .getSystemTheme()
      .then((theme) => {
        if (mounted) applySystemTheme(theme);
      })
      .catch(() => undefined);

    const initialFilesPromise = window.folixAPI
      .getInitialFiles()
      .then((results) => {
        if (!mounted) return;
        for (const res of results) {
          applyFileReadResult(res);
        }
      })
      .catch(() => undefined);

    const fontsReadyPromise =
      document.fonts?.ready.catch(() => undefined) ?? Promise.resolve();

    let minDelayTimer: number | null = null;
    let rafId1: number | null = null;
    let rafId2: number | null = null;
    const minChoreographyPromise = new Promise<void>((resolve) => {
      rafId1 = window.requestAnimationFrame(() => {
        rafId2 = window.requestAnimationFrame(() => {
          minDelayTimer = window.setTimeout(resolve, 2600);
        });
      });
    });

    Promise.all([
      Promise.all([
        maxStatePromise,
        systemThemePromise,
        initialFilesPromise,
        fontsReadyPromise,
      ]),
      minChoreographyPromise,
    ]).then(() => {
      if (!mounted) return;
      window.clearTimeout(stillLoadingTimer);
      setSplashStillLoading(false);
      setSplashExiting(true);
      exitTimer = window.setTimeout(() => {
        if (mounted) setShowSplash(false);
      }, 480);
    });

    const unsubMax = window.folixAPI.onMaximizedChange(setIsMaximized);
    const unsubTheme = window.folixAPI.onSystemThemeChange(applySystemTheme);
    const unsubRequestClose = window.folixAPI.onRequestCloseWindow(() => {
      requestCloseAppRef.current();
    });
    const unsubOpenFile = window.folixAPI.onOpenFileResult((res) => {
      if (!res.ok) {
        applyFileReadResult(res);
        return;
      }
      const reqId = ++loadingRequestIdRef.current;
      if (loadingDocTimerRef.current !== null) {
        window.clearTimeout(loadingDocTimerRef.current);
      }
      setLoadingDocInfo({ fileName: res.data.fileName });
      applyFileReadResult(res);
      loadingDocTimerRef.current = window.setTimeout(() => {
        if (loadingRequestIdRef.current === reqId) {
          setLoadingDocInfo(null);
        }
      }, 540);
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      applySystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mounted = false;
      window.clearTimeout(stillLoadingTimer);
      if (rafId1 !== null) window.cancelAnimationFrame(rafId1);
      if (rafId2 !== null) window.cancelAnimationFrame(rafId2);
      if (minDelayTimer !== null) window.clearTimeout(minDelayTimer);
      if (exitTimer !== null) window.clearTimeout(exitTimer);
      if (loadingDocTimerRef.current !== null) {
        window.clearTimeout(loadingDocTimerRef.current);
      }
      unsubMax();
      unsubTheme();
      unsubRequestClose();
      unsubOpenFile();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [applyFileReadResult, applySystemTheme]);

  const runWithDocumentLoader = useCallback(
    async (
      fileNameHint: string | undefined,
      task: () => Promise<boolean>
    ) => {
      const reqId = ++loadingRequestIdRef.current;
      if (loadingDocTimerRef.current !== null) {
        window.clearTimeout(loadingDocTimerRef.current);
      }
      setLoadingDocInfo({ fileName: fileNameHint });

      const minVisualPromise = new Promise<void>((resolve) => {
        loadingDocTimerRef.current = window.setTimeout(resolve, 540);
      });

      const succeeded = await task();
      if (!succeeded) {
        if (loadingDocTimerRef.current !== null) {
          window.clearTimeout(loadingDocTimerRef.current);
        }
        if (loadingRequestIdRef.current === reqId) {
          setLoadingDocInfo(null);
        }
        return;
      }

      await minVisualPromise;
      if (loadingRequestIdRef.current === reqId) {
        setLoadingDocInfo(null);
      }
    },
    []
  );

  const handleOpenFilesDialog = useCallback(async () => {
    const results = await window.folixAPI.openFilesDialog();
    if (results.length === 0) return;

    const firstValid = results.find((r) => r.ok);
    await runWithDocumentLoader(
      firstValid?.ok ? firstValid.data.fileName : undefined,
      async () => {
        let openedAny = false;
        for (const res of results) {
          if (res.ok) openedAny = true;
          applyFileReadResult(res);
        }
        return openedAny;
      }
    );
  }, [applyFileReadResult, runWithDocumentLoader]);

  const handleOpenPath = useCallback(
    async (filePath: string) => {
      await runWithDocumentLoader(getFileNameHint(filePath), async () => {
        const res = await window.folixAPI.readFile(filePath);
        if (!res.ok) {
          pushToast({
            type: 'error',
            title: 'Arquivo indisponível',
            description: res.error,
          });
          return false;
        }
        applyFileReadResult(res);
        return true;
      });
    },
    [applyFileReadResult, pushToast, runWithDocumentLoader]
  );

  const handleOpenRelativeLink = useCallback(
    async (relPath: string) => {
      const currentTab = activeTabRef.current;
      if (!currentTab) return;
      const cleanRel = relPath.split('#')[0];
      await runWithDocumentLoader(getFileNameHint(cleanRel), async () => {
        const res = await window.folixAPI.openRelativeFile(
          currentTab.directory,
          relPath
        );
        applyFileReadResult(res, res.anchor);
        return res.ok;
      });
    },
    [applyFileReadResult, runWithDocumentLoader]
  );

  const handleOpenExternalError = useCallback(
    (message: string) => {
      pushToast({
        type: 'error',
        title: 'Não foi possível abrir o link',
        description: message,
      });
    },
    [pushToast]
  );

  const handleImageClick = useCallback((src: string, alt?: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const handleCloseSidebar = useCallback(() => {
    updateSettings({ sidebarOpen: false });
  }, [updateSettings]);

  const handleChangeTabContent = useCallback(
    (tabId: string, nextContent: string) => {
      const byteSize = new Blob([nextContent]).size;
      setTabs((prevTabs) =>
        prevTabs.map((t) =>
          t.id === tabId ? { ...t, content: nextContent, size: byteSize } : t
        )
      );
    },
    []
  );

  const handleChangeMode = useCallback((nextMode: DocumentMode) => {
    const tab = activeTabRef.current;
    if (!tab || (tab.mode ?? 'read') === nextMode) return;

    if (nextMode === 'edit') {
      const anchor = captureViewerSyncAnchor(
        scrollContainerRef.current,
        articleRef.current
      );
      pendingEditorSyncRef.current.set(tab.id, anchor);
      if (editorLayoutRef.current === 'split') {
        pendingViewerSyncRef.current.set(tab.id, anchor);
        setViewerSyncRevision((r) => r + 1);
      }
      setTabs((prevTabs) =>
        prevTabs.map((t) => (t.id === tab.id ? { ...t, mode: 'edit' } : t))
      );
      return;
    }

    const anchor = editorHandleRef.current?.captureSyncAnchor() ?? null;
    if (anchor) {
      pendingViewerSyncRef.current.set(tab.id, anchor);
      const nextToc = extractTocFromMarkdown(tab.content);
      setActiveHeadingId(resolveActiveHeadingForLine(nextToc, anchor.line));
    }
    suppressViewerRevealRef.current.add(tab.id);
    setViewerSyncRevision((r) => r + 1);
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tab.id ? { ...t, mode: 'read' } : t))
    );
  }, []);

  const handleToggleSplitLayout = useCallback(() => {
    const tab = activeTabRef.current;
    const next: EditorLayout =
      editorLayoutRef.current === 'split' ? 'editor' : 'split';
    if (next === 'split' && tab && (tab.mode ?? 'read') === 'edit') {
      const anchor = editorHandleRef.current?.captureSyncAnchor();
      if (anchor) {
        pendingViewerSyncRef.current.set(tab.id, anchor);
      }
      suppressViewerRevealRef.current.add(tab.id);
      setDebouncedPreview({ tabId: tab.id, content: tab.content });
      setViewerSyncRevision((r) => r + 1);
    }
    setEditorLayout(next);
  }, []);

  const handleSaveTab = useCallback(
    async (tab: DocumentTab, forceOverwrite = false): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await window.folixAPI.saveFile({
          filePath: tab.filePath,
          content: tab.content,
          encoding: tab.encoding,
          lineEnding: tab.lineEnding,
          expectedUpdatedAt: tab.updatedAt,
          forceOverwrite,
        });

        if (!res.ok) {
          if (res.conflict) {
            setPendingConfirm({
              kind: 'conflict',
              tabId: tab.id,
              fileName: tab.fileName,
              diskUpdatedAt: res.diskUpdatedAt,
            });
            return false;
          }
          pushToast({
            type: 'error',
            title: 'Não foi possível salvar o arquivo',
            description: res.error,
          });
          return false;
        }

        const savedCanonical = res.data.content.replace(/\r\n/g, '\n');
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === tab.id
              ? {
                  ...t,
                  filePath: res.data.filePath,
                  fileName: res.data.fileName,
                  directory: res.data.directory,
                  content: savedCanonical,
                  savedContent: savedCanonical,
                  encoding: res.data.encoding || t.encoding,
                  lineEnding: res.data.lineEnding || t.lineEnding,
                  size: res.data.size,
                  updatedAt: res.data.updatedAt,
                }
              : t
          )
        );
        pushToast(
          {
            type: 'success',
            title: 'Documento salvo',
            description: res.data.fileName,
          },
          2400
        );
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [pushToast]
  );

  const handleSaveTabAs = useCallback(
    async (tab: DocumentTab): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await window.folixAPI.saveFileAs({
          defaultPath: tab.filePath,
          content: tab.content,
          encoding: tab.encoding,
          lineEnding: tab.lineEnding,
        });

        if (!res.ok) {
          if (!res.cancelled && res.error) {
            pushToast({
              type: 'error',
              title: 'Não foi possível salvar cópia',
              description: res.error,
            });
          }
          return false;
        }

        const savedCanonical = res.data.content.replace(/\r\n/g, '\n');
        setRecentFiles(
          addRecentFile({
            filePath: res.data.filePath,
            fileName: res.data.fileName,
            directory: res.data.directory,
          })
        );
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === tab.id
              ? {
                  ...t,
                  filePath: res.data.filePath,
                  fileName: res.data.fileName,
                  directory: res.data.directory,
                  content: savedCanonical,
                  savedContent: savedCanonical,
                  encoding: res.data.encoding || t.encoding,
                  lineEnding: res.data.lineEnding || t.lineEnding,
                  size: res.data.size,
                  updatedAt: res.data.updatedAt,
                }
              : t
          )
        );
        pushToast(
          {
            type: 'success',
            title: 'Cópia salva com sucesso',
            description: res.data.filePath,
          },
          3200
        );
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [pushToast]
  );

  const handleSaveActiveFile = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab) return;
    await handleSaveTab(tab, false);
  }, [handleSaveTab]);

  const handleSaveActiveFileAs = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab) return;
    await handleSaveTabAs(tab);
  }, [handleSaveTabAs]);

  const forceCloseTab = useCallback(
    (tabId: string) => {
      scrollPositionsRef.current.delete(tabId);
      editorScrollPositionsRef.current.delete(tabId);
      editorStatesRef.current.delete(tabId);
      pendingEditorSyncRef.current.delete(tabId);
      pendingViewerSyncRef.current.delete(tabId);
      suppressViewerRevealRef.current.delete(tabId);
      setTabs((prevTabs) => {
        const idx = prevTabs.findIndex((t) => t.id === tabId);
        if (idx === -1) return prevTabs;
        const nextTabs = prevTabs.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          if (nextTabs.length === 0) {
            setActiveTabId(null);
            setIsSearchOpen(false);
            setIsImmersive(false);
          } else {
            const fallbackIdx = Math.min(idx, nextTabs.length - 1);
            setActiveTabId(nextTabs[fallbackIdx].id);
          }
        }
        return nextTabs;
      });
    },
    [activeTabId]
  );

  const requestCloseTab = useCallback(
    (tabId: string) => {
      const target = tabsRef.current.find((t) => t.id === tabId);
      if (!target) return;
      if (target.content !== target.savedContent) {
        setPendingConfirm({
          kind: 'unsaved',
          reason: 'close-tab',
          fileNames: [target.fileName],
          targetTabId: target.id,
        });
        return;
      }
      forceCloseTab(tabId);
    },
    [forceCloseTab]
  );

  const executeReloadTab = useCallback(
    async (tab: DocumentTab) => {
      await runWithDocumentLoader(tab.fileName, async () => {
        const res = await window.folixAPI.readFile(tab.filePath);
        if (!res.ok) {
          pushToast({
            type: 'error',
            title: 'Falha ao recarregar',
            description: res.error,
          });
          return false;
        }
        applyFileReadResult(res, undefined, true);
        pushToast(
          {
            type: 'info',
            title: 'Documento atualizado',
            description: `${tab.fileName} foi recarregado do disco.`,
          },
          2600
        );
        return true;
      });
    },
    [applyFileReadResult, pushToast, runWithDocumentLoader]
  );

  const requestReloadActiveFile = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab) return;
    if (tab.content !== tab.savedContent) {
      setPendingConfirm({
        kind: 'unsaved',
        reason: 'reload-file',
        fileNames: [tab.fileName],
        targetTabId: tab.id,
      });
      return;
    }
    await executeReloadTab(tab);
  }, [executeReloadTab]);

  const requestCloseApp = useCallback(() => {
    const dirtyTabs = tabsRef.current.filter(
      (t) => t.content !== t.savedContent
    );
    if (dirtyTabs.length > 0) {
      setPendingConfirm({
        kind: 'unsaved',
        reason: 'close-app',
        fileNames: dirtyTabs.map((t) => t.fileName),
      });
      return;
    }
    window.folixAPI.confirmCloseWindow();
  }, []);
  requestCloseAppRef.current = requestCloseApp;

  const handleConfirmSaveAndContinue = useCallback(async () => {
    if (!pendingConfirm || pendingConfirm.kind !== 'unsaved') return;
    const action = pendingConfirm;

    if (action.reason === 'close-tab' && action.targetTabId) {
      const target = tabsRef.current.find((t) => t.id === action.targetTabId);
      setPendingConfirm(null);
      if (target) {
        const saved = await handleSaveTab(target, false);
        if (saved) forceCloseTab(target.id);
      }
      return;
    }

    if (action.reason === 'reload-file' && action.targetTabId) {
      const target = tabsRef.current.find((t) => t.id === action.targetTabId);
      setPendingConfirm(null);
      if (target) {
        const saved = await handleSaveTab(target, false);
        if (saved) await executeReloadTab(target);
      }
      return;
    }

    if (action.reason === 'close-app') {
      const dirtyTabs = tabsRef.current.filter(
        (t) => t.content !== t.savedContent
      );
      setPendingConfirm(null);
      for (const dirtyTab of dirtyTabs) {
        const saved = await handleSaveTab(dirtyTab, false);
        if (!saved) return;
      }
      window.folixAPI.confirmCloseWindow();
    }
  }, [pendingConfirm, handleSaveTab, forceCloseTab, executeReloadTab]);

  const handleConfirmDiscardAndContinue = useCallback(async () => {
    if (!pendingConfirm || pendingConfirm.kind !== 'unsaved') return;
    const action = pendingConfirm;
    setPendingConfirm(null);

    if (action.reason === 'close-tab' && action.targetTabId) {
      forceCloseTab(action.targetTabId);
      return;
    }

    if (action.reason === 'reload-file' && action.targetTabId) {
      const target = tabsRef.current.find((t) => t.id === action.targetTabId);
      if (target) await executeReloadTab(target);
      return;
    }

    if (action.reason === 'close-app') {
      window.folixAPI.confirmCloseWindow();
    }
  }, [pendingConfirm, forceCloseTab, executeReloadTab]);

  const handleOverwriteConflict = useCallback(async () => {
    if (!pendingConfirm || pendingConfirm.kind !== 'conflict') return;
    const target = tabsRef.current.find((t) => t.id === pendingConfirm.tabId);
    setPendingConfirm(null);
    if (target) {
      await handleSaveTab(target, true);
    }
  }, [pendingConfirm, handleSaveTab]);

  const handleSaveCopyConflict = useCallback(async () => {
    if (!pendingConfirm || pendingConfirm.kind !== 'conflict') return;
    const target = tabsRef.current.find((t) => t.id === pendingConfirm.tabId);
    setPendingConfirm(null);
    if (target) {
      await handleSaveTabAs(target);
    }
  }, [pendingConfirm, handleSaveTabAs]);

  const prepareRenderedPrintView = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab) return;
    const isEditorOnly =
      (tab.mode ?? 'read') === 'edit' && editorLayout === 'editor';
    if (!isEditorOnly) return;

    flushSync(() => {
      setIsPreparingPrint(true);
    });
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }, [editorLayout]);

  const handleExportPdf = useCallback(async () => {
    if (!activeTab || isExportingPdf) return;
    setIsExportingPdf(true);
    const hasUnsavedEdits = activeTab.content !== activeTab.savedContent;
    try {
      await prepareRenderedPrintView();
      const documentTitle = getDocumentTitle(
        activeTab.content,
        activeTab.fileName
      );
      const res = await window.folixAPI.exportPdf({
        defaultFileName: activeTab.fileName,
        documentTitle,
      });

      if (res.cancelled) return;

      if (res.ok && res.filePath) {
        pushToast({
          type: 'success',
          title: 'PDF exportado com sucesso',
          description: hasUnsavedEdits
            ? `${res.filePath} (inclui alterações ainda não salvas)`
            : res.filePath,
        });
      } else if (res.error) {
        pushToast({
          type: 'error',
          title: 'Falha ao exportar PDF',
          description: res.error,
        });
      }
    } finally {
      setIsPreparingPrint(false);
      setIsExportingPdf(false);
    }
  }, [activeTab, isExportingPdf, prepareRenderedPrintView, pushToast]);

  const handlePrint = useCallback(async () => {
    if (!activeTab) return;
    const hasUnsavedEdits = activeTab.content !== activeTab.savedContent;
    try {
      await prepareRenderedPrintView();
      if (hasUnsavedEdits) {
        pushToast(
          {
            type: 'info',
            title: 'Impressão com alterações atuais',
            description:
              'A visualização de impressão inclui suas edições não salvas.',
          },
          3200
        );
      }
      const res = await window.folixAPI.printDocument();
      if (!res.ok && res.error) {
        pushToast({
          type: 'error',
          title: 'Erro de impressão',
          description: res.error,
        });
      }
    } finally {
      setIsPreparingPrint(false);
    }
  }, [activeTab, prepareRenderedPrintView, pushToast]);

  const handleSelectTocHeading = useCallback((id: string) => {
    const tab = activeTabRef.current;
    if (tab && (tab.mode ?? 'read') === 'edit') {
      const tocItem = tocItemsRef.current.find((item) => item.id === id);
      if (tocItem) {
        editorHandleRef.current?.scrollToLine(tocItem.line);
        setActiveHeadingId(tocItem.id);
      }
    }

    const article = articleRef.current;
    if (!article) return;
    const headings = Array.from(
      article.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ) as HTMLElement[];
    const target =
      headings.find((el) => el.id === id) ||
      headings.find((el) => el.id.toLowerCase() === id.toLowerCase());
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(target.id);
    }
  }, []);

  const getSavedScrollTop = useCallback((tabId: string) => {
    return scrollPositionsRef.current.get(tabId) ?? 0;
  }, []);

  const handleSaveScrollTop = useCallback((tabId: string, scrollTop: number) => {
    scrollPositionsRef.current.set(tabId, scrollTop);
  }, []);

  const getSavedEditorScrollTop = useCallback((tabId: string) => {
    return editorScrollPositionsRef.current.get(tabId) ?? 0;
  }, []);

  const handleSaveEditorScrollTop = useCallback(
    (tabId: string, scrollTop: number) => {
      editorScrollPositionsRef.current.set(tabId, scrollTop);
    },
    []
  );

  const consumePendingEditorSyncAnchor = useCallback((tabId: string) => {
    const anchor = pendingEditorSyncRef.current.get(tabId) ?? null;
    pendingEditorSyncRef.current.delete(tabId);
    return anchor;
  }, []);

  const consumePendingViewerSyncAnchor = useCallback((tabId: string) => {
    const anchor = pendingViewerSyncRef.current.get(tabId) ?? null;
    pendingViewerSyncRef.current.delete(tabId);
    return anchor;
  }, []);

  const handleEditorVisibleLineChange = useCallback((line: number) => {
    const tab = activeTabRef.current;
    const headingId = resolveActiveHeadingForLine(tocItemsRef.current, line);
    setActiveHeadingId(headingId);

    if (
      editorLayoutRef.current === 'split' &&
      tab &&
      !pendingViewerSyncRef.current.has(tab.id)
    ) {
      const container = scrollContainerRef.current;
      const article = articleRef.current;
      if (container && article) {
        applyAnchorToViewer(container, article, {
          line,
          lineFraction: 0,
          viewportOffset: 96,
        });
      }
    }
  }, []);

  const handleEditorSearch = useCallback(
    (query: string, caseSensitive: boolean, direction?: 'next' | 'prev') => {
      return (
        editorHandleRef.current?.findAndHighlight(
          query,
          caseSensitive,
          direction
        ) ?? { total: 0, current: 0 }
      );
    },
    []
  );

  const handleEditorClearSearch = useCallback(() => {
    editorHandleRef.current?.clearSearch();
  }, []);

  const handleConsumePendingAnchor = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId && t.pendingAnchor ? { ...t, pendingAnchor: undefined } : t
      )
    );
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSplash || e.defaultPrevented) return;
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (ctrlOrCmd && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFilesDialog();
        return;
      }

      if (!activeTab) return;

      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveFileAs();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        handleSaveActiveFile();
        return;
      }

      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleChangeMode(
          (activeTab.mode ?? 'read') === 'edit' ? 'read' : 'edit'
        );
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'b') {
        if ((e.target as HTMLElement | null)?.closest('.cm-editor')) {
          return;
        }
        e.preventDefault();
        updateSettings({ sidebarOpen: !settings.sidebarOpen });
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        requestCloseTab(activeTab.id);
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        requestReloadActiveFile();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'e' && !e.shiftKey) {
        e.preventDefault();
        handleExportPdf();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      if (ctrlOrCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        updateSettings({ fontSize: Math.min(160, settings.fontSize + 10) });
        return;
      }

      if (ctrlOrCmd && e.key === '-') {
        e.preventDefault();
        updateSettings({ fontSize: Math.max(80, settings.fontSize - 10) });
        return;
      }

      if (ctrlOrCmd && e.key === '0') {
        e.preventDefault();
        updateSettings({ fontSize: 100 });
        return;
      }

      if (ctrlOrCmd && e.key === 'Tab' && tabs.length > 1) {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTab.id);
        const delta = e.shiftKey ? -1 : 1;
        const nextIdx = (currentIdx + delta + tabs.length) % tabs.length;
        setActiveTabId(tabs[nextIdx].id);
        return;
      }

      if (
        e.key === 'F11' ||
        (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'f')
      ) {
        e.preventDefault();
        setIsImmersive((prev) => !prev);
        return;
      }

      if (
        e.key === 'Escape' &&
        isImmersive &&
        !isSearchOpen &&
        !isSettingsOpen &&
        !lightboxImage &&
        !pendingConfirm
      ) {
        e.preventDefault();
        setIsImmersive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showSplash,
    activeTab,
    tabs,
    settings.sidebarOpen,
    settings.fontSize,
    isImmersive,
    isSearchOpen,
    isSettingsOpen,
    lightboxImage,
    pendingConfirm,
    handleOpenFilesDialog,
    handleSaveActiveFile,
    handleSaveActiveFileAs,
    handleChangeMode,
    requestCloseTab,
    requestReloadActiveFile,
    handleExportPdf,
    handlePrint,
    updateSettings,
  ]);

  // Global Drag & Drop for opening Markdown files
  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    await runWithDocumentLoader(droppedFiles[0]?.name, async () => {
      let openedAny = false;
      for (const file of droppedFiles) {
        const filePath = window.folixAPI.getPathForDroppedFile(file);
        if (!filePath) {
          pushToast({
            type: 'warning',
            title: 'Não foi possível ler o arquivo arrastado',
            description: 'Tente abrir o arquivo usando o botão "Abrir arquivo".',
          });
          continue;
        }
        const res = await window.folixAPI.readFile(filePath);
        if (res.ok) openedAny = true;
        applyFileReadResult(res);
      }
      return openedAny;
    });
  };

  return (
    <div
      className="folix-print-root relative flex h-screen w-screen flex-col overflow-hidden bg-folix-bg text-folix-text"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Custom Windows 11 Title Bar + Tabs */}
      {!isImmersive && (
        <TitleBar
          tabs={tabs}
          activeTabId={activeTabId}
          isMaximized={isMaximized}
          resolvedTheme={resolvedTheme}
          onSelectTab={(id) => setActiveTabId(id)}
          onCloseTab={requestCloseTab}
          onShowWelcome={() => setActiveTabId(null)}
          onOpenFiles={handleOpenFilesDialog}
          onQuickToggleTheme={() =>
            updateSettings({
              theme: resolvedTheme === 'dark' ? 'light' : 'dark',
            })
          }
          onOpenSettings={() => setIsSettingsOpen(true)}
          onMinimize={() => window.folixAPI.minimizeWindow()}
          onToggleMaximize={() => window.folixAPI.toggleMaximizeWindow()}
          onCloseWindow={requestCloseApp}
        />
      )}

      {/* Document Toolbar */}
      {activeTab && !isImmersive && (
        <Toolbar
          activeTab={activeTab}
          tocCount={tocItems.length}
          settings={settings}
          systemTheme={systemTheme}
          mode={activeTab.mode ?? 'read'}
          editorLayout={editorLayout}
          isDirty={activeTab.content !== activeTab.savedContent}
          isSaving={isSaving}
          isSearchOpen={isSearchOpen}
          isExportingPdf={isExportingPdf}
          onToggleSidebar={() =>
            updateSettings({ sidebarOpen: !settings.sidebarOpen })
          }
          onChangeMode={handleChangeMode}
          onToggleSplitLayout={handleToggleSplitLayout}
          onSaveFile={handleSaveActiveFile}
          onSaveFileAs={handleSaveActiveFileAs}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          onToggleImmersive={() => setIsImmersive(true)}
          onReloadFile={requestReloadActiveFile}
          onShowInFolder={() => window.folixAPI.showInFolder(activeTab.filePath)}
          onUpdateSettings={updateSettings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onExportPdf={handleExportPdf}
          onPrint={handlePrint}
        />
      )}

      {/* Main Content Workspace */}
      {loadingDocInfo ? (
        <DocumentLoader
          fileName={loadingDocInfo.fileName}
          resolvedTheme={resolvedTheme}
        />
      ) : activeTab ? (
        <div className="folix-print-root relative flex min-h-0 flex-1 overflow-hidden">
          {!isImmersive && (
            <SidebarToc
              items={tocItems}
              activeHeadingId={activeHeadingId}
              isOpen={settings.sidebarOpen}
              onSelectHeading={handleSelectTocHeading}
              onClose={handleCloseSidebar}
            />
          )}

          <main className="folix-print-root relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <SearchBar
              isOpen={isSearchOpen}
              containerRef={articleRef}
              documentKey={`${activeTab.id}:${activeTab.updatedAt}`}
              isEditorSearchMode={(activeTab.mode ?? 'read') === 'edit'}
              onEditorSearch={handleEditorSearch}
              onEditorClearSearch={handleEditorClearSearch}
              onClose={() => setIsSearchOpen(false)}
            />

            {isImmersive && (
              <button
                type="button"
                onClick={() => setIsImmersive(false)}
                className="no-print fixed right-5 top-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-folix-border bg-folix-surface/90 px-3 py-1.5 text-[12px] font-medium text-folix-text-secondary shadow-folix-md backdrop-blur-md transition-all hover:text-folix-text"
                title="Sair do modo de leitura imersivo (F11 ou Esc)"
              >
                <Minimize2 size={13} />
                <span>Sair do modo foco</span>
              </button>
            )}

            <div className="folix-print-root flex min-h-0 flex-1 overflow-hidden">
              {(activeTab.mode ?? 'read') === 'edit' && (
                <div
                  className={
                    editorLayout === 'split'
                      ? 'no-print flex min-w-0 w-1/2 flex-col border-r border-folix-border overflow-hidden'
                      : 'no-print flex min-w-0 flex-1 flex-col overflow-hidden'
                  }
                >
                  <MarkdownEditor
                    ref={editorHandleRef}
                    documentTab={activeTab}
                    fontFamily={settings.fontFamily}
                    fontSize={settings.fontSize}
                    pageWidth={settings.pageWidth}
                    isSplitView={editorLayout === 'split'}
                    isSaving={isSaving}
                    editorStatesMap={editorStatesRef.current}
                    onChangeContent={handleChangeTabContent}
                    onSaveFile={handleSaveActiveFile}
                    onSaveScrollTop={handleSaveEditorScrollTop}
                    getSavedEditorScrollTop={getSavedEditorScrollTop}
                    consumePendingSyncAnchor={consumePendingEditorSyncAnchor}
                    onVisibleLineChange={handleEditorVisibleLineChange}
                  />
                </div>
              )}

              {((activeTab.mode ?? 'read') === 'read' ||
                editorLayout === 'split' ||
                isPreparingPrint) && (
                <div
                  className={
                    (activeTab.mode ?? 'read') === 'edit'
                      ? editorLayout === 'split'
                        ? 'folix-print-root flex min-w-0 w-1/2 flex-col overflow-hidden'
                        : 'folix-print-root hidden print:block w-full'
                      : 'folix-print-root flex min-w-0 flex-1 flex-col overflow-hidden'
                  }
                >
                  <MarkdownViewer
                    documentTab={previewTab ?? activeTab}
                    fontFamily={settings.fontFamily}
                    fontSize={settings.fontSize}
                    pageWidth={settings.pageWidth}
                    tocItems={tocItems}
                    scrollContainerRef={scrollContainerRef}
                    articleRef={articleRef}
                    getSavedScrollTop={getSavedScrollTop}
                    onSaveScrollTop={handleSaveScrollTop}
                    onActiveHeadingChange={setActiveHeadingId}
                    onConsumePendingAnchor={handleConsumePendingAnchor}
                    consumePendingSyncAnchor={consumePendingViewerSyncAnchor}
                    suppressRevealAnimation={suppressViewerRevealRef.current.has(
                      activeTab.id
                    )}
                    syncRevision={viewerSyncRevision}
                    onOpenRelativeLink={handleOpenRelativeLink}
                    onOpenExternalError={handleOpenExternalError}
                    onImageClick={handleImageClick}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <WelcomeScreen
          recentFiles={recentFiles}
          resolvedTheme={resolvedTheme}
          onOpenFiles={handleOpenFilesDialog}
          onOpenRecent={handleOpenPath}
          onRemoveRecent={(path) => setRecentFiles(removeRecentFile(path))}
          onClearRecent={() => setRecentFiles(clearRecentFiles())}
        />
      )}

      {/* Drag & Drop Global Overlay */}
      {isDraggingOver && (
        <div className="no-print pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-folix-bg/75 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-folix-accent bg-folix-surface px-10 py-8 text-center shadow-folix-lg animate-scale-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-folix-accent-soft text-folix-accent">
              <Upload size={26} />
            </div>
            <p className="text-[17px] font-semibold text-folix-text">
              Solte para abrir no Folix
            </p>
            <p className="text-[13px] text-folix-text-secondary">
              Arquivos suportados: .md, .markdown, .mdown, .mkd e .txt
            </p>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        systemTheme={systemTheme}
        onUpdate={updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Unsaved Changes & File Conflict Confirmation Modal */}
      <UnsavedChangesModal
        prompt={pendingConfirm}
        isBusy={isSaving}
        onCancel={() => setPendingConfirm(null)}
        onSaveAndContinue={handleConfirmSaveAndContinue}
        onDiscardAndContinue={handleConfirmDiscardAndContinue}
        onOverwriteConflict={handleOverwriteConflict}
        onSaveCopyConflict={handleSaveCopyConflict}
      />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Startup Splash Screen */}
      {showSplash && (
        <SplashScreen
          resolvedTheme={resolvedTheme}
          isExiting={splashExiting}
          isStillLoading={splashStillLoading}
        />
      )}
    </div>
  );
}

