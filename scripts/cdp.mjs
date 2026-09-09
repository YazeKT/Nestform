import fs from "node:fs/promises";
export async function connect(port = 9345, title = "Nestform") {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const target =
    targets.find((t) => t.title === title) ||
    targets.find((t) => title === "main" && t.type === "node");
  if (!target)
    throw Error(`Missing ${title}: ${targets.map((t) => t.title).join(", ")}`);
  const socket = new WebSocket(target.webSocketDebuggerUrl),
    pending = new Map();
  let seq = 0;
  await new Promise((ok, fail) => {
    socket.onopen = ok;
    socket.onerror = fail;
  });
  socket.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      clearTimeout(p.timer);
      m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq,
        timer = setTimeout(() => {
          pending.delete(id);
          reject(Error(`Timed out: ${method}`));
        }, 60000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text,
      );
    return r.result.value;
  };
  return {
    send,
    evaluate,
    close: () => socket.close(),
    capture: async (file) => {
      const r = await send("Page.captureScreenshot", { format: "png" });
      await fs.mkdir(new URL("../validation/", import.meta.url), {
        recursive: true,
      });
      await fs.writeFile(file, Buffer.from(r.data, "base64"));
    },
  };
}
if (
  process.argv[1] &&
  new URL(import.meta.url).pathname
    .toLowerCase()
    .endsWith(process.argv[1].replaceAll("\\", "/").toLowerCase())
) {
  const client = await connect(
    Number(process.argv[2] || 9345),
    process.argv[3] || "Nestform",
  );
  try {
    console.log(
      JSON.stringify(
        await client.evaluate(await fs.readFile(process.argv[4], "utf8")),
        null,
        2,
      ),
    );
  } finally {
    client.close();
  }
}
