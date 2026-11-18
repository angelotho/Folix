import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '@codemirror/commands';
import { markdown, markdownKeymap } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import {
  findNext,
  findPrevious,
  search,
  SearchCursor,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search';
import { Annotation, EditorState, Prec, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import {
  Bold,
  Calendar,
  CheckCircle2,
  Clock,
  Code,
  FileCode2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Table,
  Undo2,
} from 'lucide-react';
import type {
  DocumentTab,
  ReaderSettings,
  ViewportSyncAnchor,
} from '../types/folix';
import {
  cn,
  computeReadingStats,
  formatBytes,
  formatFullDate,
} from '../utils/format';
import {
  insertCodeBlock,
  insertHorizontalRule,
  insertLink,
  insertTable,
  runRedo,
  runUndo,
  setHeadingLevel,
  toggleInlineFormat,
  toggleLinePrefix,
} from '../utils/markdownCommands';

export interface MarkdownEditorHandle {
  scrollToLine: (lineNumber: number) => void;
  scrollToAnchor: (
    anchor: ViewportSyncAnchor,
    options?: { updateSelection?: boolean }
  ) => void;
  captureSyncAnchor: () => ViewportSyncAnchor | null;
  findAndHighlight: (
    query: string,
    caseSensitive: boolean,
    direction?: 'next' | 'prev'
  ) => { total: number; current: number };
  clearSearch: () => void;
  focus: () => void;
}

interface MarkdownEditorProps {
  documentTab: DocumentTab;
  fontFamily: ReaderSettings['fontFamily'];
  fontSize: ReaderSettings['fontSize'];
  pageWidth: ReaderSettings['pageWidth'];
  isSplitView: boolean;
  isSaving: boolean;
  editorStatesMap: Map<string, EditorState>;
  onChangeContent: (tabId: string, nextContent: string) => void;
  onSaveFile: () => void;
  onSaveScrollTop: (tabId: string, scrollTop: number) => void;
  getSavedEditorScrollTop: (tabId: string) => number;
  consumePendingSyncAnchor?: (tabId: string) => ViewportSyncAnchor | null;
  onVisibleLineChange?: (line: number) => void;
}

const PAGE_WIDTH_CLASSES: Record<ReaderSettings['pageWidth'], string> = {
  comfortable: 'max-w-[740px]',
  wide: 'max-w-[940px]',
  expanded: 'max-w-[1180px]',
};

const FONT_FAMILY_VARS: Record<ReaderSettings['fontFamily'], string> = {
  inter: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  mono: "'JetBrains Mono', 'Cascadia Code', monospace",
};

const folixHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: 'var(--folix-text)',
    fontWeight: '700',
    fontSize: '1.52em',
  },
  {
    tag: tags.heading2,
    color: 'var(--folix-text)',
    fontWeight: '700',
    fontSize: '1.28em',
  },
  {
    tag: tags.heading3,
    color: 'var(--folix-text)',
    fontWeight: '650',
    fontSize: '1.14em',
  },
  {
    tag: [tags.heading4, tags.heading5, tags.heading6],
    color: 'var(--folix-text)',
    fontWeight: '600',
    fontSize: '1.04em',
  },
  { tag: tags.strong, fontWeight: '700', color: 'var(--folix-text)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  {
    tag: tags.strikethrough,
    textDecoration: 'line-through',
    color: 'var(--folix-text-muted)',
  },
  { tag: tags.quote, color: 'var(--folix-text-secondary)', fontStyle: 'italic' },
  {
    tag: tags.monospace,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
    fontSize: '0.9em',
    color: 'var(--folix-inline-code-text)',
  },
  { tag: tags.link, color: 'var(--folix-accent)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--folix-text-muted)' },
  { tag: tags.list, color: 'var(--folix-accent)' },
  { tag: tags.contentSeparator, color: 'var(--folix-text-muted)' },
  { tag: [tags.meta, tags.comment], color: 'var(--hljs-comment)' },
  { tag: tags.keyword, color: 'var(--hljs-keyword)' },
  { tag: tags.string, color: 'var(--hljs-string)' },
  { tag: tags.number, color: 'var(--hljs-number)' },
  { tag: tags.typeName, color: 'var(--hljs-attr)' },
]);

const folixEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--folix-text)',
    fontFamily: "var(--folix-doc-font-family, 'Inter', system-ui, sans-serif)",
    fontSize: 'calc(16px * var(--folix-doc-font-scale, 1))',
    lineHeight: '1.74',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: 'inherit',
    overflow: 'visible',
  },
  '.cm-content': {
    padding: '4px 0 36px 0',
    caretColor: 'var(--folix-accent)',
    minHeight: '55vh',
  },
  '.cm-line': {
    padding: '1px 2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--folix-surface-hover)',
    borderRadius: '6px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--folix-selection-bg) !important',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--folix-accent)',
    borderLeftWidth: '2px',
  },
  '.cm-placeholder': {
    color: 'var(--folix-text-muted)',
    fontStyle: 'italic',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(245, 158, 11, 0.34)',
    borderRadius: '3px',
    boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.35)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: '#f59e0b',
    color: '#141413',
    borderRadius: '3px',
    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.5)',
  },
});

const programmaticSyncAnnotation = Annotation.define<boolean>();

function applyAnchorToEditor(
  view: EditorView,
  container: HTMLElement,
  anchor: ViewportSyncAnchor,
  options?: { updateSelection?: boolean; forceSelection?: boolean }
): void {
  const doc = view.state.doc;
  const updateSelection = options?.updateSelection ?? true;
  const forceSelection = options?.forceSelection ?? false;

  if (anchor.atTop) {
    if (updateSelection) {
      const currentLine = doc.lineAt(view.state.selection.main.head).number;
      if (forceSelection || currentLine > 15) {
        view.dispatch({
          selection: { anchor: 0 },
          annotations: programmaticSyncAnnotation.of(true),
        });
      }
    }
    container.scrollTop = 0;
    return;
  }

  const targetLineNum = Math.max(1, Math.min(anchor.line, doc.lines));
  const lineInfo = doc.line(targetLineNum);
  const clampedFraction = Math.max(0, Math.min(0.99, anchor.lineFraction));
  const charOffset =
    lineInfo.length > 0 && clampedFraction > 0
      ? Math.min(lineInfo.length, Math.round(lineInfo.length * clampedFraction))
      : 0;
  const targetPos = lineInfo.from + charOffset;

  const containerHeight =
    container.clientHeight || container.getBoundingClientRect().height;
  const desiredOffset = Math.max(
    8,
    Math.min(Math.max(24, containerHeight - 48), anchor.viewportOffset)
  );

  let selectionChange: { anchor: number } | undefined;
  if (updateSelection) {
    const currentLine = doc.lineAt(view.state.selection.main.head).number;
    if (forceSelection || Math.abs(currentLine - targetLineNum) > 15) {
      selectionChange = { anchor: lineInfo.from };
    }
  }

  view.dispatch({
    ...(selectionChange ? { selection: selectionChange } : {}),
    effects: EditorView.scrollIntoView(targetPos, {
      y: 'start',
      yMargin: desiredOffset,
    }),
    annotations: programmaticSyncAnnotation.of(true),
  });

  // Convergent multi-pass alignment: forces CodeMirror to measure newly exposed
  // viewport lines and eliminates drift from .cm-gap height estimates.
  for (let pass = 0; pass < 5; pass++) {
    const containerRect = container.getBoundingClientRect();
    const coords = view.coordsAtPos(targetPos);

    let currentRelativeTop: number | null = coords
      ? coords.top - containerRect.top
      : null;

    if (currentRelativeTop === null) {
      const block = view.lineBlockAt(targetPos);
      currentRelativeTop = view.documentTop + block.top - containerRect.top;
    }

    const delta = currentRelativeTop - desiredOffset;
    if (Math.abs(delta) <= 1) {
      break;
    }

    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextScrollTop = Math.max(
      0,
      Math.min(maxScroll, container.scrollTop + delta)
    );
    if (Math.abs(nextScrollTop - container.scrollTop) < 0.5) {
      break;
    }

    container.scrollTop = nextScrollTop;
    view.requestMeasure();
  }
}

function captureSyncAnchorFromEditor(
  view: EditorView | null,
  container: HTMLElement | null,
  hasUserInteracted: boolean
): ViewportSyncAnchor | null {
  if (!view || !container) return null;

  const containerRect = container.getBoundingClientRect();
  const containerTop = containerRect.top;
  const containerBottom = containerRect.bottom;
  const containerHeight = containerRect.height || container.clientHeight;
  const doc = view.state.doc;

  if (hasUserInteracted) {
    const headPos = view.state.selection.main.head;
    const cursorCoords = view.coordsAtPos(headPos);
    if (
      cursorCoords &&
      cursorCoords.top >= containerTop + 8 &&
      cursorCoords.bottom <= containerBottom - 8
    ) {
      const lineInfo = doc.lineAt(headPos);
      const block = view.lineBlockAt(headPos);
      const blockScreenTop = view.documentTop + block.top;
      const singleLineHeight = Math.max(
        view.defaultLineHeight,
        cursorCoords.bottom - cursorCoords.top
      );
      let lineFraction = 0;

      if (block.height > singleLineHeight * 1.6) {
        lineFraction = Math.max(
          0,
          Math.min(
            0.99,
            (cursorCoords.top - blockScreenTop) / Math.max(1, block.height)
          )
        );
      }

      return {
        line: lineInfo.number,
        lineFraction,
        viewportOffset: Math.round(cursorCoords.top - containerTop),
      };
    }
  }

  if (container.scrollTop <= 4) {
    return { line: 1, lineFraction: 0, viewportOffset: 0, atTop: true };
  }

  const docTopScreen = view.documentTop;
  const pivotScreenY =
    containerTop + Math.min(72, Math.max(36, containerHeight * 0.14));

  if (pivotScreenY < docTopScreen) {
    return {
      line: 1,
      lineFraction: 0,
      viewportOffset: Math.max(0, Math.round(docTopScreen - containerTop)),
    };
  }

  const heightInDoc = Math.max(0, pivotScreenY - docTopScreen);
  const block = view.lineBlockAtHeight(heightInDoc);
  const lineInfo = doc.lineAt(block.from);
  const blockTopScreen = docTopScreen + block.top;

  if (
    blockTopScreen >= containerTop + 8 &&
    blockTopScreen <= pivotScreenY + 24
  ) {
    return {
      line: lineInfo.number,
      lineFraction: 0,
      viewportOffset: Math.round(blockTopScreen - containerTop),
    };
  }

  const lineFraction = Math.max(
    0,
    Math.min(0.99, (heightInDoc - block.top) / Math.max(1, block.height))
  );

  return {
    line: lineInfo.number,
    lineFraction,
    viewportOffset: Math.round(pivotScreenY - containerTop),
  };
}

const MarkdownEditorInner = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditorInner(
    {
      documentTab,
      fontFamily,
      fontSize,
      pageWidth,
      isSplitView,
      isSaving,
      editorStatesMap,
      onChangeContent,
      onSaveFile,
      onSaveScrollTop,
      getSavedEditorScrollTop,
      consumePendingSyncAnchor,
      onVisibleLineChange,
    },
    ref
  ) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const editorHostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const activeTabIdRef = useRef(documentTab.id);
    const lastSyncedDocRef = useRef(documentTab.content);
    const hasUserInteractedRef = useRef(false);
    const syncVerifyRafRef = useRef<number | null>(null);
    const visibleLineRafRef = useRef<number | null>(null);
    const suppressNextScrollSyncRef = useRef(false);
    const programmaticScrollTargetRef = useRef(0);

    const onChangeRef = useRef(onChangeContent);
    onChangeRef.current = onChangeContent;
    const onSaveScrollTopRef = useRef(onSaveScrollTop);
    onSaveScrollTopRef.current = onSaveScrollTop;
    const getSavedScrollTopRef = useRef(getSavedEditorScrollTop);
    getSavedScrollTopRef.current = getSavedEditorScrollTop;
    const consumePendingSyncAnchorRef = useRef(consumePendingSyncAnchor);
    consumePendingSyncAnchorRef.current = consumePendingSyncAnchor;
    const onVisibleLineChangeRef = useRef(onVisibleLineChange);
    onVisibleLineChangeRef.current = onVisibleLineChange;
    const editorStatesMapRef = useRef(editorStatesMap);
    editorStatesMapRef.current = editorStatesMap;

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const syncUndoRedoFlags = useCallback((state: EditorState) => {
      setCanUndo(undoDepth(state) > 0);
      setCanRedo(redoDepth(state) > 0);
    }, []);

    const buildExtensions = useCallback((): Extension[] => {
      const markdownShortcutMap = Prec.highest(
        keymap.of([
          {
            key: 'Mod-b',
            run: (view) => toggleInlineFormat(view, '**', 'negrito'),
          },
          {
            key: 'Mod-i',
            run: (view) => toggleInlineFormat(view, '*', 'itálico'),
          },
          {
            key: 'Mod-k',
            run: (view) => insertLink(view),
          },
          {
            key: 'Mod-`',
            run: (view) => toggleInlineFormat(view, '`', 'código'),
          },
          {
            key: 'Mod-Shift-c',
            run: (view) => insertCodeBlock(view),
          },
          {
            key: 'Alt-Shift-s',
            run: (view) => toggleInlineFormat(view, '~~', 'texto'),
          },
          {
            key: 'Mod-1',
            run: (view) => setHeadingLevel(view, 1),
          },
          {
            key: 'Mod-2',
            run: (view) => setHeadingLevel(view, 2),
          },
          {
            key: 'Mod-3',
            run: (view) => setHeadingLevel(view, 3),
          },
          {
            key: 'Mod-y',
            run: (view) => redo(view),
          },
          {
            key: 'Mod-Shift-z',
            run: (view) => redo(view),
          },
          {
            key: 'Mod-z',
            run: (view) => undo(view),
          },
        ])
      );

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          hasUserInteractedRef.current = true;
          const nextDoc = update.state.doc.toString();
          lastSyncedDocRef.current = nextDoc;
          onChangeRef.current(activeTabIdRef.current, nextDoc);
        } else if (
          update.selectionSet &&
          !update.transactions.some((tr) =>
            tr.annotation(programmaticSyncAnnotation)
          )
        ) {
          hasUserInteractedRef.current = true;
        }
        if (update.docChanged || update.transactions.length > 0) {
          editorStatesMapRef.current.set(activeTabIdRef.current, update.state);
          syncUndoRedoFlags(update.state);
        }
      });

      return [
        history(),
        markdownShortcutMap,
        keymap.of([
          ...markdownKeymap,
          ...historyKeymap,
          ...defaultKeymap,
          indentWithTab,
        ]),
        markdown(),
        syntaxHighlighting(folixHighlightStyle),
        folixEditorTheme,
        drawSelection(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        search(),
        cmPlaceholder('Comece a escrever seu documento Markdown aqui...'),
        updateListener,
      ];
    }, [syncUndoRedoFlags]);

    const getOrCreateEditorState = useCallback(
      (tab: DocumentTab): EditorState => {
        const cached = editorStatesMapRef.current.get(tab.id);
        if (cached) {
          return cached;
        }
        const created = EditorState.create({
          doc: tab.content,
          extensions: buildExtensions(),
        });
        editorStatesMapRef.current.set(tab.id, created);
        return created;
      },
      [buildExtensions]
    );

    const scheduleSyncVerification = useCallback(
      (tabId: string, anchor: ViewportSyncAnchor) => {
        if (syncVerifyRafRef.current !== null) {
          window.cancelAnimationFrame(syncVerifyRafRef.current);
        }
        syncVerifyRafRef.current = window.requestAnimationFrame(() => {
          syncVerifyRafRef.current = null;
          const activeView = viewRef.current;
          const activeContainer = scrollContainerRef.current;
          if (!activeView || !activeContainer || activeTabIdRef.current !== tabId) {
            return;
          }
          const prevScrollTop = activeContainer.scrollTop;
          applyAnchorToEditor(activeView, activeContainer, anchor, {
            updateSelection: false,
          });
          if (Math.abs(activeContainer.scrollTop - prevScrollTop) > 0.5) {
            programmaticScrollTargetRef.current = activeContainer.scrollTop;
            suppressNextScrollSyncRef.current = true;
          }
          onSaveScrollTopRef.current(tabId, activeContainer.scrollTop);
        });
      },
      []
    );

    // Mount EditorView once before paint and clean up on unmount
    useLayoutEffect(() => {
      const host = editorHostRef.current;
      if (!host) return;

      const initialState = getOrCreateEditorState(documentTab);
      const view = new EditorView({
        state: initialState,
        parent: host,
      });

      viewRef.current = view;
      activeTabIdRef.current = documentTab.id;
      lastSyncedDocRef.current = documentTab.content;
      hasUserInteractedRef.current = false;
      syncUndoRedoFlags(initialState);

      const container = scrollContainerRef.current;
      if (container) {
        const pendingSync = consumePendingSyncAnchorRef.current?.(documentTab.id);
        if (pendingSync) {
          applyAnchorToEditor(view, container, pendingSync, {
            updateSelection: true,
          });
          programmaticScrollTargetRef.current = container.scrollTop;
          suppressNextScrollSyncRef.current = true;
          onSaveScrollTopRef.current(documentTab.id, container.scrollTop);
          onVisibleLineChangeRef.current?.(
            Math.max(1, Math.min(pendingSync.line, view.state.doc.lines))
          );
          scheduleSyncVerification(documentTab.id, pendingSync);
        } else {
          const savedTop = getSavedScrollTopRef.current(documentTab.id);
          programmaticScrollTargetRef.current = savedTop;
          suppressNextScrollSyncRef.current = savedTop > 0;
          container.scrollTop = savedTop;
        }
      }

      return () => {
        if (syncVerifyRafRef.current !== null) {
          window.cancelAnimationFrame(syncVerifyRafRef.current);
          syncVerifyRafRef.current = null;
        }
        if (visibleLineRafRef.current !== null) {
          window.cancelAnimationFrame(visibleLineRafRef.current);
          visibleLineRafRef.current = null;
        }
        if (viewRef.current) {
          editorStatesMapRef.current.set(
            activeTabIdRef.current,
            viewRef.current.state
          );
          if (scrollContainerRef.current) {
            onSaveScrollTopRef.current(
              activeTabIdRef.current,
              scrollContainerRef.current.scrollTop
            );
          }
          viewRef.current.destroy();
          viewRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Switch EditorState cleanly when changing tabs or reloading file externally
    useLayoutEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      const prevTabId = activeTabIdRef.current;

      if (prevTabId !== documentTab.id) {
        editorStatesMapRef.current.set(prevTabId, view.state);
        if (scrollContainerRef.current) {
          onSaveScrollTopRef.current(prevTabId, scrollContainerRef.current.scrollTop);
        }

        activeTabIdRef.current = documentTab.id;
        lastSyncedDocRef.current = documentTab.content;
        hasUserInteractedRef.current = false;

        const nextState = getOrCreateEditorState(documentTab);
        view.setState(nextState);
        syncUndoRedoFlags(nextState);

        const container = scrollContainerRef.current;
        if (container) {
          const pendingSync = consumePendingSyncAnchorRef.current?.(documentTab.id);
          if (pendingSync) {
            applyAnchorToEditor(view, container, pendingSync, {
              updateSelection: true,
            });
            programmaticScrollTargetRef.current = container.scrollTop;
            suppressNextScrollSyncRef.current = true;
            onSaveScrollTopRef.current(documentTab.id, container.scrollTop);
            onVisibleLineChangeRef.current?.(
              Math.max(1, Math.min(pendingSync.line, view.state.doc.lines))
            );
            scheduleSyncVerification(documentTab.id, pendingSync);
          } else {
            const savedTop = getSavedScrollTopRef.current(documentTab.id);
            programmaticScrollTargetRef.current = savedTop;
            suppressNextScrollSyncRef.current = savedTop > 0;
            container.scrollTop = savedTop;
          }
        }
        return;
      }

      // Same tab: sync only when content was modified externally (e.g. reload/discard)
      if (documentTab.content !== lastSyncedDocRef.current) {
        lastSyncedDocRef.current = documentTab.content;
        hasUserInteractedRef.current = false;
        const currentDoc = view.state.doc.toString();
        if (currentDoc !== documentTab.content) {
          const freshState = EditorState.create({
            doc: documentTab.content,
            extensions: buildExtensions(),
          });
          editorStatesMapRef.current.set(documentTab.id, freshState);
          view.setState(freshState);
          syncUndoRedoFlags(freshState);
        }
      }
    }, [
      documentTab,
      buildExtensions,
      getOrCreateEditorState,
      scheduleSyncVerification,
      syncUndoRedoFlags,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToLine(lineNumber: number) {
          const view = viewRef.current;
          const container = scrollContainerRef.current;
          if (!view || !container) return;

          const clamped = Math.max(
            1,
            Math.min(lineNumber, view.state.doc.lines)
          );
          applyAnchorToEditor(
            view,
            container,
            { line: clamped, lineFraction: 0, viewportOffset: 36 },
            { updateSelection: true, forceSelection: true }
          );
          programmaticScrollTargetRef.current = container.scrollTop;
          suppressNextScrollSyncRef.current = true;
          onSaveScrollTopRef.current(activeTabIdRef.current, container.scrollTop);
          onVisibleLineChangeRef.current?.(clamped);
        },
        scrollToAnchor(
          anchor: ViewportSyncAnchor,
          options?: { updateSelection?: boolean }
        ) {
          const view = viewRef.current;
          const container = scrollContainerRef.current;
          if (!view || !container) return;

          applyAnchorToEditor(view, container, anchor, {
            updateSelection: options?.updateSelection ?? true,
          });
          programmaticScrollTargetRef.current = container.scrollTop;
          suppressNextScrollSyncRef.current = true;
          onSaveScrollTopRef.current(activeTabIdRef.current, container.scrollTop);
          onVisibleLineChangeRef.current?.(
            Math.max(1, Math.min(anchor.line, view.state.doc.lines))
          );
        },
        captureSyncAnchor() {
          return captureSyncAnchorFromEditor(
            viewRef.current,
            scrollContainerRef.current,
            hasUserInteractedRef.current
          );
        },
        findAndHighlight(
          query: string,
          caseSensitive: boolean,
          direction?: 'next' | 'prev'
        ) {
          const view = viewRef.current;
          if (!view) return { total: 0, current: 0 };

          if (!query) {
            view.dispatch({
              effects: setSearchQuery.of(new SearchQuery({ search: '' })),
            });
            return { total: 0, current: 0 };
          }

          const sq = new SearchQuery({
            search: query,
            caseSensitive,
          });
          view.dispatch({
            effects: setSearchQuery.of(sq),
          });

          const cursor = new SearchCursor(
            view.state.doc,
            query,
            0,
            view.state.doc.length,
            caseSensitive ? undefined : (s) => s.toLowerCase()
          );

          const matches: Array<{ from: number; to: number }> = [];
          while (!cursor.next().done) {
            matches.push({ from: cursor.value.from, to: cursor.value.to });
          }

          if (matches.length === 0) {
            return { total: 0, current: 0 };
          }

          if (direction === 'next') {
            findNext(view);
          } else if (direction === 'prev') {
            findPrevious(view);
          } else {
            const sel = view.state.selection.main;
            const currentMatch = matches.find(
              (m) => m.from === sel.from && m.to === sel.to
            );
            if (!currentMatch) {
              view.dispatch({
                selection: { anchor: matches[0].from, head: matches[0].to },
              });
            }
          }

          const updatedSel = view.state.selection.main;
          let activeIdx = matches.findIndex(
            (m) => m.from === updatedSel.from && m.to === updatedSel.to
          );
          if (activeIdx === -1) {
            activeIdx = Math.max(
              0,
              matches.findIndex((m) => m.from >= updatedSel.from)
            );
          }

          // Scroll match into view cleanly inside custom container
          const targetMatch = matches[activeIdx] || matches[0];
          const container = scrollContainerRef.current;
          if (container && targetMatch) {
            const coords = view.coordsAtPos(targetMatch.from);
            if (coords) {
              const containerRect = container.getBoundingClientRect();
              if (
                coords.top < containerRect.top + 80 ||
                coords.bottom > containerRect.bottom - 40
              ) {
                const offset = coords.top - containerRect.top;
                container.scrollTo({
                  top: Math.max(0, container.scrollTop + offset - containerRect.height / 3),
                  behavior: 'smooth',
                });
              }
            }
          }

          return { total: matches.length, current: activeIdx + 1 };
        },
        clearSearch() {
          const view = viewRef.current;
          if (!view) return;
          view.dispatch({
            effects: setSearchQuery.of(new SearchQuery({ search: '' })),
          });
        },
        focus() {
          viewRef.current?.focus();
        },
      }),
      []
    );

    const runAction = useCallback((fn: (view: EditorView) => void) => {
      const view = viewRef.current;
      if (!view) return;
      fn(view);
    }, []);

    const stats = useMemo(
      () => computeReadingStats(documentTab.content),
      [documentTab.content]
    );
    const isDirty = documentTab.content !== documentTab.savedContent;

    const handleScroll = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      onSaveScrollTopRef.current(activeTabIdRef.current, container.scrollTop);

      if (suppressNextScrollSyncRef.current) {
        const diff = Math.abs(
          container.scrollTop - programmaticScrollTargetRef.current
        );
        suppressNextScrollSyncRef.current = false;
        if (diff <= 2) {
          return;
        }
      }

      if (!onVisibleLineChangeRef.current) return;
      if (visibleLineRafRef.current !== null) return;

      visibleLineRafRef.current = window.requestAnimationFrame(() => {
        visibleLineRafRef.current = null;
        const view = viewRef.current;
        const scroller = scrollContainerRef.current;
        if (!view || !scroller || !onVisibleLineChangeRef.current) return;

        const containerTop = scroller.getBoundingClientRect().top;
        const probeY = containerTop + 96;
        const heightInDoc = Math.max(0, probeY - view.documentTop);
        const block = view.lineBlockAtHeight(heightInDoc);
        const lineNum = view.state.doc.lineAt(block.from).number;
        onVisibleLineChangeRef.current(lineNum);
      });
    }, []);

    return (
      <div className="no-print flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Contextual Formatting Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-folix-border bg-folix-surface/95 px-3.5 py-1.5">
          <div className="flex flex-wrap items-center gap-0.5">
            <ToolbarBtn
              title="Desfazer (Ctrl+Z)"
              disabled={!canUndo}
              onClick={() => runAction((v) => runUndo(v))}
            >
              <Undo2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Refazer (Ctrl+Y / Ctrl+Shift+Z)"
              disabled={!canRedo}
              onClick={() => runAction((v) => runRedo(v))}
            >
              <Redo2 size={14} />
            </ToolbarBtn>

            <BarDivider />

            <ToolbarBtn
              title="Título 1 (Ctrl+1)"
              onClick={() => runAction((v) => setHeadingLevel(v, 1))}
            >
              <Heading1 size={14.5} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Título 2 (Ctrl+2)"
              onClick={() => runAction((v) => setHeadingLevel(v, 2))}
            >
              <Heading2 size={14.5} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Título 3 (Ctrl+3)"
              onClick={() => runAction((v) => setHeadingLevel(v, 3))}
            >
              <Heading3 size={14.5} />
            </ToolbarBtn>

            <BarDivider />

            <ToolbarBtn
              title="Negrito (Ctrl+B)"
              onClick={() =>
                runAction((v) => toggleInlineFormat(v, '**', 'negrito'))
              }
            >
              <Bold size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Itálico (Ctrl+I)"
              onClick={() =>
                runAction((v) => toggleInlineFormat(v, '*', 'itálico'))
              }
            >
              <Italic size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Tachado (Alt+Shift+S)"
              onClick={() =>
                runAction((v) => toggleInlineFormat(v, '~~', 'texto'))
              }
            >
              <Strikethrough size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Código inline (Ctrl+`)"
              onClick={() =>
                runAction((v) => toggleInlineFormat(v, '`', 'código'))
              }
            >
              <Code size={14} />
            </ToolbarBtn>

            <BarDivider />

            <ToolbarBtn
              title="Lista com marcadores"
              onClick={() => runAction((v) => toggleLinePrefix(v, '- '))}
            >
              <List size={14.5} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Lista numerada"
              onClick={() => runAction((v) => toggleLinePrefix(v, '1. ', true))}
            >
              <ListOrdered size={14.5} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Lista de tarefas (Checklist)"
              onClick={() => runAction((v) => toggleLinePrefix(v, '- [ ] '))}
            >
              <ListChecks size={14.5} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Citação"
              onClick={() => runAction((v) => toggleLinePrefix(v, '> '))}
            >
              <Quote size={14} />
            </ToolbarBtn>

            <BarDivider />

            <ToolbarBtn
              title="Inserir link (Ctrl+K)"
              onClick={() => runAction((v) => insertLink(v))}
            >
              <Link2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Bloco de código (Ctrl+Shift+C)"
              onClick={() => runAction((v) => insertCodeBlock(v))}
            >
              <FileCode2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Inserir tabela Markdown"
              onClick={() => runAction((v) => insertTable(v))}
            >
              <Table size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              title="Separador horizontal"
              onClick={() => runAction((v) => insertHorizontalRule(v))}
            >
              <Minus size={14} />
            </ToolbarBtn>
          </div>

          {/* Inline save status */}
          <div className="flex items-center gap-2 text-[11.5px]">
            {isDirty ? (
              <button
                type="button"
                onClick={onSaveFile}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/12 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
                title="Salvar alterações no arquivo original (Ctrl+S)"
              >
                <Save size={12} />
                <span>
                  {isSaving ? 'Salvando...' : 'Alterações não salvas'}
                </span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 text-folix-text-muted">
                <CheckCircle2 size={12.5} className="text-emerald-500" />
                <span className="hidden sm:inline">Salvo</span>
              </span>
            )}
          </div>
        </div>

        {/* Editorial Writing Canvas */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8"
        >
          <div
            className={cn(
              'mx-auto w-full rounded-2xl border border-folix-border bg-folix-surface px-6 py-7 shadow-folix-doc transition-[max-width] duration-200 sm:px-10 sm:py-10',
              isSplitView ? 'max-w-none' : PAGE_WIDTH_CLASSES[pageWidth]
            )}
          >
            {/* Document Editor Metadata Bar */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-folix-border-subtle pb-3.5 text-[12px] text-folix-text-muted">
              <div className="flex items-center gap-2 font-medium text-folix-text-secondary">
                <FileText size={13.5} className="text-folix-accent" />
                <span>{documentTab.fileName}</span>
                <span className="rounded-md bg-folix-accent-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-folix-accent">
                  Editando
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12.5} />
                  {stats.lines.toLocaleString('pt-BR')} linhas •{' '}
                  {stats.words.toLocaleString('pt-BR')} palavras
                </span>
                <span>{formatBytes(documentTab.size)}</span>
                <span className="hidden md:inline-flex items-center gap-1">
                  <Calendar size={12.5} />
                  {formatFullDate(documentTab.updatedAt)}
                </span>
              </div>
            </div>

            {/* CodeMirror 6 Host */}
            <div
              ref={editorHostRef}
              className="folix-editor-host"
              style={
                {
                  '--folix-doc-font-scale': fontSize / 100,
                  '--folix-doc-font-family': FONT_FAMILY_VARS[fontFamily],
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>
    );
  }
);

function BarDivider() {
  return (
    <div
      className="mx-1 h-4 w-px bg-folix-border-subtle"
      aria-hidden="true"
    />
  );
}

interface ToolbarBtnProps {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarBtn({ title, disabled, onClick, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Preserve editor text selection when clicking formatting buttons
        e.preventDefault();
      }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export const MarkdownEditor = memo(MarkdownEditorInner);
