import { useEffect } from 'react';
import {
  AlertTriangle,
  FileWarning,
  FolderDown,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { formatFullDate } from '../utils/format';

export type PendingConfirmAction =
  | {
      kind: 'unsaved';
      reason: 'close-tab' | 'reload-file' | 'close-app';
      fileNames: string[];
      targetTabId?: string;
    }
  | {
      kind: 'conflict';
      tabId: string;
      fileName: string;
      diskUpdatedAt?: string;
    };

interface UnsavedChangesModalProps {
  prompt: PendingConfirmAction | null;
  isBusy: boolean;
  onCancel: () => void;
  onSaveAndContinue: () => void;
  onDiscardAndContinue: () => void;
  onOverwriteConflict: () => void;
  onSaveCopyConflict: () => void;
}

export function UnsavedChangesModal({
  prompt,
  isBusy,
  onCancel,
  onSaveAndContinue,
  onDiscardAndContinue,
  onOverwriteConflict,
  onSaveCopyConflict,
}: UnsavedChangesModalProps) {
  useEffect(() => {
    if (!prompt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, isBusy, onCancel]);

  if (!prompt) return null;

  if (prompt.kind === 'conflict') {
    return (
      <div
        className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[var(--folix-modal-backdrop)] p-4 backdrop-blur-sm animate-fade-in"
        onClick={() => !isBusy && onCancel()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="folix-conflict-title"
      >
        <div
          className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-folix-border bg-folix-surface shadow-folix-lg animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-folix-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <FileWarning size={19} />
              </div>
              <div>
                <h2
                  id="folix-conflict-title"
                  className="text-[15.5px] font-semibold text-folix-text"
                >
                  Arquivo modificado externamente
                </h2>
                <p className="mt-0.5 text-[12px] text-folix-text-secondary">
                  {prompt.fileName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="rounded-lg p-1.5 text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text disabled:opacity-50"
              aria-label="Cancelar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-4 text-[13.5px] leading-relaxed text-folix-text-secondary">
            <p>
              O arquivo <span className="font-semibold text-folix-text">{prompt.fileName}</span>{' '}
              foi alterado no disco por outro programa depois que você o abriu no Folix
              {prompt.diskUpdatedAt
                ? ` (${formatFullDate(prompt.diskUpdatedAt)})`
                : ''}
              .
            </p>
            <p className="mt-2.5 text-[12.5px] text-folix-text-muted">
              Escolha se deseja salvar suas alterações em uma nova cópia para evitar
              perder o conteúdo externo, ou sobrescrever o arquivo atual.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-folix-border bg-folix-surface-elevated px-6 py-3.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="inline-flex h-9 items-center rounded-xl border border-folix-border bg-folix-surface px-3.5 text-[12.5px] font-medium text-folix-text-secondary transition-colors hover:text-folix-text disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onOverwriteConflict}
              disabled={isBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/12 px-3.5 text-[12.5px] font-semibold text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              <Save size={13.5} />
              <span>Sobrescrever arquivo</span>
            </button>
            <button
              type="button"
              onClick={onSaveCopyConflict}
              disabled={isBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-folix-accent px-4 text-[12.5px] font-semibold text-white shadow-folix-sm transition-colors hover:bg-folix-accent-hover disabled:opacity-50"
            >
              <FolderDown size={13.5} />
              <span>Salvar como cópia</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMultiple = prompt.fileNames.length > 1;
  const titleText =
    prompt.reason === 'reload-file'
      ? 'Recarregar arquivo modificado?'
      : isMultiple
      ? 'Existem documentos com alterações não salvas'
      : 'Deseja salvar as alterações?';

  const bodyDescription =
    prompt.reason === 'reload-file'
      ? `O documento "${prompt.fileNames[0]}" possui edições não salvas no Folix. Recarregar do disco substituirá o conteúdo atual em edição.`
      : prompt.reason === 'close-app'
      ? isMultiple
        ? `Existem ${prompt.fileNames.length} documentos abertos com alterações não salvas. Se sair sem salvar, essas modificações serão perdidas.`
        : `O documento "${prompt.fileNames[0]}" possui alterações que ainda não foram salvas no disco.`
      : `O documento "${prompt.fileNames[0]}" possui alterações que ainda não foram salvas no disco.`;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[var(--folix-modal-backdrop)] p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !isBusy && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="folix-unsaved-title"
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-folix-border bg-folix-surface shadow-folix-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-folix-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={19} />
            </div>
            <div>
              <h2
                id="folix-unsaved-title"
                className="text-[15.5px] font-semibold text-folix-text"
              >
                {titleText}
              </h2>
              {!isMultiple && (
                <p className="mt-0.5 text-[12px] text-folix-text-secondary">
                  {prompt.fileNames[0]}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg p-1.5 text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text disabled:opacity-50"
            aria-label="Cancelar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 text-[13.5px] leading-relaxed text-folix-text-secondary">
          <p>{bodyDescription}</p>

          {isMultiple && (
            <ul className="mt-3 max-h-[120px] space-y-1 overflow-y-auto rounded-xl border border-folix-border-subtle bg-folix-bg/70 px-3.5 py-2.5 text-[12.5px] text-folix-text">
              {prompt.fileNames.map((name, i) => (
                <li key={`${name}-${i}`} className="truncate font-medium">
                  • {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-folix-border bg-folix-surface-elevated px-6 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="inline-flex h-9 items-center rounded-xl border border-folix-border bg-folix-surface px-3.5 text-[12.5px] font-medium text-folix-text-secondary transition-colors hover:text-folix-text disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscardAndContinue}
            disabled={isBusy}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 text-[12.5px] font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-500/18 disabled:opacity-50"
          >
            <Trash2 size={13.5} />
            <span>Descartar</span>
          </button>
          <button
            type="button"
            onClick={onSaveAndContinue}
            disabled={isBusy}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-folix-accent px-4 text-[12.5px] font-semibold text-white shadow-folix-sm transition-colors hover:bg-folix-accent-hover disabled:opacity-50"
          >
            <Save size={13.5} />
            <span>
              {isBusy
                ? 'Salvando...'
                : prompt.reason === 'reload-file'
                ? 'Salvar antes'
                : 'Salvar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

