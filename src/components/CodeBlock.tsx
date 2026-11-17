import React, { useState, isValidElement } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { cn } from '../utils/format';

interface CodeBlockProps {
  children?: React.ReactNode;
}

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join('');
  }
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextContent(node.props.children);
  }
  return '';
}

function extractLanguage(node: React.ReactNode): string {
  if (isValidElement<{ className?: string }>(node)) {
    const cls = node.props.className || '';
    const match = cls.match(/language-([a-zA-Z0-9_+-]+)/);
    if (match) return match[1];
  }
  return '';
}

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript JSX',
  ts: 'TypeScript',
  tsx: 'TypeScript TSX',
  py: 'Python',
  python: 'Python',
  rs: 'Rust',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  go: 'Go',
  sh: 'Shell',
  bash: 'Bash',
  ps1: 'PowerShell',
  powershell: 'PowerShell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  sql: 'SQL',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  md: 'Markdown',
  markdown: 'Markdown',
  dockerfile: 'Dockerfile',
  diff: 'Diff',
};

export function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const rawLanguage = extractLanguage(children);
  const displayLanguage =
    LANGUAGE_LABELS[rawLanguage.toLowerCase()] ||
    (rawLanguage ? rawLanguage.toUpperCase() : 'Código');

  const handleCopy = async () => {
    const codeText = extractTextContent(children).replace(/\n$/, '');
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback via temporary textarea if clipboard permission fails
      const ta = document.createElement('textarea');
      ta.value = codeText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="folix-code-container group my-5 overflow-hidden rounded-xl border border-folix-border bg-[var(--folix-code-bg)] shadow-folix-sm">
      <div className="no-search-highlight flex items-center justify-between border-b border-folix-border bg-[var(--folix-code-header)] px-3.5 py-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-folix-text-secondary uppercase">
          <Terminal size={13} className="text-folix-accent opacity-80" />
          <span>{displayLanguage}</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'no-print inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
            copied
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text'
          )}
          aria-label="Copiar código"
        >
          {copied ? (
            <>
              <Check size={12} />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      <pre className="folix-code-pre">{children}</pre>
    </div>
  );
}

