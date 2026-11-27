import type { Paragraph, Root, RootContent } from 'mdast';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';

/*
 * Suporte a LaTeX (remark-math + rehype-katex) adaptado a documentos em pt-BR.
 *
 * O remark-math abre fórmula em qualquer `$`, então "R$ 10 e R$ 20" viraria
 * a fórmula " 10 e R". `protectLoneDollars` aplica regras no estilo Pandoc
 * antes do parse e escapa (`\$`) todo `$` simples que não forme um par válido:
 *   - o `$` de abertura precisa ser seguido de caractere não branco;
 *   - o `$` de fechamento precisa vir após caractere não branco e não pode
 *     ser seguido de dígito;
 *   - `$` precedido de símbolo monetário (R$, US$...) seguido de número é
 *     sempre literal.
 * Código (cercas ``` / ~~~ e `inline`) e blocos `$$` não são alterados.
 * Só caracteres são inseridos dentro das linhas: a numeração de linhas usada
 * pelo scrollSync permanece idêntica.
 */

const CURRENCY_BEFORE = /(?:^|[^\p{L}\p{N}])(?:R|US|U|A|C|NZ|HK|S)$/u;
const FENCE_PREFIX = /^\s*(?:>\s*)*/;

function isBlank(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isCurrencyDollar(line: string, index: number): boolean {
  return (
    CURRENCY_BEFORE.test(line.slice(Math.max(0, index - 3), index)) &&
    /^\s*\d/.test(line.slice(index + 1))
  );
}

/** Returns the index of a valid closing `$` for an opener at `start`, or -1. */
function findClosingDollar(line: string, start: number): number {
  for (let j = start + 1; j < line.length; j += 1) {
    const ch = line[j];
    if (ch === '\\') {
      j += 1;
      continue;
    }
    if (ch === '`') return -1;
    if (ch !== '$') continue;
    if (line[j + 1] === '$') return -1;
    if (!isBlank(line[j - 1]) && !isDigit(line[j + 1])) return j;
  }
  return -1;
}

function protectLine(line: string): string {
  if (!line.includes('$')) return line;

  let out = '';
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === '\\') {
      out += line.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (ch === '`') {
      let run = 1;
      while (line[i + run] === '`') run += 1;
      const fence = '`'.repeat(run);
      const close = line.indexOf(fence, i + run);
      if (close === -1) {
        out += fence;
        i += run;
      } else {
        out += line.slice(i, close + run);
        i = close + run;
      }
      continue;
    }

    if (ch === '$') {
      if (line[i + 1] === '$') {
        const close = line.indexOf('$$', i + 2);
        const end = close === -1 ? i + 2 : close + 2;
        out += line.slice(i, end);
        i = end;
        continue;
      }

      const opensMath = !isBlank(line[i + 1]) && !isCurrencyDollar(line, i);
      const close = opensMath ? findClosingDollar(line, i) : -1;
      if (close !== -1) {
        out += line.slice(i, close + 1);
        i = close + 1;
      } else {
        out += '\\$';
        i += 1;
      }
      continue;
    }

    out += ch;
    i += 1;
  }
  return out;
}

export function protectLoneDollars(source: string): string {
  if (!source.includes('$')) return source;

  const lines = source.split('\n');
  let codeFence: { char: string; length: number } | null = null;
  let inMathBlock = false;

  for (let n = 0; n < lines.length; n += 1) {
    const body = lines[n].replace(FENCE_PREFIX, '');

    if (codeFence) {
      const match = /^(`{3,}|~{3,})\s*$/.exec(body);
      if (
        match &&
        match[1][0] === codeFence.char &&
        match[1].length >= codeFence.length
      ) {
        codeFence = null;
      }
      continue;
    }

    const open = /^(`{3,}|~{3,})/.exec(body);
    if (open) {
      codeFence = { char: open[1][0], length: open[1].length };
      continue;
    }

    if (inMathBlock) {
      if (body.trimEnd().endsWith('$$')) inMathBlock = false;
      continue;
    }

    if (body.startsWith('$$') && !body.slice(2).includes('$$')) {
      inMathBlock = true;
      continue;
    }

    lines[n] = protectLine(lines[n]);
  }

  return lines.join('\n');
}

function displayMathNode(value: string, position: Paragraph['position']) {
  return {
    type: 'math',
    value,
    position,
    data: {
      hName: 'div',
      hProperties: { className: ['folix-math-block'] },
      hChildren: [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: ['language-math', 'math-display'] },
          children: [{ type: 'text', value }],
        },
      ],
    },
  } as unknown as RootContent;
}

/**
 * Must run after remark-math. Renders display math inside a positioned
 * `div.folix-math-block` (so scrollSync keeps its source lines after KaTeX
 * replaces the inner `code`) and promotes a paragraph made only of
 * `$$...$$` to display math, as most editors do.
 */
export function remarkFolixMath() {
  return (tree: Root, file: VFile) => {
    const source = String(file.value ?? '');

    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;

      if (node.type === 'math') {
        parent.children[index] = displayMathNode(node.value, node.position) as never;
        return;
      }

      if (node.type !== 'paragraph') return;
      const meaningful = node.children.filter(
        (child) => !(child.type === 'text' && child.value.trim() === '')
      );
      if (meaningful.length !== 1 || meaningful[0].type !== 'inlineMath') return;

      const math = meaningful[0];
      const offset = math.position?.start.offset;
      if (offset === undefined || !source.startsWith('$$', offset)) return;

      parent.children[index] = displayMathNode(math.value, node.position) as never;
    });
  };
}
