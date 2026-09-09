import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("engineBridge", {
  ready: () => ipcRenderer.send("engine:ready"),
  reply: (id: number, result: unknown, error?: string) =>
    ipcRenderer.send("engine:reply", { id, result, error }),
  state: (snapshot: unknown) => ipcRenderer.send("engine:state", snapshot),
  start: (payload: unknown) => ipcRenderer.send("engine:evaluate", payload),
  autoStop: () => ipcRenderer.send("engine:auto-stop"),
  onCommand: (callback: (command: unknown) => void) =>
    ipcRenderer.on("engine:command", (_event, command) => callback(command)),
  onBackground: (callback: (kind: string, payload: unknown) => void) =>
    ipcRenderer.on("engine:background", (_event, kind, payload) =>
      callback(kind, payload),
    ),
});
