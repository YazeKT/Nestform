export interface Settings {
  units: "inch" | "mm";
  scale: number;
  spacing: number;
  curveTolerance: number;
  rotations: number;
  threads: number;
  populationSize: number;
  mutationRate: number;
  placementType: "box" | "gravity" | "convexhull";
  mergeLines: boolean;
  timeRatio: number;
  simplify: boolean;
  endpointTolerance: number;
  dxfImportScale: number;
  dxfExportScale: number;
  conversionServer: string;
  legacyExportPadding: boolean;
  runDurationSeconds: number;
  theme: "dark" | "oled" | "light";
  accent: "cyan" | "blue" | "violet" | "orange" | "lime" | "rose";
  canvasGrid: boolean;
  gridStrength: number;
  outlineStrength: number;
  uiDensity: "comfortable" | "balanced" | "compact";
  thumbnailSize: "small" | "medium" | "large";
  motion: "system" | "reduced";
  autoGapMinMm: number;
  autoGapMaxMm: number;
  onboardingSeen: boolean;
}
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Part {
  id: number;
  name: string;
  quantity: number;
  sheet: boolean;
  bounds: Bounds;
  svg: string;
}
export interface SheetView {
  width: number;
  height: number;
  svg: string;
}
export interface NestResult {
  id: number;
  fitness: number;
  placed: number;
  sheets: SheetView[];
  mergedLength: number;
}
export interface Snapshot {
  revision: number;
  status: "idle" | "running" | "stopped" | "error";
  parts: Part[];
  results: NestResult[];
  selectedResult: number | null;
  settings: Settings;
  evaluated: number;
  elapsedMs: number;
  message: string;
  projectName: string;
  startedAt: number | null;
  plannedEndAt: number | null;
  endedAt: number | null;
  remainingMs: number;
  progress: number;
}
export interface HistoryEntry {
  id: string;
  projectName: string;
  createdAt: number;
  durationMs: number;
  partCount: number;
  sheetCount: number;
  units: "inch" | "mm";
  width: number;
  height: number;
  svg: string;
}
export interface CommandResult {
  canceled?: boolean;
  path?: string;
  message?: string;
}
export interface HistoryStorage {
  folder: string | null;
  count: number;
  status: "local" | "backed-up" | "unavailable";
}
export interface NestformAPI {
  snapshot(): Promise<Snapshot>;
  subscribe(cb: (state: Snapshot) => void): () => void;
  importFiles(mode?: "add" | "new"): Promise<CommandResult>;
  loadSample(): Promise<CommandResult>;
  addSheet(
    width: number,
    height: number,
    quantity: number,
    name?: string,
  ): Promise<void>;
  updatePart(
    id: number,
    update: { quantity?: number; sheet?: boolean; name?: string },
  ): Promise<void>;
  removeParts(ids: number[]): Promise<void>;
  clear(): Promise<void>;
  settings(update: Partial<Settings>): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  selectResult(id: number): Promise<void>;
  exportFile(format: "svg" | "dxf"): Promise<CommandResult>;
  renameProject(name: string): Promise<void>;
  history(): Promise<HistoryEntry[]>;
  historyStorage(): Promise<HistoryStorage>;
  chooseHistoryFolder(): Promise<HistoryStorage>;
  openHistoryFolder(): Promise<void>;
  exportHistory(id: string): Promise<CommandResult>;
  reportBug(summary: string, details: string): Promise<void>;
  windowAction(action: "minimize" | "maximize" | "close"): void;
}
declare global {
  interface Window {
    nestform: NestformAPI;
  }
}
