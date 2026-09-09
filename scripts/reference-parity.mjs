import { connect } from "./cdp.mjs";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  addon = require("../native/build/Release/nestform.node");
const rect = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const cases = [
  {
    name: "rectangle",
    A: rect(10, 20, 50, 30),
    B: rect(3, 5, 8, 6),
    holes: [],
  },
  {
    name: "hole",
    A: rect(0, 0, 100, 100),
    holes: [rect(20, 20, 60, 60)],
    B: rect(0, 0, 10, 10),
  },
  {
    name: "concave rotated",
    A: [
      { x: -20, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 15 },
      { x: 0, y: 15 },
      { x: 0, y: 50 },
      { x: -20, y: 50 },
    ],
    holes: [],
    B: [
      { x: 2.3, y: -9.1 },
      { x: 25.2, y: 17.1 },
      { x: -3.2, y: 15.9 },
    ],
  },
];
const original = await connect(9335, "background.html");
try {
  const evidence = [];
  for (const item of cases) {
    const expected = JSON.parse(
      await original.evaluate(
        `(function(){var c=${JSON.stringify(item)};c.A.children=c.holes;return JSON.stringify(require('../minkowski/Release/addon').calculateNFP({A:c.A,B:c.B}).map(function(p){return {points:p.slice(),children:p.children}}))})()`,
      ),
    );
    item.A.children = item.holes;
    const actual = addon
      .calculateNFP({ A: item.A, B: item.B })
      .map((p) => ({ points: p.slice(), children: p.children }));
    assert.deepEqual(actual, expected);
    evidence.push({ name: item.name, input: item, expected, exactMatch: true });
  }
  await fs.mkdir("tests/fixtures", { recursive: true });
  await fs.writeFile(
    "tests/fixtures/reference-native.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    "Three native cases exactly match the original Windows 1.0.5 addon, including holes and concave geometry.",
  );
} finally {
  original.close();
}
