import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import type { TocItem, ViewportSyncAnchor } from '../types/folix';

const SOURCE_LINE_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'blockquote',
  'pre',
  'hr',
  'img',
  'div',
  'section',
  'details',
  'summary',
  'figure',
  'dl',
  'dt',
  'dd',
]);

export interface ViewerLineSegment {
  top: number;
  bottom: number;
  startLine: number;
  endLine: number;
}

/**
 * Rehype plugin that annotates rendered structural elements with their
 * 1-based start and end line numbers from the original Markdown source.
 */
export function rehypeSourceLines() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!SOURCE_LINE_TAGS.has(node.tagName)) return;
      const startLine = node.position?.start?.line;
      if (!startLine || startLine < 1) return;
      const endLine = node.position?.end?.line ?? startLine;

      node.properties = node.properties ?? {};
      node.properties['data-source-line'] = startLine;
      node.properties['data-source-line-end'] = Math.max(startLine, endLine);
    });
  };
}

function parsePositiveLine(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
  }
  return undefined;
}

/**
 * Extracts `data-source-line` attributes for custom ReactMarkdown components
 * (such as CodeBlock, table wrapper, blockquote/callout, and images).
 */
export function extractSourceLineProps(
  node?: Element,
  props?: Record<string, unknown>
): { 'data-source-line'?: number; 'data-source-line-end'?: number } {
  const startLine =
    parsePositiveLine(node?.position?.start?.line) ??
    parsePositiveLine(props?.['data-source-line']);

  if (!startLine) return {};

  const endLine =
    parsePositiveLine(node?.position?.end?.line) ??
    parsePositiveLine(props?.['data-source-line-end']) ??
    startLine;

  return {
    'data-source-line': startLine,
    'data-source-line-end': Math.max(startLine, endLine),
  };
}

/**
 * Builds a single-pass O(N) ordered list of rendered visual segments mapped to
 * Markdown source line spans.
 */
export function buildViewerLineSegments(
  article: HTMLElement
): ViewerLineSegment[] {
  const elements = Array.from(
    article.querySelectorAll<HTMLElement>('[data-source-line]')
  );
  if (elements.length === 0) return [];

  const segments: ViewerLineSegment[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const startLine = parsePositiveLine(el.getAttribute('data-source-line'));
    if (!startLine) continue;

    const endLineRaw = parsePositiveLine(el.getAttribute('data-source-line-end'));
    const endLine = endLineRaw ? Math.max(startLine, endLineRaw) : startLine;

    const elRect = el.getBoundingClientRect();
    if (elRect.height <= 0 && elRect.width <= 0) continue;

    const nextEl = elements[i + 1];
    const hasAnnotatedChild = Boolean(nextEl && el.contains(nextEl));

    if (!hasAnnotatedChild) {
      segments.push({
        top: elRect.top,
        bottom: Math.max(elRect.top + 1, elRect.bottom),
        startLine,
        endLine,
      });
      continue;
    }

    // Container element (e.g. list item with nested list, or callout with title):
    // emit its leading header/text slice if it precedes the first annotated child.
    const childRect = nextEl.getBoundingClientRect();
    const childStartLine =
      parsePositiveLine(nextEl.getAttribute('data-source-line')) ?? startLine;

    if (childRect.top - elRect.top >= 8 || childStartLine > startLine) {
      const upperEndLine = Math.max(startLine, childStartLine - 1);
      segments.push({
        top: elRect.top,
        bottom: Math.max(elRect.top + 4, childRect.top),
        startLine,
        endLine: Math.min(endLine, upperEndLine),
      });
    }
  }

  return segments;
}

/**
 * Captures an exact structural anchor representing what the user is currently
 * reading near the top reading zone of the Markdown viewer.
 */
export function captureViewerSyncAnchor(
  container: HTMLElement | null,
  article: HTMLElement | null
): ViewportSyncAnchor {
  if (!container || container.scrollTop <= 4) {
    return { line: 1, lineFraction: 0, viewportOffset: 0, atTop: true };
  }

  if (!article) {
    return { line: 1, lineFraction: 0, viewportOffset: 0, atTop: true };
  }

  const segments = buildViewerLineSegments(article);
  if (segments.length === 0) {
    return { line: 1, lineFraction: 0, viewportOffset: 0, atTop: true };
  }

  const containerRect = container.getBoundingClientRect();
  const containerTop = containerRect.top;
  const containerHeight = containerRect.height || container.clientHeight;
  const topThreshold = containerTop + 16;
  const readingPivot =
    containerTop + Math.min(72, Math.max(36, containerHeight * 0.14));

  let targetIdx = segments.findIndex((seg) => seg.bottom > topThreshold);
  if (targetIdx === -1) {
    targetIdx = segments.length - 1;
  }

  const seg = segments[targetIdx];
  const nearTopLimit = containerTop + Math.min(160, containerHeight * 0.35);

  if (seg.top >= containerTop + 8 && seg.top <= nearTopLimit) {
    return {
      line: seg.startLine,
      lineFraction: 0,
      viewportOffset: Math.round(seg.top - containerTop),
    };
  }

  const nextSeg = segments[targetIdx + 1];
  const nextLimit = containerTop + Math.min(180, containerHeight * 0.38);
  if (seg.bottom <= readingPivot && nextSeg && nextSeg.top <= nextLimit) {
    return {
      line: nextSeg.startLine,
      lineFraction: 0,
      viewportOffset: Math.round(nextSeg.top - containerTop),
    };
  }

  const pivotY = Math.min(readingPivot, seg.bottom - 4);
  const segHeight = Math.max(1, seg.bottom - seg.top);
  const ratio = Math.max(0, Math.min(0.999, (pivotY - seg.top) / segHeight));
  const totalLines = Math.max(1, seg.endLine - seg.startLine + 1);
  const exactLineOffset = ratio * totalLines;
  const lineOffset = Math.min(totalLines - 1, Math.floor(exactLineOffset));
  const lineFraction = Math.max(0, Math.min(0.99, exactLineOffset - lineOffset));

  return {
    line: seg.startLine + lineOffset,
    lineFraction,
    viewportOffset: Math.round(pivotY - containerTop),
  };
}

/**
 * Scrolls the Markdown viewer instantaneously so the given source anchor appears
 * at its target viewport offset.
 */
export function applyAnchorToViewer(
  container: HTMLElement,
  article: HTMLElement | null,
  anchor: ViewportSyncAnchor
): void {
  if (anchor.atTop) {
    container.scrollTop = 0;
    return;
  }

  if (!article) return;

  const segments = buildViewerLineSegments(article);
  if (segments.length === 0) return;

  const containerRect = container.getBoundingClientRect();
  const containerHeight = containerRect.height || container.clientHeight;
  const desiredOffset = Math.max(
    8,
    Math.min(Math.max(24, containerHeight - 48), anchor.viewportOffset)
  );

  let matchedSeg: ViewerLineSegment | null = null;
  let bestSpan = Number.POSITIVE_INFINITY;

  for (const seg of segments) {
    if (anchor.line >= seg.startLine && anchor.line <= seg.endLine) {
      const span = seg.endLine - seg.startLine;
      if (span < bestSpan) {
        bestSpan = span;
        matchedSeg = seg;
      }
    }
  }

  let targetScreenY: number;

  if (matchedSeg) {
    const totalLines = Math.max(1, matchedSeg.endLine - matchedSeg.startLine + 1);
    const progress = Math.max(
      0,
      Math.min(
        1,
        (anchor.line - matchedSeg.startLine + anchor.lineFraction) / totalLines
      )
    );
    targetScreenY =
      matchedSeg.top + progress * (matchedSeg.bottom - matchedSeg.top);
  } else {
    let prevSeg: ViewerLineSegment | null = null;
    let nextSeg: ViewerLineSegment | null = null;

    for (const seg of segments) {
      if (seg.endLine < anchor.line) {
        if (!prevSeg || seg.endLine > prevSeg.endLine) {
          prevSeg = seg;
        }
      } else if (seg.startLine > anchor.line) {
        if (!nextSeg || seg.startLine < nextSeg.startLine) {
          nextSeg = seg;
        }
      }
    }

    if (prevSeg && nextSeg) {
      const lineGap = Math.max(1, nextSeg.startLine - prevSeg.endLine);
      const t = Math.max(
        0,
        Math.min(1, (anchor.line - prevSeg.endLine) / lineGap)
      );
      targetScreenY = prevSeg.bottom + t * (nextSeg.top - prevSeg.bottom);
    } else if (nextSeg) {
      targetScreenY = nextSeg.top;
    } else if (prevSeg) {
      targetScreenY = prevSeg.bottom;
    } else {
      return;
    }
  }

  const delta = targetScreenY - (containerRect.top + desiredOffset);
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  container.scrollTop = Math.max(0, Math.min(maxScroll, container.scrollTop + delta));
}

/**
 * Resolves the active TOC heading ID corresponding to a given 1-based line.
 */
export function resolveActiveHeadingForLine(
  tocItems: TocItem[],
  line: number
): string | null {
  if (tocItems.length === 0) return null;

  let activeId = tocItems[0].id;
  for (const item of tocItems) {
    if (item.line <= line) {
      activeId = item.id;
    } else {
      break;
    }
  }
  return activeId;
}

