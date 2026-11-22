import { ArrowDownToLine, RotateCw, X } from 'lucide-react';
import type { UpdateStatus } from '../types/folix';

interface UpdateNoticeProps {
  status: UpdateStatus;
  onDownload: () => void;
  onOpenDownloadPage: () => void;
  onInstallNow: () => void;
  onDismiss: () => void;
}

const actionClass =
  'h-6 shrink-0 rounded-md px-2 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folix-accent';
const primaryClass = `${actionClass} bg-folix-accent text-white hover:bg-folix-accent-hover`;
const secondaryClass = `${actionClass} text-folix-text-secondary hover:bg-[var(--folix-surface-hover)] hover:text-folix-text`;

/** Aviso compacto de atualização no canto inferior direito. */
export function UpdateNotice({
  status,
  onDownload,
  onOpenDownloadPage,
  onInstallNow,
  onDismiss,
}: UpdateNoticeProps) {
  let label: string;
  let actions: JSX.Element | null = null;

  switch (status.state) {
    case 'available':
      label = `Versão ${status.version} disponível`;
      actions = status.canAutoInstall ? (
        <button type="button" className={primaryClass} onClick={onDownload}>
          Atualizar
        </button>
      ) : (
        <button type="button" className={primaryClass} onClick={onOpenDownloadPage}>
          Baixar
        </button>
      );
      break;
    case 'downloading':
      label = `Baixando atualização… ${status.percent}%`;
      break;
    case 'ready':
      label = `Versão ${status.version} pronta`;
      actions = (
        <>
          <button type="button" className={primaryClass} onClick={onInstallNow}>
            Reiniciar
          </button>
          <button
            type="button"
            className={secondaryClass}
            onClick={onDismiss}
            title="A atualização será instalada quando você fechar o Folix"
          >
            Ao fechar
          </button>
        </>
      );
      break;
    case 'error':
      label = 'Não foi possível baixar';
      actions = (
        <button type="button" className={secondaryClass} onClick={onDownload}>
          <span className="inline-flex items-center gap-1">
            <RotateCw size={11} />
            Tentar de novo
          </span>
        </button>
      );
      break;
  }

  const showClose = status.state !== 'ready';

  return (
    <div
      className="no-print fixed bottom-4 right-4 z-40 motion-safe:animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center gap-2 overflow-hidden rounded-lg border border-folix-border bg-folix-surface py-1.5 pl-2.5 pr-1.5 shadow-folix-md">
        <ArrowDownToLine size={13} className="shrink-0 text-folix-accent" aria-hidden />
        <span className="whitespace-nowrap text-[12px] font-medium text-folix-text-secondary tabular-nums">
          {label}
        </span>
        {actions}
        {showClose && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
            aria-label={status.state === 'downloading' ? 'Ocultar' : 'Depois'}
            title={status.state === 'downloading' ? 'Ocultar' : 'Depois'}
          >
            <X size={12} />
          </button>
        )}
        {status.state === 'downloading' && (
          <span
            className="absolute bottom-0 left-0 h-[2px] bg-folix-accent transition-[width] duration-300 ease-out"
            style={{ width: `${status.percent}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
