import { contextBridge, ipcRenderer } from "electron";
import type { NestformAPI } from "../shared/types";
const invoke = (operation: string, ...args: unknown[]) =>
  ipcRenderer.invoke("app:command", operation, args);
const api: NestformAPI = {
  snapshot: () => invoke("snapshot"),
  subscribe: (cb) => {
    const listener = (_event: unknown, state: Parameters<typeof cb>[0]) =>
      cb(state);
    ipcRenderer.on("app:state", listener);
    return () => ipcRenderer.removeListener("app:state", listener);
  },
  importFiles: (mode = "add") => invoke("import", mode),
  loadSample: () => invoke("sample"),
  addSheet: (...a) => invoke("addSheet", ...a),
  updatePart: (...a) => invoke("updatePart", ...a),
  removeParts: (ids) => invoke("removeParts", ids),
  clear: () => invoke("clear"),
  settings: (patch) => invoke("settings", patch),
  start: () => invoke("start"),
  stop: () => invoke("stop"),
  selectResult: (id) => invoke("selectResult", id),
  exportFile: (format) => invoke("export", format),
  renameProject: (name) => invoke("renameProject", name),
  history: () => invoke("history"),
  historyStorage: () => invoke("historyStorage"),
  chooseHistoryFolder: () => invoke("chooseHistoryFolder"),
  openHistoryFolder: () => invoke("openHistoryFolder"),
  exportHistory: (id) => invoke("exportHistory", id),
  reportBug: (summary, details) => invoke("reportBug", summary, details),
  windowAction: (action) => ipcRenderer.send("app:window", action),
};
contextBridge.exposeInMainWorld("nestform", api);
