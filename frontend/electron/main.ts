import { app, BrowserWindow, shell, Menu, utilityProcess, dialog, ipcMain } from 'electron';
import type { UtilityProcess } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Switches de Chromium para prevenir congelamientos de repintado y pérdida de foco en Windows
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Definir __dirname manualmente para entornos de módulos ES (ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIN_CSC_PATH = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const WIN_DOTNET_DIR = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319';
const WIN_METADATA_DIR = 'C:\\Windows\\System32\\WinMetadata';

const REQUIRED_DOTNET_REFS = [
  'System.Runtime.dll',
  'System.Threading.Tasks.dll',
  'System.Runtime.InteropServices.WindowsRuntime.dll',
  'System.Runtime.WindowsRuntime.dll',
  'System.Runtime.WindowsRuntime.UI.Xaml.dll'
];

const REQUIRED_WINMD_REFS = [
  'Windows.Foundation.winmd',
  'Windows.Storage.winmd',
  'Windows.Data.winmd',
  'Windows.Graphics.winmd',
  'Windows.UI.winmd',
  'Windows.UI.Xaml.winmd'
];

let mainWindow: BrowserWindow | null = null;
let backendProcess: UtilityProcess | null = null;
let backendExitedEarly = false;
let backendLastError = '';
let activePrintProcess: ChildProcess | null = null;
let isNativePrintOpen = false;

interface PrintOptions {
  title?: string;
  landscape?: boolean;
}

function getPreloadPath(): string {
  const preloadMjs = path.join(__dirname, 'preload.mjs');
  return fs.existsSync(preloadMjs) ? preloadMjs : path.join(__dirname, 'preload.js');
}

const ELECTRON_LOG_MAX_BYTES = 2 * 1024 * 1024;

function getLogsDir(): string {
  return path.join(app.getPath('userData'), 'logs');
}

function sanitizeElectronLogText(texto: string): string {
  return String(texto || '')
    .replace(/postgres(?:ql)?:\/\/([^:\s/]+):([^@\s]+)@/gi, 'postgresql://***:***@')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(JWT_SECRET|DATABASE_URL)\s*=\s*([^\s"'`;]+)/gi, '$1=[REDACTED]')
    .replace(/(["']?(?:contrasena|password|token)["']?\s*:\s*)(["'])(?:\\.|(?!\2).)*\2/gi, '$1"[REDACTED]"');
}

function appendElectronLog(nivel: 'INFO' | 'WARN' | 'ERROR', origen: string, mensaje: string): void {
  try {
    const dir = getLogsDir();
    fs.mkdirSync(dir, { recursive: true });
    const logPath = path.join(dir, 'bikesystem.log');

    if (fs.existsSync(logPath) && fs.statSync(logPath).size >= ELECTRON_LOG_MAX_BYTES) {
      const rotated = path.join(dir, 'bikesystem.1.log');
      if (fs.existsSync(rotated)) {
        fs.rmSync(rotated, { force: true });
      }
      fs.renameSync(logPath, rotated);
    }

    const ts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());

    const msgLimpio = sanitizeElectronLogText(mensaje).replace(/\r?\n/g, ' \\n ').trim().slice(0, 2000);
    if (!msgLimpio) return;

    fs.appendFileSync(logPath, `[${ts}] [${nivel}] [${origen}] ${msgLimpio}\n`, 'utf8');
  } catch {
    // Nunca interrumpir la app de escritorio por un fallo al escribir el log
  }
}

process.on('uncaughtException', (err) => {
  appendElectronLog('ERROR', 'ELECTRON_MAIN', err?.stack || err?.message || String(err));
});

process.on('unhandledRejection', (reason) => {
  appendElectronLog(
    'ERROR',
    'ELECTRON_MAIN',
    reason instanceof Error ? reason.stack || reason.message : String(reason)
  );
});

function cleanupTempFiles(files: string[]) {
  setTimeout(() => {
    for (const filePath of files) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignorar si Windows aún retiene temporalmente el archivo
      }
    }
  }, 2500);
}

const WIN_PRINT_HELPER_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <maxversiontested Id="10.0.19041.0"/>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}" />
    </application>
  </compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
    </windowsSettings>
  </application>
</assembly>`;

const WIN_PRINT_HELPER_CS = `using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Data.Pdf;
using Windows.Foundation;
using Windows.Graphics.Printing;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Hosting;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Media.Imaging;
using Windows.UI.Xaml.Printing;

[ComImport]
[Guid("3cbcf1bf-2f76-4e9c-96ab-e84b37972554")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWindowXamlSourceNative {
    void AttachToWindow(IntPtr parentWnd);
    IntPtr WindowHandle { get; }
}

[ComImport]
[Guid("c5435a42-8d43-4e7b-a68a-ef311e392087")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPrintManagerInterop {
    IntPtr GetIids(out int iidCount, out IntPtr iids);
    IntPtr GetRuntimeClassName(out IntPtr className);
    IntPtr GetTrustLevel(out int trustLevel);
    PrintManager GetForWindow(IntPtr appWindow, [In] ref Guid riid);
    [return: MarshalAs(UnmanagedType.Interface)]
    IAsyncOperation<bool> ShowPrintUIForWindowAsync(IntPtr appWindow, [In] ref Guid riid);
}

static class WinRtAsync {
    public static Task<T> ToTask<T>(this IAsyncOperation<T> op) {
        var tcs = new TaskCompletionSource<T>();
        op.Completed = (info, status) => {
            if (status == AsyncStatus.Completed) tcs.TrySetResult(info.GetResults());
            else if (status == AsyncStatus.Error) tcs.TrySetException(info.ErrorCode ?? new Exception("WinRT error"));
            else tcs.TrySetCanceled();
        };
        return tcs.Task;
    }

    public static Task ToTask(this IAsyncAction act) {
        var tcs = new TaskCompletionSource<bool>();
        act.Completed = (info, status) => {
            if (status == AsyncStatus.Completed) tcs.TrySetResult(true);
            else if (status == AsyncStatus.Error) tcs.TrySetException(info.ErrorCode ?? new Exception("WinRT error"));
            else tcs.TrySetCanceled();
        };
        return tcs.Task;
    }
}

class Program {
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("kernel32.dll")]
    static extern IntPtr GetCurrentProcess();

    [DllImport("kernel32.dll")]
    static extern bool TerminateProcess(IntPtr hProcess, uint uExitCode);

    static PrintManager printManager;
    static PrintDocument printDoc;
    static IPrintDocumentSource printDocSource;
    static readonly List<Grid> pageGrids = new List<Grid>();
    static Canvas rootCanvas;
    static Form hostForm;
    static bool dialogDeactivatedOnce = false;
    static bool addPagesStarted = false;
    static bool taskCompleted = false;

    static void ExitHelper(uint exitCode) {
        TerminateProcess(GetCurrentProcess(), exitCode);
    }

    static async Task LoadPdfPagesAsync(string pdfPath) {
        StorageFile file = await StorageFile.GetFileFromPathAsync(pdfPath).ToTask();
        PdfDocument pdf = await PdfDocument.LoadFromFileAsync(file).ToTask();
        for (uint i = 0; i < pdf.PageCount; i++) {
            using (PdfPage page = pdf.GetPage(i))
            using (var stream = new InMemoryRandomAccessStream()) {
                var opts = new PdfPageRenderOptions {
                    DestinationWidth = (uint)Math.Round(page.Dimensions.MediaBox.Width * 2.5),
                    DestinationHeight = (uint)Math.Round(page.Dimensions.MediaBox.Height * 2.5)
                };
                await page.RenderToStreamAsync(stream, opts).ToTask();
                stream.Seek(0);
                var bmp = new BitmapImage();
                await bmp.SetSourceAsync(stream).ToTask();
                var img = new Image {
                    Source = bmp,
                    Stretch = Stretch.Uniform,
                    HorizontalAlignment = Windows.UI.Xaml.HorizontalAlignment.Stretch,
                    VerticalAlignment = VerticalAlignment.Stretch
                };
                var grid = new Grid {
                    Width = page.Dimensions.MediaBox.Width,
                    Height = page.Dimensions.MediaBox.Height,
                    Background = new SolidColorBrush(Windows.UI.Colors.White)
                };
                grid.Children.Add(img);
                rootCanvas.Children.Add(grid);
                grid.Measure(new Size(grid.Width, grid.Height));
                grid.Arrange(new Rect(0, 0, grid.Width, grid.Height));
                grid.UpdateLayout();
                pageGrids.Add(grid);
            }
        }
    }

    static void SafeCloseHost() {
        try {
            if (hostForm != null && !hostForm.IsDisposed) {
                hostForm.Hide();
                hostForm.Close();
            }
        } catch { }
        ExitHelper(0);
    }

    [STAThread]
    static int Main(string[] args) {
        if (args.Length < 1 || !File.Exists(args[0])) {
            ExitHelper(2);
            return 2;
        }
        string pdfPath = Path.GetFullPath(args[0]);
        string docTitle = args.Length >= 2 ? args[1] : "DN BIKES - Comprobante";
        int x = 100, y = 100, w = 1200, h = 800;
        if (args.Length >= 6) {
            int.TryParse(args[2], out x);
            int.TryParse(args[3], out y);
            int.TryParse(args[4], out w);
            int.TryParse(args[5], out h);
        }
        bool isLandscape = args.Length >= 7 && args[6] == "1";

        int centerX = x + Math.Max(400, w) / 2;
        int centerY = y + Math.Max(300, h) / 2;

        try {
            var factory = (IPrintManagerInterop)WindowsRuntimeMarshal.GetActivationFactory(typeof(PrintManager));
            using (var xaml = WindowsXamlManager.InitializeForCurrentThread())
            using (var source = new DesktopWindowXamlSource())
            using (hostForm = new Form()) {
                hostForm.Text = docTitle;
                hostForm.FormBorderStyle = FormBorderStyle.None;
                hostForm.StartPosition = FormStartPosition.Manual;
                hostForm.Bounds = new System.Drawing.Rectangle(centerX, centerY, 1, 1);
                hostForm.ShowInTaskbar = false;
                hostForm.Opacity = 0.01;

                var native = (IDesktopWindowXamlSourceNative)(object)source;
                native.AttachToWindow(hostForm.Handle);
                SetWindowPos(native.WindowHandle, IntPtr.Zero, 0, 0, 1, 1, 0x0040 | 0x0010);

                rootCanvas = new Canvas { Width = 1, Height = 1, Opacity = 0.01 };
                source.Content = rootCanvas;

                var maxLifetimeTimer = new Timer { Interval = 600000 };
                maxLifetimeTimer.Tick += (ms, me) => {
                    maxLifetimeTimer.Stop();
                    SafeCloseHost();
                };
                maxLifetimeTimer.Start();

                printDoc = new PrintDocument();
                printDocSource = printDoc.DocumentSource;

                printDoc.Paginate += (s, e) => {
                    var desc = e.PrintTaskOptions.GetPageDescription(0);
                    foreach (var g in pageGrids) {
                        if (Math.Abs(g.Width - desc.PageSize.Width) > 0.5 || Math.Abs(g.Height - desc.PageSize.Height) > 0.5) {
                            g.Width = desc.PageSize.Width;
                            g.Height = desc.PageSize.Height;
                            g.Measure(desc.PageSize);
                            g.Arrange(new Rect(0, 0, desc.PageSize.Width, desc.PageSize.Height));
                            g.UpdateLayout();
                        }
                    }
                    printDoc.SetPreviewPageCount(pageGrids.Count, PreviewPageCountType.Final);
                };

                printDoc.GetPreviewPage += (s, e) => {
                    int idx = e.PageNumber - 1;
                    if (idx >= 0 && idx < pageGrids.Count) {
                        printDoc.SetPreviewPage(e.PageNumber, pageGrids[idx]);
                    }
                };

                printDoc.AddPages += (s, e) => {
                    addPagesStarted = true;
                    foreach (var g in pageGrids) {
                        printDoc.AddPage(g);
                    }
                    printDoc.AddPagesComplete();
                };

                hostForm.Deactivate += (s, e) => {
                    dialogDeactivatedOnce = true;
                };

                hostForm.Activated += (s, e) => {
                    if (dialogDeactivatedOnce) {
                        var t = new Timer { Interval = 500 };
                        t.Tick += (ts, te) => {
                            t.Stop();
                            if (!addPagesStarted || taskCompleted) {
                                SafeCloseHost();
                            }
                        };
                        t.Start();
                    }
                };

                hostForm.Shown += async (s, e) => {
                    try {
                        await LoadPdfPagesAsync(pdfPath);
                        hostForm.Activate();
                        SetForegroundWindow(hostForm.Handle);

                        Guid iidPm = new Guid("ff2a9694-8c99-44fd-ae4a-19d9aa9a0f0a");
                        printManager = factory.GetForWindow(hostForm.Handle, ref iidPm);
                        printManager.PrintTaskRequested += (sender, ptArgs) => {
                            var deferral = ptArgs.Request.GetDeferral();
                            PrintTask task = ptArgs.Request.CreatePrintTask(docTitle, req => {
                                req.SetSource(printDocSource);
                            });
                            task.Options.MediaSize = PrintMediaSize.IsoA4;
                            task.Options.Orientation = isLandscape ? PrintOrientation.Landscape : PrintOrientation.Portrait;
                            task.Completed += (tSender, tArgs) => {
                                taskCompleted = true;
                                try {
                                    hostForm.BeginInvoke(new Action(SafeCloseHost));
                                } catch {
                                    ExitHelper(0);
                                }
                            };
                            deferral.Complete();
                        };

                        Guid iidAsync = new Guid("cdb5efb3-5788-509d-9be1-71ccb8a3362a");
                        var op = factory.ShowPrintUIForWindowAsync(hostForm.Handle, ref iidAsync);
                        bool shown = await op.ToTask();
                        if (!shown) {
                            ExitHelper(2);
                        }
                    } catch {
                        ExitHelper(2);
                    }
                };

                System.Windows.Forms.Application.Run(hostForm);
            }
            ExitHelper(0);
            return 0;
        } catch {
            ExitHelper(2);
            return 2;
        }
    }
}`;

function canCompileNativeWinPrintHelper(): boolean {
  if (process.platform !== 'win32' || !fs.existsSync(WIN_CSC_PATH)) {
    return false;
  }
  const hasDotnetRefs = REQUIRED_DOTNET_REFS.every((dll) => fs.existsSync(path.join(WIN_DOTNET_DIR, dll)));
  const hasWinmdRefs = REQUIRED_WINMD_REFS.every((winmd) => fs.existsSync(path.join(WIN_METADATA_DIR, winmd)));
  return hasDotnetRefs && hasWinmdRefs;
}

/**
 * Compila y cachea de forma asíncrona en AppData el puente nativo WinRT para mostrar la vista previa oficial
 * dentro del diálogo de impresión de Windows 11.
 */
async function ensureNativeWinPrintHelper(): Promise<string | null> {
  const helperDir = path.join(app.getPath('userData'), 'native-print');
  const exePath = path.join(helperDir, 'DNBikesWinPrintHelper_v2.exe');
  if (fs.existsSync(exePath)) {
    return exePath;
  }

  if (!canCompileNativeWinPrintHelper()) {
    return null;
  }

  const csPath = path.join(helperDir, 'DNBikesWinPrintHelper_v2.cs');
  const manifestPath = path.join(helperDir, 'DNBikesWinPrintHelper_v2.manifest');

  try {
    fs.mkdirSync(helperDir, { recursive: true });
    fs.writeFileSync(manifestPath, WIN_PRINT_HELPER_MANIFEST, 'utf8');
    fs.writeFileSync(csPath, WIN_PRINT_HELPER_CS, 'utf8');

    const compiled = await new Promise<boolean>((resolve) => {
      execFile(
        WIN_CSC_PATH,
        [
          '/nologo',
          '/target:winexe',
          `/win32manifest:${manifestPath}`,
          `/out:${exePath}`,
          '/r:System.Drawing.dll',
          '/r:System.Windows.Forms.dll',
          ...REQUIRED_DOTNET_REFS.map((dll) => `/r:${path.join(WIN_DOTNET_DIR, dll)}`),
          ...REQUIRED_WINMD_REFS.map((winmd) => `/r:${path.join(WIN_METADATA_DIR, winmd)}`),
          csPath
        ],
        { windowsHide: true, timeout: 15000 },
        (error) => {
          resolve(!error);
        }
      );
    });

    try {
      fs.unlinkSync(csPath);
      fs.unlinkSync(manifestPath);
    } catch {
      // Ignorar limpieza opcional de fuentes
    }

    return compiled && fs.existsSync(exePath) ? exePath : null;
  } catch (error) {
    console.warn('[Electron] No se pudo compilar el puente de impresión WinRT:', error);
    return null;
  }
}

function runNativeWinPrintHelper(
  exePath: string,
  pdfPath: string,
  title: string,
  landscape: boolean,
  bounds: Electron.Rectangle
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    activePrintProcess = execFile(
      exePath,
      [
        pdfPath,
        title,
        String(bounds.x),
        String(bounds.y),
        String(bounds.width),
        String(bounds.height),
        landscape ? '1' : '0'
      ],
      { windowsHide: false, timeout: 180000 },
      (error) => {
        activePrintProcess = null;
        resolve(!error);
      }
    );
  });
}

function stopActivePrintProcess() {
  if (activePrintProcess) {
    try {
      activePrintProcess.kill();
    } catch {
      // Ignorar errores al matar helper de impresión
    }
    activePrintProcess = null;
  }
}

function fallbackSystemPrintDialog(landscape: boolean): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      resolve(false);
      return;
    }

    mainWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        landscape,
        pageSize: 'A4'
      },
      (success, failureReason) => {
        if (!success && failureReason && failureReason !== 'cancelled') {
          console.warn('[Electron] Impresión finalizada sin completarse:', failureReason);
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
          mainWindow.webContents.focus();
        }
        resolve(success);
      }
    );
  });
}

/**
 * Abre directamente el diálogo nativo de impresión de Windows 11 con vista previa real A4
 * usando el puente WinRT PrintManager/PrintDocument (con fallback al diálogo clásico si falla).
 */
async function openNativeSystemPrintDialog(options?: PrintOptions): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed() || isNativePrintOpen) {
    return false;
  }

  isNativePrintOpen = true;
  const landscape = Boolean(options?.landscape);
  const title = options?.title || 'DN BIKES - Comprobante A4';
  const tempFiles: string[] = [];

  try {
    const helperExe = await ensureNativeWinPrintHelper();
    if (helperExe) {
      const pdfBuffer = await mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        landscape,
        preferCSSPageSize: !landscape,
        margins: { marginType: 'default' }
      });

      const pdfPath = path.join(
        app.getPath('temp'),
        `DNBikes_WinPrint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.pdf`
      );
      fs.writeFileSync(pdfPath, pdfBuffer);
      tempFiles.push(pdfPath);

      const bounds = mainWindow.getBounds();
      const ok = await runNativeWinPrintHelper(helperExe, pdfPath, title, landscape, bounds);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.webContents.focus();
      }
      if (ok) {
        return true;
      }
    }

    return await fallbackSystemPrintDialog(landscape);
  } catch (error) {
    console.warn('[Electron] Error en impresión nativa WinRT, usando diálogo del sistema:', error);
    return await fallbackSystemPrintDialog(landscape);
  } finally {
    isNativePrintOpen = false;
    if (tempFiles.length > 0) {
      cleanupTempFiles(tempFiles);
    }
  }
}

/** Resuelve la ruta al script server.cjs compilado según el entorno. */
function getBackendPath(): string | null {
  // 1. En producción empaquetado (resources/backend/server.cjs)
  const prodPath = path.join(process.resourcesPath, 'backend', 'server.cjs');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // 2. En modo monorepo local
  const devPath = path.resolve(__dirname, '../../backend/dist/server.cjs');
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  return null;
}

/** Resuelve la ruta del archivo .env priorizando AppData (no sobrescrito por actualizaciones). */
function resolveBackendEnvPath(): string | null {
  const candidates = [
    path.join(app.getPath('userData'), '.env'),
    path.join(path.dirname(process.execPath), '.env'),
    path.join(process.resourcesPath, 'backend', '.env'),
    path.resolve(__dirname, '../../backend/.env')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Copia una plantilla .env.example en AppData para orientar la configuración inicial en producción. */
function ensureEnvExampleInUserData() {
  try {
    const userDataDir = app.getPath('userData');
    const targetExample = path.join(userDataDir, '.env.example');
    if (fs.existsSync(targetExample)) return;

    fs.mkdirSync(userDataDir, { recursive: true });
    const packagedExample = path.join(process.resourcesPath, 'backend', '.env.example');
    if (fs.existsSync(packagedExample)) {
      fs.copyFileSync(packagedExample, targetExample);
    } else {
      fs.writeFileSync(
        targetExample,
        'DATABASE_URL=postgresql://usuario:password@localhost:5432/bikesystem\nJWT_SECRET=reemplazar_por_clave_secreta\nPORT=3000\nHOST=127.0.0.1\n',
        'utf8'
      );
    }
  } catch {
    // No bloquear por fallo al copiar plantilla guía
  }
}

/** Inicia el servidor Express en un subproceso de Node gestionado por Electron. */
function startBackendServer(): { started: boolean; errorMessage?: string } {
  backendExitedEarly = false;
  backendLastError = '';

  const serverPath = getBackendPath();
  if (!serverPath) {
    console.warn('[Electron] Binario del backend no encontrado. Omitiendo arranque automático.');
    return {
      started: false,
      errorMessage: 'No se encontró el binario del servidor interno (backend/server.cjs).'
    };
  }

  const envPath = resolveBackendEnvPath();
  if (!envPath) {
    ensureEnvExampleInUserData();
    const expectedPath = path.join(app.getPath('userData'), '.env');
    return {
      started: false,
      errorMessage: `No se encontró el archivo de configuración (.env).\n\nCrealo en:\n${expectedPath}\n\n(Tenés una plantilla ".env.example" en esa misma carpeta).`
    };
  }

  try {
    const backendDir = path.dirname(serverPath);
    backendProcess = utilityProcess.fork(serverPath, [], {
      cwd: backendDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        DOTENV_CONFIG_PATH: envPath,
        LOG_DIR: getLogsDir()
      }
    });

    backendProcess.stderr?.on('data', (chunk: Buffer) => {
      const texto = chunk.toString('utf8');
      backendLastError = (backendLastError + texto).slice(-1000);
      for (const linea of texto.split(/\r?\n/)) {
        if (linea.trim()) {
          appendElectronLog('ERROR', 'BACKEND_STDERR', linea);
        }
      }
    });

    backendProcess.on('spawn', () => {
      console.log('[Electron] Servidor Express iniciado con éxito en segundo plano.');
    });

    backendProcess.on('exit', (code: number) => {
      console.log(`[Electron] Servidor Express finalizó con código: ${code}`);
      if (code !== 0) {
        backendExitedEarly = true;
        appendElectronLog('ERROR', 'ELECTRON', `El backend finalizó inesperadamente con código ${code}`);
      }
      backendProcess = null;
    });

    return { started: true };
  } catch (error) {
    console.error('[Electron] Error al iniciar el servidor Express:', error);
    return {
      started: false,
      errorMessage: error instanceof Error ? error.message : 'Error al iniciar el servidor Express.'
    };
  }
}

/** Espera a que el backend responda /api/health antes de abrir la ventana principal. */
function waitForBackendHealth(timeoutMs = 15000): Promise<boolean> {
  const startedAt = Date.now();

  return new Promise<boolean>((resolve) => {
    const check = () => {
      if (backendExitedEarly) {
        resolve(false);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      const req = http.get('http://127.0.0.1:3000/api/health', { timeout: 1000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          setTimeout(check, 250);
        }
      });

      req.on('error', () => {
        setTimeout(check, 250);
      });

      req.on('timeout', () => {
        req.destroy();
        setTimeout(check, 250);
      });
    };

    check();
  });
}

/** Termina el subproceso del servidor Express al cerrar la aplicación. */
function stopBackendServer() {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {
      // Ignorar errores al matar proceso
    }
    backendProcess = null;
  }
}

/** Resuelve la ruta al ícono de la aplicación según el entorno (producción empaquetada o desarrollo). */
function getAppIcon(): string | undefined {
  // 1. En producción empaquetada (dist/icon.ico)
  const prodPath = path.join(__dirname, '../dist/icon.ico');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // 2. En modo desarrollo (public/icon.ico)
  const devPath = path.join(__dirname, '../public/icon.ico');
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  return undefined;
}

/** Inicializa y configura la ventana principal de escritorio con restricciones de seguridad. */
function createWindow() {
  const preloadPath = getPreloadPath();
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    ...(appIcon ? { icon: appIcon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
      webSecurity: true,
      backgroundThrottling: false,
      devTools: Boolean(process.env.VITE_DEV_SERVER_URL)
    }
  });

  const win = mainWindow;

  // Garantizar que Chromium reciba el foco al activar o restaurar la ventana en Windows
  win.on('focus', () => {
    win.webContents.focus();
  });

  win.on('restore', () => {
    win.webContents.invalidate();
    win.webContents.focus();
  });

  win.on('show', () => {
    win.webContents.focus();
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  // Remover la barra de menú superior por defecto de Windows
  win.setMenu(null);

  // Prevenir creación no autorizada de nuevas ventanas emergentes y delegar links externos al navegador del sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevenir navegación fuera de la aplicación autorizada
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (process.env.VITE_DEV_SERVER_URL) {
        const devServerUrl = new URL(process.env.VITE_DEV_SERVER_URL);
        if (parsedUrl.origin !== devServerUrl.origin) {
          event.preventDefault();
        }
      } else if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // Bloquear recarga accidental y atajos de DevTools en producción; habilitar en desarrollo y capturar Ctrl+P
  win.webContents.on('before-input-event', (event, input) => {
    const esImprimir = (input.control || input.meta) && input.key.toLowerCase() === 'p';
    const esRecarga = input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r');
    const esDevTools = input.key === 'F12' || ((input.control || input.meta) && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'j'));
    const esDesarrollo = Boolean(process.env.VITE_DEV_SERVER_URL);

    if (esImprimir) {
      event.preventDefault();
      if (input.type === 'keyDown') {
        void openNativeSystemPrintDialog();
      }
    } else if (esDevTools) {
      if (!esDesarrollo) {
        event.preventDefault();
      }
    } else if (esRecarga) {
      if (!esDesarrollo) {
        event.preventDefault();
      } else if (input.type === 'keyDown') {
        win.webContents.reload();
      }
    }
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    appendElectronLog('ERROR', 'RENDERER', `Proceso renderer caído: ${details.reason} (exitCode=${details.exitCode})`);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    appendElectronLog('ERROR', 'RENDERER', `Fallo de carga (${errorCode}): ${errorDescription} en ${validatedURL}`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // En desarrollo, carga la URL del servidor local de Vite
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // En producción, carga el archivo HTML empaquetado
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Handlers IPC para diálogos nativos seguros que no rompen el foco de entrada en Windows
ipcMain.on('dialog:showMessageBoxSync', (event, options) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    event.returnValue = 0;
    return;
  }

  const result = dialog.showMessageBoxSync(mainWindow, {
    type: options?.type || 'info',
    title: options?.title || 'BikeSystem',
    message: options?.message || '',
    buttons: options?.buttons && options.buttons.length > 0 ? options.buttons : ['Aceptar'],
    defaultId: options?.defaultId ?? 0,
    cancelId: options?.cancelId ?? 0,
    noLink: true
  });

  // Forzar restitución inmediata del foco de entrada tras el cierre del diálogo
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }

  event.returnValue = result;
});

ipcMain.on('window:refocus', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
});

ipcMain.handle('print:preview', (_event, options?: PrintOptions) => {
  return openNativeSystemPrintDialog(options);
});

ipcMain.handle('logs:openFolder', async () => {
  try {
    const dir = getLogsDir();
    fs.mkdirSync(dir, { recursive: true });
    const errorMsg = await shell.openPath(dir);
    return !errorMsg;
  } catch {
    return false;
  }
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Desactivar el menú global de la aplicación
    Menu.setApplicationMenu(null);

    // En producción (cuando no hay servidor Vite de desarrollo), iniciar el backend local y esperar salud
    if (!process.env.VITE_DEV_SERVER_URL) {
      const inicio = startBackendServer();
      if (!inicio.started) {
        dialog.showMessageBoxSync({
          type: 'error',
          title: 'Error de configuración - BikeSystem',
          message: inicio.errorMessage || 'No se pudo iniciar el servidor interno de BikeSystem.',
          buttons: ['Aceptar'],
          defaultId: 0
        });
      } else {
        const listo = await waitForBackendHealth(15000);
        if (!listo) {
          dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Servidor interno no responde - BikeSystem',
            message: backendLastError
              ? `El servidor interno no pudo iniciarse correctamente:\n\n${backendLastError}`
              : 'El servidor interno tardó demasiado en responder en el puerto 3000. Verificá la conexión a PostgreSQL y el archivo .env.',
            buttons: ['Aceptar'],
            defaultId: 0
          });
        }
      }
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('before-quit', () => {
    stopActivePrintProcess();
    stopBackendServer();
  });

  app.on('window-all-closed', () => {
    stopActivePrintProcess();
    stopBackendServer();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
