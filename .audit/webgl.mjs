import { spawn } from "node:child_process";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9335;
const BASE = "http://127.0.0.1:5181";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${process.cwd()}/.audit/edge-webgl`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);
for (let i = 0; i < 80; i += 1) {
  try {
    if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
  } catch {}
  await sleep(250);
}
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }))
    .result.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  `,
});
await send("Page.navigate", { url: `${BASE}/#/centrifuge-tube` });
await sleep(2500);
const result = await evaluate(`(() => {
  const text = document.body.innerText;
  const buttons = [...document.querySelectorAll('button')];
  const stl = buttons.find((b) => /Download STL/.test(b.textContent || ''));
  return {
    fallback: text.includes('needs WebGL'),
    measurements: text.includes('Calculated measurements'),
    exportEnabled: Boolean(stl) && !stl.disabled,
    capability: text.includes('Not suitable for the named high-risk use'),
    h1: document.querySelector('h1')?.innerText || '',
  };
})()`);
const ok =
  result.fallback &&
  result.measurements &&
  result.exportEnabled &&
  result.capability &&
  result.h1.length > 0;
console.log(JSON.stringify(result, null, 1));
console.log(ok ? "webgl-fallback ok" : "webgl-fallback FAIL");
ws.close();
chrome.kill();
process.exit(ok ? 0 : 1);
