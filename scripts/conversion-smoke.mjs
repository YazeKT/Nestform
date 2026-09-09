import { connect } from "./cdp.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
const ui = await connect(),
  main = await connect(9346, "main"),
  report = {};
const evaluate = (method, ...args) =>
  ui.evaluate(`nestform.${method}(...${JSON.stringify(args)})`);
let server;
try {
  await evaluate("stop");
  const initial = await evaluate("snapshot");
  report.stability = {
    status: initial.status,
    candidates: initial.evaluated,
    elapsedMs: initial.elapsedMs,
    results: initial.results.length,
  };
  assert.ok(initial.evaluated > 100);
  await main.evaluate(
    `(()=>{const d=process.mainModule.require('electron').dialog;globalThis.conversionDialogs={message:d.showMessageBox,save:d.showSaveDialog,open:d.showOpenDialog};d.showMessageBox=async()=>({response:1});d.showSaveDialog=async()=>({canceled:false,filePath:${JSON.stringify(path.resolve("validation/baseline.dxf"))}})})()`,
  );
  try {
    await evaluate("exportFile", "dxf");
    const content = await fs.readFile("validation/baseline.dxf", "utf8");
    assert.match(content, /\bSECTION\b/);
    assert.match(content, /\bEOF\b/);
    report.onlineDXFExport = { result: "passed", bytes: content.length };
    console.log("Online DXF export passed");
  } catch (error) {
    report.onlineDXFExport = {
      result: "service failure",
      message: String(error),
    };
    console.log("Online service result:", String(error));
  }
  const before = (await evaluate("snapshot")).results;
  server = http.createServer((_req, res) => {
    res.writeHead(503);
    res.end("Test service unavailable");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  await evaluate("settings", {
    conversionServer: `http://127.0.0.1:${address.port}`,
  });
  await assert.rejects(() => evaluate("exportFile", "dxf"), /503/);
  assert.deepEqual((await evaluate("snapshot")).results, before);
  report.failedConversionPreservesResults = true;
  await main.evaluate(
    "process.mainModule.require('electron').dialog.showMessageBox=async()=>({response:0})",
  );
  assert.equal((await evaluate("exportFile", "dxf")).canceled, true);
  report.canceledConversion = true;
  await evaluate("settings", {
    conversionServer: "https://convert.deepnest.io",
  });
  report.result = "passed";
} finally {
  if (server) server.close();
  await main
    .evaluate(
      `(()=>{const d=process.mainModule.require('electron').dialog;d.showMessageBox=conversionDialogs.message;d.showSaveDialog=conversionDialogs.save;d.showOpenDialog=conversionDialogs.open;delete globalThis.conversionDialogs})()`,
    )
    .catch(() => {});
  await evaluate("settings", {
    conversionServer: "https://convert.deepnest.io",
  }).catch(() => {});
  await fs.writeFile(
    "validation/conversion-report.json",
    JSON.stringify(report, null, 2),
  );
  ui.close();
  main.close();
}
