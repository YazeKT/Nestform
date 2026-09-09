// Compatibility host for the unchanged upstream placement evaluator.
const { parentPort, workerData: threadData } = require("node:worker_threads");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  v8 = require("node:v8");
const workerData =
  threadData || JSON.parse(process.env.NESTFORM_WORKER_DATA || "{}");
const channel = parentPort || {
  postMessage: (m) => process.send(m),
  on: (_name, fn) => process.on("message", fn),
};
if (!parentPort) process.on("disconnect", () => process.exit(0));
const handlers = new Map();
let currentJob = null;
class PairMap {
  constructor(pairs) {
    this.pairs = pairs;
  }
  require() {
    return this;
  }
  _spawnMapWorker() {
    return null;
  }
  map(fn) {
    return Promise.resolve().then(() =>
      this.pairs.map((pair, index) => {
        if (index % 8 === 0)
          channel.postMessage({
            kind: "background-progress",
            payload: {
              index: currentJob.index,
              progress: (0.5 * index) / this.pairs.length,
            },
          });
        return fn(pair);
      }),
    );
  }
}
const ipc = {
  on: (name, fn) => handlers.set(name, fn),
  send: (kind, payload) => channel.postMessage({ kind, payload }),
};
const stats = v8.getHeapStatistics();
const context = {
  console: { log() {}, time() {}, timeEnd() {}, warn() {}, error() {} },
  setTimeout,
  clearTimeout,
  performance: {
    memory: {
      get totalJSHeapSize() {
        return v8.getHeapStatistics().used_heap_size;
      },
      jsHeapSizeLimit: stats.heap_size_limit,
    },
  },
  Parallel: PairMap,
  require: (name) => {
    if (name === "electron") return { ipcRenderer: ipc };
    if (name === "../minkowski/Release/addon") return require(workerData.addon);
    if (name === "filequeue") return class {};
    if (name === "graceful-fs") return fs;
    if (name === "path" || name === "url") return require(name);
    throw Error("Unsupported engine dependency " + name);
  },
};
context.window = context;
context.self = context;
context.ClipperLib = require(path.join(workerData.legacy, "clippernode.js"));
vm.createContext(context);
for (const name of ["geometryutil.js", "d3-polygon.js", "background.js"])
  vm.runInContext(
    fs.readFileSync(path.join(workerData.legacy, name), "utf8"),
    context,
    { filename: name },
  );
context.onload();
process.on("unhandledRejection", (error) =>
  channel.postMessage({
    kind: "error",
    message: String(error?.stack || error),
  }),
);
channel.on("message", (payload) => {
  currentJob = payload;
  try {
    handlers.get("background-start")({}, payload);
  } catch (error) {
    channel.postMessage({
      kind: "error",
      message: String(error?.stack || error),
    });
  }
});
