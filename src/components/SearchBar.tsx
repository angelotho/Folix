import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, CaseSensitive, Search, X } from 'lucide-react';
import { cn } from '../utils/format';

interface SearchBarProps {
  isOpen: boolean;
  containerRef: React.RefObject<HTMLElement>;
  documentKey: string;
  isEditorSearchMode?: boolean;
  onEditorSearch?: (
    query: string,
    caseSensitive: boolean,
    direction?: 'next' | 'prev'
  ) => { total: number; current: number };
  onEditorClearSearch?: () => void;
  onClose: () => void;
}

function clearHighlights(root: HTMLElement | null) {
  if (!root) return;
  const marks = root.querySelectorAll('mark.folix-search-hit');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parent.normalize();
  });
}

function highlightMatches(
  root: HTMLElement,
  query: string,
  caseSensitive: boolean
): HTMLElement[] {
  clearHighlights(root);
  if (!query) return [];

  const needle = caseSensitive ? query : query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (
        parent.closest('.no-search-highlight') ||
        parent.tagName === 'SCRIPT' ||
        parent.tagName === 'STYLE' ||
        parent.tagName === 'MARK'
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || node.nodeValue.length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  const createdMarks: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const text = textNode.nodeValue || '';
    const haystack = caseSensitive ? text : text.toLowerCase();
    let idx = haystack.indexOf(needle);
    if (idx === -1) continue;

    const fragment = document.createDocumentFragment();
    let lastPos = 0;

    while (idx !== -1) {
      if (idx > lastPos) {
        fragment.appendChild(document.createTextNode(text.slice(lastPos, idx)));
      }
      const mark = document.createElement('mark');
      mark.className = 'folix-search-hit';
      mark.textContent = text.slice(idx, idx + query.length);
      fragment.appendChild(mark);
      createdMarks.push(mark);

      lastPos = idx + query.length;
      idx = haystack.indexOf(needle, lastPos);
    }

    if (lastPos < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastPos)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return createdMarks;
}

export function SearchBar({
  isOpen,
  containerRef,
  documentKey,
  isEditorSearchMode = false,
  onEditorSearch,
  onEditorClearSearch,
  onClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<HTMLElement[]>([]);
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const activateMatch = useCallback((index: number, scroll = true) => {
    const marks = matchesRef.current;
    marks.forEach((m) => m.classList.remove('folix-search-hit-active'));
    if (marks.length === 0 || index < 0 || index >= marks.length) return;

    const target = marks[index];
    target.classList.add('folix-search-hit-active');
    if (scroll) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Focus input when opened, clear highlights when closed
  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    } else {
      clearHighlights(containerRef.current);
      onEditorClearSearch?.();
      matchesRef.current = [];
      setTotalMatches(0);
      setActiveIndex(-1);
    }
  }, [isOpen, containerRef, onEditorClearSearch]);

  // Run search whenever query, case sensitivity, document, or mode changes
  useEffect(() => {
    if (!isOpen) return;

    if (!query) {
      clearHighlights(containerRef.current);
      onEditorClearSearch?.();
      matchesRef.current = [];
      setTotalMatches(0);
      setActiveIndex(-1);
      return;
    }

    if (isEditorSearchMode && onEditorSearch) {
      clearHighlights(containerRef.current);
      const timer = window.setTimeout(() => {
        const res = onEditorSearch(query, caseSensitive);
        setTotalMatches(res.total);
        setActiveIndex(res.total > 0 ? Math.max(0, res.current - 1) : -1);
      }, 60);
      return () => window.clearTimeout(timer);
    }

    onEditorClearSearch?.();
    if (!containerRef.current) return;

    const timer = window.setTimeout(() => {
      if (!containerRef.current) return;
      const marks = highlightMatches(containerRef.current, query, caseSensitive);
      matchesRef.current = marks;
      setTotalMatches(marks.length);
      if (marks.length > 0) {
        setActiveIndex(0);
        activateMatch(0, true);
      } else {
        setActiveIndex(-1);
      }
    }, 60);

    return () => window.clearTimeout(timer);
  }, [
    isOpen,
    query,
    caseSensitive,
    documentKey,
    isEditorSearchMode,
    containerRef,
    activateMatch,
    onEditorSearch,
    onEditorClearSearch,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHighlights(containerRef.current);
      onEditorClearSearch?.();
    };
  }, [containerRef, onEditorClearSearch]);

  if (!isOpen) return null;

  const goToNext = () => {
    if (totalMatches === 0) return;
    if (isEditorSearchMode && onEditorSearch) {
      const res = onEditorSearch(query, caseSensitive, 'next');
      setTotalMatches(res.total);
      setActiveIndex(res.total > 0 ? Math.max(0, res.current - 1) : -1);
      return;
    }
    const next = (activeIndex + 1) % totalMatches;
    setActiveIndex(next);
    activateMatch(next, true);
  };

  const goToPrev = () => {
    if (totalMatches === 0) return;
    if (isEditorSearchMode && onEditorSearch) {
      const res = onEditorSearch(query, caseSensitive, 'prev');
      setTotalMatches(res.total);
      setActiveIndex(res.total > 0 ? Math.max(0, res.current - 1) : -1);
      return;
    }
    const prev = (activeIndex - 1 + totalMatches) % totalMatches;
    setActiveIndex(prev);
    activateMatch(prev, true);
  };

  return (
    <div
      className="no-print absolute right-6 top-3 z-30 flex items-center gap-1.5 rounded-xl border border-folix-border bg-folix-surface p-1.5 shadow-folix-lg animate-scale-in"
      role="search"
      aria-label="Pesquisar no documento"
    >
      <div className="relative flex items-center">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 text-folix-text-muted"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) {
                goToPrev();
              } else {
                goToNext();
              }
            }
          }}
          placeholder="Pesquisar no documento..."
          className="h-8 w-[210px] sm:w-[240px] rounded-lg bg-folix-bg pl-8 pr-2 text-[12.5px] text-folix-text placeholder:text-folix-text-muted focus:outline-none focus:ring-1 focus:ring-folix-accent"
        />
      </div>

      {/* Match count */}
      <span className="min-w-[68px] px-1 text-center font-mono text-[11px] text-folix-text-muted">
        {query.length === 0
          ? ''
          : totalMatches > 0
          ? `${activeIndex + 1} de ${totalMatches}`
          : '0 resultados'}
      </span>

      {/* Case-sensitive toggle */}
      <button
        type="button"
        onClick={() => setCaseSensitive((prev) => !prev)}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
          caseSensitive
            ? 'bg-folix-accent-soft text-folix-accent'
            : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
        )}
        title="Diferenciar maiúsculas e minúsculas"
        aria-pressed={caseSensitive}
        aria-label="Diferenciar maiúsculas e minúsculas"
      >
        <CaseSensitive size={15} />
      </button>

      <div className="h-4 w-px bg-folix-border" aria-hidden="true" />

      <button
        type="button"
        onClick={goToPrev}
        disabled={totalMatches === 0}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text disabled:opacity-35"
        title="Ocorrência anterior (Shift+Enter)"
        aria-label="Ocorrência anterior"
      >
        <ChevronUp size={15} />
      </button>

      <button
        type="button"
        onClick={goToNext}
        disabled={totalMatches === 0}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text disabled:opacity-35"
        title="Próxima ocorrência (Enter)"
        aria-label="Próxima ocorrência"
      >
        <ChevronDown size={15} />
      </button>

      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
        title="Fechar pesquisa (Esc)"
        aria-label="Fechar pesquisa"
      >
        <X size={14} />
      </button>
    </div>
  );
}

