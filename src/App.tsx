import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minimize2, Upload } from 'lucide-react';
import type {
  DocumentTab,
  FileReadResponse,
  ReaderSettings,
  RecentFile,
  ResolvedTheme,
  ToastMessage,
} from './types/folix';
import { extractTocFromMarkdown, getDocumentTitle } from './utils/slug';
import {
  addRecentFile,
  clearRecentFiles,
  loadReaderSettings,
  loadRecentFiles,
  removeRecentFile,
  resolveInitialTheme,
  saveReaderSettings,
} from './utils/storage';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SidebarToc } from './components/SidebarToc';
import { MarkdownViewer } from './components/MarkdownViewer';
import { SearchBar } from './components/SearchBar';
import { ImageLightbox } from './components/ImageLightbox';
import { DocumentLoader } from './components/DocumentLoader';
import { SettingsModal } from './components/SettingsModal';
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
  const hasMountedThemeRef = useRef(false);
  const themeTransitionTimerRef = useRef<number | null>(null);
  const dragCounterRef = useRef(0);
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  const resolvedTheme: ResolvedTheme =
    settings.theme === 'system' ? systemTheme : settings.theme;

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  const tocItems = useMemo(
    () => (activeTab ? extractTocFromMarkdown(activeTab.content) : []),
    [activeTab]
  );

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
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveReaderSettings(next);
      return next;
    });
  }, []);

  // Apply resolved theme attribute to root HTML element with smooth transient transition
  useEffect(() => {
    const root = document.documentElement;
    if (hasMountedThemeRef.current) {
      root.classList.add('folix-theme-transition');
      if (themeTransitionTimerRef.current !== null) {
        window.clearTimeout(themeTransitionTimerRef.current);
      }
      themeTransitionTimerRef.current = window.setTimeout(() => {
        root.classList.remove('folix-theme-transition');
        themeTransitionTimerRef.current = null;
      }, 240);
    } else {
      hasMountedThemeRef.current = true;
    }

    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // Keep Electron main process background color & persisted startup preference synced
  useEffect(() => {
    window.folixAPI.setThemePreference(settings.theme);
  }, [settings.theme]);

  // Update window title
  useEffect(() => {
    document.title = activeTab ? `${activeTab.fileName} — Folix` : 'Folix';
  }, [activeTab]);

  // Open file payload into tab (reusing existing tab if same path)
  const applyFileReadResult = useCallback(
    (result: FileReadResponse, anchor?: string) => {
      if (!result.ok) {
        pushToast({
          type: 'error',
          title: 'Não foi possível abrir o documento',
          description: result.error,
        });
        return;
      }

      const payload = result.data;
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
          return prevTabs.map((t) =>
            t.id === existing.id
              ? {
                  ...t,
                  fileName: payload.fileName,
                  directory: payload.directory,
                  content: payload.content,
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
          content: payload.content,
          size: payload.size,
          updatedAt: payload.updatedAt,
          scrollTop: 0,
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
        if (mounted) setSystemTheme(theme);
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
    const unsubTheme = window.folixAPI.onSystemThemeChange(setSystemTheme);
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
      setSystemTheme(e.matches ? 'dark' : 'light');
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
      unsubOpenFile();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [applyFileReadResult]);

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
      if (!activeTab) return;
      const cleanRel = relPath.split('#')[0];
      await runWithDocumentLoader(getFileNameHint(cleanRel), async () => {
        const res = await window.folixAPI.openRelativeFile(
          activeTab.directory,
          relPath
        );
        applyFileReadResult(res, res.anchor);
        return res.ok;
      });
    },
    [activeTab, applyFileReadResult, runWithDocumentLoader]
  );

  const handleReloadActiveFile = useCallback(async () => {
    if (!activeTab) return;
    await runWithDocumentLoader(activeTab.fileName, async () => {
      const res = await window.folixAPI.readFile(activeTab.filePath);
      if (!res.ok) {
        pushToast({
          type: 'error',
          title: 'Falha ao recarregar',
          description: res.error,
        });
        return false;
      }
      applyFileReadResult(res);
      pushToast(
        {
          type: 'info',
          title: 'Documento atualizado',
          description: `${activeTab.fileName} foi recarregado do disco.`,
        },
        2600
      );
      return true;
    });
  }, [activeTab, applyFileReadResult, pushToast, runWithDocumentLoader]);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      scrollPositionsRef.current.delete(tabId);
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

  const handleExportPdf = useCallback(async () => {
    if (!activeTab || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
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
          description: res.filePath,
        });
      } else if (res.error) {
        pushToast({
          type: 'error',
          title: 'Falha ao exportar PDF',
          description: res.error,
        });
      }
    } finally {
      setIsExportingPdf(false);
    }
  }, [activeTab, isExportingPdf, pushToast]);

  const handlePrint = useCallback(async () => {
    if (!activeTab) return;
    const res = await window.folixAPI.printDocument();
    if (!res.ok && res.error) {
      pushToast({
        type: 'error',
        title: 'Erro de impressão',
        description: res.error,
      });
    }
  }, [activeTab, pushToast]);

  const handleSelectTocHeading = useCallback((id: string) => {
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
      if (showSplash) return;
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

      if (ctrlOrCmd && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        updateSettings({ sidebarOpen: !settings.sidebarOpen });
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseTab(activeTab.id);
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReloadActiveFile();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'e') {
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
        !lightboxImage
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
    handleOpenFilesDialog,
    handleCloseTab,
    handleReloadActiveFile,
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
          onCloseTab={handleCloseTab}
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
          onCloseWindow={() => window.folixAPI.closeWindow()}
        />
      )}

      {/* Document Toolbar */}
      {activeTab && !isImmersive && (
        <Toolbar
          activeTab={activeTab}
          tocCount={tocItems.length}
          settings={settings}
          resolvedTheme={resolvedTheme}
          systemTheme={systemTheme}
          isSearchOpen={isSearchOpen}
          isExportingPdf={isExportingPdf}
          onToggleSidebar={() =>
            updateSettings({ sidebarOpen: !settings.sidebarOpen })
          }
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          onToggleImmersive={() => setIsImmersive(true)}
          onReloadFile={handleReloadActiveFile}
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
              onClose={() => updateSettings({ sidebarOpen: false })}
            />
          )}

          <main className="folix-print-root relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <SearchBar
              isOpen={isSearchOpen}
              containerRef={articleRef}
              documentKey={`${activeTab.id}:${activeTab.updatedAt}`}
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

            <MarkdownViewer
              documentTab={activeTab}
              settings={settings}
              tocItems={tocItems}
              scrollContainerRef={scrollContainerRef}
              articleRef={articleRef}
              getSavedScrollTop={getSavedScrollTop}
              onSaveScrollTop={handleSaveScrollTop}
              onActiveHeadingChange={setActiveHeadingId}
              onConsumePendingAnchor={handleConsumePendingAnchor}
              onOpenRelativeLink={handleOpenRelativeLink}
              onOpenExternalError={(message) =>
                pushToast({
                  type: 'error',
                  title: 'Não foi possível abrir o link',
                  description: message,
                })
              }
              onImageClick={(src, alt) => setLightboxImage({ src, alt })}
            />
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

