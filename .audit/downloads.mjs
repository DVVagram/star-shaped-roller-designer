import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9336;
const BASE = "http://127.0.0.1:5181";
const ROOT = path.resolve(".audit/downloads");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });

const chrome = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.resolve(".audit/edge-downloads")}`,
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
const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const pageTarget = targets.find((t) => t.type === "page");

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };
    const send = (method, params = {}) =>
      new Promise((res, rej) => {
        const id = ++seq;
        pending.set(id, (m) =>
          m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result),
        );
        ws.send(JSON.stringify({ id, method, params }));
      });
    ws.onopen = () => resolve({ ws, send });
    ws.onerror = reject;
  });
}

const browser = await connect(version.webSocketDebuggerUrl);
const page = await connect(pageTarget.webSocketDebuggerUrl);

async function evaluate(expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(200);
  }
  return false;
}

async function navigate(url) {
  await page.send("Page.navigate", { url });
  await sleep(900);
}

async function clickText(text) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim().includes(${JSON.stringify(text)}),
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${text}`);
}

async function waitFile(dir, extension, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith(extension) && !name.endsWith(".crdownload"));
    for (const name of files) {
      const full = path.join(dir, name);
      const first = fs.statSync(full).size;
      if (first <= 0) continue;
      await sleep(250);
      const second = fs.statSync(full).size;
      if (first === second) return full;
    }
    await sleep(200);
  }
  throw new Error(`No ${extension} download in ${dir}`);
}

async function setDownloadDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  await browser.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: dir,
    eventsEnabled: true,
  });
}

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  console.log(`${name} ${ok ? "ok" : "FAIL"}`);
};

function inspectStl(file, label) {
  const buffer = fs.readFileSync(file);
  const count = buffer.readUInt32LE(80);
  const expected = 84 + count * 50;
  const header = buffer.subarray(0, 80).toString("ascii").replace(/\0/g, "").trim();
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let finite = true;
  for (let t = 0; t < count; t += 1) {
    const base = 84 + t * 50 + 12;
    for (let v = 0; v < 3; v += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = buffer.readFloatLE(base + v * 12 + axis * 4);
        if (!Number.isFinite(value)) finite = false;
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
    }
  }
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return {
    label,
    bytes: buffer.length,
    count,
    expected,
    header,
    finite,
    size,
    fits: size.every((value) => value <= 180.5),
    capability: /FIT PROTOTYPE/i.test(header),
  };
}

function inspectSpec(file, expectedId, typedValue) {
  const text = fs.readFileSync(file, "utf8");
  return {
    id: text.includes(`Design ID: ${expectedId}`),
    capability: /CAPABILITY: Fit prototype/.test(text),
    entered: text.includes("ENTERED VALUES"),
    derived: text.includes("DERIVED VALUES"),
    notChecked: text.includes("NOT CHECKED"),
    units: text.includes("STL is unitless"),
    typed: typedValue ? text.includes(typedValue) : true,
    noNormalised: typedValue ? !text.includes("- Wheel diameter: 82.55 mm") : true,
    clean: !/NaN|Infinity|undefined/.test(text),
  };
}

function inspectSvg(file) {
  const text = fs.readFileSync(file, "utf8");
  return {
    svg: text.startsWith("<svg"),
    sheet: text.includes("measurement sheet"),
    views: text.includes("Top view") && text.includes("Front view"),
    tolerance: text.includes("Not a tolerance drawing"),
    clean: !/NaN|Infinity|undefined/.test(text),
  };
}

try {
  /* ------------------------------------------------------------ library page */
  const libraryDir = path.join(ROOT, "library");
  await setDownloadDir(libraryDir);
  await navigate(`${BASE}/#/centering-cone`);
  await waitFor("Boolean(document.querySelector('#capability'))");
  await waitFor("Boolean([...document.querySelectorAll('button')].find((b) => /Download STL/.test(b.textContent || '')))");
  await sleep(700);

  await clickText("Download STL");
  const libraryStlFile = await waitFile(libraryDir, ".stl");
  const libraryStl = inspectStl(libraryStlFile, path.basename(libraryStlFile));
  check(
    "library-stl",
    libraryStl.count > 0 &&
      libraryStl.bytes === libraryStl.expected &&
      libraryStl.finite &&
      libraryStl.fits &&
      libraryStl.capability &&
      libraryStl.size.every((value) => value > 5),
    libraryStl,
  );

  await clickText("Specification (.txt)");
  const librarySpecFile = await waitFile(libraryDir, ".txt");
  const librarySpec = inspectSpec(librarySpecFile, "centering-cone");
  check(
    "library-spec",
    Object.values(librarySpec).every(Boolean),
    { file: path.basename(librarySpecFile), ...librarySpec },
  );

  await clickText("Dimension sheet (.svg)");
  const librarySvgFile = await waitFile(libraryDir, ".svg");
  const librarySvg = inspectSvg(librarySvgFile);
  check(
    "library-svg",
    Object.values(librarySvg).every(Boolean),
    { file: path.basename(librarySvgFile), ...librarySvg },
  );

  /* ------------------------------------------------------------- legacy page */
  const legacyDir = path.join(ROOT, "legacy");
  await setDownloadDir(legacyDir);
  await navigate(`${BASE}/#/star`);
  await waitFor("Boolean(document.querySelector('#outerDiameter'))");
  await sleep(800);

  const switched = await evaluate(`(() => {
    const inch = [...document.querySelectorAll('button')].find(
      (b) => (b.textContent || '').trim() === 'in' && b.getAttribute('aria-pressed') !== 'true',
    );
    if (!inch) return false;
    inch.click();
    return true;
  })()`);
  if (!switched) throw new Error("Could not switch the star designer to inches");
  await sleep(500);

  const typed = await evaluate(`(() => {
    const input = document.querySelector('#outerDiameter');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '3.25');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  if (!typed) throw new Error("Could not type an inch wheel diameter");
  await sleep(900);

  const exportReady = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      /Download STL/.test(b.textContent || ''),
    );
    return Boolean(button) && !button.disabled;
  })()`);
  check("legacy-inch-config-valid", exportReady, { exportReady });

  await clickText("Download STL");
  const legacyStlFile = await waitFile(legacyDir, ".stl");
  const legacyStl = inspectStl(legacyStlFile, path.basename(legacyStlFile));
  check(
    "legacy-stl",
    legacyStl.count > 0 &&
      legacyStl.bytes === legacyStl.expected &&
      legacyStl.finite &&
      legacyStl.fits &&
      legacyStl.capability &&
      legacyStl.size.some((value) => value > 75 && value < 92),
    legacyStl,
  );

  await clickText("Specification (.txt)");
  const legacySpecFile = await waitFile(legacyDir, ".txt");
  const legacySpec = inspectSpec(legacySpecFile, "star", "- Wheel diameter: 3.25 in");
  check(
    "legacy-spec-typed-inches",
    Object.values(legacySpec).every(Boolean),
    { file: path.basename(legacySpecFile), ...legacySpec },
  );

  await clickText("Dimension sheet (.svg)");
  const legacySvgFile = await waitFile(legacyDir, ".svg");
  const legacySvg = inspectSvg(legacySvgFile);
  check(
    "legacy-svg",
    Object.values(legacySvg).every(Boolean),
    { file: path.basename(legacySvgFile), ...legacySvg },
  );
} catch (error) {
  check("download-harness", false, String(error));
}

fs.writeFileSync(".audit/downloads-result.json", JSON.stringify(checks, null, 2));
const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length} download checks, ${failed.length} failing`);
browser.ws.close();
page.ws.close();
chrome.kill();
process.exit(failed.length ? 1 : 0);
