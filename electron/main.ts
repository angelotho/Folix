import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
  nativeTheme,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupAutoUpdater } from './updater';

const ALLOWED_MARKDOWN_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.mdown',
  '.mkd',
  '.txt',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.avif',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'folix-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let isForceClosingWindow = false;
const openedDocumentDirs = new Set<string>();
const pendingInitialFiles: string[] = [];

type FileEncoding = 'utf8' | 'utf8-bom' | 'utf16le';
type LineEnding = '\r\n' | '\n';

interface FileDataPayload {
  filePath: string;
  fileName: string;
  directory: string;
  content: string;
  encoding?: FileEncoding;
  lineEnding?: LineEnding;
  size: number;
  updatedAt: string;
}

type FileReadResponse =
  | { ok: true; data: FileDataPayload }
  | { ok: false; error: string };

interface FileSaveRequest {
  filePath: string;
  content: string;
  encoding?: FileEncoding;
  lineEnding?: LineEnding;
  expectedUpdatedAt?: string;
  forceOverwrite?: boolean;
}

type FileSaveResponse =
  | { ok: true; data: FileDataPayload }
  | {
      ok: false;
      error: string;
      conflict?: boolean;
      diskUpdatedAt?: string;
      cancelled?: boolean;
    };

function isSupportedMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_MARKDOWN_EXTENSIONS.has(ext);
}

function extractFileArgs(argv: string[]): string[] {
  const startIndex = app.isPackaged ? 1 : 2;
  const results: string[] = [];

  for (let i = startIndex; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg || arg.startsWith('-')) continue;
    const resolved = path.resolve(arg);
    if (isSupportedMarkdownPath(resolved) && fs.existsSync(resolved)) {
      results.push(resolved);
    }
  }
  return results;
}

function translateFsError(err: unknown, filePath: string): string {
  const code = (err as NodeJS.ErrnoException)?.code;
  const fileName = path.basename(filePath);

  switch (code) {
    case 'ENOENT':
      return `O arquivo "${fileName}" não foi encontrado. Ele pode ter sido movido, renomeado ou excluído.`;
    case 'EACCES':
    case 'EPERM':
      return `Permissão negada ao tentar ler "${fileName}". Verifique as permissões do arquivo no Windows.`;
    case 'EISDIR':
      return `O caminho "${fileName}" refere-se a uma pasta, não a um arquivo Markdown.`;
    case 'EBUSY':
      return `O arquivo "${fileName}" está bloqueado por outro programa no momento.`;
    default:
      return `Não foi possível abrir o arquivo "${fileName}". Verifique se ele é um documento Markdown válido.`;
  }
}

async function readMarkdownFile(rawPath: string): Promise<FileReadResponse> {
  if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
    return { ok: false, error: 'O caminho do arquivo informado é inválido.' };
  }

  const normalizedPath = path.resolve(rawPath.trim());

  if (!isSupportedMarkdownPath(normalizedPath)) {
    return {
      ok: false,
      error:
        'Formato não suportado. O Folix abre arquivos Markdown (.md, .markdown, .mdown, .mkd) e texto simples (.txt).',
    };
  }

  try {
    const stat = await fs.promises.stat(normalizedPath);
    if (!stat.isFile()) {
      return {
        ok: false,
        error: 'O item selecionado não é um arquivo válido.',
      };
    }

    if (stat.size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error:
          'Este arquivo excede o limite de 25 MB suportado para leitura segura e fluida.',
      };
    }

    const buffer = await fs.promises.readFile(normalizedPath);

    // Detect binary payload (null bytes outside UTF-16 BOM)
    const sampleLength = Math.min(buffer.length, 4096);
    const hasUtf16Bom =
      buffer.length >= 2 &&
      ((buffer[0] === 0xff && buffer[1] === 0xfe) ||
        (buffer[0] === 0xfe && buffer[1] === 0xff));

    if (!hasUtf16Bom) {
      for (let i = 0; i < sampleLength; i++) {
        if (buffer[i] === 0) {
          return {
            ok: false,
            error: `O arquivo "${path.basename(
              normalizedPath
            )}" parece conter dados binários e não pode ser exibido como Markdown.`,
          };
        }
      }
    }

    let content: string;
    let encoding: FileEncoding = 'utf8';
    const hasUtf8Bom =
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf;

    if (hasUtf16Bom && buffer[0] === 0xff && buffer[1] === 0xfe) {
      encoding = 'utf16le';
      content = buffer.subarray(2).toString('utf16le');
    } else {
      content = buffer.toString('utf8');
      if (hasUtf8Bom || content.charCodeAt(0) === 0xfeff) {
        encoding = 'utf8-bom';
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }
      }
    }

    const lineEnding: LineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const directory = path.dirname(normalizedPath);
    openedDocumentDirs.add(path.resolve(directory));

    return {
      ok: true,
      data: {
        filePath: normalizedPath,
        fileName: path.basename(normalizedPath),
        directory,
        content,
        encoding,
        lineEnding,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, error: translateFsError(err, normalizedPath) };
  }
}

function translateWriteError(err: unknown, filePath: string): string {
  const code = (err as NodeJS.ErrnoException)?.code;
  const fileName = path.basename(filePath);

  switch (code) {
    case 'EACCES':
    case 'EPERM':
    case 'EROFS':
      return `Não foi possível salvar "${fileName}". O arquivo ou a pasta é somente leitura ou não possui permissão de escrita.`;
    case 'EBUSY':
      return `O arquivo "${fileName}" está aberto ou bloqueado por outro programa no momento.`;
    case 'ENOSPC':
      return `Não há espaço suficiente em disco para salvar "${fileName}".`;
    case 'ENOENT':
      return `A pasta de destino de "${fileName}" não existe mais. Use "Salvar como" para escolher outro local.`;
    default:
      return `Não foi possível salvar "${fileName}". Verifique as permissões e tente novamente.`;
  }
}

async function writeMarkdownFileSafe(
  options: FileSaveRequest
): Promise<FileSaveResponse> {
  if (!options || typeof options.filePath !== 'string' || options.filePath.trim().length === 0) {
    return { ok: false, error: 'Caminho de destino inválido para salvamento.' };
  }

  const normalizedPath = path.resolve(options.filePath.trim());
  const resolvedDir = path.resolve(path.dirname(normalizedPath));

  if (!isSupportedMarkdownPath(normalizedPath)) {
    return {
      ok: false,
      error:
        'Extensão não suportada para salvamento. Utilize .md, .markdown, .mdown, .mkd ou .txt.',
    };
  }

  if (!openedDocumentDirs.has(resolvedDir)) {
    return {
      ok: false,
      error: 'Diretório não autorizado para gravação direta. Utilize "Salvar como".',
    };
  }

  const encoding: FileEncoding = options.encoding || 'utf8';
  const lineEnding: LineEnding = options.lineEnding || '\n';
  const rawContent = typeof options.content === 'string' ? options.content : '';

  try {
    let existingStat: fs.Stats | null = null;
    try {
      existingStat = await fs.promises.stat(normalizedPath);
    } catch (statErr) {
      if ((statErr as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw statErr;
      }
    }

    if (
      existingStat &&
      !options.forceOverwrite &&
      options.expectedUpdatedAt
    ) {
      const expectedTime = new Date(options.expectedUpdatedAt).getTime();
      const diskTime = existingStat.mtime.getTime();
      if (
        !Number.isNaN(expectedTime) &&
        Math.abs(diskTime - expectedTime) > 1500
      ) {
        return {
          ok: false,
          conflict: true,
          diskUpdatedAt: existingStat.mtime.toISOString(),
          error:
            'Este arquivo foi modificado por outro programa fora do Folix desde a última leitura ou salvamento.',
        };
      }
    }

    const normalizedText =
      lineEnding === '\r\n'
        ? rawContent.replace(/\r?\n/g, '\r\n')
        : rawContent.replace(/\r\n/g, '\n');

    let buffer: Buffer;
    if (encoding === 'utf16le') {
      buffer = Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from(normalizedText, 'utf16le'),
      ]);
    } else if (encoding === 'utf8-bom') {
      buffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(normalizedText, 'utf8'),
      ]);
    } else {
      buffer = Buffer.from(normalizedText, 'utf8');
    }

    const tempPath = `${normalizedPath}.folix-${process.pid}-${Date.now()}.tmp`;
    let wroteViaRename = false;

    try {
      await fs.promises.writeFile(tempPath, buffer);
      await fs.promises.rename(tempPath, normalizedPath);
      wroteViaRename = true;
    } catch (atomicErr) {
      // Remove temporary file if still present
      await fs.promises.unlink(tempPath).catch(() => undefined);

      // On Windows, OneDrive/ACL/in-use locks can reject rename; try direct write fallback
      if (!wroteViaRename) {
        const errCode = (atomicErr as NodeJS.ErrnoException)?.code;
        if (errCode === 'ENOENT' || errCode === 'ENOSPC') {
          throw atomicErr;
        }
        await fs.promises.writeFile(normalizedPath, buffer);
      }
    }

    const newStat = await fs.promises.stat(normalizedPath);

    return {
      ok: true,
      data: {
        filePath: normalizedPath,
        fileName: path.basename(normalizedPath),
        directory: path.dirname(normalizedPath),
        content: normalizedText,
        encoding,
        lineEnding,
        size: newStat.size,
        updatedAt: newStat.mtime.toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, error: translateWriteError(err, normalizedPath) };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type ThemePreference = 'light' | 'dark' | 'system';

function getThemePreferencePath(): string {
  return path.join(app.getPath('userData'), 'folix-theme.json');
}

function loadSavedThemePreference(): ThemePreference {
  try {
    const raw = fs.readFileSync(getThemePreferencePath(), 'utf8');
    const parsed = JSON.parse(raw) as { theme?: string };
    if (
      parsed.theme === 'light' ||
      parsed.theme === 'dark' ||
      parsed.theme === 'system'
    ) {
      return parsed.theme;
    }
  } catch {
    // Fallback to system when preference file does not exist yet
  }
  return 'system';
}

function saveThemePreference(theme: ThemePreference): void {
  void fs.promises
    .writeFile(getThemePreferencePath(), JSON.stringify({ theme }), 'utf8')
    .catch(() => {
      // Ignore persistence write error gracefully
    });
}

function resolveWindowBackgroundColor(theme: ThemePreference): string {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && nativeTheme.shouldUseDarkColors);
  return isDark ? '#0B0C10' : '#F4F2ED';
}

let bgColorUpdateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWindowBackgroundSync(theme: ThemePreference): void {
  if (bgColorUpdateTimer !== null) {
    clearTimeout(bgColorUpdateTimer);
  }
  bgColorUpdateTimer = setTimeout(() => {
    bgColorUpdateTimer = null;
    mainWindow?.setBackgroundColor(resolveWindowBackgroundColor(theme));
  }, 280);
}

function createMainWindow(): BrowserWindow {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  const initialTheme = loadSavedThemePreference();

  const win = new BrowserWindow({
    width: 1340,
    height: 860,
    minWidth: 820,
    minHeight: 560,
    frame: false,
    show: false,
    backgroundColor: resolveWindowBackgroundColor(initialTheme),
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  win.once('ready-to-show', () => {
    // Sempre abre maximizado (janela ocupando a tela toda, com barra de tarefas visível)
    win.maximize();
    win.show();
  });

  win.on('maximize', () => {
    win.webContents.send('window:maximized-changed', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:maximized-changed', false);
  });

  win.on('close', (event) => {
    if (isForceClosingWindow) return;
    event.preventDefault();
    win.webContents.send('window:request-close');
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('will-navigate', (event, targetUrl) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl && targetUrl.startsWith(devServerUrl)) {
      return;
    }
    const prodIndexUrl = pathToFileURL(
      path.join(__dirname, '..', 'dist', 'index.html')
    ).toString();
    if (targetUrl === prodIndexUrl) {
      return;
    }
    event.preventDefault();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
}

// Identidade na barra de tarefas: o instalador cria os atalhos com o appId
// `com.folix.app`. A versão portátil usa um ID próprio para que o Windows não a
// agrupe sob o ícone fixado da versão instalada (o que fazia parecer que o app
// "voltava" de versão ao reabrir pelo ícone fixado).
app.setAppUserModelId(
  process.env.PORTABLE_EXECUTABLE_FILE ? 'com.folix.app.portable' : 'com.folix.app',
);

// Enforce single instance on Windows 11
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  pendingInitialFiles.push(...extractFileArgs(process.argv));

  app.on('second-instance', async (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const files = extractFileArgs(commandLine);
      for (const filePath of files) {
        const result = await readMarkdownFile(filePath);
        mainWindow.webContents.send('app:open-file-result', result);
      }
    }
  });

  app.whenReady().then(() => {
    // Secure local image protocol for relative Markdown images
    protocol.handle('folix-asset', async (request) => {
      try {
        const parsedUrl = new URL(request.url);
        const baseDir = parsedUrl.searchParams.get('baseDir');
        const relPathRaw = parsedUrl.searchParams.get('relPath');

        if (!baseDir || !relPathRaw) {
          return new Response('Parâmetros de imagem ausentes.', { status: 400 });
        }

        const resolvedBase = path.resolve(baseDir);
        if (!openedDocumentDirs.has(resolvedBase)) {
          return new Response('Acesso não autorizado ao diretório.', { status: 403 });
        }

        // Strip query/hash fragments from markdown image paths and decode URI sequences
        const cleanRel = decodeURIComponent(relPathRaw.split(/[?#]/)[0]);
        const targetPath = path.resolve(resolvedBase, cleanRel);

        // Allow assets in the document directory or up to 2 ancestor levels (e.g. ../assets/img.png)
        const allowedScopeRoot = path.resolve(resolvedBase, '..', '..');
        const relToScope = path.relative(allowedScopeRoot, targetPath);
        if (relToScope.startsWith('..') || path.isAbsolute(relToScope)) {
          return new Response('Caminho fora do escopo permitido do documento.', {
            status: 403,
          });
        }

        const ext = path.extname(targetPath).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
          return new Response('Tipo de arquivo de imagem não permitido.', {
            status: 403,
          });
        }

        const stat = await fs.promises.stat(targetPath);
        if (!stat.isFile()) {
          return new Response('Imagem não encontrada.', { status: 404 });
        }

        return net.fetch(pathToFileURL(targetPath).toString());
      } catch {
        return new Response('Imagem indisponível.', { status: 404 });
      }
    });

    mainWindow = createMainWindow();

    setupAutoUpdater({
      getWindow: () => mainWindow,
      allowForceClose: () => {
        isForceClosingWindow = true;
      },
    });

    // Window control IPC
    ipcMain.handle('window:minimize', () => {
      mainWindow?.minimize();
    });

    ipcMain.handle('window:toggle-maximize', () => {
      if (!mainWindow) return false;
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return false;
      }
      mainWindow.maximize();
      return true;
    });

    ipcMain.handle('window:close', () => {
      mainWindow?.close();
    });

    ipcMain.handle('window:confirm-close', () => {
      isForceClosingWindow = true;
      mainWindow?.close();
    });

    ipcMain.handle('window:is-maximized', () => {
      return mainWindow?.isMaximized() ?? false;
    });

    // Open file dialog
    ipcMain.handle('dialog:open-files', async () => {
      if (!mainWindow) return [];
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Abrir documento Markdown',
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Documentos Markdown',
            extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'],
          },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      });

      if (canceled || filePaths.length === 0) return [];
      return Promise.all(filePaths.map((p) => readMarkdownFile(p)));
    });

    // Read single file
    ipcMain.handle('file:read', async (_event, filePath: string) => {
      return readMarkdownFile(filePath);
    });

    // Safe atomic save to original file
    ipcMain.handle('file:save', async (_event, req: FileSaveRequest) => {
      return writeMarkdownFileSafe(req);
    });

    // Save As dialog
    ipcMain.handle(
      'file:save-as',
      async (
        _event,
        req: {
          defaultPath?: string;
          content: string;
          encoding?: FileEncoding;
          lineEnding?: LineEnding;
          isNewDocument?: boolean;
        }
      ): Promise<FileSaveResponse> => {
        if (!mainWindow) {
          return { ok: false, error: 'Janela principal indisponível.' };
        }

        const isNewDocument = req?.isNewDocument === true;

        // New documents have no location yet: suggest the user's Documents folder
        // with a sanitized file name (directory components are discarded).
        let defaultPath = req.defaultPath;
        if (isNewDocument) {
          const suggestedName = path.basename(
            typeof req.defaultPath === 'string' && req.defaultPath.trim()
              ? req.defaultPath.trim()
              : 'Sem título.md'
          );
          defaultPath = path.join(app.getPath('documents'), suggestedName);
        }

        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          title: isNewDocument ? 'Salvar novo documento' : 'Salvar documento como',
          defaultPath,
          filters: isNewDocument
            ? [
                {
                  name: 'Documento Markdown (*.md)',
                  extensions: ['md', 'markdown', 'mdown', 'mkd'],
                },
              ]
            : [
                {
                  name: 'Documentos Markdown (*.md)',
                  extensions: ['md', 'markdown', 'mdown', 'mkd'],
                },
                { name: 'Texto simples (*.txt)', extensions: ['txt'] },
              ],
        });

        if (canceled || !filePath) {
          return { ok: false, error: '', cancelled: true };
        }

        let targetPath: string;
        if (isNewDocument) {
          targetPath = isSupportedMarkdownPath(filePath) &&
            path.extname(filePath).toLowerCase() !== '.txt'
            ? filePath
            : `${filePath}.md`;
        } else {
          targetPath = path.extname(filePath) ? filePath : `${filePath}.md`;
        }
        openedDocumentDirs.add(path.resolve(path.dirname(targetPath)));

        return writeMarkdownFileSafe({
          filePath: targetPath,
          content: req.content,
          encoding: req.encoding,
          lineEnding: req.lineEnding,
          forceOverwrite: true,
        });
      }
    );

    // Open a relative markdown link inside an opened document
    ipcMain.handle(
      'file:open-relative',
      async (_event, baseDir: string, relPath: string) => {
        if (!baseDir || !relPath) {
          return { ok: false, error: 'Caminho relativo inválido.' };
        }
        const resolvedBase = path.resolve(baseDir);
        if (!openedDocumentDirs.has(resolvedBase)) {
          return { ok: false, error: 'Diretório de origem não autorizado.' };
        }

        const hashIndex = relPath.indexOf('#');
        const filePart = hashIndex >= 0 ? relPath.slice(0, hashIndex) : relPath;
        const anchor = hashIndex >= 0 ? relPath.slice(hashIndex + 1) : undefined;

        const cleanPath = decodeURIComponent(filePart.split('?')[0]);
        const resolvedTarget = path.resolve(resolvedBase, cleanPath);

        const allowedRoot = path.resolve(resolvedBase, '..', '..');
        const relToScope = path.relative(allowedRoot, resolvedTarget);
        if (relToScope.startsWith('..') || path.isAbsolute(relToScope)) {
          return {
            ok: false,
            error:
              'Por segurança, não é permitido navegar para diretórios fora da estrutura do documento.',
          };
        }

        const res = await readMarkdownFile(resolvedTarget);
        return { ...res, anchor };
      }
    );

    // Get initial files passed via command line / Explorer double-click
    ipcMain.handle('app:get-initial-files', async () => {
      if (pendingInitialFiles.length === 0) return [];
      const pathsToOpen = pendingInitialFiles.splice(0, pendingInitialFiles.length);
      return Promise.all(pathsToOpen.map((p) => readMarkdownFile(p)));
    });

    // Export current rendered document to vector PDF
    ipcMain.handle(
      'file:export-pdf',
      async (_event, options: { defaultFileName: string; documentTitle: string }) => {
        if (!mainWindow) {
          return { ok: false, error: 'Janela principal indisponível.' };
        }

        const baseName = (options.defaultFileName || 'documento')
          .replace(/\.(md|markdown|mdown|mkd|txt)$/i, '');

        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          title: 'Exportar documento para PDF',
          defaultPath: `${baseName}.pdf`,
          filters: [{ name: 'Documento PDF (*.pdf)', extensions: ['pdf'] }],
        });

        if (canceled || !filePath) {
          return { ok: false, cancelled: true };
        }

        try {
          const safeTitle = escapeHtml(options.documentTitle || baseName);
          const pdfData = await mainWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: {
              top: 0.7,
              bottom: 0.72,
              left: 0.6,
              right: 0.6,
            },
            displayHeaderFooter: true,
            headerTemplate: `
              <div style="width:100%;font-family:'Inter','Segoe UI',sans-serif;font-size:8px;color:#787772;padding:0 24px;display:flex;justify-content:space-between;align-items:center;">
                <span>${safeTitle}</span>
                <span></span>
              </div>
            `,
            footerTemplate: `
              <div style="width:100%;font-family:'Inter','Segoe UI',sans-serif;font-size:8px;color:#787772;padding:0 24px;display:flex;justify-content:space-between;align-items:center;">
                <span>Folix</span>
                <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
              </div>
            `,
          });

          await fs.promises.writeFile(filePath, pdfData);
          return { ok: true, filePath };
        } catch {
          return {
            ok: false,
            error:
              'Não foi possível gerar o arquivo PDF. Verifique se o destino possui permissão de escrita e não está aberto em outro aplicativo.',
          };
        }
      }
    );

    // Native Windows Print dialog
    ipcMain.handle('file:print', async () => {
      if (!mainWindow) return { ok: false, error: 'Janela indisponível.' };
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        mainWindow?.webContents.print(
          { silent: false, printBackground: true },
          (success, failureReason) => {
            if (success) {
              resolve({ ok: true });
            } else if (failureReason === 'cancelled') {
              resolve({ ok: false });
            } else {
              resolve({
                ok: false,
                error: 'Não foi possível concluir a impressão no Windows.',
              });
            }
          }
        );
      });
    });

    // Open external URL safely in Windows default browser
    ipcMain.handle('shell:open-external', async (_event, rawUrl: string) => {
      try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
          return {
            ok: false,
            error: 'Por segurança, apenas links HTTP, HTTPS ou e-mail podem ser abertos.',
          };
        }
        await shell.openExternal(parsed.toString());
        return { ok: true };
      } catch {
        return { ok: false, error: 'Endereço externo inválido.' };
      }
    });

    // Show file in Windows Explorer
    ipcMain.handle('shell:show-in-folder', (_event, filePath: string) => {
      if (typeof filePath === 'string' && fs.existsSync(filePath)) {
        shell.showItemInFolder(path.resolve(filePath));
        return true;
      }
      return false;
    });

    // System theme & preference sync
    ipcMain.handle('theme:get-system', () => {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    ipcMain.handle(
      'theme:set-preference',
      (_event, theme: ThemePreference) => {
        if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return;
        saveThemePreference(theme);
        scheduleWindowBackgroundSync(theme);
      }
    );

    nativeTheme.on('updated', () => {
      const currentPreference = loadSavedThemePreference();
      if (currentPreference === 'system') {
        scheduleWindowBackgroundSync('system');
      }
      mainWindow?.webContents.send(
        'theme:system-changed',
        nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
      );
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
