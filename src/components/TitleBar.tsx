import { FileText, Home, Minus, Plus, Square, Copy, X } from 'lucide-react';
import type { DocumentTab } from '../types/folix';
import { cn } from '../utils/format';
import { FolixLogo } from './FolixLogo';

interface TitleBarProps {
  tabs: DocumentTab[];
  activeTabId: string | null;
  isMaximized: boolean;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onShowWelcome: () => void;
  onOpenFiles: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onCloseWindow: () => void;
}

export function TitleBar({
  tabs,
  activeTabId,
  isMaximized,
  onSelectTab,
  onCloseTab,
  onShowWelcome,
  onOpenFiles,
  onMinimize,
  onToggleMaximize,
  onCloseWindow,
}: TitleBarProps) {
  return (
    <header
      className="no-print folix-drag-region flex h-[42px] shrink-0 items-center justify-between border-b border-folix-border bg-[var(--folix-titlebar)] pl-3 select-none"
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.folix-no-drag')) return;
        onToggleMaximize();
      }}
    >
      {/* Left: Brand & Home toggle */}
      <div className="folix-no-drag flex shrink-0 items-center gap-2 pr-2">
        <button
          type="button"
          onClick={onShowWelcome}
          className={cn(
            'group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors',
            activeTabId === null
              ? 'bg-folix-surface text-folix-text shadow-folix-sm'
              : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
          )}
          title="Tela inicial do Folix"
        >
          <FolixLogo size={18} className="shrink-0 transition-transform group-hover:scale-105" />
          <span className="text-[13px] font-semibold tracking-tight text-folix-text">
            Folix
          </span>
        </button>

        {tabs.length > 0 && (
          <div className="h-4 w-px bg-folix-border" aria-hidden="true" />
        )}
      </div>

      {/* Center: Multi-document Tabs */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 pr-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={cn(
                'folix-no-drag group relative flex h-[30px] max-w-[220px] min-w-[118px] shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-[12.5px] transition-all duration-150',
                isActive
                  ? 'border-folix-border bg-folix-surface text-folix-text font-medium shadow-folix-sm'
                  : 'border-transparent bg-transparent text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
              )}
              onClick={() => onSelectTab(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.id);
                }
              }}
              title={tab.filePath}
              role="tab"
              aria-selected={isActive}
            >
              {isActive && (
                <span
                  className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-folix-accent"
                  aria-hidden="true"
                />
              )}
              <FileText
                size={13}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-folix-accent' : 'text-folix-text-muted'
                )}
              />
              <span className="min-w-0 flex-1 truncate">{tab.fileName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors',
                  isActive
                    ? 'text-folix-text-muted hover:bg-folix-bg hover:text-folix-text'
                    : 'opacity-0 group-hover:opacity-100 text-folix-text-muted hover:bg-folix-bg hover:text-folix-text'
                )}
                aria-label={`Fechar ${tab.fileName}`}
                title="Fechar aba (Ctrl+W)"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onOpenFiles}
          className="folix-no-drag flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-lg text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title="Abrir documento Markdown (Ctrl+O)"
          aria-label="Abrir novo documento Markdown"
        >
          <Plus size={15} />
        </button>

        {tabs.length > 0 && activeTabId !== null && (
          <button
            type="button"
            onClick={onShowWelcome}
            className="folix-no-drag ml-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-lg text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
            title="Ir para a tela inicial"
            aria-label="Ir para a tela inicial"
          >
            <Home size={14} />
          </button>
        )}
      </div>

      {/* Right: Native Windows 11 Caption Controls */}
      <div className="folix-no-drag flex h-full shrink-0 items-center">
        <button
          type="button"
          onClick={onMinimize}
          className="flex h-full w-[46px] items-center justify-center text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          aria-label="Minimizar janela"
          title="Minimizar"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={onToggleMaximize}
          className="flex h-full w-[46px] items-center justify-center text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          onClick={onCloseWindow}
          className="flex h-full w-[46px] items-center justify-center text-folix-text-secondary transition-colors hover:bg-[#e81123] hover:text-white"
          aria-label="Fechar janela"
          title="Fechar"
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}

