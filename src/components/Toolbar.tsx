import { useState } from 'react';
import {
  BookOpen,
  Columns2,
  Eye,
  FileDown,
  FolderDown,
  FolderOpen,
  ListTree,
  Loader2,
  PenLine,
  Printer,
  RotateCw,
  Save,
  Search,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  DocumentMode,
  DocumentTab,
  EditorLayout,
  ReaderSettings,
  ResolvedTheme,
} from '../types/folix';
import { cn } from '../utils/format';
import { AppearancePopover } from './AppearancePopover';

interface ToolbarProps {
  activeTab: DocumentTab;
  tocCount: number;
  settings: ReaderSettings;
  systemTheme: ResolvedTheme;
  mode: DocumentMode;
  editorLayout: EditorLayout;
  isDirty: boolean;
  isSaving: boolean;
  isSearchOpen: boolean;
  isExportingPdf: boolean;
  onToggleSidebar: () => void;
  onChangeMode: (mode: DocumentMode) => void;
  onToggleSplitLayout: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
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
  mode,
  editorLayout,
  isDirty,
  isSaving,
  isSearchOpen,
  isExportingPdf,
  onToggleSidebar,
  onChangeMode,
  onToggleSplitLayout,
  onSaveFile,
  onSaveFileAs,
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

      {/* Right controls: Mode switch, Save controls, Search, Zoom, Appearance, Immersive, Print, Export PDF */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Read / Edit Mode Segmented Control */}
        <div
          className="inline-flex h-8 items-center rounded-xl border border-folix-border-subtle bg-folix-bg/75 p-0.5"
          role="group"
          aria-label="Modo do documento"
          title="Alternar entre Leitura e Edição (Ctrl+Shift+E)"
        >
          <button
            type="button"
            onClick={() => onChangeMode('read')}
            aria-pressed={mode === 'read'}
            className={cn(
              'inline-flex h-[26px] items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-all',
              mode === 'read'
                ? 'bg-folix-surface text-folix-text shadow-folix-sm ring-1 ring-folix-border'
                : 'text-folix-text-secondary hover:text-folix-text'
            )}
          >
            <Eye size={13.5} className={mode === 'read' ? 'text-folix-accent' : ''} />
            <span>Leitura</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('edit')}
            aria-pressed={mode === 'edit'}
            className={cn(
              'inline-flex h-[26px] items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-all',
              mode === 'edit'
                ? 'bg-folix-surface text-folix-text shadow-folix-sm ring-1 ring-folix-border'
                : 'text-folix-text-secondary hover:text-folix-text'
            )}
          >
            <PenLine size={13} className={mode === 'edit' ? 'text-folix-accent' : ''} />
            <span>Edição</span>
          </button>
        </div>

        {/* Split preview toggle (only when Editing) */}
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onToggleSplitLayout}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-all',
              editorLayout === 'split'
                ? 'bg-folix-accent-soft text-folix-accent'
                : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
            )}
            title="Visualização dividida: Editor + Prévia"
            aria-pressed={editorLayout === 'split'}
          >
            <Columns2 size={14} />
            <span className="hidden xl:inline">Dividido</span>
          </button>
        )}

        {/* Save & Save As (available in Edit mode or whenever unsaved edits exist) */}
        {(mode === 'edit' || isDirty) && (
          <>
            <button
              type="button"
              onClick={onSaveFile}
              disabled={!isDirty || isSaving}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-all',
                isDirty
                  ? 'border border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                  : 'text-folix-text-muted opacity-55 cursor-default'
              )}
              title="Salvar alterações no arquivo original (Ctrl+S)"
            >
              <Save size={14} />
              <span className="hidden lg:inline">
                {isSaving ? 'Salvando...' : 'Salvar'}
              </span>
            </button>

            <button
              type="button"
              onClick={onSaveFileAs}
              disabled={isSaving}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text disabled:opacity-50"
              title="Salvar como... (Ctrl+Shift+S)"
              aria-label="Salvar documento como"
            >
              <FolderDown size={14.5} />
            </button>
          </>
        )}

        <div className="h-4 w-px bg-folix-border mx-0.5" aria-hidden="true" />

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
          <span className="hidden 2xl:inline">Pesquisar</span>
        </button>

        {/* Text zoom controls */}
        <div className="hidden md:flex items-center rounded-lg border border-folix-border-subtle bg-folix-bg/70 p-0.5">
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
            className="min-w-[40px] px-1 text-center font-mono text-[11px] font-medium text-folix-text-secondary hover:text-folix-text"
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
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium transition-all',
              appearanceOpen
                ? 'bg-folix-accent-soft text-folix-accent'
                : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
            )}
            title="Personalizar aparência e leitura"
            aria-expanded={appearanceOpen}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden 2xl:inline">Estilo</span>
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
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title="Modo de leitura imersivo (F11)"
          aria-label="Ativar modo de leitura imersivo"
        >
          <BookOpen size={14.5} />
          <span className="hidden 2xl:inline">Foco</span>
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

