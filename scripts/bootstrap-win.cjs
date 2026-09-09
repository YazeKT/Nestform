const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const vendor = path.join(root, "vendor");
const archive = path.join(vendor, "boost_1_62_0.7z");
const destination = path.join(vendor, "boost_1_62_0");
const expected = "B91C2CDA8BEE73EA613130E19E72C9589E9EF0357C4C5CC5F7523DE82CCE11F7";
const source = "https://archives.boost.io/release/1.62.0/source/boost_1_62_0.7z";

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
}

function download(url, file, redirects = 0) {
  if (redirects > 5) throw new Error("Too many redirects while downloading Boost");
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Nestform-build" } }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url).toString(), file, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Boost download failed with HTTP ${response.statusCode}`));
        return;
      }
      const temporary = `${file}.tmp`;
      const output = fs.createWriteStream(temporary);
      response.pipe(output);
      output.on("finish", () => {
        output.close();
        fs.renameSync(temporary, file);
        resolve();
      });
      output.on("error", reject);
    }).on("error", reject);
  });
}

function findExtractor() {
  const candidates = [
    "7z",
    path.join(process.env.ProgramFiles || "", "7-Zip", "7z.exe"),
    path.join(process.env.ChocolateyInstall || "", "bin", "7z.exe"),
  ];
  const sevenZip = candidates.find((candidate) => {
    if (candidate !== "7z" && !fs.existsSync(candidate)) return false;
    return spawnSync(candidate, ["-h"], { stdio: "ignore" }).status === 0;
  });
  if (sevenZip) return { command: sevenZip, args: ["x", archive, `-o${vendor}`, "-y"] };
  if (spawnSync("tar", ["-tf", archive], { stdio: "ignore" }).status === 0) {
    return { command: "tar", args: ["-xf", archive, "-C", vendor] };
  }
  return null;
}

async function main() {
  const marker = path.join(destination, "boost", "geometry.hpp");
  if (fs.existsSync(marker)) {
    console.log("Boost 1.62 is already available.");
    return;
  }
  fs.mkdirSync(vendor, { recursive: true });
  if (!fs.existsSync(archive)) {
    console.log(`Downloading ${source}`);
    await download(source, archive);
  }
  const actual = hash(archive);
  if (actual !== expected) throw new Error(`Boost checksum mismatch. Expected ${expected}; received ${actual}`);
  const extractor = findExtractor();
  if (!extractor) throw new Error("Windows tar or 7-Zip is required to extract Boost.");
  const result = spawnSync(extractor.command, extractor.args, { stdio: "inherit" });
  if (result.status !== 0 || !fs.existsSync(marker)) throw new Error("Boost extraction failed");
  console.log("Boost 1.62 downloaded, verified, and extracted.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
