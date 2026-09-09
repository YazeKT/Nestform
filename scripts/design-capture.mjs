import { connect } from "./cdp.mjs";
import fs from "node:fs/promises";
import path from "node:path";
const ui = await connect(),
  main = await connect(9346, "main"),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await ui.evaluate(
    `(async()=>{await nestform.stop();await nestform.clear();await nestform.settings({units:'inch'});await nestform.loadSample();await nestform.updatePart(0,{quantity:3});await nestform.updatePart(1,{quantity:4});await nestform.updatePart(2,{quantity:2});await nestform.addSheet(4,3,1);await nestform.start()})()`,
  );
  await wait(2300);
  await ui.send("Emulation.setDeviceMetricsOverride", {
    width: 1487,
    height: 1058,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(150);
  await ui.capture("validation/10-final-workshop.png");
  await ui.evaluate("nestform.stop()");
  await ui.send("Emulation.setDeviceMetricsOverride", {
    width: 1000,
    height: 680,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(120);
  await ui.capture("validation/11-minimum-window.png");
  await ui.evaluate("document.querySelector('.settings-button').click()");
  await wait(100);
  await ui.capture("validation/12-final-settings.png");
  const toggle = await ui.evaluate(
    "(()=>{const b=document.querySelector('dialog .toggle'),s=b.firstElementChild;return {track:b.getBoundingClientRect().toJSON(),knob:s.getBoundingClientRect().toJSON()}})()",
  );
  await fs.writeFile(
    "validation/design-control-check.json",
    JSON.stringify(toggle, null, 2),
  );
  await ui.evaluate(
    "document.querySelector('dialog [aria-label=\"Close dialog\"]').click()",
  );
  await ui.send("Emulation.clearDeviceMetricsOverride");
  await import("./compare-images.mjs");
  console.log(
    "Matched-size full and header comparisons, minimum window and corrected settings captured.",
  );
} finally {
  ui.close();
  main.close();
}
