import { spawn } from "node:child_process";
import fs from "node:fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9334;
const BASE = "http://127.0.0.1:5181";
const profile = process.cwd() + "/.audit/edge-shots";
const chrome = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (let i = 0; i < 80; i += 1) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (res.ok) break;
  } catch {}
  await sleep(250);
}
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = targets.find((item) => item.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let seq = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (!msg.id) return;
  const entry = pending.get(msg.id);
  if (!entry) return;
  pending.delete(msg.id);
  if (msg.error) entry.reject(new Error(msg.error.message));
  else entry.resolve(msg.result);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await sleep(150);
  }
  throw new Error(`timeout: ${expression}`);
}

fs.mkdirSync(".audit/shots", { recursive: true });

async function shot({ route, width, height, mobile, scrollToPreview, out }) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: Boolean(mobile),
  });
  await send("Page.navigate", { url: `${BASE}/#/${route}` });
  await waitFor("Boolean(document.querySelector('canvas'))");
  await sleep(900);
  await evaluate(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Reset')?.click()`,
  );
  await sleep(700);
  if (scrollToPreview) {
    await evaluate(
      `(document.querySelector('img[aria-label$="3D preview"]') || document.querySelector('canvas')).scrollIntoView({ block: 'center' })`,
    );
    await sleep(600);
  } else {
    await evaluate("window.scrollTo(0, 0)");
    await sleep(300);
  }
  const scrollY = await evaluate("window.scrollY");
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: scrollY, width, height, scale: 1 },
  });
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  console.log(out);
}

await send("Page.enable");
await send("Runtime.enable");

await shot({
  route: "lettered-plate",
  width: 1440,
  height: 1000,
  mobile: false,
  scrollToPreview: true,
  out: ".audit/shots/cdp-lettered-desktop.png",
});
await shot({
  route: "lettered-plate",
  width: 390,
  height: 844,
  mobile: true,
  scrollToPreview: false,
  out: ".audit/shots/cdp-lettered-mobile-top.png",
});
await shot({
  route: "lettered-plate",
  width: 390,
  height: 844,
  mobile: true,
  scrollToPreview: true,
  out: ".audit/shots/cdp-lettered-mobile-preview.png",
});

ws.close();
chrome.kill();
