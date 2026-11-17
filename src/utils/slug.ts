import GithubSlugger from 'github-slugger';
import type { TocItem } from '../types/folix';

function stripMarkdownFormatting(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .replace(/\s+#+\s*$/, '')
    .trim();
}

export function extractTocFromMarkdown(markdown: string): TocItem[] {
  if (!markdown) return [];

  const slugger = new GithubSlugger();
  const lines = markdown.split(/\r?\n/);
  const items: TocItem[] = [];

  let inFence = false;
  let fenceChar = '';
  let fenceLength = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track fenced code blocks (``` or ~~~) so comments like `# python` aren't treated as headings
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceChar = marker[0];
        fenceLength = marker.length;
      } else if (marker[0] === fenceChar && marker.length >= fenceLength) {
        inFence = false;
        fenceChar = '';
        fenceLength = 0;
      }
      continue;
    }

    if (inFence) continue;

    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const rawText = headingMatch[2];
    const cleanText = stripMarkdownFormatting(rawText);
    if (!cleanText) continue;

    const id = slugger.slug(cleanText);
    items.push({ id, text: cleanText, level });
  }

  return items;
}

export function getDocumentTitle(markdown: string, fallbackFileName: string): string {
  const toc = extractTocFromMarkdown(markdown);
  const firstH1 = toc.find((item) => item.level === 1);
  if (firstH1) return firstH1.text;
  return fallbackFileName.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '');
}

