import { connect } from "./cdp.mjs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const ui = await connect(),
  main = await connect(9346, "main"),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await ui.evaluate("nestform.start()");
  await wait(1200);
  const before = await ui.evaluate("nestform.snapshot()");
  const killed = await main.evaluate(
    `(()=>{const child=process._getActiveHandles().find(h=>h.constructor.name==='ChildProcess'&&h.spawnargs?.some(a=>a.endsWith('engine-worker.cjs')));if(!child)throw Error('No evaluator found');child.kill();return child.pid})()`,
  );
  let after;
  for (let i = 0; i < 40; i++) {
    after = await ui.evaluate("nestform.snapshot()");
    if (after.status === "error") break;
    await wait(100);
  }
  assert.equal(after.status, "error");
  assert.ok(after.results.length);
  assert.equal(after.results[0].fitness, before.results[0].fitness);
  await ui.capture("validation/09-worker-recovery.png");
  await ui.evaluate("nestform.start()");
  let resumed;
  for (let i = 0; i < 50; i++) {
    resumed = await ui.evaluate("nestform.snapshot()");
    if (resumed.evaluated > after.evaluated) break;
    await wait(100);
  }
  assert.equal(resumed.status, "running");
  assert.ok(resumed.evaluated > after.evaluated);
  await ui.evaluate("nestform.stop()");
  await fs.writeFile(
    "validation/resilience-report.json",
    JSON.stringify(
      {
        forcedEvaluatorExit: killed,
        applicationSurvived: true,
        retainedBestFitness: after.results[0].fitness,
        resumedCandidates: resumed.evaluated - after.evaluated,
        result: "passed",
      },
      null,
      2,
    ),
  );
  console.log(
    "Forced evaluator exit kept the app and best nest alive; restarting resumed computation.",
  );
} finally {
  ui.close();
  main.close();
}
