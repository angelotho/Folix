import {
  Clock,
  FileText,
  FolderOpen,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { RecentFile, ResolvedTheme } from '../types/folix';
import { formatRelativeDate } from '../utils/format';
import { FolixLogo } from './FolixLogo';

interface WelcomeScreenProps {
  recentFiles: RecentFile[];
  resolvedTheme: ResolvedTheme;
  onOpenFiles: () => void;
  onOpenRecent: (filePath: string) => void;
  onRemoveRecent: (filePath: string) => void;
  onClearRecent: () => void;
}

const SHORTCUTS = [
  { keys: 'Ctrl + O', label: 'Abrir arquivo' },
  { keys: 'Ctrl + ,', label: 'Temas e configurações' },
  { keys: 'Ctrl + F', label: 'Pesquisar' },
  { keys: 'Ctrl + B', label: 'Sumário lateral' },
  { keys: 'Ctrl + E', label: 'Exportar PDF' },
  { keys: 'F11', label: 'Modo imersivo' },
];

export function WelcomeScreen({
  recentFiles,
  resolvedTheme,
  onOpenFiles,
  onOpenRecent,
  onRemoveRecent,
  onClearRecent,
}: WelcomeScreenProps) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 animate-fade-in">
      {/* Subtle ambient radial gradient */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-1/4 h-[460px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, var(--folix-accent-soft) 0%, transparent 72%)',
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-[740px] flex-col items-center">
        {/* Identity Hero */}
        <div className="mb-3 flex items-center gap-2 rounded-full border border-folix-border bg-folix-surface px-3 py-1 text-[11.5px] font-medium text-folix-text-secondary shadow-folix-sm">
          <Sparkles size={12} className="text-folix-gold" />
          <span>Folix 1.0.6 • Leitor Editorial Offline</span>
        </div>

        <div className="mt-2 flex flex-col items-center text-center">
          <FolixLogo
            variant="full"
            resolvedTheme={resolvedTheme}
            size={62}
            className="mb-3"
          />
          <p className="mt-1 max-w-[490px] text-[15px] leading-relaxed text-folix-text-secondary">
            Transforme arquivos Markdown em documentos elegantes, organizados e
            prontos para leitura ou exportação profissional em PDF.
          </p>
        </div>

        {/* Primary Action & Drop Zone Card */}
        <div className="mt-8 w-full rounded-2xl border border-folix-border bg-folix-surface p-7 shadow-folix-doc transition-all hover:border-folix-accent/40">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex items-start gap-4 text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-folix-accent-soft text-folix-accent">
                <Upload size={22} />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-folix-text">
                  Abra um documento Markdown
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-folix-text-secondary">
                  Selecione pelo Explorador do Windows ou arraste e solte um ou
                  mais arquivos <span className="font-mono text-[12px]">.md</span>{' '}
                  em qualquer lugar desta janela.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenFiles}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-folix-accent px-5 text-[13.5px] font-semibold text-white shadow-folix-sm transition-all hover:bg-folix-accent-hover active:scale-[0.99]"
            >
              <FolderOpen size={16} />
              <span>Abrir arquivo</span>
            </button>
          </div>
        </div>

        {/* Recent Documents */}
        {recentFiles.length > 0 && (
          <section
            className="mt-7 w-full"
            aria-label="Documentos abertos recentemente"
          >
            <div className="mb-2.5 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-folix-text-muted">
                <Clock size={13} />
                <span>Documentos recentes</span>
              </div>
              <button
                type="button"
                onClick={onClearRecent}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
              >
                <Trash2 size={11.5} />
                <span>Limpar histórico</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recentFiles.map((file) => (
                <div
                  key={file.filePath}
                  onClick={() => onOpenRecent(file.filePath)}
                  className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-folix-border bg-folix-surface px-3.5 py-2.5 shadow-folix-sm transition-all hover:border-folix-accent/45 hover:bg-folix-surface-elevated"
                  title={file.filePath}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenRecent(file.filePath);
                    }
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-folix-bg text-folix-accent">
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-folix-text">
                      {file.fileName}
                    </p>
                    <p className="truncate text-[11.5px] text-folix-text-muted">
                      {formatRelativeDate(file.lastOpenedAt)} • {file.directory}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecent(file.filePath);
                    }}
                    className="rounded-md p-1 text-folix-text-muted opacity-0 transition-all hover:bg-[var(--folix-surface-hover)] hover:text-folix-text group-hover:opacity-100"
                    aria-label={`Remover ${file.fileName} dos recentes`}
                    title="Remover da lista"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Discrete Keyboard Shortcuts */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-folix-text-muted">
          {SHORTCUTS.map((item) => (
            <div key={item.keys} className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-folix-border bg-folix-surface px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-folix-text-secondary shadow-folix-sm">
                {item.keys}
              </kbd>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

