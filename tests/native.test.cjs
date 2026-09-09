const { test } = require("node:test"),
  assert = require("node:assert/strict");
const addon = require("../native/build/Release/nestform.node");
const rect = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const bounds = (ring) => ({
  left: Math.min(...ring.map((p) => p.x)),
  right: Math.max(...ring.map((p) => p.x)),
  top: Math.min(...ring.map((p) => p.y)),
  bottom: Math.max(...ring.map((p) => p.y)),
});
test("native rectangle convolution preserves bounds and first-point anchor", () => {
  const result = addon.calculateNFP({
    A: rect(10, 20, 50, 30),
    B: rect(3, 5, 8, 6),
  });
  assert.equal(result.length, 1);
  const b = bounds(result[0]);
  for (const [k, v] of Object.entries({
    left: 2,
    right: 60,
    top: 14,
    bottom: 50,
  }))
    assert.ok(Math.abs(b[k] - v) < 1e-5, `${k}: ${b[k]}`);
});
test("native convolution preserves an internal hole", () => {
  const A = rect(0, 0, 100, 100);
  A.children = [rect(20, 20, 60, 60)];
  const result = addon.calculateNFP({ A, B: rect(0, 0, 10, 10) });
  assert.equal(result.length, 1);
  assert.equal(result[0].children.length, 1);
  const b = bounds(result[0].children[0]);
  for (const [k, v] of Object.entries({
    left: 20,
    right: 70,
    top: 20,
    bottom: 70,
  }))
    assert.ok(Math.abs(b[k] - v) < 1e-5);
});
test("malformed and nonfinite native input fails cleanly", () => {
  for (const A of [
    [],
    [{ x: 0, y: 0 }],
    rect(0, 0, Infinity, 1),
    rect(0, 0, NaN, 1),
  ])
    assert.throws(() => addon.calculateNFP({ A, B: rect(0, 0, 1, 1) }));
});
for (const item of require("./fixtures/reference-native.json"))
  test(`Windows 1.0.5 parity: ${item.name}`, () => {
    const { A, B, holes } = item.input;
    A.children = holes;
    assert.deepEqual(
      addon
        .calculateNFP({ A, B })
        .map((p) => ({ points: p.slice(), children: p.children })),
      item.expected,
    );
  });
