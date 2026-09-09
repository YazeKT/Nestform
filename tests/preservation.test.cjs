const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "vendor/upstream-hashes.json"), "utf8"));

for (const item of manifest) {
  test(`Preserved upstream source: ${item.path}`, () => {
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, item.path)))
      .digest("hex")
      .toUpperCase();
    assert.equal(actual, item.sha256);
  });
}

test("Upstream preservation manifest uses portable repository paths", () => {
  for (const item of manifest) {
    assert.equal(path.isAbsolute(item.path), false);
    assert.equal(item.path.includes(".."), false);
    assert.match(item.sha256, /^[A-F0-9]{64}$/);
  }
});

