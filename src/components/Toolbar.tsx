import { useState } from 'react';
import {
  BookOpen,
  FileDown,
  FolderOpen,
  ListTree,
  Loader2,
  Printer,
  RotateCw,
  Search,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { DocumentTab, ReaderSettings, ResolvedTheme } from '../types/folix';
import { cn } from '../utils/format';
import { AppearancePopover } from './AppearancePopover';

interface ToolbarProps {
  activeTab: DocumentTab;
  tocCount: number;
  settings: ReaderSettings;
  systemTheme: ResolvedTheme;
  isSearchOpen: boolean;
  isExportingPdf: boolean;
  onToggleSidebar: () => void;
  onToggleSearch: () => void;
  onToggleImmersive: () => void;
  onReloadFile: () => void;
  onShowInFolder: () => void;
  onUpdateSettings: (patch: Partial<ReaderSettings>) => void;
  onOpenSettings: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
}

export function Toolbar({
  activeTab,
  tocCount,
  settings,
  systemTheme,
  isSearchOpen,
  isExportingPdf,
  onToggleSidebar,
  onToggleSearch,
  onToggleImmersive,
  onReloadFile,
  onShowInFolder,
  onUpdateSettings,
  onOpenSettings,
  onExportPdf,
  onPrint,
}: ToolbarProps) {
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const adjustFontSize = (delta: number) => {
    const next = Math.min(160, Math.max(80, settings.fontSize + delta));
    onUpdateSettings({ fontSize: next });
  };

  return (
    <div className="no-print flex h-[44px] shrink-0 items-center justify-between gap-3 border-b border-folix-border bg-folix-surface px-3.5">
      {/* Left controls: TOC + file path */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-all',
            settings.sidebarOpen
              ? 'bg-folix-accent-soft text-folix-accent'
              : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
          )}
          title="Alternar índice lateral (Ctrl+B)"
          aria-pressed={settings.sidebarOpen}
        >
          <ListTree size={15} />
          <span className="hidden sm:inline">Sumário</span>
          {tocCount > 0 && (
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.2 text-[10.5px] font-semibold',
                settings.sidebarOpen
                  ? 'bg-folix-accent/15 text-folix-accent'
                  : 'bg-folix-bg text-folix-text-muted'
              )}
            >
              {tocCount}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-folix-border" aria-hidden="true" />

        {/* File path breadcrumb */}
        <button
          type="button"
          onClick={onShowInFolder}
          className="group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[12px] text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title={`Abrir pasta no Explorador de Arquivos:\n${activeTab.filePath}`}
        >
          <FolderOpen
            size={13.5}
            className="shrink-0 text-folix-text-muted transition-colors group-hover:text-folix-accent"
          />
          <span className="hidden md:inline truncate max-w-[260px] lg:max-w-[380px]">
            {activeTab.directory}
          </span>
          <span className="hidden md:inline text-folix-text-muted/50">/</span>
          <span className="truncate font-medium text-folix-text-secondary group-hover:text-folix-text">
            {activeTab.fileName}
          </span>
        </button>

        <button
          type="button"
          onClick={onReloadFile}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title="Recarregar documento do disco (Ctrl+R)"
          aria-label="Recarregar documento"
        >
          <RotateCw size={13.5} />
        </button>
      </div>

      {/* Right controls: Search, Zoom, Theme/Appearance, Immersive, Print, Export PDF */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSearch}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-all',
            isSearchOpen
              ? 'bg-folix-accent-soft text-folix-accent'
              : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
          )}
          title="Pesquisar no documento (Ctrl+F)"
          aria-pressed={isSearchOpen}
        >
          <Search size={14} />
          <span className="hidden lg:inline">Pesquisar</span>
        </button>

        <div className="hidden sm:block h-4 w-px bg-folix-border mx-0.5" aria-hidden="true" />

        {/* Text zoom controls */}
        <div className="hidden sm:flex items-center rounded-lg border border-folix-border-subtle bg-folix-bg/70 p-0.5">
          <button
            type="button"
            onClick={() => adjustFontSize(-10)}
            disabled={settings.fontSize <= 80}
            className="flex h-6 w-6 items-center justify-center rounded-md text-folix-text-secondary transition-colors hover:bg-folix-surface hover:text-folix-text disabled:opacity-35"
            title="Diminuir tamanho do texto (Ctrl+-)"
            aria-label="Diminuir tamanho do texto"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ fontSize: 100 })}
            className="min-w-[42px] px-1 text-center font-mono text-[11px] font-medium text-folix-text-secondary hover:text-folix-text"
            title="Restaurar tamanho padrão (Ctrl+0)"
          >
            {settings.fontSize}%
          </button>
          <button
            type="button"
            onClick={() => adjustFontSize(10)}
            disabled={settings.fontSize >= 160}
            className="flex h-6 w-6 items-center justify-center rounded-md text-folix-text-secondary transition-colors hover:bg-folix-surface hover:text-folix-text disabled:opacity-35"
            title="Aumentar tamanho do texto (Ctrl+=)"
            aria-label="Aumentar tamanho do texto"
          >
            <ZoomIn size={13} />
          </button>
        </div>

        {/* Appearance Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAppearanceOpen((prev) => !prev)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-all',
              appearanceOpen
                ? 'bg-folix-accent-soft text-folix-accent'
                : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
            )}
            title="Personalizar aparência e leitura"
            aria-expanded={appearanceOpen}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden xl:inline">Leitura</span>
          </button>

          {appearanceOpen && (
            <AppearancePopover
              settings={settings}
              systemTheme={systemTheme}
              onUpdate={onUpdateSettings}
              onOpenSettings={onOpenSettings}
              onClose={() => setAppearanceOpen(false)}
            />
          )}
        </div>

        {/* Immersive Reading Mode */}
        <button
          type="button"
          onClick={onToggleImmersive}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title="Modo de leitura imersivo (F11)"
          aria-label="Ativar modo de leitura imersivo"
        >
          <BookOpen size={14.5} />
          <span className="hidden xl:inline">Foco</span>
        </button>

        <div className="h-4 w-px bg-folix-border mx-0.5" aria-hidden="true" />

        {/* Print */}
        <button
          type="button"
          onClick={onPrint}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title="Imprimir documento (Ctrl+P)"
          aria-label="Imprimir documento"
        >
          <Printer size={15} />
        </button>

        {/* Export PDF */}
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExportingPdf}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-folix-accent px-3 text-[12.5px] font-medium text-white shadow-folix-sm transition-all hover:bg-folix-accent-hover disabled:opacity-65"
          title="Exportar como relatório PDF (Ctrl+E)"
        >
          {isExportingPdf ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileDown size={14} />
          )}
          <span>{isExportingPdf ? 'Gerando...' : 'Exportar PDF'}</span>
        </button>
      </div>
    </div>
  );
}

