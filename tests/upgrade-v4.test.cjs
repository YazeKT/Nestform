const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("Auto Nest uses the approved millimetre defaults", () => {
  const source = read("src/renderer/src.tsx");
  assert.match(source, /units: "mm"/);
  assert.match(source, /spacing: gapMin \* scale/);
  assert.match(source, /rotations: 6/);
  assert.match(source, /useState\(settings\.autoGapMinMm \|\| 3\)/);
});

test("History remains uncapped and writes portable backup pairs", () => {
  const source = read("src/main/index.ts");
  assert.doesNotMatch(source, /history\.slice\(/);
  assert.match(source, /`\$\{base\}\.svg`/);
  assert.match(source, /`\$\{base\}\.nestform\.json`/);
  assert.match(source, /for \(const entry of history\) await saveHistoryBackup\(entry\)/);
});

test("0.4 help and changelog describe Auto Nest accurately", () => {
  assert.match(read("CHANGELOG.md"), /six evenly spaced rotations/);
  assert.match(read("docs/USER-GUIDE.md"), /default clearance is exactly 3 mm/);
});
