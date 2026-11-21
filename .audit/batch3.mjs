import fs from "node:fs";

const designs = [
  ["round-standoff", "Round standoff"], ["locating-pin", "Locating pin"],
  ["countersink-plug", "Countersink plug"], ["screw-cap", "Screw cap"],
  ["acorn-cap", "Acorn cap"], ["dowel", "Dowel"],
  ["towel-bar-end", "Towel bar end"], ["capstan-drum", "Capstan drum"],
  ["bobbin-flange", "Bobbin flange"], ["tap-handle", "Tap handle"],
  ["tumbler", "Tumbler"], ["shot-glass", "Shot glass"],
  ["measuring-cup", "Measuring cup"], ["votive-holder", "Votive holder"],
  ["bud-vase", "Bud vase"], ["decanter-stopper", "Decanter stopper"],
  ["coaster", "Coaster"], ["napkin-ring", "Napkin ring"],
  ["drawer-knob", "Drawer knob"], ["vial-cap", "Vial cap"],
  ["septum-cap", "Septum cap"], ["sample-cup", "Sample cup"],
  ["dowel-spacer", "Dowel spacer"], ["flask-weight", "Flask weight"],
  ["wrist-pin", "Wrist pin"], ["crowned-roller", "Crowned roller"],
  ["idler-wheel", "Idler wheel"], ["guide-roller", "Guide roller"],
  ["plain-bushing", "Plain bushing"], ["flanged-sleeve", "Flanged sleeve"],
  ["spacer-stack", "Spacer stack"], ["spring-seat", "Spring seat"],
  ["spring-cap", "Spring cap"], ["plunger", "Plunger"],
  ["hinge-pin", "Hinge pin"], ["bushing-driver", "Bushing driver"],
  ["seal-driver", "Seal driver"], ["press-disc", "Press disc"],
  ["bench-dog", "Bench dog"], ["hole-plug", "Hole plug"],
  ["dial-plate", "Dial plate"], ["blind-flange", "Blind flange"],
  ["orifice-plate", "Orifice plate"], ["encoder-disc", "Encoder disc"],
  ["soft-jaw-blank", "Soft jaw blank"], ["pot-grid", "Pot grid"],
  ["pet-tag", "Pet tag"], ["cable-marker", "Cable marker"],
  ["zip-anchor", "Zip anchor"], ["rail-end-plate", "Rail end plate"],
];

const routes = JSON.parse(fs.readFileSync(".audit/routes.json", "utf8"));
const known = new Set(routes.map((route) => route.id));
for (const [id, name] of designs) if (!known.has(id)) routes.push({ id, name });
fs.writeFileSync(".audit/routes.json", `${JSON.stringify(routes, null, 1)}\n`);
console.log(`routes: ${routes.length}`);

let doc = fs.readFileSync("docs/DESIGNERS-1000.md", "utf8");
let marked = 0;
for (const [, name] of designs) {
  const index = doc.indexOf(` ${name} —`);
  if (index < 0) continue;
  const lineStart = doc.lastIndexOf("\n", index) + 1;
  const line = doc.slice(lineStart, doc.indexOf("\n", lineStart));
  if (line.includes("★")) continue;
  doc = doc.slice(0, lineStart) + line.replace(` ${name} —`, ` **★ ${name}** —`) + doc.slice(lineStart + line.length);
  marked += 1;
}
fs.writeFileSync("docs/DESIGNERS-1000.md", doc);
console.log(`1000-list entries marked built: ${marked}`);
