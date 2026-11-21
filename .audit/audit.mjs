import { spawn } from "node:child_process";
import fs from "node:fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9333;
const BASE = process.env.BASE || "http://127.0.0.1:5181";
const routes = JSON.parse(fs.readFileSync(".audit/routes.json", "utf8"));
const profile = process.cwd() + "/.audit/edge-profile";
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
    "--window-size=1440,1000",
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
const errors = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id) {
    const entry = pending.get(msg.id);
    if (entry) {
      pending.delete(msg.id);
      entry(msg);
    }
    return;
  }
  if (msg.method === "Runtime.exceptionThrown") {
    const details = msg.params.exceptionDetails;
    errors.push(`exception: ${details.text} ${details.exception?.description ?? ""}`.trim());
  }
  if (msg.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(msg.params.type)) {
    errors.push(
      `console.${msg.params.type}: ` +
        msg.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "),
    );
  }
  if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    errors.push(`log: ${msg.params.entry.text}`);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
    );
  }
  return result.result.value;
}
async function waitFor(expression, timeout = 7000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(150);
  }
  return false;
}

const probe = `(() => {
  const h1 = document.querySelector('h1');
  const builder = document.querySelector('#builder');
  const how = document.querySelector('#how');
  const canvas = document.querySelector('canvas');
  const useParagraph = document.querySelector('#use-case');
  const useText = useParagraph ? useParagraph.textContent.trim() : '';
  const notes = how ? how.innerText : '';
  const capability = document.querySelector('#capability');
  const about = document.querySelector('#about');
  const form = document.querySelector('#builder > div');
  const top = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);
  const buttons = [...document.querySelectorAll('button')];
  return {
    h1: h1 ? h1.innerText : '',
    canvas: canvas ? { width: canvas.width, height: canvas.height, cssW: canvas.clientWidth, cssH: canvas.clientHeight } : null,
    builder: Boolean(builder),
    how: Boolean(how),
    builderTop: top(builder),
    formTop: top(form),
    aboutTop: top(about),
    useTop: top(useParagraph),
    howTop: top(how),
    capabilityTop: top(capability),
    useText,
    notesLength: notes.length,
    notes: notes.slice(0, 900),
    capabilityLength: capability ? capability.innerText.trim().length : 0,
    specButton: buttons.some((b) => /Specification/.test(b.textContent || '')),
    drawingButton: buttons.some((b) => /Dimension sheet/.test(b.textContent || '')),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Page.navigate", { url: `${BASE}/#/` });
await waitFor("Boolean(document.querySelector('h1'))");
await sleep(700);
await evaluate("localStorage.clear()");

const results = [];
for (const route of routes) {
  errors.length = 0;
  const before = await evaluate("document.querySelector('h1') ? document.querySelector('h1').innerText : ''");
  await evaluate(`location.hash = "#/${route.id}"`);
  const expected = JSON.stringify(before);
  const swapped = await waitFor(
    `(() => { const h = document.querySelector('h1'); if (!h) return false; const text = h.innerText; return Boolean(text) && text !== ${expected} && Boolean(document.querySelector('canvas')) && Boolean(document.querySelector('#how')); })()`,
  );
  await sleep(400);
  const info = await evaluate(probe);
  const ok =
    swapped &&
    info.canvas &&
    info.canvas.width > 0 &&
    info.canvas.cssW > 0 &&
    info.builder &&
    info.how &&
    info.formTop !== null &&
    info.formTop < 320 &&
    info.builderTop < info.formTop &&
    info.formTop < info.aboutTop &&
    info.formTop < info.useTop &&
    info.howTop < info.capabilityTop &&
    info.useText.length > 20 &&
    info.notesLength > 400 &&
    info.capabilityLength > 80 &&
    info.specButton &&
    info.drawingButton &&
    errors.length === 0;
  results.push({ id: route.id, name: route.name, swapped, ...info, errors: [...errors], ok });
  process.stdout.write(`${route.id} ${ok ? "ok" : "FAIL"}\n`);
}

/* ---------------------------------------------------------------- UI checks */

const ui = [];
const check = (name, ok, detail) => {
  ui.push({ name, ok, detail });
  process.stdout.write(`UI ${name} ${ok ? "ok" : "FAIL"}\n`);
};

async function navigate(url) {
  await send("Page.navigate", { url });
  await sleep(500);
}

// Unknown deep link must recover to a catalogue link, not a blank page.
await navigate(`${BASE}/#/definitely-not-a-designer`);
await waitFor("Boolean(document.querySelector('h1'))");
const missing = await evaluate(`(() => ({
  h1: document.querySelector('h1')?.innerText || '',
  back: [...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '#/'),
  suggestions: document.querySelectorAll('a[href^="#/"]').length,
}))()`);
check(
  "not-found-recovery",
  missing.h1.includes("No designer called") && missing.back && missing.suggestions >= 2,
  JSON.stringify(missing),
);

// Catalogue search and capability filter.
await navigate(`${BASE}/#/`);
await waitFor("Boolean(document.querySelector('#catalog-search'))");
await sleep(400);
const before = await evaluate("document.querySelectorAll('ul a[href^=\"#/\"]').length");
await evaluate(`(() => {
  const input = document.querySelector('#catalog-search');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'gear');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await sleep(400);
const searched = await evaluate("document.querySelectorAll('ul a[href^=\"#/\"]').length");
check("catalog-search", before > 100 && searched > 0 && searched < before, `${before} -> ${searched}`);

await evaluate(`(() => {
  const input = document.querySelector('#catalog-search');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const select = document.querySelector('#catalog-capability');
  select.value = 'unsafe';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await sleep(400);
const filtered = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('ul a[href^="#/"]')];
  return { count: cards.length, badges: cards.filter((a) => /excluded|High-risk/i.test(a.innerText)).length };
})()`);
check(
  "catalog-capability-filter",
  filtered.count > 0 && filtered.count < before && filtered.badges === filtered.count,
  JSON.stringify(filtered),
);

// Invalid input must block the STL and the artifacts, with a readable error.
await navigate(`${BASE}/#/centrifuge-tube`);
await waitFor("Boolean(document.querySelector('#builder input[inputmode=\"decimal\"]'))");
await sleep(300);
const validState = await evaluate(`(() => {
  const buttons = [...document.querySelectorAll('button')];
  const stl = buttons.find((b) => /Download STL/.test(b.textContent || ''));
  return { stlDisabled: Boolean(stl?.disabled) };
})()`);
await evaluate(`(() => {
  const input = document.querySelector('#builder input[inputmode="decimal"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '0');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await sleep(500);
const invalidState = await evaluate(`(() => {
  const buttons = [...document.querySelectorAll('button')];
  const stl = buttons.find((b) => /Download STL/.test(b.textContent || ''));
  const spec = buttons.find((b) => /Specification/.test(b.textContent || ''));
  const summary = document.querySelector('#builder-issues');
  const jump = summary?.querySelector('button');
  jump?.click();
  return {
    stlDisabled: Boolean(stl?.disabled),
    specDisabled: Boolean(spec?.disabled),
    error: /must be between|Enter a/.test(document.body.innerText),
    summary: Boolean(summary && /needs attention/.test(summary.innerText)),
    jumped: Boolean(jump && document.activeElement?.id === jump.dataset.fieldId),
    focused: document.activeElement?.id || '',
  };
})()`);
check(
  "invalid-state-blocks-export",
  !validState.stlDisabled &&
    invalidState.stlDisabled &&
    invalidState.specDisabled &&
    invalidState.error &&
    invalidState.summary,
  JSON.stringify({ validState, invalidState }),
);
check(
  "error-summary-jumps-to-field",
  invalidState.jumped && invalidState.focused.length > 0,
  JSON.stringify(invalidState),
);
await evaluate(`(() => {
  [...document.querySelectorAll('#builder button')].find((b) => b.textContent?.trim() === 'Reset')?.click();
  return true;
})()`);
await sleep(500);

// Presets, search, related links and URL round-trip.
await navigate(`${BASE}/#/centering-cone`);
await waitFor("Boolean(document.querySelector('[aria-label=\"Starting point\"]'))");
await sleep(400);
const presetApplied = await evaluate(`(() => {
  const compact = [...document.querySelectorAll('[aria-label="Starting point"] button')]
    .find((b) => b.textContent.trim() === 'Compact');
  const before = document.querySelector('#centering-cone-large')?.value;
  compact?.click();
  return { before };
})()`);
// The form writes the config into the URL after a 250 ms debounce; poll for it
// rather than racing a fixed delay.
await waitFor("new URL(location.href).searchParams.has('config')", 4000);
const presetAfter = await evaluate(`(() => ({
  large: document.querySelector('#centering-cone-large')?.value,
  active: [...document.querySelectorAll('[aria-label="Starting point"] button')]
    .find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent.trim(),
  config: new URL(location.href).searchParams.has('config'),
  related: document.querySelectorAll('#about ~ section a[href^="#/"]').length,
  relatedTitle: document.body.innerText.includes('Related designers'),
  bundle: [...document.querySelectorAll('button')].some((b) => /Download all three/.test(b.textContent || '')),
  url: location.href,
}))()`);
check(
  "preset-and-shared-url",
  presetApplied.before !== presetAfter.large &&
    presetAfter.active === 'Compact' &&
    presetAfter.config &&
    presetAfter.bundle,
  JSON.stringify({ presetApplied, ...presetAfter }),
);
check(
  "related-designers",
  presetAfter.related >= 3 && presetAfter.relatedTitle,
  `${presetAfter.related} links, title ${presetAfter.relatedTitle}`,
);
await navigate(presetAfter.url);
await waitFor("Boolean(document.querySelector('#centering-cone-large'))");
await sleep(300);
const restored = await evaluate(`({
  large: document.querySelector('#centering-cone-large')?.value,
  active: [...document.querySelectorAll('[aria-label="Starting point"] button')]
    .find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent.trim(),
})`);
check(
  "shared-url-restores-state",
  restored.large === presetAfter.large && restored.active === 'Compact',
  JSON.stringify(restored),
);

const searchOpened = await evaluate(`(() => {
  const trigger = document.querySelector('nav button[aria-haspopup="listbox"]');
  trigger?.click();
  return Boolean(trigger);
})()`);
await sleep(250);
await evaluate(`(() => {
  const input = document.querySelector('#designer-search');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'sprocket');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await sleep(300);
const searchFiltered = await evaluate(`(() => {
  const options = [...document.querySelectorAll('[role=option]')];
  const names = options.map((option) => option.querySelector('span span')?.textContent || '');
  options[0]?.click();
  return { names };
})()`);
await sleep(800);
const searchLanded = await evaluate(`({
  hash: location.hash,
  h1: document.querySelector('h1')?.innerText || '',
  options: document.querySelectorAll('[role=option]').length,
})`);
check(
  "searchable-designer-switcher",
  searchOpened &&
    searchFiltered.names.length === 1 &&
    searchFiltered.names[0] === 'Chain sprocket' &&
    searchLanded.hash === '#/sprocket' &&
    searchLanded.h1.includes('Sprockets') &&
    searchLanded.options === 0,
  JSON.stringify({ searchOpened, searchFiltered, searchLanded }),
);

// Mobile layout and one high-risk designer page.
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await navigate(`${BASE}/#/`);
await waitFor("Boolean(document.querySelector('h1'))");
await sleep(400);
const mobileHome = await evaluate(
  "document.documentElement.scrollWidth - document.documentElement.clientWidth",
);
check("mobile-catalog-overflow", mobileHome <= 1, `overflow ${mobileHome}px`);

await navigate(`${BASE}/#/centrifuge-tube`);
await waitFor("Boolean(document.querySelector('#capability'))");
// A restored scroll position can leave the export panel in view, which hides
// the sticky bar by design. Start at the top, then wait for the observer.
await evaluate("window.scrollTo(0, 0)");
await waitFor("Boolean(document.querySelector('[aria-label=\"Export actions\"]'))", 5000);
await sleep(500);
const mobileDesigner = await evaluate(`(() => {
  const capability = document.querySelector('#capability');
  const fields = [...document.querySelectorAll('input, select')];
  const labelled = fields.filter((el) => el.id && document.querySelector('label[for="' + el.id + '"]'));
  const buttons = [...document.querySelectorAll('button')];
  const top = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    builderTop: top(document.querySelector('#builder')),
    formTop: top(document.querySelector('#builder > div')),
    aboutTop: top(document.querySelector('#about')),
    useCaseTop: top(document.querySelector('#use-case')),
    capability: capability ? capability.getBoundingClientRect().height : 0,
    fields: fields.length,
    labelled: labelled.length,
    excluded: (capability?.innerText || '').includes('high-risk'),
    spec: buttons.some((b) => /Specification/.test(b.textContent || '')),
    drawing: buttons.some((b) => /Dimension sheet/.test(b.textContent || '')),
    skip: buttons.some((b) => /Skip to content/.test(b.textContent || '')),
    focus: document.activeElement?.tagName === 'H1',
    sticky: document.querySelector('[aria-label="Export actions"]')?.innerText || '',
  };
})()`);
check(
  "mobile-designer-accessibility",
  mobileDesigner.overflow <= 1 &&
    mobileDesigner.formTop < 320 &&
    mobileDesigner.builderTop < mobileDesigner.formTop &&
    mobileDesigner.formTop < mobileDesigner.aboutTop &&
    mobileDesigner.formTop < mobileDesigner.useCaseTop &&
    mobileDesigner.capability > 50 &&
    mobileDesigner.fields > 0 &&
    mobileDesigner.fields === mobileDesigner.labelled &&
    mobileDesigner.excluded &&
    mobileDesigner.spec &&
    mobileDesigner.drawing &&
    mobileDesigner.skip &&
    mobileDesigner.focus &&
    /Ready to export/.test(mobileDesigner.sticky) &&
    /Download STL/.test(mobileDesigner.sticky),
  JSON.stringify(mobileDesigner),
);

await evaluate(`document.querySelector('#export-panel')?.scrollIntoView({ block: 'center' })`);
await sleep(500);
const stickyNearPanel = await evaluate(
  "Boolean(document.querySelector('[aria-label=\"Export actions\"]'))",
);
check("sticky-export-hides-at-panel", !stickyNearPanel, `visible ${stickyNearPanel}`);
// In-page controls must not be mistaken for hash routes.
const anchorBefore = await evaluate(`({ h1: document.querySelector('h1')?.innerText || '', hash: location.hash })`);
await evaluate(`(() => {
  [...document.querySelectorAll('button')].find((b) => /Skip to content/.test(b.textContent || ''))?.click();
  return true;
})()`);
await sleep(300);
await evaluate(`(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Limits')?.click();
  return true;
})()`);
await sleep(500);
const anchorAfter = await evaluate(`({ h1: document.querySelector('h1')?.innerText || '', hash: location.hash, missing: document.body.innerText.includes('No designer called') })`);
check(
  "in-page-anchors-stay-on-route",
  anchorAfter.h1 === anchorBefore.h1 &&
    anchorAfter.h1.length > 0 &&
    anchorAfter.hash === anchorBefore.hash &&
    !anchorAfter.missing,
  JSON.stringify({ anchorBefore, anchorAfter }),
);

await send("Emulation.clearDeviceMetricsOverride");

fs.writeFileSync(".audit/ui-result.json", JSON.stringify(ui, null, 2));
fs.writeFileSync(".audit/result.json", JSON.stringify(results, null, 2));
const bad = results.filter((item) => !item.ok);
const uiBad = ui.filter((item) => !item.ok);
console.log(`\n${results.length} pages, ${bad.length} failing`);
console.log(`${ui.length} UI checks, ${uiBad.length} failing`);
for (const item of bad) {
  console.log(
    JSON.stringify(
      {
        id: item.id,
        h1: item.h1,
        swapped: item.swapped,
        canvas: item.canvas,
        use: item.useText,
        notesLength: item.notesLength,
        errors: item.errors,
      },
      null,
      1,
    ),
  );
}
ws.close();
chrome.kill();
process.exit(bad.length + uiBad.length ? 1 : 0);
