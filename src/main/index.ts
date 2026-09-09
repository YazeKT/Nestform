import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import { fork, type ChildProcess } from "node:child_process";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  stat,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { defaults, validatedSettings } from "../shared/settings";
import type { HistoryEntry, Settings, Snapshot } from "../shared/types";

app.setName("Nestform");
if (process.env.NESTFORM_USER_DATA)
  app.setPath("userData", process.env.NESTFORM_USER_DATA);
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
const root = app.getAppPath();
let window: BrowserWindow,
  engine: BrowserWindow,
  settings: Settings = { ...defaults },
  state: Snapshot,
  projectName = "Untitled job",
  history: HistoryEntry[] = [],
  historyFolder: string | null = null;
let sequence = 0,
  epoch = 0,
  jobRunning = false,
  closing = false;
const pending = new Map<
  number,
  {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }
>();
let readyResolve: () => void;
const engineReady = new Promise<void>((resolve) => {
  readyResolve = resolve;
});
type Slot = { worker: ChildProcess; busy: boolean; epoch: number };
let pool: Slot[] = [],
  queue: any[] = [];
function fromEngine(event: Electron.IpcMainEvent) {
  if (!engine || event.sender !== engine.webContents)
    throw Error("Untrusted engine sender");
}
function fromUI(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) {
  if (!window || event.sender !== window.webContents)
    throw Error("Untrusted application sender");
}
function command(op: string, ...args: unknown[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(
        Error("The geometry engine did not respond. Try reopening the app."),
      );
    }, 45000);
    pending.set(id, { resolve, reject, timer });
    engine.webContents.send("engine:command", { id, op, args });
  });
}
async function stopWorkers() {
  epoch++;
  jobRunning = false;
  queue = [];
  const old = pool;
  pool = [];
  for (const s of old) s.worker.kill();
}
function failWorkers(error: string) {
  void stopWorkers();
  if (engine && !engine.isDestroyed())
    engine.webContents.send("engine:background", "error", error);
}
function createSlot(): Slot {
  const resources = app.isPackaged
    ? path.join(process.resourcesPath, "engine")
    : root;
  const workerData = {
    addon: app.isPackaged
      ? path.join(resources, "nestform.node")
      : path.join(root, "native/build/Release/nestform.node"),
    legacy: app.isPackaged
      ? path.join(resources, "legacy")
      : path.join(root, "vendor/legacy"),
  };
  const worker = fork(path.join(__dirname, "engine-worker.cjs"), [], {
    execPath: process.execPath,
    execArgv: [],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NESTFORM_WORKER_DATA: JSON.stringify(workerData),
    },
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  const slot = { worker, busy: false, epoch };
  worker.on("message", (message: any) => {
    if (slot.epoch !== epoch || !jobRunning) return;
    if (message.kind === "error") {
      failWorkers("Nesting stopped: " + message.message);
      return;
    }
    if (message.kind === "background-response") {
      slot.busy = false;
      engine.webContents.send(
        "engine:background",
        message.kind,
        message.payload,
      );
      pump();
    } else if (message.kind === "background-progress")
      engine.webContents.send(
        "engine:background",
        message.kind,
        message.payload,
      );
  });
  worker.on("error", (error) => {
    if (slot.epoch === epoch && jobRunning) failWorkers(error.message);
  });
  worker.on("exit", (code) => {
    if (slot.epoch === epoch && jobRunning)
      failWorkers(
        `A nesting worker stopped unexpectedly (${code}). The last result has been kept.`,
      );
  });
  return slot;
}
function pump() {
  if (!jobRunning) return;
  const count = Math.min(settings.threads, os.availableParallelism(), 8);
  while (pool.length < count) pool.push(createSlot());
  for (const s of pool) {
    if (!s.busy && queue.length) {
      s.busy = true;
      s.worker.send(queue.shift());
    }
  }
}
function constrain(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
}
async function saveSettings() {
  await mkdir(app.getPath("userData"), { recursive: true });
  const target = path.join(app.getPath("userData"), "settings.json"),
    temp = target + ".tmp";
  await writeFile(temp, JSON.stringify(settings, null, 2));
  await rename(temp, target);
}
async function saveWorkspace() {
  await mkdir(app.getPath("userData"), { recursive: true });
  const target = path.join(app.getPath("userData"), "workspace.json"),
    temp = target + ".tmp";
  await writeFile(temp, JSON.stringify({ projectName }, null, 2));
  await rename(temp, target);
}
async function saveHistory() {
  await mkdir(app.getPath("userData"), { recursive: true });
  const target = path.join(app.getPath("userData"), "history.json"),
    temp = target + ".tmp";
  await writeFile(temp, JSON.stringify(history, null, 2));
  await rename(temp, target);
}
function historyBase(entry: HistoryEntry) {
  const stamp = new Date(entry.createdAt).toISOString().replace(/[:.]/g, "-");
  const name =
    entry.projectName
      .replace(/[<>:"/\\|?*]/g, "-")
      .trim()
      .slice(0, 80) || "nestform";
  return `${stamp}_${name}_${entry.id.replace(/[^a-z0-9-]/gi, "")}`;
}
async function saveHistoryBackup(entry: HistoryEntry) {
  if (!historyFolder) return;
  await mkdir(historyFolder, { recursive: true });
  const base = path.join(historyFolder, historyBase(entry));
  await writeFile(`${base}.svg`, entry.svg);
  await writeFile(
    `${base}.nestform.json`,
    JSON.stringify(
      { ...entry, svgFile: `${path.basename(base)}.svg`, svg: undefined },
      null,
      2,
    ),
  );
}
async function saveStorage() {
  await mkdir(app.getPath("userData"), { recursive: true });
  const target = path.join(app.getPath("userData"), "storage.json"),
    temp = target + ".tmp";
  await writeFile(temp, JSON.stringify({ historyFolder }, null, 2));
  await rename(temp, target);
}
function withProject(snapshot: Snapshot): Snapshot {
  return { ...snapshot, projectName };
}
async function recordHistory() {
  const snapshot = withProject(await command("snapshot"));
  const selected =
    snapshot.results.find((r) => r.id === snapshot.selectedResult) ||
    snapshot.results[0];
  if (!selected) return;
  const svg = await command("export", "svg");
  const f = settings.scale / (settings.units === "mm" ? 25.4 : 1);
  history.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectName,
    createdAt: Date.now(),
    durationMs: snapshot.elapsedMs,
    partCount: selected.placed,
    sheetCount: selected.sheets.length,
    units: settings.units,
    width: Number(
      Math.max(...selected.sheets.map((s) => s.width / f)).toFixed(6),
    ),
    height: Number(
      selected.sheets.reduce((sum, s) => sum + s.height / f, 0).toFixed(6),
    ),
    svg,
  });
  await saveHistory();
  await saveHistoryBackup(history[0]);
}
async function saveContent(
  content: string,
  format: "svg" | "dxf",
  basename: string,
) {
  const choice = await dialog.showSaveDialog(window, {
    title: `Export ${format.toUpperCase()}`,
    defaultPath: `${basename}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (choice.canceled || !choice.filePath) return { canceled: true };
  const target = path.extname(choice.filePath)
    ? choice.filePath
    : `${choice.filePath}.${format}`;
  const temp = target + ".nestform-tmp";
  await writeFile(temp, content);
  await rename(temp, target);
  return { path: target, message: `Exported ${path.basename(target)}` };
}
function requireIdle() {
  if (jobRunning) throw Error("Stop nesting before changing the job.");
}
function positive(value: unknown, label: string, max = 1_000_000) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > max
  )
    throw Error(`${label} must be greater than zero and no more than ${max}.`);
}
function quantity(value: unknown) {
  positive(value, "Quantity", 10000);
  if (!Number.isInteger(value)) throw Error("Quantity must be a whole number.");
}
async function convert(
  content: Buffer | string,
  filename: string,
  format: "svg" | "dxf",
) {
  const form = new FormData();
  form.append("format", format);
  form.append(
    "fileUpload",
    new Blob([
      Uint8Array.from(
        typeof content === "string" ? Buffer.from(content) : content,
      ),
    ]),
    filename,
  );
  const response = await fetch(settings.conversionServer, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  if (!response.ok)
    throw Error(`Conversion service returned ${response.status}.`);
  const text = await response.text();
  if (text.length > 25_000_000) throw Error("Converted file exceeds 25 MB.");
  if (format === "svg" && !/<svg[\s>]/i.test(text))
    throw Error("The conversion service did not return an SVG.");
  if (
    format === "dxf" &&
    (!/\bSECTION\b/.test(text) || !/(?:^|\n)\s*EOF\s*$/.test(text))
  )
    throw Error("The conversion service did not return a complete DXF.");
  return text;
}
async function confirmConversion(filename: string) {
  const result = await dialog.showMessageBox(window, {
    type: "question",
    title: "Online file conversion",
    message: `Convert ${filename} using the online service?`,
    detail: `This sends this file to ${settings.conversionServer}. SVG import and export work locally.`,
    buttons: ["Cancel", "Convert file"],
    defaultId: 0,
    cancelId: 0,
  });
  return result.response === 1;
}
async function embedImages(content: string, filename: string) {
  const folder = path.dirname(filename);
  const matches = [
    ...content.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/g),
  ];
  for (const match of matches) {
    const href = match[1];
    if (/^(data:|https?:|#)/i.test(href)) continue;
    const resolved = path.resolve(folder, href);
    if (
      !resolved.startsWith(folder + path.sep) ||
      !/[.](png|jpe?g|webp)$/i.test(resolved)
    )
      continue;
    try {
      const actual = await realpath(resolved),
        actualFolder = await realpath(folder);
      if (
        !actual
          .toLowerCase()
          .startsWith((actualFolder + path.sep).toLowerCase())
      )
        continue;
      const info = await stat(actual);
      if (info.size > 8_000_000) continue;
      const data = await readFile(actual);
      const mime = /\.png$/i.test(resolved)
        ? "png"
        : /\.webp$/i.test(resolved)
          ? "webp"
          : "jpeg";
      content = content.replaceAll(
        href,
        `data:image/${mime};base64,${data.toString("base64")}`,
      );
    } catch {}
  }
  return content;
}
async function importPath(filename: string) {
  const info = await stat(filename);
  if (info.size > 25_000_000) throw Error("Choose a file smaller than 25 MB.");
  const data = await readFile(filename),
    name = path.basename(filename),
    extension = path.extname(name).toLowerCase();
  let content: string;
  if (extension === ".svg")
    content = await embedImages(data.toString("utf8"), filename);
  else if ([".dxf", ".cdr"].includes(extension)) {
    if (!(await confirmConversion(name))) return { canceled: true };
    content = await convert(data, name, "svg");
  } else throw Error("Choose an SVG, DXF, or CDR file.");
  await command("import", {
    name,
    content,
    dxfFlag: extension === ".dxf",
    scalingFactor: extension === ".dxf" ? settings.dxfImportScale : null,
  });
  if (projectName === "Untitled job") {
    projectName =
      path.basename(filename, path.extname(filename)).slice(0, 120) ||
      "Untitled job";
    await saveWorkspace();
  }
  return { message: `Imported ${name}` };
}
let operationChain = Promise.resolve<unknown>(undefined);
async function operation(op: string, args: any[]) {
  await engineReady;
  switch (op) {
    case "snapshot":
      return withProject(await command("snapshot"));
    case "import": {
      requireIdle();
      const mode = args[0] === "new" ? "new" : "add";
      const choice = await dialog.showOpenDialog(window, {
        title:
          mode === "new"
            ? "Choose parts for a new nest"
            : "Add parts to this nest",
        filters: [{ name: "Drawing files", extensions: ["svg", "dxf", "cdr"] }],
        properties: ["openFile", "multiSelections"],
      });
      if (choice.canceled) return { canceled: true };
      if (mode === "new") {
        await command("clear");
        projectName = "Untitled job";
        await saveWorkspace();
      }
      let imported = 0;
      for (const filename of choice.filePaths) {
        const result = await importPath(filename);
        if (!result.canceled) imported++;
      }
      return { message: `Imported ${imported} files` };
    }
    case "sample": {
      requireIdle();
      return importPath(
        path.join(
          app.isPackaged ? process.resourcesPath : root,
          "samples/baseline-parts.svg",
        ),
      );
    }
    case "addSheet":
      requireIdle();
      positive(args[0], "Width");
      positive(args[1], "Height");
      quantity(args[2]);
      if (
        args[3] !== undefined &&
        (typeof args[3] !== "string" || args[3].length > 80)
      )
        throw Error("Invalid sheet name");
      return command(op, ...args);
    case "updatePart": {
      requireIdle();
      if (!Number.isInteger(args[0])) throw Error("Invalid part");
      const update = args[1];
      if (
        !update ||
        typeof update !== "object" ||
        Object.keys(update).some(
          (k) => !["quantity", "sheet", "name"].includes(k),
        )
      )
        throw Error("Invalid part update");
      if ("quantity" in update) quantity(update.quantity);
      if ("sheet" in update && typeof update.sheet !== "boolean")
        throw Error("Invalid sheet flag");
      if (
        "name" in update &&
        (typeof update.name !== "string" || update.name.length > 120)
      )
        throw Error("Invalid name");
      return command(op, ...args);
    }
    case "removeParts":
      requireIdle();
      if (
        !Array.isArray(args[0]) ||
        args[0].some((id) => !Number.isInteger(id))
      )
        throw Error("Invalid selection");
      return command(op, [...new Set(args[0])]);
    case "clear":
      requireIdle();
      projectName = "Untitled job";
      await saveWorkspace();
      return command(op);
    case "renameProject": {
      const name = String(args[0] || "").trim();
      if (!name || name.length > 120)
        throw Error("Use a project name between 1 and 120 characters.");
      projectName = name;
      await saveWorkspace();
      state = withProject(await command("snapshot"));
      window.webContents.send("app:state", state);
      return;
    }
    case "history":
      return history;
    case "historyStorage": {
      let status: "local" | "backed-up" | "unavailable" = historyFolder
        ? "backed-up"
        : "local";
      if (historyFolder)
        try {
          await stat(historyFolder);
        } catch {
          status = "unavailable";
        }
      return { folder: historyFolder, count: history.length, status };
    }
    case "chooseHistoryFolder": {
      const choice = await dialog.showOpenDialog(window, {
        title: "Choose Nestform history backup folder",
        properties: ["openDirectory", "createDirectory"],
      });
      if (choice.canceled || !choice.filePaths[0])
        return operation("historyStorage", []);
      historyFolder = choice.filePaths[0];
      await saveStorage();
      for (const entry of history) await saveHistoryBackup(entry);
      return operation("historyStorage", []);
    }
    case "openHistoryFolder":
      if (!historyFolder) throw Error("Choose a History Backup Folder first.");
      if (await shell.openPath(historyFolder))
        throw Error("The History Backup Folder is unavailable.");
      return;
    case "settings": {
      requireIdle();
      const next = validatedSettings(settings, args[0]);
      await command("settings", next);
      settings = next;
      await saveSettings();
      return;
    }
    case "start": {
      if (jobRunning) return;
      const snapshot: Snapshot = await command("snapshot");
      const parts = snapshot.parts
        .filter((p) => !p.sheet)
        .reduce((sum, p) => sum + p.quantity, 0);
      if (parts > 25000)
        throw Error("Use no more than 25,000 parts in one job.");
      jobRunning = true;
      try {
        return await command("start");
      } catch (error) {
        await stopWorkers();
        throw error;
      }
    }
    case "stop":
      if (!jobRunning) return;
      await command("stop");
      await stopWorkers();
      await recordHistory();
      return;
    case "selectResult":
      if (!Number.isInteger(args[0])) throw Error("Invalid result");
      return command(op, ...args);
    case "export": {
      const format = args[0];
      if (!["svg", "dxf"].includes(format))
        throw Error("Invalid export format");
      let content = await command("export", format);
      if (format === "dxf") {
        if (!(await confirmConversion("the selected nesting result")))
          return { canceled: true };
        content = await convert(content, "nestform.svg", "dxf");
      }
      try {
        return await saveContent(
          content,
          format,
          projectName.replace(/[<>:"/\\|?*]/g, "-") || "nestform",
        );
      } catch (error) {
        throw Error(
          `Could not save the export: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    case "exportHistory": {
      const entry = history.find((item) => item.id === args[0]);
      if (!entry) throw Error("That history item is no longer available.");
      return saveContent(
        entry.svg,
        "svg",
        entry.projectName.replace(/[<>:"/\\|?*]/g, "-") || "nestform",
      );
    }
    case "reportBug": {
      const summary = String(args[0] || "Nestform bug report").slice(0, 160);
      const details = String(args[1] || "").slice(0, 4000);
      await shell.openExternal(
        `mailto:kirstentrimaley@gmail.com?subject=${encodeURIComponent(summary)}&body=${encodeURIComponent(details)}`,
      );
      return;
    }
    default:
      throw Error("Unknown application command");
  }
}
ipcMain.on("engine:ready", (event) => {
  fromEngine(event);
  void command("configure", settings).then(() => readyResolve());
});
ipcMain.on("engine:reply", (event, { id, result, error }) => {
  fromEngine(event);
  const request = pending.get(id);
  if (!request) return;
  clearTimeout(request.timer);
  pending.delete(id);
  error ? request.reject(Error(error)) : request.resolve(result);
});
ipcMain.on("engine:state", (event, snapshot) => {
  fromEngine(event);
  state = withProject(snapshot);
  if (window && !window.isDestroyed())
    window.webContents.send("app:state", state);
});
ipcMain.on("engine:auto-stop", (event) => {
  fromEngine(event);
  const next = operationChain.then(async () => {
    if (!jobRunning) return;
    await stopWorkers();
    await recordHistory();
  });
  operationChain = next.catch(() => {});
});
ipcMain.on("engine:evaluate", (event, payload) => {
  fromEngine(event);
  if (!jobRunning) return;
  queue.push(payload);
  pump();
});
ipcMain.handle("app:command", (event, op, args) => {
  fromUI(event);
  if (op === "snapshot") return operation(op, []);
  const next = operationChain.then(() => operation(op, args));
  operationChain = next.catch(() => {});
  return next;
});
ipcMain.on("app:window", (event, action) => {
  fromUI(event);
  if (action === "minimize") window.minimize();
  if (action === "maximize")
    window.isMaximized() ? window.unmaximize() : window.maximize();
  if (action === "close") window.close();
});
app.whenReady().then(async () => {
  app.setAppUserModelId("media.yaze.nestform");
  try {
    settings = validatedSettings(
      defaults,
      JSON.parse(
        await readFile(
          path.join(app.getPath("userData"), "settings.json"),
          "utf8",
        ),
      ),
    );
  } catch {}
  try {
    const saved = JSON.parse(
      await readFile(
        path.join(app.getPath("userData"), "workspace.json"),
        "utf8",
      ),
    );
    if (typeof saved.projectName === "string" && saved.projectName.trim())
      projectName = saved.projectName.slice(0, 120);
  } catch {}
  try {
    const saved = JSON.parse(
      await readFile(
        path.join(app.getPath("userData"), "history.json"),
        "utf8",
      ),
    );
    if (Array.isArray(saved))
      history = saved.filter(
        (x) =>
          x &&
          typeof x.id === "string" &&
          typeof x.svg === "string" &&
          x.svg.length < 25_000_000,
      );
  } catch {}
  try {
    const saved = JSON.parse(
      await readFile(
        path.join(app.getPath("userData"), "storage.json"),
        "utf8",
      ),
    );
    if (
      typeof saved.historyFolder === "string" &&
      path.isAbsolute(saved.historyFolder)
    )
      historyFolder = saved.historyFolder;
  } catch {}
  session.defaultSession.setPermissionRequestHandler(
    (_wc, _permission, callback) => callback(false),
  );
  engine = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/engine.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  constrain(engine);
  window = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: "#20252b",
    frame: false,
    show: false,
    title: "Nestform",
    icon: path.join(__dirname, "../renderer/nestform-logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  constrain(window);
  window.on("ready-to-show", () => window.show());
  window.on("closed", () => app.quit());
  window.on("close", (event) => {
    if (!jobRunning || closing) return;
    event.preventDefault();
    void dialog
      .showMessageBox(window, {
        type: "question",
        message: "Stop nesting and close Nestform?",
        detail:
          "Unsaved job data will be lost. Export the selected result before closing if you need it.",
        buttons: ["Keep open", "Stop and close"],
        defaultId: 0,
        cancelId: 0,
      })
      .then(({ response }) => {
        if (response === 1) {
          closing = true;
          void stopWorkers().then(() => window.close());
        }
      });
  });
  engine.webContents.on("render-process-gone", () => {
    if (!closing && window && !window.isDestroyed()) {
      state = {
        ...state,
        status: "error",
        message: "The geometry engine stopped. Reopen Nestform to continue.",
      };
      window.webContents.send("app:state", state);
      void stopWorkers();
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    await engine.loadURL(
      process.env.ELECTRON_RENDERER_URL + "/engine/index.html",
    );
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await engine.loadFile(
      path.join(__dirname, "../renderer/engine/index.html"),
    );
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
});
app.on("window-all-closed", () => app.quit());
app.on("second-instance", () => {
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
});
app.on("before-quit", () => {
  closing = true;
  void stopWorkers();
  if (engine && !engine.isDestroyed()) engine.destroy();
});
