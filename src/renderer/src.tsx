import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpFromLine,
  Archive,
  Check,
  ChevronDown,
  FileClock,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  LoaderCircle,
  Maximize2,
  Minus,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  HistoryEntry,
  HistoryStorage,
  Part,
  Settings,
  SheetView,
  Snapshot,
} from "../shared/types";
import guide from "../../docs/USER-GUIDE.md?raw";
import wiki from "../../docs/TECHNICAL-WIKI.md?raw";
import safety from "../../docs/SAFETY.md?raw";
import changelog from "../../CHANGELOG.md?raw";
import notices from "../../THIRD-PARTY-NOTICES.md?raw";
import "@fontsource-variable/outfit";
import "./style.css";
const api = window.nestform,
  u = (s: Settings) => (s.units === "mm" ? "mm" : "in"),
  f = (s: Settings) => s.scale / (s.units === "mm" ? 25.4 : 1),
  n = (x: number, d = 2) =>
    Number(x.toFixed(d)).toLocaleString(undefined, {
      maximumFractionDigits: d,
    });
const dims = (p: Part, s: Settings) =>
  `${n(p.bounds.width / f(s))} ${u(s)} × ${n(p.bounds.height / f(s))} ${u(s)}`;
const dur = (ms: number) => {
    const x = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(x / 3600)).padStart(2, "0")}:${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  },
  dateParts = (v: number) => ({
    date: new Date(v).toLocaleDateString(),
    time: new Date(v).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
function Button({
  icon: I,
  className = "",
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: typeof Plus }) {
  return (
    <button type={p.type || "button"} className={`button ${className}`} {...p}>
      {I && <I size={15} />} {children}
    </button>
  );
}
function IconButton({
  icon: I,
  title,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: typeof Plus;
  title: string;
}) {
  return (
    <button
      type={p.type || "button"}
      className="icon-button"
      title={title}
      aria-label={title}
      {...p}
    >
      <I size={16} />
    </button>
  );
}
function NumberField({
  value,
  onChange,
  label,
  min = 0,
  max,
  step = "any",
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number | "any";
  disabled?: boolean;
}) {
  const [d, setD] = React.useState(String(value));
  useEffect(() => setD(String(value)), [value]);
  const done = () => {
    const x = Number(d);
    if (
      d.trim() &&
      Number.isFinite(x) &&
      x >= min &&
      (max === undefined || x <= max) &&
      (step === "any" || Number.isInteger(x))
    )
      onChange(x);
    else setD(String(value));
  };
  return (
    <input
      type="number"
      aria-label={label}
      value={d}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => setD(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`toggle ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
const PartPreview = memo(({ part }: { part: Part }) => {
  const b = part.bounds,
    p = Math.max(b.width, b.height) * 0.05;
  return (
    <svg
      className={`part-preview color-${part.id % 5}`}
      viewBox={`${b.x - p} ${b.y - p} ${b.width + p * 2} ${b.height + p * 2}`}
      dangerouslySetInnerHTML={{ __html: part.svg }}
    />
  );
});
const SvgImage = memo(
    ({
      svg,
      alt = "Nesting preview",
      className = "",
    }: {
      svg: string;
      alt?: string;
      className?: string;
    }) => (
      <img
        className={`svg-image ${className}`}
        alt={alt}
        draggable={false}
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      />
    ),
    (a, b) => a.svg === b.svg && a.className === b.className,
  ),
  SheetGraphic = memo(
    ({ sheet }: { sheet: SheetView }) => <SvgImage svg={sheet.svg} />,
    (a, b) => a.sheet.svg === b.sheet.svg,
  );
const historyDisplay = (svg: string) => {
  const viewBox = svg
    .match(/viewBox=["']([^"']+)["']/i)?.[1]
    ?.trim()
    .split(/\s+/)
    .map(Number);
  const border =
    viewBox?.length === 4 && viewBox.every(Number.isFinite)
      ? `<rect class="history-sheet-boundary" x="${viewBox[0]}" y="${viewBox[1]}" width="${viewBox[2]}" height="${viewBox[3]}"/>`
      : "";
  return svg.replace(
    /<svg([^>]*)>/i,
    `<svg$1><style>path,rect,circle,ellipse,polygon,polyline,line{fill:none!important;stroke-width:1.35px!important;vector-effect:non-scaling-stroke}.history-sheet-boundary{stroke:#727f89!important;stroke-width:1.6px!important}g[data-nest-color="0"] *{stroke:#d76666!important}g[data-nest-color="1"] *{stroke:#9ca33f!important}g[data-nest-color="2"] *{stroke:#269da8!important}g[data-nest-color="3"] *{stroke:#3d83be!important}g[data-nest-color="4"] *{stroke:#8061b8!important}svg>g>g:nth-child(5n+1) *{stroke:#d76666}svg>g>g:nth-child(5n+2) *{stroke:#9ca33f}svg>g>g:nth-child(5n+3) *{stroke:#269da8}svg>g>g:nth-child(5n+4) *{stroke:#3d83be}svg>g>g:nth-child(5n) *{stroke:#8061b8}</style>${border}`,
  );
};
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const r = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    r.current?.showModal();
  }, []);
  return (
    <dialog
      ref={r}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <IconButton icon={X} title="Close dialog" onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
function Markdown({ text }: { text: string }) {
  return (
    <div className="document-view">
      {text.split("\n").map((l, i) =>
        l.startsWith("### ") ? (
          <h4 key={i}>{l.slice(4)}</h4>
        ) : l.startsWith("## ") ? (
          <h3 key={i}>{l.slice(3)}</h3>
        ) : l.startsWith("# ") ? (
          <h2 key={i}>{l.slice(2)}</h2>
        ) : l.startsWith("- ") ? (
          <p className="bullet" key={i}>
            {l.slice(2)}
          </p>
        ) : /^\d+[.] /.test(l) ? (
          <p className="step" key={i}>
            {l}
          </p>
        ) : l ? (
          <p key={i}>{l}</p>
        ) : (
          <br key={i} />
        ),
      )}
    </div>
  );
}
function SettingsDialog({
  settings,
  storage,
  onSave,
  onClose,
  onGuide,
  onTour,
  onChooseHistory,
  onOpenHistory,
}: {
  settings: Settings;
  storage: HistoryStorage;
  onSave: (s: Settings) => Promise<void>;
  onClose: () => void;
  onGuide: () => void;
  onTour: () => void;
  onChooseHistory: () => Promise<void>;
  onOpenHistory: () => Promise<void>;
}) {
  const [d, setD] = React.useState({ ...settings }),
    [tab, setTab] = React.useState<
      "nesting" | "appearance" | "storage" | "about" | "changelog"
    >("nesting"),
    [error, setError] = React.useState("");
  const c = (k: keyof Settings, v: unknown) => setD((s) => ({ ...s, [k]: v })),
    scale = f(d),
    field = (
      k: keyof Settings,
      l: string,
      h: string,
      min: number,
      max: number,
      conv = false,
      int = false,
    ) => (
      <label className="setting-field">
        <span>
          {l}
          <small>{h}</small>
        </span>
        <NumberField
          label={l}
          min={min}
          max={max}
          step={int ? 1 : "any"}
          value={Number(d[k]) / (conv ? scale : 1)}
          onChange={(v) => c(k, v * (conv ? scale : 1))}
        />
      </label>
    );
  return (
    <Modal title="Settings" wide onClose={onClose}>
      <div className="settings-layout">
        <nav>
          {(
            [
              ["nesting", "Nesting"],
              ["appearance", "Appearance"],
              ["storage", "History & backup"],
              ["about", "About & safety"],
              ["changelog", "Changelog"],
            ] as const
          ).map(([id, l]) => (
            <button
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              key={id}
            >
              {l}
            </button>
          ))}
        </nav>
        <div className="settings-page">
          {tab === "nesting" && (
            <div className="settings-grid">
              <section>
                <h3>Drawing & placement</h3>
                <label className="setting-field">
                  <span>
                    Working units
                    <small>Input, spacing, dimensions and SVG output.</small>
                  </span>
                  <select
                    value={d.units}
                    onChange={(e) => c("units", e.target.value)}
                  >
                    <option value="mm">Millimetres (mm)</option>
                    <option value="inch">Inches (in)</option>
                  </select>
                </label>
                {field(
                  "spacing",
                  `Part spacing (${u(d)})`,
                  "Exact edge-to-edge clearance.",
                  0,
                  10000,
                  true,
                )}
                {field(
                  "rotations",
                  "Part rotations",
                  "4 allows 90° steps.",
                  1,
                  360,
                  false,
                  true,
                )}
                <label className="setting-field">
                  <span>
                    Placement method
                    <small>How compact layouts are compared.</small>
                  </span>
                  <select
                    value={d.placementType}
                    onChange={(e) => c("placementType", e.target.value)}
                  >
                    <option value="box">Bounding box</option>
                    <option value="gravity">Gravity</option>
                    <option value="convexhull">Squeeze</option>
                  </select>
                </label>
                {field(
                  "curveTolerance",
                  `Curve tolerance (${u(d)})`,
                  "Lower follows curves more closely.",
                  0.00001,
                  25,
                  true,
                )}
                {field(
                  "endpointTolerance",
                  `Endpoint tolerance (${u(d)})`,
                  "Join distance for endpoints.",
                  0.00001,
                  25,
                  true,
                )}
              </section>
              <section>
                <h3>Run & performance</h3>
                {field(
                  "runDurationSeconds",
                  "Run duration (seconds)",
                  "The real progress deadline.",
                  1,
                  86400,
                  false,
                  true,
                )}
                {field(
                  "threads",
                  "CPU workers",
                  "Parallel native calculations.",
                  1,
                  8,
                  false,
                  true,
                )}
                {field(
                  "populationSize",
                  "Population size",
                  "More candidate layouts per generation.",
                  3,
                  100,
                  false,
                  true,
                )}
                {field(
                  "mutationRate",
                  "Mutation rate (%)",
                  "Order and rotation variation.",
                  1,
                  100,
                  false,
                  true,
                )}
                {field(
                  "timeRatio",
                  "Cutting / material balance",
                  "0 favours material; 1 shared cuts.",
                  0,
                  1,
                )}
                <label className="setting-field">
                  <span>
                    Merge common lines<small>Export a shared edge once.</small>
                  </span>
                  <Toggle
                    checked={d.mergeLines}
                    onChange={() => c("mergeLines", !d.mergeLines)}
                    label="Merge common lines"
                  />
                </label>
                <label className="setting-field">
                  <span>
                    Rough approximation
                    <small>Faster, with less precision.</small>
                  </span>
                  <Toggle
                    checked={d.simplify}
                    onChange={() => c("simplify", !d.simplify)}
                    label="Rough approximation"
                  />
                </label>
              </section>
              <section>
                <h3>Scale & conversion</h3>
                {field(
                  "scale",
                  "SVG units per inch",
                  "Keep 72 for Deepnest compatibility.",
                  1,
                  10000,
                  false,
                  true,
                )}
                {field(
                  "dxfImportScale",
                  "DXF import scale",
                  "Conversion input factor.",
                  0.00001,
                  10000,
                )}
                {field(
                  "dxfExportScale",
                  "DXF export units per inch",
                  "Conversion output factor.",
                  0.00001,
                  10000,
                )}
                <label className="setting-field">
                  <span>
                    Legacy export padding
                    <small>Add original 10% page space.</small>
                  </span>
                  <Toggle
                    checked={d.legacyExportPadding}
                    onChange={() =>
                      c("legacyExportPadding", !d.legacyExportPadding)
                    }
                    label="Legacy export padding"
                  />
                </label>
              </section>
            </div>
          )}
          {tab === "appearance" && (
            <section className="appearance-settings">
              <div className="settings-section-heading">
                <div>
                  <h3>Workspace appearance</h3>
                  <p>
                    Shape the workspace without reducing the nesting canvas.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setD((s) => ({
                      ...s,
                      theme: "dark",
                      accent: "cyan",
                      canvasGrid: true,
                      gridStrength: 5,
                      outlineStrength: 6,
                      uiDensity: "balanced",
                      thumbnailSize: "medium",
                      motion: "system",
                    }))
                  }
                >
                  Restore defaults
                </Button>
              </div>
              <div className="theme-grid">
                {(
                  [
                    ["oled", "OLED black"],
                    ["dark", "Dark grey"],
                    ["light", "Light"],
                  ] as const
                ).map(([id, l]) => (
                  <button
                    className={`theme-card ${d.theme === id ? "active" : ""}`}
                    onClick={() => c("theme", id)}
                    key={id}
                  >
                    <i data-demo={id} />
                    <span>{l}</span>
                  </button>
                ))}
              </div>
              <h3>Accent colour</h3>
              <div className="accent-grid">
                {(
                  ["cyan", "blue", "violet", "orange", "lime", "rose"] as const
                ).map((id) => (
                  <button
                    aria-label={`${id} accent`}
                    className={d.accent === id ? "active" : ""}
                    data-color={id}
                    onClick={() => c("accent", id)}
                    key={id}
                  >
                    <span />
                  </button>
                ))}
              </div>
              <div
                className="appearance-preview"
                data-preview-theme={d.theme}
                data-preview-accent={d.accent}
              >
                <div className="preview-top">
                  <i />
                  <span />
                  <b />
                </div>
                <div className="preview-body">
                  <aside>
                    <i />
                    <i />
                    <i />
                  </aside>
                  <main>
                    <span />
                    <svg viewBox="0 0 160 90">
                      <rect x="8" y="8" width="144" height="74" rx="2" />
                      <path d="M22 20h35v24H22zM70 18l28 8-8 28-28-8zM105 48h33v22h-33z" />
                    </svg>
                  </main>
                  <aside>
                    <i />
                    <i />
                  </aside>
                </div>
              </div>
              <div className="appearance-controls">
                <label className="setting-field">
                  <span>
                    Canvas grid
                    <small>
                      Show a subtle scale reference behind the sheet.
                    </small>
                  </span>
                  <Toggle
                    label="Canvas grid"
                    checked={d.canvasGrid}
                    onChange={() => c("canvasGrid", !d.canvasGrid)}
                  />
                </label>
                {field(
                  "gridStrength",
                  "Grid visibility",
                  "1 is faint; 10 is strongest.",
                  1,
                  10,
                  false,
                  true,
                )}
                {field(
                  "outlineStrength",
                  "Sheet outline",
                  "Controls the sheet edge in the canvas and previews.",
                  1,
                  10,
                  false,
                  true,
                )}
                <label className="setting-field">
                  <span>
                    Interface spacing
                    <small>Controls rows and preview density.</small>
                  </span>
                  <select
                    value={d.uiDensity}
                    onChange={(e) => c("uiDensity", e.target.value)}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="balanced">Balanced</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <label className="setting-field">
                  <span>
                    Preview size
                    <small>Size of Results and History cards.</small>
                  </span>
                  <select
                    value={d.thumbnailSize}
                    onChange={(e) => c("thumbnailSize", e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
                <label className="setting-field">
                  <span>
                    Motion
                    <small>
                      Use system preference or reduce interface movement.
                    </small>
                  </span>
                  <select
                    value={d.motion}
                    onChange={(e) => c("motion", e.target.value)}
                  >
                    <option value="system">Follow system</option>
                    <option value="reduced">Reduced motion</option>
                  </select>
                </label>
              </div>
            </section>
          )}
          {tab === "storage" && (
            <section className="storage-settings">
              <div className="storage-hero">
                <Archive />
                <div>
                  <h3>Keep every completed nest</h3>
                  <p>
                    Nestform always keeps History locally. Choose a backup
                    folder to also save a reopenable SVG and job record after
                    every completed run.
                  </p>
                </div>
              </div>
              <div className="storage-card">
                <span
                  className={`storage-status ${storage.folder ? "ready" : "local"}`}
                >
                  {storage.folder ? "Backup active" : "Local history"}
                </span>
                <h3>
                  {storage.count.toLocaleString()} saved{" "}
                  {storage.count === 1 ? "nest" : "nests"}
                </h3>
                <p>
                  {storage.folder ||
                    "Choose a folder on another drive or synced location for automatic backups."}
                </p>
                <div>
                  <Button
                    className="primary"
                    icon={FolderPlus}
                    onClick={() => void onChooseHistory()}
                  >
                    {storage.folder
                      ? "Change backup folder"
                      : "Choose history folder"}
                  </Button>
                  {storage.folder && (
                    <Button
                      icon={FolderOpen}
                      onClick={() => void onOpenHistory()}
                    >
                      Open folder
                    </Button>
                  )}
                </div>
              </div>
              <div className="storage-notes">
                <h3>What is saved</h3>
                <p>
                  <b>SVG output</b>
                  <small>
                    The finished nest at its exact physical dimensions.
                  </small>
                </p>
                <p>
                  <b>Job record</b>
                  <small>
                    Project name, time, parts, sheets, units and result details.
                  </small>
                </p>
              </div>
            </section>
          )}
          {tab === "about" && (
            <section className="about">
              <img src="./nestform-logo.svg" alt="Nestform geometric N logo" />
              <h2>Nestform 0.4.0</h2>
              <p className="made-by">Made by Yaze Media</p>
              <p>
                Local nesting engine connected · SVG processing stays local.
              </p>
              <div className="doc-cards">
                <button onClick={onTour}>Replay guided tour</button>
                <button onClick={onGuide}>How to use & internal wiki</button>
                <details>
                  <summary>Safety for production</summary>
                  <Markdown text={safety} />
                </details>
                <details>
                  <summary>Licensing and third-party notices</summary>
                  <Markdown text={notices} />
                </details>
              </div>
              <div className="support">
                <h3>Contact & bug reports</h3>
                <p>kirstentrimaley@gmail.com</p>
                <Button
                  onClick={() =>
                    void api.reportBug(
                      "Nestform bug report",
                      "Nestform 0.4.0\n\nWhat happened:\n\nSteps to reproduce:\n",
                    )
                  }
                >
                  Report a bug
                </Button>
              </div>
            </section>
          )}
          {tab === "changelog" && <Markdown text={changelog} />}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <footer>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          className="primary"
          onClick={async () => {
            try {
              await onSave(d);
              onClose();
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Save settings
        </Button>
      </footer>
    </Modal>
  );
}
function GuideDialog({ onClose }: { onClose: () => void }) {
  const [t, setT] = React.useState<"guide" | "technical" | "safety">("guide");
  return (
    <Modal title="How to use Nestform" wide onClose={onClose}>
      <div className="guide-tabs">
        <button
          className={t === "guide" ? "active" : ""}
          onClick={() => setT("guide")}
        >
          Step by step
        </button>
        <button
          className={t === "technical" ? "active" : ""}
          onClick={() => setT("technical")}
        >
          Technical wiki
        </button>
        <button
          className={t === "safety" ? "active" : ""}
          onClick={() => setT("safety")}
        >
          Safety
        </button>
      </div>
      <div className="guide-content">
        <Markdown
          text={t === "guide" ? guide : t === "technical" ? wiki : safety}
        />
      </div>
    </Modal>
  );
}
function AddSheet({
  settings,
  onAdd,
  onClose,
}: {
  settings: Settings;
  onAdd: (w: number, h: number, q: number, name?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(""),
    [w, setW] = React.useState(settings.units === "mm" ? 600 : 24),
    [h, setH] = React.useState(settings.units === "mm" ? 400 : 16),
    [q, setQ] = React.useState(1),
    [e, setE] = React.useState("");
  return (
    <Modal title="Add sheet or offcut" onClose={onClose}>
      <div className="form-body">
        <label className="stacked-field">
          Name (optional)
          <input
            value={name}
            placeholder="Birch offcut A"
            onChange={(x) => setName(x.target.value)}
          />
        </label>
        {[
          ["Width", w, setW],
          ["Height", h, setH],
        ].map(([l, v, set]: any) => (
          <label className="setting-field" key={l}>
            <span>
              {l} ({u(settings)})
            </span>
            <NumberField
              label={`Sheet ${String(l).toLowerCase()}`}
              value={v}
              min={0.001}
              onChange={set}
            />
          </label>
        ))}
        <label className="setting-field">
          <span>Quantity</span>
          <NumberField
            label="Sheet quantity"
            value={q}
            min={1}
            max={10000}
            step={1}
            onChange={setQ}
          />
        </label>
        {e && <p className="form-error">{e}</p>}
      </div>
      <footer>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          className="primary"
          icon={Plus}
          onClick={async () => {
            try {
              await onAdd(w, h, q, name.trim() || undefined);
              onClose();
            } catch (x) {
              setE(String(x));
            }
          }}
        >
          Add stock
        </Button>
      </footer>
    </Modal>
  );
}
function ImportChoice({
  onChoose,
  onClose,
}: {
  onChoose: (mode: "add" | "new") => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal title="Import parts" onClose={onClose}>
      <div className="choice-grid">
        <button onClick={() => void onChoose("add")}>
          <Plus />
          <span>
            <b>Add parts to this nest</b>
            <small>Keep the current parts, sheets and project name.</small>
          </span>
        </button>
        <button onClick={() => void onChoose("new")}>
          <FolderPlus />
          <span>
            <b>Create a new empty nest</b>
            <small>Choose files, then replace the current workspace.</small>
          </span>
        </button>
      </div>
      <footer>
        <Button onClick={onClose}>Cancel</Button>
      </footer>
    </Modal>
  );
}
function AutoNestDialog({
  settings,
  onImport,
  onStart,
  onClose,
}: {
  settings: Settings;
  onImport: () => Promise<number>;
  onStart: (values: {
    width: number;
    height: number;
    quantity: number;
    gapMin: number;
    gapMax: number;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0),
    [partCount, setPartCount] = useState(0),
    [width, setWidth] = useState(600),
    [height, setHeight] = useState(400),
    [quantity, setQuantity] = useState(1),
    [gapMin, setGapMin] = useState(settings.autoGapMinMm || 3),
    [gapMax, setGapMax] = useState(settings.autoGapMaxMm || 3),
    [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const start = async () => {
    setWorking(true);
    setError("");
    try {
      if (gapMax < gapMin)
        throw Error("Maximum gap cannot be smaller than minimum gap.");
      await onStart({ width, height, quantity, gapMin, gapMax });
    } catch (e) {
      setError(String(e).replace(/^Error: /, ""));
      setWorking(false);
    }
  };
  return (
    <Modal title="Auto Nest" wide onClose={onClose}>
      <div
        className="wizard-progress"
        aria-label={`Auto Nest step ${step + 1} of 3`}
      >
        {["Choose parts", "Set sheet", "Start"].map((label, index) => (
          <span className={index <= step ? "active" : ""} key={label}>
            <i>{index + 1}</i>
            {label}
          </span>
        ))}
      </div>
      <div className="auto-wizard">
        {step === 0 && (
          <section className="auto-intro">
            <Sparkles />
            <h2>Choose the parts to nest</h2>
            <p>
              Auto Nest starts a fresh job, imports your scaled drawing, and
              prepares the strongest search settings for you.
            </p>
            <Button
              className="primary auto-import"
              icon={ArrowUpFromLine}
              disabled={working}
              onClick={async () => {
                setWorking(true);
                const count = await onImport();
                setWorking(false);
                if (count) {
                  setPartCount(count);
                  setStep(1);
                }
              }}
            >
              {working ? "Opening files…" : "Choose drawing files"}
            </Button>
          </section>
        )}
        {step === 1 && (
          <section>
            <div className="wizard-heading">
              <div>
                <small>Parts ready</small>
                <h2>{partCount.toLocaleString()} part types imported</h2>
              </div>
              <span className="success-mark">
                <Check /> Ready
              </span>
            </div>
            <div className="auto-fields">
              <label>
                Sheet width{" "}
                <span>
                  <NumberField
                    label="Auto Nest sheet width"
                    value={width}
                    min={0.001}
                    onChange={setWidth}
                  />
                  <small>mm</small>
                </span>
              </label>
              <label>
                Sheet height{" "}
                <span>
                  <NumberField
                    label="Auto Nest sheet height"
                    value={height}
                    min={0.001}
                    onChange={setHeight}
                  />
                  <small>mm</small>
                </span>
              </label>
              <label>
                Number of sheets{" "}
                <NumberField
                  label="Auto Nest sheet quantity"
                  value={quantity}
                  min={1}
                  max={10000}
                  step={1}
                  onChange={setQuantity}
                />
              </label>
            </div>
            <details className="auto-advanced">
              <summary>Gap range</summary>
              <p>
                Auto Nest defaults to an exact 3 mm clearance. Set a range only
                when you want it to explore larger clearances.
              </p>
              <div>
                <label>
                  Minimum{" "}
                  <span>
                    <NumberField
                      label="Minimum automatic gap"
                      value={gapMin}
                      min={0}
                      max={1000}
                      onChange={setGapMin}
                    />
                    <small>mm</small>
                  </span>
                </label>
                <label>
                  Maximum{" "}
                  <span>
                    <NumberField
                      label="Maximum automatic gap"
                      value={gapMax}
                      min={0}
                      max={1000}
                      onChange={setGapMax}
                    />
                    <small>mm</small>
                  </span>
                </label>
              </div>
            </details>
          </section>
        )}
        {step === 2 && (
          <section className="auto-review">
            <Sparkles />
            <h2>Ready for the best automatic fit</h2>
            <div className="review-grid">
              <span>
                <small>Parts</small>
                <b>{partCount.toLocaleString()} types</b>
              </span>
              <span>
                <small>Stock</small>
                <b>
                  {n(width)} × {n(height)} mm · {quantity}
                </b>
              </span>
              <span>
                <small>Gap</small>
                <b>
                  {gapMin === gapMax
                    ? `${n(gapMin)} mm`
                    : `${n(gapMin)}–${n(gapMax)} mm`}
                </b>
              </span>
              <span>
                <small>Rotation</small>
                <b>6 rotations · 60° steps</b>
              </span>
            </div>
            <p>
              Nestform will test part order and six evenly spaced orientations,
              keep improving the layout, and retain the best result if you stop
              early.
            </p>
          </section>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="wizard-actions">
        <Button onClick={onClose}>Cancel</Button>
        <span />
        {step > 0 && (
          <Button icon={ArrowLeft} onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step === 1 && (
          <Button
            className="primary"
            icon={ArrowRight}
            onClick={() => setStep(2)}
          >
            Review
          </Button>
        )}
        {step === 2 && (
          <Button
            className="primary"
            icon={Play}
            disabled={working}
            onClick={() => void start()}
          >
            {working ? "Starting…" : "Start Auto Nest"}
          </Button>
        )}
      </footer>
    </Modal>
  );
}
const tourSteps = [
  {
    target: "[data-tour='auto']",
    title: "Start with Auto Nest",
    text: "Choose your drawing, enter the sheet size and quantity, then let Nestform configure the search.",
  },
  {
    target: "[data-tour='parts']",
    title: "Check your parts",
    text: "Every imported shape appears here. Adjust quantities or names before starting.",
  },
  {
    target: "[data-tour='sheets']",
    title: "Add all available stock",
    text: "List full sheets and offcuts so Nestform can use the best combination.",
  },
  {
    target: "[data-tour='start']",
    title: "Run and improve",
    text: "Start manually whenever you prefer exact settings. The countdown shows how long remains.",
  },
  {
    target: "[data-tour='results']",
    title: "Compare results",
    text: "Results and dated History previews stay together in this panel.",
  },
  {
    target: "[data-tour='export']",
    title: "Export at exact scale",
    text: "Export the selected SVG in your working units when the layout is ready.",
  },
];
function Tour({
  onClose,
  onNever,
}: {
  onClose: () => void;
  onNever: () => void;
}) {
  const [step, setStep] = useState(0),
    [rect, setRect] = useState<DOMRect>();
  useEffect(() => {
    const update = () =>
      setRect(
        document.querySelector(tourSteps[step].target)?.getBoundingClientRect(),
      );
    update();
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, [step]);
  const item = tourSteps[step];
  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="false"
      aria-label="Getting started tour"
    >
      {rect && (
        <>
          <span
            className="tour-spotlight"
            style={{
              left: rect.left - 6,
              top: rect.top - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />
          <span
            className="tour-arrow"
            style={{
              left: Math.min(
                innerWidth - 34,
                Math.max(12, rect.left + rect.width / 2 - 10),
              ),
              top: Math.min(innerHeight - 38, rect.bottom + 8),
            }}
          >
            <ArrowUp />
          </span>
        </>
      )}
      <section className="tour-card">
        <header>
          <span>
            Step {step + 1} of {tourSteps.length}
          </span>
          <IconButton icon={X} title="Close tour" onClick={onClose} />
        </header>
        <h2>{item.title}</h2>
        <p>{item.text}</p>
        <footer>
          <button className="text-button" onClick={onNever}>
            Don’t show again
          </button>
          <span />
          {step > 0 && (
            <Button icon={ArrowLeft} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < tourSteps.length - 1 ? (
            <Button
              className="primary"
              icon={ArrowRight}
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          ) : (
            <Button className="primary" icon={Check} onClick={onNever}>
              Done
            </Button>
          )}
        </footer>
      </section>
    </div>
  );
}
function HistoryDialog({
  items,
  initialId,
  onClose,
  onExport,
}: {
  items: HistoryEntry[];
  initialId?: string;
  onClose: () => void;
  onExport: (id: string) => void;
}) {
  const [id, setId] = React.useState(initialId || items[0]?.id),
    x = items.find((i) => i.id === id);
  return (
    <Modal title="History" wide onClose={onClose}>
      <div className="history-layout">
        <div className="history-list">
          {items.length ? (
            items.map((i) => (
              <button
                key={i.id}
                className={i.id === id ? "active" : ""}
                onClick={() => setId(i.id)}
              >
                <strong>{i.projectName}</strong>
                <span>{new Date(i.createdAt).toLocaleString()}</span>
                <small>
                  {i.partCount.toLocaleString()} parts · {i.sheetCount} sheets
                </small>
              </button>
            ))
          ) : (
            <div className="empty-list">
              <FileClock />
              <p>Completed nests will be saved here.</p>
            </div>
          )}
        </div>
        <div className="history-preview">
          {x && (
            <>
              <div className="history-drawing">
                <SvgImage className="history-svg" svg={historyDisplay(x.svg)} />
              </div>
              <div className="history-meta">
                <h3>{x.projectName}</h3>
                <p>
                  {n(x.width)} {x.units} × {n(x.height)} {x.units} ·{" "}
                  {x.partCount.toLocaleString()} parts · {x.sheetCount} sheets ·{" "}
                  {dur(x.durationMs)}
                </p>
                <Button
                  className="primary"
                  icon={ArrowDownToLine}
                  onClick={() => onExport(x.id)}
                >
                  Export SVG again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
function App() {
  const [state, setState] = React.useState<Snapshot>(),
    [modal, setModal] = React.useState<
      "settings" | "sheet" | "help" | "history" | "import" | "auto" | null
    >(null),
    [tour, setTour] = React.useState(false),
    [storage, setStorage] = React.useState<HistoryStorage>({
      folder: null,
      count: 0,
      status: "local",
    }),
    [autoMode, setAutoMode] = React.useState(false),
    [inspector, setInspector] = React.useState<"results" | "history">(
      "results",
    ),
    [hist, setHist] = React.useState<HistoryEntry[]>([]),
    [historyId, setHistoryId] = React.useState<string>(),
    [sel, setSel] = React.useState<number[]>([]),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [notice, setNotice] = React.useState(""),
    [menu, setMenu] = React.useState(false),
    [sheet, setSheet] = React.useState(0),
    [zoom, setZoom] = React.useState(1),
    [pan, setPan] = React.useState({ x: 0, y: 0 }),
    [name, setName] = React.useState("");
  const onboard = useRef(false),
    drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
      null,
    );
  useEffect(() => {
    api
      .snapshot()
      .then((s) => {
        setState(s);
        setName(s.projectName);
      })
      .catch((e) => setError(String(e)));
    return api.subscribe((s) => {
      setState(s);
      if (document.activeElement?.getAttribute("aria-label") !== "Project name")
        setName(s.projectName);
    });
  }, []);
  useEffect(() => {
    if (state && !state.settings.onboardingSeen && !onboard.current) {
      onboard.current = true;
      setTour(true);
    }
  }, [state?.settings.onboardingSeen]);
  const settings = state?.settings,
    running = state?.status === "running",
    locked = running || busy,
    parts = state?.parts.filter((p) => !p.sheet) || [],
    sheets = state?.parts.filter((p) => p.sheet) || [],
    total = parts.reduce((a, p) => a + p.quantity, 0),
    result =
      state?.results.find((r) => r.id === state.selectedResult) ||
      state?.results[0],
    preview =
      result?.sheets[sheet] ||
      (sheets[0]
        ? {
            width: sheets[0].bounds.width,
            height: sheets[0].bounds.height,
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sheets[0].bounds.x} ${sheets[0].bounds.y} ${sheets[0].bounds.width} ${sheets[0].bounds.height}">${sheets[0].svg}</svg>`,
          }
        : undefined);
  useEffect(() => {
    setSheet(0);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [result?.id, sheet]);
  const act = useCallback(async (fn: () => Promise<any>) => {
      setBusy(true);
      setError("");
      try {
        const r = await fn();
        if (r?.message) setNotice(r.message);
        return r;
      } catch (e) {
        setError(String(e).replace(/^Error: /, ""));
      } finally {
        setBusy(false);
      }
    }, []),
    close = () => setModal(null),
    openSettings = async () => {
      setStorage(await api.historyStorage());
      setModal("settings");
    },
    openHist = async (id?: string) => {
      const [items, status] = await Promise.all([
        api.history(),
        api.historyStorage(),
      ]);
      setHist(items);
      setStorage(status);
      setHistoryId(id);
      setModal("history");
    },
    showHistory = async () => {
      setInspector("history");
      const [items, status] = await Promise.all([
        api.history(),
        api.historyStorage(),
      ]);
      setHist(items);
      setStorage(status);
    };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "o" && !locked) {
        e.preventDefault();
        setModal("import");
      }
      if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        if (!modal) setZoom((z) => Math.min(6, z * 1.2));
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        if (!modal) setZoom((z) => Math.max(0.25, z / 1.2));
      }
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        if (modal) return;
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [locked, modal, act]);
  const row = (p: Part) => (
    <div
      className={`part-row ${sel.includes(p.id) ? "selected" : ""}`}
      key={p.id}
    >
      <button
        className="part-select"
        onClick={() =>
          setSel((s) =>
            s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id],
          )
        }
      >
        <PartPreview part={p} />
      </button>
      <div className="part-info">
        <input
          value={p.name}
          disabled={locked}
          onChange={(e) =>
            void act(() => api.updatePart(p.id, { name: e.target.value }))
          }
        />
        <small>{settings ? dims(p, settings) : ""}</small>
      </div>
      <NumberField
        label={`Quantity for ${p.name}`}
        value={p.quantity}
        min={1}
        max={10000}
        step={1}
        disabled={locked}
        onChange={(q) => void act(() => api.updatePart(p.id, { quantity: q }))}
      />
    </div>
  );
  return (
    <div
      className="app-shell"
      data-theme={settings?.theme || "dark"}
      data-accent={settings?.accent || "cyan"}
      data-grid={settings?.canvasGrid === false ? "off" : "on"}
      data-grid-strength={settings?.gridStrength || 5}
      data-density={settings?.uiDensity || "balanced"}
      data-thumbnails={settings?.thumbnailSize || "medium"}
      data-motion={settings?.motion || "system"}
      style={
        {
          "--grid-opacity": String(
            0.012 + ((settings?.gridStrength || 5) / 10) * 0.085,
          ),
        } as React.CSSProperties
      }
    >
      <header className="titlebar">
        <div className="brand">
          <img src="./nestform-logo.png" />
          <b>nestform</b>
        </div>
        <div className="project-name">
          <Pencil />
          <input
            aria-label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() =>
              name.trim() && name !== state?.projectName
                ? void act(() => api.renameProject(name))
                : setName(state?.projectName || "Untitled job")
            }
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>
        <div className="command-settings">
          <label>
            <span>Spacing</span>
            <NumberField
              label="Part spacing"
              value={settings ? settings.spacing / f(settings) : 0}
              min={0}
              disabled={locked || !settings}
              onChange={(v) =>
                void act(() => api.settings({ spacing: v * f(settings!) }))
              }
            />
            <small>{settings ? u(settings) : "mm"}</small>
          </label>
          <label>
            <span>Rotations</span>
            <NumberField
              label="Rotations"
              value={settings?.rotations || 4}
              min={1}
              max={360}
              step={1}
              disabled={locked || !settings}
              onChange={(v) => void act(() => api.settings({ rotations: v }))}
            />
          </label>
          <label>
            <span>Merge</span>
            <Toggle
              label="Merge common lines"
              checked={settings?.mergeLines ?? true}
              disabled={locked || !settings}
              onChange={() =>
                void act(() =>
                  api.settings({ mergeLines: !settings!.mergeLines }),
                )
              }
            />
          </label>
        </div>
        <div className="title-actions">
          <Button
            icon={ArrowUpFromLine}
            disabled={locked}
            onClick={() => setModal("import")}
          >
            Import
          </Button>
          {!running && (
            <Button
              data-tour="auto"
              className="auto-button"
              icon={Sparkles}
              disabled={locked}
              onClick={() => setModal("auto")}
            >
              Auto Nest
            </Button>
          )}
          {running ? (
            <Button
              className="start-button stop"
              icon={Square}
              onClick={() => void act(() => api.stop())}
            >
              Stop
            </Button>
          ) : (
            <Button
              className="start-button primary"
              data-tour="start"
              icon={Play}
              disabled={!parts.length || !sheets.length || busy}
              onClick={() => void act(() => api.start())}
            >
              Start nest
            </Button>
          )}
          <div className="export-wrap">
            <Button
              icon={ArrowDownToLine}
              disabled={!result}
              data-tour="export"
              onClick={() => setMenu(!menu)}
            >
              Export <ChevronDown />
            </Button>
            {menu && (
              <div className="export-menu">
                <button
                  onClick={() => {
                    setMenu(false);
                    void act(() => api.exportFile("svg"));
                  }}
                >
                  SVG file<small>Exact physical units</small>
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    void act(() => api.exportFile("dxf"));
                  }}
                >
                  DXF file<small>Online conversion</small>
                </button>
              </div>
            )}
          </div>
          <IconButton
            icon={Settings2}
            title="Settings"
            disabled={locked || !settings}
            onClick={() => void openSettings()}
          />
          <IconButton
            icon={HelpCircle}
            title="Help and about"
            onClick={() => setModal("help")}
          />
        </div>
        <div className="window-buttons">
          <button
            aria-label="Minimize"
            onClick={() => api.windowAction("minimize")}
          >
            <Minus />
          </button>
          <button
            aria-label="Maximize"
            onClick={() => api.windowAction("maximize")}
          >
            <Maximize2 />
          </button>
          <button
            className="close"
            aria-label="Close"
            onClick={() => api.windowAction("close")}
          >
            <X />
          </button>
        </div>
      </header>
      {(error || state?.status === "error") && (
        <div className="alert">
          <span>{error || state?.message}</span>
          <IconButton icon={X} title="Dismiss" onClick={() => setError("")} />
        </div>
      )}
      <main className="workspace">
        <aside className="parts-dock" data-tour="parts">
          <div className="dock-heading">
            <h2>
              Parts <span>{parts.length || ""}</span>
            </h2>
            <IconButton
              icon={Plus}
              title="Import parts"
              disabled={locked}
              onClick={() => setModal("import")}
            />
          </div>
          <div className="parts-scroll">
            {parts.length ? (
              parts.map(row)
            ) : (
              <div className="parts-empty">
                <FolderOpen />
                <p>Import your parts</p>
                <small>SVG, DXF or CDR outlines</small>
              </div>
            )}
            <div className="dock-heading sheet-heading" data-tour="sheets">
              <h2>
                Sheets & offcuts <span>{sheets.length || ""}</span>
              </h2>
              <IconButton
                icon={Plus}
                title="Add sheet or offcut"
                disabled={locked}
                onClick={() => setModal("sheet")}
              />
            </div>
            {sheets.length ? (
              sheets.map(row)
            ) : (
              <button className="add-stock" onClick={() => setModal("sheet")}>
                <Plus /> Add available stock
              </button>
            )}
          </div>
          <div className="selection-tools">
            {sel.length ? (
              <>
                <span>{sel.length} selected</span>
                <Button
                  disabled={locked}
                  onClick={() =>
                    void act(async () => {
                      for (const id of sel) {
                        const p = state!.parts.find((x) => x.id === id)!;
                        await api.updatePart(id, { sheet: !p.sheet });
                      }
                      setSel([]);
                    })
                  }
                >
                  {state?.parts.find((p) => p.id === sel[0])?.sheet
                    ? "Make part"
                    : "Make sheet"}
                </Button>
                <IconButton
                  icon={Trash2}
                  title="Remove selected"
                  disabled={locked}
                  onClick={() =>
                    void act(async () => {
                      await api.removeParts(sel);
                      setSel([]);
                    })
                  }
                />
              </>
            ) : (
              <>
                <small>{total.toLocaleString()} parts in job</small>
                <IconButton
                  icon={RotateCcw}
                  title="Clear job"
                  disabled={locked || !state?.parts.length}
                  onClick={() =>
                    confirm(
                      "Clear this job? Completed results remain in History.",
                    ) && void act(() => api.clear())
                  }
                />
              </>
            )}
          </div>
        </aside>
        <section className="canvas-column">
          <div className="canvas-toolbar">
            <div className="job-status">
              <span className={`status-dot ${running ? "running" : ""}`} />
              <div>
                <strong>
                  {running
                    ? autoMode
                      ? "Auto Nest searching…"
                      : "Nesting…"
                    : result
                      ? "Stopped · result retained"
                      : parts.length
                        ? "Ready to nest"
                        : "Prepare a nest"}
                </strong>
                <small>
                  {result
                    ? `${result.placed.toLocaleString()} / ${total.toLocaleString()} parts · ${result.sheets.length} sheets`
                    : `${total.toLocaleString()} parts · ${sheets.reduce((a, p) => a + p.quantity, 0).toLocaleString()} sheets available`}
                </small>
              </div>
            </div>
            <div className="progress-wrap">
              <div className="progress-label">
                <span>
                  {running
                    ? "Timed search progress"
                    : state?.endedAt
                      ? state.progress >= 0.999
                        ? "Timed run complete"
                        : "Stopped early"
                      : "Run progress"}
                </span>
                <b>{Math.round((state?.progress || 0) * 100)}%</b>
              </div>
              <div className="progress-track">
                <i style={{ transform: `scaleX(${state?.progress || 0})` }} />
              </div>
            </div>
            <div className="remaining-block">
              <small>Remaining</small>
              <b>{dur(state?.remainingMs || 0)}</b>
            </div>
            <div className="candidates">
              <small>Candidates</small>
              <b>{(state?.evaluated || 0).toLocaleString()}</b>
            </div>
          </div>
          <div
            className="canvas"
            onWheel={(e) =>
              preview &&
              setZoom((z) =>
                Math.min(6, Math.max(0.25, z * (e.deltaY > 0 ? 0.9 : 1.1))),
              )
            }
            onPointerDown={(e) => {
              if (!preview || e.button !== 0) return;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                px: pan.x,
                py: pan.y,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current)
                setPan({
                  x: drag.current.px + e.clientX - drag.current.x,
                  y: drag.current.py + e.clientY - drag.current.y,
                });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            {preview ? (
              <div
                className="sheet-position"
                style={{
                  transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                }}
              >
                <SheetGraphic sheet={preview} />
              </div>
            ) : (
              <div className="empty-canvas">
                <img src="./nestform-logo.png" />
                <h1>A better fit starts here.</h1>
                <p>
                  Choose parts, set your sheet, and let Auto Nest find the fit.
                </p>
                <div className="empty-actions">
                  <Button
                    className="primary auto-button"
                    icon={Sparkles}
                    onClick={() => setModal("auto")}
                  >
                    Auto Nest
                  </Button>
                  <Button
                    icon={ArrowUpFromLine}
                    onClick={() => setModal("import")}
                  >
                    Import manually
                  </Button>
                </div>
                <button
                  className="text-button"
                  onClick={() => void act(() => api.loadSample())}
                >
                  Try the sample job
                </button>
              </div>
            )}
          </div>
          <div className="canvas-bottom">
            <span>
              {running ? (
                <>
                  <LoaderCircle className="spin" /> Searching for lower waste
                </>
              ) : (
                notice || state?.message || "Scroll to zoom · drag to pan"
              )}
            </span>
            <div>
              <IconButton
                icon={ZoomOut}
                title="Zoom out (Ctrl -)"
                onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}
              />
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <IconButton
                icon={ZoomIn}
                title="Zoom in (Ctrl +)"
                onClick={() => setZoom((z) => Math.min(6, z * 1.2))}
              />
              <IconButton
                icon={Maximize2}
                title="Fit to view (Ctrl 0)"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              />
            </div>
          </div>
        </section>
        <aside className="results-rail" data-tour="results">
          <header className="inspector-tabs">
            <button
              className={inspector === "results" ? "active" : ""}
              aria-pressed={inspector === "results"}
              onClick={() => setInspector("results")}
            >
              Results
            </button>
            <button
              className={inspector === "history" ? "active" : ""}
              aria-pressed={inspector === "history"}
              onClick={() => void showHistory()}
            >
              History
            </button>
          </header>
          {inspector === "results" ? (
            <div className="results-list inspector-view" key="results">
              {state?.results.length ? (
                state.results.map((r, ri) =>
                  r.sheets.map((s, si) => (
                    <button
                      style={{ animationDelay: `${Math.min(ri * 30, 180)}ms` }}
                      key={`${r.id}-${si}`}
                      className={`result-thumb ${result?.id === r.id && sheet === si ? "active" : ""}`}
                      onClick={() => {
                        setSheet(si);
                        void act(() => api.selectResult(r.id));
                      }}
                    >
                      <SheetGraphic sheet={s} />
                      <span>
                        <b>
                          {ri === 0 ? "Best" : `#${ri + 1}`} · Sheet {si + 1}
                        </b>
                        <small>
                          {settings
                            ? `${n(s.width / f(settings))} ${u(settings)} × ${n(s.height / f(settings))} ${u(settings)}`
                            : ""}
                        </small>
                      </span>
                      {result?.id === r.id && sheet === si && <Check />}
                    </button>
                  )),
                )
              ) : (
                <div className="empty-list">
                  Finished nests appear here with every sheet and dimension.
                </div>
              )}
            </div>
          ) : (
            <div className="history-rail inspector-view" key="history">
              <button
                className={`history-storage-banner ${storage.folder ? "ready" : ""}`}
                onClick={() => void openSettings()}
              >
                <Archive />
                <span>
                  <b>
                    {storage.folder
                      ? "History backup active"
                      : "Choose a backup folder"}
                  </b>
                  <small>
                    {storage.folder
                      ? `${storage.count.toLocaleString()} nests saved`
                      : "Keep SVG copies outside the app"}
                  </small>
                </span>
              </button>
              {hist.length ? (
                hist.map((h, i) => (
                  <button
                    style={{ animationDelay: `${Math.min(i * 30, 180)}ms` }}
                    key={h.id}
                    className="history-card"
                    onClick={() => void openHist(h.id)}
                  >
                    <span className="history-card-preview">
                      <SvgImage
                        svg={historyDisplay(h.svg)}
                        alt={`${h.projectName} history preview`}
                      />
                    </span>
                    <span className="history-card-meta">
                      <b>{h.projectName}</b>
                      <small>
                        {dateParts(h.createdAt).date} ·{" "}
                        {dateParts(h.createdAt).time}
                      </small>
                      <em>
                        {h.width} × {h.height} {h.units}
                      </em>
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty-list">
                  Completed nests are saved here for reopening and export.
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
      {modal === "settings" && settings && (
        <SettingsDialog
          settings={settings}
          storage={storage}
          onSave={(s) => api.settings(s)}
          onClose={close}
          onGuide={() => setModal("help")}
          onTour={() => {
            setModal(null);
            setTour(true);
          }}
          onChooseHistory={async () =>
            setStorage(await api.chooseHistoryFolder())
          }
          onOpenHistory={() => api.openHistoryFolder()}
        />
      )}{" "}
      {modal === "help" && <GuideDialog onClose={close} />}{" "}
      {modal === "import" && (
        <ImportChoice
          onClose={close}
          onChoose={async (mode) => {
            await act(() => api.importFiles(mode));
            setModal(null);
          }}
        />
      )}{" "}
      {modal === "auto" && settings && (
        <AutoNestDialog
          settings={settings}
          onClose={close}
          onImport={async () => {
            const before = (await api.snapshot()).parts.filter(
              (p) => !p.sheet,
            ).length;
            const imported = await act(() => api.importFiles("new"));
            if (imported?.canceled) return 0;
            const next = await api.snapshot();
            return next.parts.filter((p) => !p.sheet).length || before;
          }}
          onStart={async ({ width, height, quantity, gapMin, gapMax }) => {
            const scale = 72 / 25.4;
            await api.settings({
              units: "mm",
              spacing: gapMin * scale,
              rotations: 6,
              populationSize: Math.max(settings.populationSize, 24),
              mutationRate: Math.max(settings.mutationRate, 18),
              autoGapMinMm: gapMin,
              autoGapMaxMm: gapMax,
            });
            await api.addSheet(width, height, quantity, "Auto Nest sheet");
            setState(await api.snapshot());
            setAutoMode(true);
            await api.start();
            setModal(null);
          }}
        />
      )}{" "}
      {modal === "sheet" && settings && (
        <AddSheet settings={settings} onAdd={api.addSheet} onClose={close} />
      )}{" "}
      {modal === "history" && (
        <HistoryDialog
          items={hist}
          initialId={historyId}
          onClose={close}
          onExport={(id) => void act(() => api.exportHistory(id))}
        />
      )}
      {tour && (
        <Tour
          onClose={() => setTour(false)}
          onNever={() => {
            void api.settings({ onboardingSeen: true });
            setTour(false);
          }}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
