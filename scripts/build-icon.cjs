// Package the supplied logo into the standard Windows multi-resolution ICO container.
// Electron's native decoder avoids an additional WebAssembly image runtime at build time.
const { app, nativeImage } = require("electron"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  source = nativeImage.createFromPath(
    path.join(root, "src/renderer/public/nestform-logo.png"),
  );
if (source.isEmpty()) throw Error("Logo PNG could not be loaded");
const sizes = [16, 24, 32, 48, 64, 128, 256],
  buffers = sizes.map((size) =>
    source.resize({ width: size, height: size, quality: "best" }).toPNG(),
  );
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const i = 6 + index * 16;
  header[i] = size === 256 ? 0 : size;
  header[i + 1] = header[i];
  header.writeUInt16LE(1, i + 4);
  header.writeUInt16LE(32, i + 6);
  header.writeUInt32LE(buffers[index].length, i + 8);
  header.writeUInt32LE(offset, i + 12);
  offset += buffers[index].length;
});
fs.writeFileSync(
  path.join(root, "src/renderer/public/nestform.ico"),
  Buffer.concat([header, ...buffers]),
);
app.quit();
