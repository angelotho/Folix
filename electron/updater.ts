import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Verificação de atualizações via GitHub Releases.
 *
 * - Única chamada de rede do Folix: só acontece quando o renderer pede
 *   (`update:check`), e o renderer só pede se a opção estiver ligada.
 * - Versão instalada (NSIS): baixa sob demanda, confere o SHA-512 do
 *   `latest.yml` e instala em silêncio ao reiniciar ou ao fechar o app.
 * - Versão portátil: o executável não consegue se substituir, então apenas
 *   avisa e abre a página da release.
 */

const GITHUB_OWNER = 'angelotho';
const GITHUB_REPO = 'Folix';
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export type UpdateStatus =
  | { state: 'available'; version: string; canAutoInstall: boolean }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; version: string };

interface UpdaterOptions {
  getWindow: () => BrowserWindow | null;
  /** Libera o fechamento da janela sem passar pelo fluxo de confirmação do renderer. */
  allowForceClose: () => void;
}

const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);

export function setupAutoUpdater({ getWindow, allowForceClose }: UpdaterOptions): void {
  let availableVersion: string | null = null;
  let phase: 'idle' | 'checking' | 'downloading' | 'ready' = 'idle';
  let hasChecked = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = !isPortable;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = null;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  });

  const send = (status: UpdateStatus) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update:status', status);
    }
  };

  autoUpdater.on('update-available', (info) => {
    availableVersion = info.version;
    send({ state: 'available', version: info.version, canAutoInstall: !isPortable });
  });

  autoUpdater.on('download-progress', (progress) => {
    if (!availableVersion) return;
    send({
      state: 'downloading',
      version: availableVersion,
      percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    phase = 'ready';
    availableVersion = info.version;
    send({ state: 'ready', version: info.version });
  });

  autoUpdater.on('error', () => {
    // Falha na verificação (sem internet, GitHub fora do ar): silêncio total.
    // Falha no download: avisa para o usuário poder tentar de novo.
    if (phase === 'downloading' && availableVersion) {
      send({ state: 'error', version: availableVersion });
    }
    phase = 'idle';
  });

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged || hasChecked) return;
    hasChecked = true;
    phase = 'checking';
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // Tratado no evento 'error'
    } finally {
      if (phase === 'checking') phase = 'idle';
    }
  });

  ipcMain.handle('update:download', async () => {
    if (isPortable || !availableVersion || phase === 'downloading' || phase === 'ready') {
      return;
    }
    phase = 'downloading';
    send({ state: 'downloading', version: availableVersion, percent: 0 });
    try {
      await autoUpdater.downloadUpdate();
    } catch {
      // Tratado no evento 'error'
    }
  });

  ipcMain.handle('update:install', () => {
    if (phase !== 'ready') return;
    allowForceClose();
    // Silencioso e reabrindo o Folix ao terminar.
    autoUpdater.quitAndInstall(true, true);
  });

  ipcMain.handle('update:open-download-page', async () => {
    await shell.openExternal(RELEASES_URL);
  });
}
