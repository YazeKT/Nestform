import { connect } from "./cdp.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  Clipper = require("../vendor/legacy/clippernode.js");
const c = await connect(),
  main = await connect(9346, "main"),
  engine = await connect(9345, "Nestform engine");
const report = { checks: [], screens: [], started: new Date().toISOString() };
const record = (name, value = true) => {
  report.checks.push({ name, value });
  console.log(
    name,
    typeof value === "boolean" ? "passed" : JSON.stringify(value),
  );
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(name, ...args) {
  return c.evaluate(`nestform.${name}(...${JSON.stringify(args)})`);
}
async function waitNest(minimum = 1) {
  const end = Date.now() + 45000;
  while (Date.now() < end) {
    const s = await api("snapshot");
    if (s.status === "error") throw Error(s.message);
    if (s.evaluated >= minimum && s.results.length) return s;
    await wait(200);
  }
  throw Error("No nesting result within 45 seconds");
}
async function click(selector) {
  await c.evaluate(
    `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('Missing or disabled control');el.click()})()`,
  );
  await wait(100);
}
// Only the operating-system file chooser is supplied deterministically. The real
// renderer API, main validation, filesystem, parser, worker pool and exporters run.
async function dialogOverride(kind, value, fn) {
  await main.evaluate(
    `(()=>{const d=process.mainModule.require('electron').dialog;globalThis.smokeDialog={kind:${JSON.stringify(kind)},original:d[${JSON.stringify(kind)}]};d[${JSON.stringify(kind)}]=async()=>(${JSON.stringify(value)})})()`,
  );
  try {
    return await fn();
  } finally {
    await main.evaluate(
      `(()=>{const d=process.mainModule.require('electron').dialog;d[smokeDialog.kind]=smokeDialog.original;delete globalThis.smokeDialog})()`,
    );
  }
}
async function save(name, format = "svg") {
  const filename = path.resolve("validation", name);
  await dialogOverride(
    "showSaveDialog",
    { canceled: false, filePath: filename },
    () => api("exportFile", format),
  );
  return fs.readFile(filename, "utf8");
}
async function importFile(filename) {
  return dialogOverride(
    "showOpenDialog",
    { canceled: false, filePaths: [path.resolve(filename)] },
    () => api("importFiles"),
  );
}
async function capture(name) {
  await c.capture("validation/" + name);
  report.screens.push(name);
}
function geometry(best) {
  const scale = 1e6,
    shapes = [
      [
        [10, 10],
        [82, 10],
        [82, 46],
        [10, 46],
      ],
      Array.from({ length: 1024 }, (_, i) => [
        115 + 18 * Math.cos((2 * Math.PI * i) / 1024),
        28 + 18 * Math.sin((2 * Math.PI * i) / 1024),
      ]),
      [
        [150, 46],
        [186, 46],
        [168, 10],
      ],
    ];
  const placed = best.placements[0].sheetplacements.map((p) => ({
    id: p.id,
    points: shapes[p.source].map(([x, y]) => {
      const r = (p.rotation * Math.PI) / 180;
      return {
        X: Math.round((x * Math.cos(r) - y * Math.sin(r) + p.x) * scale),
        Y: Math.round((x * Math.sin(r) + y * Math.cos(r) + p.y) * scale),
      };
    }),
  }));
  let maximumOverlap = 0;
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const clip = new Clipper.Clipper(),
        out = [];
      clip.AddPath(placed[i].points, Clipper.PolyType.ptSubject, true);
      clip.AddPath(placed[j].points, Clipper.PolyType.ptClip, true);
      clip.Execute(
        Clipper.ClipType.ctIntersection,
        out,
        Clipper.PolyFillType.pftNonZero,
        Clipper.PolyFillType.pftNonZero,
      );
      maximumOverlap = Math.max(
        maximumOverlap,
        out.reduce((s, p) => s + Math.abs(Clipper.Clipper.Area(p)), 0) /
          scale /
          scale,
      );
    }
  const outside = placed
    .filter((p) =>
      p.points.some(
        (v) =>
          v.X < -2 ||
          v.Y < -2 ||
          v.X > 288 * scale + 2 ||
          v.Y > 216 * scale + 2,
      ),
    )
    .map((p) => p.id);
  assert.equal(placed.length, 9);
  assert.equal(outside.length, 0);
  assert.ok(maximumOverlap < 1e-4, `Overlap area ${maximumOverlap}`);
  return {
    parts: placed.length,
    outside,
    maximumOverlapSquarePoints: maximumOverlap,
    circleSamples: 1024,
    areaToleranceSquarePoints: 1e-4,
  };
}
try {
  await fs.mkdir("validation", { recursive: true });
  await api("stop");
  await api("clear");
  await api("settings", {
    units: "inch",
    mergeLines: true,
    legacyExportPadding: false,
    spacing: 0,
    rotations: 4,
    threads: 4,
    populationSize: 10,
    conversionServer: "https://convert.deepnest.io",
  });
  const security = await main.evaluate(
    `process.mainModule.require('electron').BrowserWindow.getAllWindows().map(w=>{const p=w.webContents.getLastWebPreferences();return {title:w.getTitle(),sandbox:p.sandbox,contextIsolation:p.contextIsolation,node:p.nodeIntegration}})`,
  );
  for (const w of security) {
    assert.ok(w.sandbox && w.contextIsolation && !w.node);
  }
  record("Both renderer boundaries are sandboxed", security);
  await capture("01-empty.png");
  await importFile("samples/baseline-parts.svg");
  await api("updatePart", 0, { quantity: 3 });
  await api("updatePart", 1, { quantity: 4 });
  await api("updatePart", 2, { quantity: 2 });
  await api("addSheet", 4, 3, 1);
  let s = await api("snapshot");
  assert.equal(s.parts.length, 4);
  assert.equal(s.parts[0].bounds.width, 72);
  record("Local file import, quantities and 4 × 3 inch sheet");
  await capture("02-prepared.png");
  await click(".start-button");
  s = await waitNest(12);
  assert.equal(s.results[0].placed, 9);
  await capture("03-running.png");
  await api("selectResult", s.results[0].id);
  await click(".start-button");
  s = await api("snapshot");
  assert.equal(s.status, "stopped");
  const frozen = JSON.stringify(s.results),
    count = s.evaluated;
  await wait(1800);
  const after = await api("snapshot");
  assert.equal(JSON.stringify(after.results), frozen);
  assert.equal(after.evaluated, count);
  record("UI Start / Stop retains results and rejects late worker changes", {
    evaluated: count,
  });
  const raw = await engine.evaluate(
    "JSON.parse(JSON.stringify(DeepNest.nests[0]))",
  );
  await fs.writeFile(
    "validation/placements.json",
    JSON.stringify(raw, null, 2),
  );
  record(
    "Independent fixture intersection and sheet-boundary check",
    geometry(raw),
  );
  const merged = await save("baseline-merged.svg");
  assert.match(merged, /width="4in"/);
  assert.match(merged, /height="3in"/);
  assert.match(merged, /viewBox="0 0 288 216"/);
  record("Exact-sized SVG export through main file writer");
  await api("settings", { legacyExportPadding: true });
  const padded = await save("baseline-legacy-padding.svg");
  assert.match(padded, /height="3\.3in"/);
  await api("settings", { legacyExportPadding: false });
  record("Optional original trailing padding");
  // The comparison export reads the same frozen placement with merging disabled,
  // without asking the optimizer to produce a new random result.
  const unmerged = await engine.evaluate(
    `(()=>{globalThis.smokeMergedLengths=DeepNest.nests.map(n=>n.mergedLength);DeepNest.nests.forEach(n=>n.mergedLength=0);return true})()`,
  );
  await save("baseline-unmerged.svg");
  await engine.evaluate(
    "DeepNest.nests.forEach((n,i)=>n.mergedLength=smokeMergedLengths[i]);delete globalThis.smokeMergedLengths",
  );
  await click('[title="Settings"]');
  await capture("04-settings.png");
  assert.ok(await c.evaluate("document.querySelector('dialog')?.open"));
  await click('dialog [aria-label="Close dialog"]');
  await api("start");
  s = await waitNest(count + 2);
  await api("stop");
  assert.ok(s.evaluated > count);
  record("Resume computes new candidates");
  await api("clear");
  await importFile("validation/baseline-unmerged.svg");
  s = await api("snapshot");
  assert.equal(s.parts.length, 9);
  const sizes = s.parts
    .map((p) =>
      [p.bounds.width, p.bounds.height]
        .sort((a, b) => a - b)
        .map((n) => Math.round(n * 100) / 100)
        .join("x"),
    )
    .sort();
  assert.deepEqual(
    sizes,
    [
      ...Array(3).fill("36x72"),
      ...Array(2).fill("36x36"),
      ...Array(4).fill("35.83x35.92"),
    ].sort(),
  );
  record(
    "Unmerged SVG reopens with nine dimensions matching the original parser, including its curve approximation",
  );
  await capture("05-reopened.png");
  const before = s.parts.length;
  await fs.writeFile("validation/invalid.svg", "<svg><broken>");
  await assert.rejects(() => importFile("validation/invalid.svg"));
  assert.equal((await api("snapshot")).parts.length, before);
  await assert.rejects(() => api("updatePart", 0, { quantity: -2 }));
  await assert.rejects(() => api("settings", { rotations: 0 }));
  record("Invalid import and invalid values preserve current job");
  await api("clear");
  await fs.writeFile(
    "validation/hole.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="150mm" viewBox="0 0 200 150"><rect x="5" y="5" width="80" height="80"/><circle cx="45" cy="45" r="25"/><rect x="110" y="5" width="20" height="20"/></svg>',
  );
  await importFile("validation/hole.svg");
  s = await api("snapshot");
  assert.equal(s.parts.length, 2);
  assert.match(s.parts[0].svg, /fill-rule="evenodd"/);
  assert.match(s.parts[0].svg, /a[0-9.]+,[0-9.]+/);
  const holes = await engine.evaluate(
    "DeepNest.parts[0].polygontree.children.length",
  );
  assert.equal(holes, 1);
  record("Internal hole retained in geometry and even-odd display");
  await api("settings", { units: "mm" });
  await api("addSheet", 200, 150, 1);
  await api("start");
  s = await waitNest();
  await api("stop");
  assert.equal(s.results[0].placed, 2);
  await capture("06-holes.png");
  record("Holed geometry nests successfully");
  await api("clear");
  await api("settings", { units: "inch" });
  await api("loadSample");
  await api("updatePart", 0, { quantity: 3 });
  await api("updatePart", 1, { quantity: 4 });
  await api("updatePart", 2, { quantity: 2 });
  await api("addSheet", 4, 3, 1);
  await api("start");
  s = await waitNest(20);
  await api("selectResult", s.results[0].id);
  await api("stop");
  await capture("07-final.png");
  record("Review job restored with a valid stopped nest");
  report.result = "passed";
} catch (error) {
  report.result = "failed";
  report.error = String(error.stack);
  throw error;
} finally {
  await api("stop").catch(() => {});
  await fs.writeFile(
    "validation/smoke-report.json",
    JSON.stringify(report, null, 2),
  );
  c.close();
  main.close();
  engine.close();
}
