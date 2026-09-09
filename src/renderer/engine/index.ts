import DOMPurify from "dompurify";
import { defaults } from "../../shared/settings";
import type {
  Settings,
  Snapshot,
  NestResult,
  SheetView,
} from "../../shared/types";
// Upstream DOM and polygon objects deliberately retain their custom array properties.
declare const DeepNest: any, SvgParser: any;
declare global {
  interface Window {
    engineBridge: any;
    onEngineBackground: (kind: string, payload: any) => void;
  }
}
const bridge = window.engineBridge,
  NS = "http://www.w3.org/2000/svg";
const partColors = ["#e27b7b", "#c6ca72", "#63c9d0", "#79aee0", "#ad91df"];
let settings = { ...defaults },
  status: Snapshot["status"] = "idle",
  revision = 0,
  selectedResult: number | null = null,
  evaluated = 0,
  elapsed = 0,
  started = 0,
  startedAt: number | null = null,
  plannedEndAt: number | null = null,
  endedAt: number | null = null,
  message = "",
  nextId = 1;
const ids = new WeakMap<object, number>();
const displays = new WeakMap<object, string>(),
  views = new WeakMap<object, NestResult>();
let followBest = true;
function idOf(n: object) {
  if (!ids.has(n)) ids.set(n, nextId++);
  return ids.get(n)!;
}
const serialize = (e: Element) => new XMLSerializer().serializeToString(e);
function safeSvg(input: string) {
  if (input.length > 25_000_000)
    throw Error("SVG is too large (25 MB maximum).");
  const parsed = new DOMParser().parseFromString(input, "image/svg+xml");
  if (
    parsed.querySelector("parsererror") ||
    parsed.documentElement.localName !== "svg"
  )
    throw Error("The file is not a valid SVG.");
  const clean = DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: false },
    FORBID_TAGS: ["foreignObject", "script", "use", "animate", "set", "style"],
    ADD_ATTR: ["xmlns:inkscape"],
  });
  const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
  for (const element of doc.querySelectorAll("*"))
    for (const attr of [...element.attributes]) {
      if (
        /^on/i.test(attr.name) ||
        (/href$/i.test(attr.name) &&
          !/^data:image\/(png|jpeg|webp);base64,/i.test(attr.value)) ||
        /url\s*\(/i.test(attr.value)
      )
        element.removeAttribute(attr.name);
    }
  return serialize(doc.documentElement);
}
function partSvg(part: any) {
  if (displays.has(part)) return displays.get(part)!;
  // Combine exact imported contours with even-odd fill so internal cut-outs stay transparent.
  const all = part.svgelements[0].parentNode.children,
    used = new Set<Element>(),
    segments: string[] = [];
  function contour(el: Element, tree: any): string {
    const n = (key: string) => Number(el.getAttribute(key) || 0),
      tag = el.localName;
    if (tag === "path") return el.getAttribute("d") || "";
    if (tag === "circle" || tag === "ellipse") {
      const x = n("cx"),
        y = n("cy"),
        rx = tag === "circle" ? n("r") : n("rx"),
        ry = tag === "circle" ? rx : n("ry");
      return `M${x - rx},${y}a${rx},${ry} 0 1 0 ${2 * rx},0a${rx},${ry} 0 1 0 ${-2 * rx},0Z`;
    }
    if (tag === "rect") {
      const x = n("x"),
        y = n("y"),
        w = n("width"),
        h = n("height"),
        rx = Math.min(n("rx") || n("ry"), w / 2),
        ry = Math.min(n("ry") || rx, h / 2);
      return rx
        ? `M${x + rx},${y}H${x + w - rx}A${rx},${ry} 0 0 1 ${x + w},${y + ry}V${y + h - ry}A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}H${x + rx}A${rx},${ry} 0 0 1 ${x},${y + h - ry}V${y + ry}A${rx},${ry} 0 0 1 ${x + rx},${y}Z`
        : `M${x},${y}h${w}v${h}h${-w}Z`;
    }
    if (tag === "polygon" || tag === "polyline")
      return "M" + el.getAttribute("points") + "Z";
    return "M" + tree.map((p: any) => `${p.x},${p.y}`).join("L") + "Z";
  }
  function walk(tree: any) {
    const el = all[tree.source];
    if (el) {
      used.add(el);
      segments.push(contour(el, tree));
    }
    for (const child of tree.children || []) walk(child);
  }
  walk(part.polygontree);
  const shape = document.createElementNS(NS, "path");
  shape.setAttribute("d", segments.join(" "));
  shape.setAttribute("fill-rule", "evenodd");
  const value =
    serialize(shape) +
    part.svgelements
      .filter((e: Element) => !used.has(e))
      .map((e: Element) => {
        const clone = e.cloneNode(true) as Element;
        clone.setAttribute("class", "part-detail");
        return serialize(clone);
      })
      .join("");
  displays.set(part, value);
  return value;
}
function sheetView(nest: any, placement: any, forExport = false): SheetView {
  const stock = DeepNest.parts[placement.sheet],
    b = stock.bounds,
    svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `${b.x} ${b.y} ${b.width} ${b.height}`);
  const defs = document.createElementNS(NS, "defs");
  svg.appendChild(defs);
  // Material hatching is generated with the actual drawing, in drawing coordinates.
  for (let i = 0; i < 5; i++) {
    const pattern = document.createElementNS(NS, "pattern");
    pattern.setAttribute("id", `hatch__view__${i}`);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "2.5");
    pattern.setAttribute("height", "2.5");
    pattern.setAttribute("patternTransform", "rotate(-45)");
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", "0");
    line.setAttribute("y2", "2.5");
    line.setAttribute(
      "stroke",
      ["#cf7878", "#bdc673", "#7dcbd0", "#87aac9", "#b1a1cf"][i],
    );
    line.setAttribute("stroke-width", ".45");
    line.setAttribute("opacity", ".55");
    pattern.appendChild(line);
    defs.appendChild(pattern);
  }
  const outline = document.createElementNS(NS, "g");
  outline.setAttribute("class", "sheet-outline");
  if (!forExport) {
    outline.innerHTML = partSvg(stock);
    for (const e of outline.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,line")) {
      e.setAttribute("fill", "none");
      e.setAttribute("stroke", "#85929c");
      e.setAttribute("stroke-width", String(1.05 + settings.outlineStrength * 0.07));
      e.setAttribute("vector-effect", "non-scaling-stroke");
    }
    svg.appendChild(outline);
  }
  for (const p of placement.sheetplacements) {
    const part = DeepNest.parts[p.source],
      group = document.createElementNS(NS, "g");
    group.setAttribute(
      "transform",
      `translate(${p.x} ${p.y}) rotate(${p.rotation})`,
    );
    group.setAttribute("class", `nested-part color-${p.source % 5}`);
    group.setAttribute(
      "style",
      `--part-fill:url(#hatch__view__${p.source % 5})`,
    );
    group.innerHTML = partSvg(part);
    for (const e of group.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,line")) {
      e.setAttribute("fill", `url(#hatch__view__${p.source % 5})`); e.setAttribute("stroke", partColors[p.source % 5]); e.setAttribute("stroke-width", ".85"); e.setAttribute("vector-effect", "non-scaling-stroke");
    }
    svg.appendChild(group);
  }
  return { width: b.width, height: b.height, svg: serialize(svg) };
}
function resultView(n: any): NestResult {
  if (views.has(n)) return views.get(n)!;
  const view = {
    id: idOf(n),
    fitness: n.fitness,
    placed: n.placements.reduce(
      (sum: number, s: any) => sum + s.sheetplacements.length,
      0,
    ),
    sheets: n.placements.map((p: any) => sheetView(n, p)),
    mergedLength: n.mergedLength || 0,
  };
  views.set(n, view);
  return view;
}
function snapshot(): Snapshot {
  const now = Date.now(), remainingMs = status === "running" && plannedEndAt ? Math.max(0, plannedEndAt - now) : 0;
  return {
    revision: ++revision,
    status,
    parts: DeepNest.parts.map((p: any, id: number) => ({
      id,
      name: p.name || `Part ${id + 1}`,
      quantity: p.quantity,
      sheet: p.sheet,
      bounds: p.bounds,
      svg: partSvg(p),
    })),
    results: DeepNest.nests.map(resultView),
    selectedResult,
    settings,
    evaluated,
    elapsedMs: elapsed + (status === "running" ? Date.now() - started : 0),
    message,
    projectName: "",
    startedAt,
    plannedEndAt,
    endedAt,
    remainingMs,
    progress: plannedEndAt && startedAt ? Math.min(1, Math.max(0, ((status === "running" ? now : endedAt || now) - startedAt) / (plannedEndAt - startedAt))) : 0,
  };
}
function emit() {
  bridge.state(snapshot());
}
function invalidate() {
  if (status === "running")
    throw Error("Stop nesting before changing the job.");
  DeepNest.reset();
  status = "idle";
  selectedResult = null;
  followBest = true;
  evaluated = 0;
  elapsed = 0;
  startedAt = plannedEndAt = endedAt = null;
  message = "";
}
function assertPart(id: number) {
  if (!Number.isInteger(id) || !DeepNest.parts[id])
    throw Error("Part no longer exists.");
  return DeepNest.parts[id];
}
function importSvg(args: any) {
  const content = safeSvg(args.content),
    before = DeepNest.parts.length,
    previousImports = DeepNest.imports.length;
  try {
    DeepNest.importsvg(
      args.name,
      null,
      content,
      args.scalingFactor ?? null,
      args.dxfFlag ?? false,
    );
    if (DeepNest.parts.length === before)
      throw Error(
        "No closed parts found. Convert text to paths and check that contours are closed.",
      );
  } catch (error) {
    DeepNest.parts.splice(before);
    DeepNest.imports.splice(previousImports);
    throw error;
  }
  const existing = DeepNest.parts.slice(0, before).filter((p: any) => !p.sheet).length;
  for (let i = before; i < DeepNest.parts.length; i++)
    DeepNest.parts[i].name = `Part ${existing + i - before + 1}`;
  invalidate();
  message = `Imported ${DeepNest.parts.length - before} part types from ${args.name}.`;
}
function exportSvg(format = "svg") {
  const n =
    DeepNest.nests.find((n: any) => idOf(n) === selectedResult) ||
    DeepNest.nests[0];
  if (!n) throw Error("Run nesting before exporting.");
  const svg = document.createElementNS(NS, "svg");
  let width = 0,
    height = 0;
  n.placements.forEach((s: any, index: number) => {
    const b = DeepNest.parts[s.sheet].bounds,
      g = document.createElementNS(NS, "g");
    g.setAttribute("transform", `translate(${-b.x} ${height - b.y})`);
    svg.appendChild(g);
    for (const p of s.sheetplacements) {
      const pg = document.createElementNS(NS, "g");
      pg.setAttribute(
        "transform",
        `translate(${p.x} ${p.y}) rotate(${p.rotation})`,
      );
      pg.setAttribute("data-nest-color", String(p.source % 5));
      for (const e of DeepNest.parts[p.source].svgelements)
        pg.appendChild(e.cloneNode(true));
      g.appendChild(pg);
    }
    width = Math.max(width, b.width);
    height += b.height;
    if (index < n.placements.length - 1 || settings.legacyExportPadding)
      height += b.height * 0.1;
  });
  const unitScale =
      settings.scale /
      (settings.units === "mm" ? 25.4 : 1) /
      (format === "dxf" ? settings.dxfExportScale : 1),
    units = settings.units === "mm" ? "mm" : "in";
  const physical = (value: number) => Number((value / unitScale).toFixed(6));
  svg.setAttribute("width", `${physical(width)}${units}`);
  svg.setAttribute("height", `${physical(height)}${units}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  if (settings.mergeLines && n.mergedLength > 0) {
    SvgParser.applyTransform(svg);
    SvgParser.flatten(svg);
    SvgParser.splitLines(svg);
    SvgParser.mergeOverlap(svg, 0.1 * settings.curveTolerance);
    SvgParser.mergeLines(svg);
  }
  for (const e of svg.querySelectorAll(
    "path,rect,circle,ellipse,polygon,polyline,line",
  )) {
    e.setAttribute("fill", "none");
    e.setAttribute("stroke", "#000");
    e.setAttribute("stroke-width", "0.1");
    e.removeAttribute("class");
  }
  return serialize(svg);
}
window.onEngineBackground = (kind, payload) => {
  if (status !== "running") return;
  if (kind === "background-response") {
    evaluated++;
    if (
      DeepNest.nests.length &&
      (followBest ||
        !DeepNest.nests.some((n: any) => idOf(n) === selectedResult))
    )
      selectedResult = idOf(DeepNest.nests[0]);
    emit();
  }
  if (kind === "error") {
    DeepNest.stop();
    elapsed += Date.now() - started;
    status = "error";
    message = String(payload);
    emit();
  }
};
setInterval(() => {
  if (status === "running") {
    if (plannedEndAt && Date.now() >= plannedEndAt) {
      DeepNest.stop(); elapsed += Date.now() - started; endedAt = Date.now(); status = "stopped"; message = "Timed run complete. Result saved to History."; emit(); bridge.autoStop();
    } else emit();
  }
}, 1000);
bridge.onCommand((command: any) => {
  const { id, op, args } = command;
  try {
    let result: unknown;
    switch (op) {
      case "snapshot":
        result = snapshot();
        break;
      case "configure":
        settings = args[0];
        DeepNest.config(settings);
        break;
      case "import":
        if (status === "running") throw Error("Stop nesting before importing.");
        importSvg(args[0]);
        break;
      case "addSheet": {
        invalidate();
        const [w, h, q, suppliedName] = args;
        const factor = settings.scale / (settings.units === "mm" ? 25.4 : 1),
          before = DeepNest.parts.length;
        DeepNest.importsvg(
          null,
          null,
          `<svg xmlns="${NS}"><rect x="0" y="0" width="${w * factor}" height="${h * factor}"/></svg>`,
        );
        const p = DeepNest.parts[before];
        if (!p) throw Error("Sheet dimensions are too small.");
        p.sheet = true;
        p.quantity = q;
        p.name = String(suppliedName || `Sheet ${DeepNest.parts.filter((x: any) => x.sheet).length}`);
        break;
      }
      case "updatePart": {
        invalidate();
        Object.assign(assertPart(args[0]), args[1]);
        break;
      }
      case "removeParts": {
        invalidate();
        for (const id of [...args[0]].sort((a, b) => b - a)) {
          assertPart(id);
          DeepNest.parts.splice(id, 1);
        }
        break;
      }
      case "clear":
        invalidate();
        DeepNest.parts.length = 0;
        DeepNest.imports.length = 0;
        break;
      case "settings": {
        const next = args[0];
        const onlyDisplay = Object.keys(next).every(
          (k) =>
            [
              "units",
              "legacyExportPadding",
              "conversionServer",
              "dxfExportScale",
              "runDurationSeconds",
              "theme",
              "accent",
              "canvasGrid",
              "gridStrength",
              "outlineStrength",
              "uiDensity",
              "thumbnailSize",
              "motion",
              "autoGapMinMm",
              "autoGapMaxMm",
              "onboardingSeen",
            ].includes(k) || next[k] === settings[k as keyof Settings],
        );
        if (!onlyDisplay) invalidate();
        settings = { ...settings, ...next };
        DeepNest.config(settings);
        break;
      }
      case "start": {
        if (status === "running") break;
        if (
          !DeepNest.parts.some((p: any) => p.sheet) ||
          !DeepNest.parts.some((p: any) => !p.sheet)
        )
          throw Error("Import parts and add or mark a sheet first.");
        status = "running";
        started = Date.now();
        startedAt = started;
        plannedEndAt = started + settings.runDurationSeconds * 1000;
        endedAt = null;
        message = "";
        DeepNest.start(
          () => {},
          () => {
            if (selectedResult === null && DeepNest.nests[0])
              selectedResult = idOf(DeepNest.nests[0]);
          },
        );
        break;
      }
      case "stop":
        if (status === "running") {
          DeepNest.stop();
          elapsed += Date.now() - started;
          endedAt = Date.now();
          status = "stopped";
        }
        break;
      case "selectResult":
        if (!DeepNest.nests.some((n: any) => idOf(n) === args[0]))
          throw Error("Result is no longer available.");
        selectedResult = args[0];
        followBest = idOf(DeepNest.nests[0]) === selectedResult;
        break;
      case "export":
        result = exportSvg(args[0]);
        break;
      default:
        throw Error("Unknown engine command");
    }
    emit();
    bridge.reply(id, result);
  } catch (error) {
    bridge.reply(
      id,
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }
});
bridge.ready();
