import { useMemo, useState } from 'react';
import { ListTree, PanelLeftClose, Search, X } from 'lucide-react';
import type { TocItem } from '../types/folix';
import { cn } from '../utils/format';

interface SidebarTocProps {
  items: TocItem[];
  activeHeadingId: string | null;
  isOpen: boolean;
  onSelectHeading: (id: string) => void;
  onClose: () => void;
}

export function SidebarToc({
  items,
  activeHeadingId,
  isOpen,
  onSelectHeading,
  onClose,
}: SidebarTocProps) {
  const [filter, setFilter] = useState('');

  const minLevel = useMemo(() => {
    if (items.length === 0) return 1;
    return Math.min(...items.map((item) => item.level));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.text.toLowerCase().includes(q));
  }, [items, filter]);

  return (
    <aside
      className={cn(
        'no-print flex shrink-0 flex-col border-r border-folix-border bg-folix-sidebar transition-all duration-200 ease-out overflow-hidden',
        isOpen ? 'w-[272px] opacity-100' : 'w-0 border-r-0 opacity-0 pointer-events-none'
      )}
      aria-label="Índice lateral do documento"
      aria-hidden={!isOpen}
    >
      <div className="flex h-full w-[272px] flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-folix-border-subtle px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <ListTree size={14} className="text-folix-accent" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-folix-text-secondary">
              Sumário
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
            title="Recolher índice lateral (Ctrl+B)"
            aria-label="Recolher índice lateral"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>

        {/* Quick Filter when document has several headings */}
        {items.length > 5 && (
          <div className="border-b border-folix-border-subtle px-3 py-2">
            <div className="relative flex items-center">
              <Search
                size={12.5}
                className="pointer-events-none absolute left-2.5 text-folix-text-muted"
              />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar seções..."
                className="h-7 w-full rounded-lg border border-folix-border bg-folix-surface pl-7 pr-7 text-[12px] text-folix-text placeholder:text-folix-text-muted focus:border-folix-accent focus:outline-none"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  className="absolute right-2 rounded p-0.5 text-folix-text-muted hover:text-folix-text"
                  aria-label="Limpar filtro"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Headings Tree */}
        <nav className="flex-1 overflow-y-auto px-2 py-2.5">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] leading-relaxed text-folix-text-muted">
              Este documento não possui títulos ou subtítulos para montar o
              sumário automático.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-folix-text-muted">
              Nenhuma seção corresponde ao filtro.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredItems.map((item, idx) => {
                const depth = Math.max(0, item.level - minLevel);
                const isActive = activeHeadingId === item.id;
                return (
                  <li key={`${item.id}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => onSelectHeading(item.id)}
                      style={{ paddingLeft: `${depth * 13 + 10}px` }}
                      className={cn(
                        'group relative flex w-full items-center rounded-lg py-1.5 pr-2.5 text-left text-[12.5px] leading-snug transition-all duration-150',
                        isActive
                          ? 'bg-folix-accent-soft font-semibold text-folix-accent'
                          : item.level === minLevel
                          ? 'font-medium text-folix-text hover:bg-[var(--folix-surface-hover)]'
                          : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
                      )}
                      title={item.text}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-folix-accent"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{item.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </div>
    </aside>
  );
}

