import React, {
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  ImageOff,
  Info,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import type { DocumentTab, ReaderSettings, TocItem } from '../types/folix';
import {
  cn,
  computeReadingStats,
  formatBytes,
  formatFullDate,
} from '../utils/format';
import { CodeBlock } from './CodeBlock';

interface MarkdownViewerProps {
  documentTab: DocumentTab;
  settings: ReaderSettings;
  tocItems: TocItem[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  articleRef: React.RefObject<HTMLElement>;
  getSavedScrollTop: (tabId: string) => number;
  onSaveScrollTop: (tabId: string, scrollTop: number) => void;
  onActiveHeadingChange: (id: string | null) => void;
  onConsumePendingAnchor: (tabId: string) => void;
  onOpenRelativeLink: (relPath: string) => void;
  onOpenExternalError: (message: string) => void;
  onImageClick: (src: string, alt?: string) => void;
}

// Strict sanitization schema preventing scripts, iframes, event handlers, and unsafe URLs
const folixSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    ul: [...(defaultSchema.attributes?.ul || []), ['className']],
    li: [...(defaultSchema.attributes?.li || []), ['className']],
    input: [
      ...(defaultSchema.attributes?.input || []),
      ['type', 'checkbox'],
      ['checked'],
      ['disabled'],
      ['className'],
    ],
    th: [...(defaultSchema.attributes?.th || []), ['align']],
    td: [...(defaultSchema.attributes?.td || []), ['align']],
  },
};

const CALLOUT_CONFIG: Record<
  string,
  {
    label: string;
    icon: typeof Info;
    containerClass: string;
    titleClass: string;
  }
> = {
  NOTE: {
    label: 'Nota',
    icon: Info,
    containerClass:
      'border-indigo-500/35 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.1]',
    titleClass: 'text-indigo-600 dark:text-indigo-400',
  },
  TIP: {
    label: 'Dica',
    icon: Lightbulb,
    containerClass:
      'border-emerald-500/35 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.1]',
    titleClass: 'text-emerald-600 dark:text-emerald-400',
  },
  IMPORTANT: {
    label: 'Importante',
    icon: Bookmark,
    containerClass:
      'border-violet-500/35 bg-violet-500/[0.06] dark:bg-violet-500/[0.1]',
    titleClass: 'text-violet-600 dark:text-violet-400',
  },
  WARNING: {
    label: 'Atenção',
    icon: AlertTriangle,
    containerClass:
      'border-amber-500/40 bg-amber-500/[0.07] dark:bg-amber-500/[0.11]',
    titleClass: 'text-amber-700 dark:text-amber-400',
  },
  CAUTION: {
    label: 'Cuidado',
    icon: ShieldAlert,
    containerClass:
      'border-rose-500/40 bg-rose-500/[0.07] dark:bg-rose-500/[0.11]',
    titleClass: 'text-rose-600 dark:text-rose-400',
  },
};

function parseGitHubAlert(children: React.ReactNode): {
  type: string;
  content: React.ReactNode[];
} | null {
  const childArray = React.Children.toArray(children);
  const firstParagraphIdx = childArray.findIndex(
    (child) => isValidElement(child) && child.type === 'p'
  );
  if (firstParagraphIdx === -1) return null;

  const firstParagraph = childArray[firstParagraphIdx] as React.ReactElement<{
    children?: React.ReactNode;
  }>;
  const pChildren = React.Children.toArray(firstParagraph.props.children);
  if (pChildren.length === 0) return null;

  const firstText = pChildren[0];
  if (typeof firstText !== 'string') return null;

  const match = firstText.match(
    /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\r?\n)?/i
  );
  if (!match) return null;

  const alertType = match[1].toUpperCase();
  const remainingFirstText = firstText.slice(match[0].length);
  const updatedPChildren = [...pChildren];
  if (remainingFirstText.length > 0) {
    updatedPChildren[0] = remainingFirstText;
  } else {
    updatedPChildren.shift();
    if (
      updatedPChildren[0] &&
      isValidElement(updatedPChildren[0]) &&
      updatedPChildren[0].type === 'br'
    ) {
      updatedPChildren.shift();
    }
  }

  const nextChildren = [...childArray];
  if (updatedPChildren.length > 0) {
    nextChildren[firstParagraphIdx] = React.cloneElement(firstParagraph, {
      children: updatedPChildren,
    });
  } else {
    nextChildren.splice(firstParagraphIdx, 1);
  }

  return { type: alertType, content: nextChildren };
}

interface MarkdownImageProps {
  src?: string;
  alt?: string;
  title?: string;
  directory: string;
  onImageClick: (src: string, alt?: string) => void;
}

function MarkdownImage({
  src,
  alt,
  title,
  directory,
  onImageClick,
}: MarkdownImageProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (!src) return '';
    const trimmed = src.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('folix-asset://')
    ) {
      return trimmed;
    }
    return `folix-asset://image?baseDir=${encodeURIComponent(
      directory
    )}&relPath=${encodeURIComponent(trimmed)}`;
  }, [src, directory]);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    return (
      <span className="my-4 flex items-center gap-3 rounded-xl border border-dashed border-folix-border bg-folix-bg/70 px-4 py-3 text-[13px] text-folix-text-secondary">
        <ImageOff size={18} className="shrink-0 text-folix-text-muted" />
        <span className="min-w-0">
          <span className="block font-medium text-folix-text">
            Não foi possível carregar a imagem
          </span>
          <span className="block truncate text-[12px] text-folix-text-muted">
            {alt ? `${alt} — ` : ''}
            {src || 'Caminho não especificado'}
          </span>
        </span>
      </span>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt || ''}
      title={title}
      loading="lazy"
      onError={() => setHasError(true)}
      onClick={() => onImageClick(resolvedSrc, alt)}
      className="cursor-zoom-in transition-transform duration-150 hover:scale-[1.005]"
    />
  );
}

interface MemoizedMarkdownProps {
  content: string;
  directory: string;
  onAnchorClick: (anchorId: string) => void;
  onOpenRelativeLink: (relPath: string) => void;
  onOpenExternalError: (message: string) => void;
  onImageClick: (src: string, alt?: string) => void;
}

const MemoizedMarkdownContent = memo(function MemoizedMarkdownContent({
  content,
  directory,
  onAnchorClick,
  onOpenRelativeLink,
  onOpenExternalError,
  onImageClick,
}: MemoizedMarkdownProps) {
  const components: Components = useMemo(
    () => ({
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      table: ({ children }) => (
        <div className="folix-table-wrap">
          <table>{children}</table>
        </div>
      ),
      blockquote: ({ children }) => {
        const alert = parseGitHubAlert(children);
        if (alert && CALLOUT_CONFIG[alert.type]) {
          const cfg = CALLOUT_CONFIG[alert.type];
          const Icon = cfg.icon;
          return (
            <div
              className={cn(
                'folix-callout my-5 rounded-xl border px-4 py-3.5',
                cfg.containerClass
              )}
            >
              <div
                className={cn(
                  'mb-1.5 flex items-center gap-2 text-[13px] font-semibold',
                  cfg.titleClass
                )}
              >
                <Icon size={15} />
                <span>{cfg.label}</span>
              </div>
              <div className="text-[0.95em] text-folix-text-secondary [&>p:last-child]:mb-0">
                {alert.content}
              </div>
            </div>
          );
        }
        return <blockquote>{children}</blockquote>;
      },
      img: ({ src, alt, title }) => (
        <MarkdownImage
          src={src}
          alt={alt}
          title={title}
          directory={directory}
          onImageClick={onImageClick}
        />
      ),
      a: ({ href, children }) => {
        if (!href) {
          return <span>{children}</span>;
        }

        const isAnchor = href.startsWith('#');
        const isExternal =
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('mailto:');
        const isRelativeMd = /\.(md|markdown|mdown|mkd)(#.*)?$/i.test(href);

        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              if (isAnchor) {
                onAnchorClick(decodeURIComponent(href.slice(1)));
              } else if (isExternal) {
                window.folixAPI.openExternal(href).then((res) => {
                  if (!res.ok && res.error) {
                    onOpenExternalError(res.error);
                  }
                });
              } else if (isRelativeMd) {
                onOpenRelativeLink(href);
              }
            }}
            title={
              isExternal
                ? `Abrir no navegador padrão: ${href}`
                : isAnchor
                ? 'Ir para a seção'
                : href
            }
          >
            {children}
            {isExternal && (
              <ExternalLink
                size={12}
                className="no-print ml-1 inline-block -translate-y-[1px] opacity-65"
                aria-hidden="true"
              />
            )}
          </a>
        );
      },
    }),
    [
      directory,
      onAnchorClick,
      onOpenRelativeLink,
      onOpenExternalError,
      onImageClick,
    ]
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        [rehypeSanitize, folixSanitizeSchema],
        rehypeSlug,
        [rehypeHighlight, { detect: true, ignoreMissing: true }],
      ]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
});

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

export function MarkdownViewer({
  documentTab,
  settings,
  tocItems,
  scrollContainerRef,
  articleRef,
  getSavedScrollTop,
  onSaveScrollTop,
  onActiveHeadingChange,
  onConsumePendingAnchor,
  onOpenRelativeLink,
  onOpenExternalError,
  onImageClick,
}: MarkdownViewerProps) {
  const stats = useMemo(
    () => computeReadingStats(documentTab.content),
    [documentTab.content]
  );

  const scrollToHeading = useCallback(
    (rawId: string) => {
      const container = scrollContainerRef.current;
      const article = articleRef.current;
      if (!container || !article) return;

      const headings = Array.from(
        article.querySelectorAll('h1, h2, h3, h4, h5, h6')
      ) as HTMLElement[];

      const normalizedTarget = rawId.toLowerCase();
      const target =
        headings.find((el) => el.id === rawId) ||
        headings.find((el) => el.id.toLowerCase() === normalizedTarget);

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onActiveHeadingChange(target.id);
      }
    },
    [scrollContainerRef, articleRef, onActiveHeadingChange]
  );

  // Restore scroll position or jump to pending anchor on tab switch
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (documentTab.pendingAnchor) {
      const anchor = documentTab.pendingAnchor;
      const timer = window.setTimeout(() => {
        scrollToHeading(anchor);
        onConsumePendingAnchor(documentTab.id);
      }, 60);
      return () => window.clearTimeout(timer);
    }

    container.scrollTop = getSavedScrollTop(documentTab.id);
  }, [
    documentTab.id,
    documentTab.pendingAnchor,
    scrollContainerRef,
    getSavedScrollTop,
    scrollToHeading,
    onConsumePendingAnchor,
  ]);

  // Update active TOC heading on scroll (scroll-spy)
  const updateActiveHeading = useCallback(() => {
    const container = scrollContainerRef.current;
    const article = articleRef.current;
    if (!container || !article) return;

    onSaveScrollTop(documentTab.id, container.scrollTop);

    if (tocItems.length === 0) {
      onActiveHeadingChange(null);
      return;
    }

    const headings = Array.from(
      article.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ) as HTMLElement[];

    if (headings.length === 0) return;

    const containerTop = container.getBoundingClientRect().top;
    let currentActive = headings[0].id;

    for (const heading of headings) {
      const offsetTop = heading.getBoundingClientRect().top - containerTop;
      if (offsetTop <= 110) {
        currentActive = heading.id;
      } else {
        break;
      }
    }

    onActiveHeadingChange(currentActive);
  }, [
    scrollContainerRef,
    articleRef,
    documentTab.id,
    tocItems.length,
    onActiveHeadingChange,
    onSaveScrollTop,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(updateActiveHeading, 80);
    return () => window.clearTimeout(timer);
  }, [documentTab.id, documentTab.content, updateActiveHeading]);

  const isEmptyDocument = documentTab.content.trim().length === 0;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={updateActiveHeading}
      className="folix-print-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-9"
    >
      <div
        key={`${documentTab.id}:${documentTab.updatedAt}`}
        className={cn(
          'folix-print-sheet folix-doc-reveal mx-auto w-full rounded-2xl border border-folix-border bg-folix-surface px-7 py-9 shadow-folix-doc transition-all duration-200 sm:px-12 sm:py-12',
          PAGE_WIDTH_CLASSES[settings.pageWidth]
        )}
      >
        {/* Subtle editorial document metadata bar */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-folix-border-subtle pb-4 text-[12px] text-folix-text-muted">
          <div className="flex items-center gap-2 font-medium text-folix-text-secondary">
            <FileText size={13.5} className="text-folix-accent" />
            <span>{documentTab.fileName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {!isEmptyDocument && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12.5} />
                  {stats.minutes} min de leitura ({stats.words.toLocaleString('pt-BR')} palavras)
                </span>
                <span>{formatBytes(documentTab.size)}</span>
              </>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar size={12.5} />
              {formatFullDate(documentTab.updatedAt)}
            </span>
          </div>
        </div>

        {/* Rendered Markdown or Empty State */}
        {isEmptyDocument ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-folix-bg text-folix-text-muted">
              <FileText size={22} />
            </div>
            <h2 className="text-[17px] font-semibold text-folix-text">
              Documento vazio
            </h2>
            <p className="mt-1.5 max-w-[360px] text-[13.5px] leading-relaxed text-folix-text-secondary">
              O arquivo <span className="font-medium">{documentTab.fileName}</span>{' '}
              não possui conteúdo textual para exibir no momento.
            </p>
          </div>
        ) : (
          <article
            key={`${documentTab.id}:${documentTab.updatedAt}`}
            ref={articleRef}
            className="folix-prose"
            style={
              {
                '--folix-doc-font-scale': settings.fontSize / 100,
                '--folix-doc-font-family': FONT_FAMILY_VARS[settings.fontFamily],
              } as React.CSSProperties
            }
          >
            <MemoizedMarkdownContent
              content={documentTab.content}
              directory={documentTab.directory}
              onAnchorClick={scrollToHeading}
              onOpenRelativeLink={onOpenRelativeLink}
              onOpenExternalError={onOpenExternalError}
              onImageClick={onImageClick}
            />
          </article>
        )}
      </div>
    </div>
  );
}
