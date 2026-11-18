import { redo, undo } from '@codemirror/commands';
import { EditorSelection, type ChangeSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

function focusView(view: EditorView): void {
  if (!view.hasFocus) {
    view.focus();
  }
}

export function runUndo(view: EditorView): boolean {
  focusView(view);
  return undo(view);
}

export function runRedo(view: EditorView): boolean {
  focusView(view);
  return redo(view);
}

export function toggleInlineFormat(
  view: EditorView,
  marker: string,
  placeholder = 'texto'
): boolean {
  const { state } = view;
  const doc = state.doc;
  const len = marker.length;

  const tr = state.changeByRange((range) => {
    const selected = doc.sliceString(range.from, range.to);

    // Check if selection itself includes surrounding markers
    if (
      selected.length >= len * 2 &&
      selected.startsWith(marker) &&
      selected.endsWith(marker)
    ) {
      const inner = selected.slice(len, selected.length - len);
      return {
        changes: { from: range.from, to: range.to, insert: inner },
        range: EditorSelection.range(range.from, range.from + inner.length),
      };
    }

    // Check if markers wrap immediately outside the selection
    const before =
      range.from >= len ? doc.sliceString(range.from - len, range.from) : '';
    const after =
      range.to + len <= doc.length
        ? doc.sliceString(range.to, range.to + len)
        : '';

    if (before === marker && after === marker) {
      return {
        changes: [
          { from: range.from - len, to: range.from, insert: '' },
          { from: range.to, to: range.to + len, insert: '' },
        ],
        range: EditorSelection.range(range.from - len, range.to - len),
      };
    }

    if (range.empty) {
      const insert = `${marker}${placeholder}${marker}`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(
          range.from + len,
          range.from + len + placeholder.length
        ),
      };
    }

    const insert = `${marker}${selected}${marker}`;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(
        range.from + len,
        range.from + len + selected.length
      ),
    };
  });

  view.dispatch(tr);
  focusView(view);
  return true;
}

export function setHeadingLevel(view: EditorView, level: 1 | 2 | 3): boolean {
  const { state } = view;
  const doc = state.doc;
  const targetPrefix = `${'#'.repeat(level)} `;
  const lineNumbers = new Set<number>();

  for (const range of state.selection.ranges) {
    const startLine = doc.lineAt(range.from).number;
    const endLine = doc.lineAt(range.to).number;
    for (let ln = startLine; ln <= endLine; ln++) {
      lineNumbers.add(ln);
    }
  }

  const changes: ChangeSpec[] = [];
  let lastLineEndOffset = 0;

  const sortedLines = Array.from(lineNumbers).sort((a, b) => a - b);
  for (const ln of sortedLines) {
    const line = doc.line(ln);
    const match = line.text.match(/^\s{0,3}(#{1,6})\s+/);
    if (match) {
      const currentLevel = match[1].length;
      if (currentLevel === level) {
        changes.push({
          from: line.from,
          to: line.from + match[0].length,
          insert: '',
        });
        lastLineEndOffset = line.to - match[0].length;
      } else {
        changes.push({
          from: line.from,
          to: line.from + match[0].length,
          insert: targetPrefix,
        });
        lastLineEndOffset =
          line.to - match[0].length + targetPrefix.length;
      }
    } else {
      changes.push({
        from: line.from,
        to: line.from,
        insert: targetPrefix,
      });
      lastLineEndOffset = line.to + targetPrefix.length;
    }
  }

  view.dispatch({
    changes,
    selection: { anchor: Math.max(0, lastLineEndOffset) },
  });
  focusView(view);
  return true;
}

export function toggleLinePrefix(
  view: EditorView,
  prefix: string,
  ordered = false
): boolean {
  const { state } = view;
  const doc = state.doc;
  const lineNumbers: number[] = [];
  const seen = new Set<number>();

  for (const range of state.selection.ranges) {
    const startLine = doc.lineAt(range.from).number;
    const endLine = doc.lineAt(range.to).number;
    for (let ln = startLine; ln <= endLine; ln++) {
      if (!seen.has(ln)) {
        seen.add(ln);
        lineNumbers.push(ln);
      }
    }
  }

  const lines = lineNumbers.map((ln) => doc.line(ln));
  const checkRegex = ordered
    ? /^\d+\.\s+/
    : prefix === '- [ ] '
    ? /^-\s+\[[ xX]\]\s+/
    : prefix === '- '
    ? /^[-*+]\s+(?!\[[ xX]\])/
    : /^>\s?/;

  const allHavePrefix =
    lines.length > 0 && lines.every((l) => checkRegex.test(l.text));

  const changes: ChangeSpec[] = [];
  const stripAnyListOrQuote = /^(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+|>\s?)/;

  lines.forEach((line, idx) => {
    if (allHavePrefix) {
      const m = line.text.match(checkRegex);
      if (m) {
        changes.push({
          from: line.from,
          to: line.from + m[0].length,
          insert: '',
        });
      }
    } else {
      const existing = line.text.match(stripAnyListOrQuote);
      const nextPrefix = ordered ? `${idx + 1}. ` : prefix;
      if (existing) {
        changes.push({
          from: line.from,
          to: line.from + existing[0].length,
          insert: nextPrefix,
        });
      } else {
        changes.push({
          from: line.from,
          to: line.from,
          insert: nextPrefix,
        });
      }
    }
  });

  view.dispatch({ changes });
  focusView(view);
  return true;
}

export function insertLink(view: EditorView): boolean {
  const { state } = view;
  const doc = state.doc;

  const tr = state.changeByRange((range) => {
    const selected = doc.sliceString(range.from, range.to);
    if (!selected) {
      const text = 'texto do link';
      const url = 'https://';
      const insert = `[${text}](${url})`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(range.from + 1, range.from + 1 + text.length),
      };
    }

    if (/^https?:\/\/\S+$/i.test(selected.trim())) {
      const label = 'descrição';
      const insert = `[${label}](${selected.trim()})`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(
          range.from + 1,
          range.from + 1 + label.length
        ),
      };
    }

    const url = 'https://';
    const insert = `[${selected}](${url})`;
    const urlStart = range.from + selected.length + 3;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(urlStart, urlStart + url.length),
    };
  });

  view.dispatch(tr);
  focusView(view);
  return true;
}

export function insertCodeBlock(view: EditorView): boolean {
  const { state } = view;
  const doc = state.doc;
  const range = state.selection.main;
  const selected = doc.sliceString(range.from, range.to);
  const line = doc.lineAt(range.from);
  const needsLeadingNewline = range.from > line.from;
  const prefix = needsLeadingNewline ? '\n```\n' : '```\n';
  const suffix = '\n```\n';

  if (selected) {
    const insert = `${prefix}${selected}${suffix}`;
    const innerStart = range.from + prefix.length;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: { anchor: innerStart, head: innerStart + selected.length },
    });
  } else {
    const placeholder = 'código';
    const insert = `${prefix}${placeholder}${suffix}`;
    const innerStart = range.from + prefix.length;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: { anchor: innerStart, head: innerStart + placeholder.length },
    });
  }

  focusView(view);
  return true;
}

export function insertTable(view: EditorView): boolean {
  const { state } = view;
  const doc = state.doc;
  const range = state.selection.main;
  const line = doc.lineAt(range.from);
  const leading = line.text.trim().length > 0 ? '\n\n' : '';
  const tableBlock =
    '| Coluna 1 | Coluna 2 | Coluna 3 |\n' +
    '| --- | --- | --- |\n' +
    '| Dado 1 | Dado 2 | Dado 3 |\n';
  const insert = `${leading}${tableBlock}`;
  const firstCellStart = range.from + leading.length + 2;

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: firstCellStart, head: firstCellStart + 8 },
  });
  focusView(view);
  return true;
}

export function insertHorizontalRule(view: EditorView): boolean {
  const { state } = view;
  const doc = state.doc;
  const range = state.selection.main;
  const line = doc.lineAt(range.from);
  const leading = line.text.trim().length > 0 ? '\n\n' : '';
  const insert = `${leading}---\n\n`;

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + insert.length },
  });
  focusView(view);
  return true;
}

