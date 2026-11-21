import fs from "node:fs";

const names = [
  "Round standoff", "Locating pin", "Countersink plug", "Screw cap", "Acorn cap",
  "Dowel", "Towel bar end", "Capstan drum", "Bobbin flange", "Tap handle",
  "Tumbler", "Shot glass", "Measuring cup", "Votive holder", "Bud vase",
  "Decanter stopper", "Coaster", "Napkin ring", "Drawer knob", "Vial cap",
  "Septum cap", "Sample cup", "Dowel spacer", "Flask weight", "Wrist pin",
  "Crowned roller", "Idler wheel", "Guide roller", "Plain bushing",
  "Flanged sleeve", "Spacer stack", "Spring seat", "Spring cap", "Plunger",
  "Hinge pin", "Bushing driver", "Seal driver", "Press disc", "Bench dog",
  "Hole plug", "Dial plate", "Blind flange", "Orifice plate", "Encoder disc",
  "Soft jaw blank", "Pot grid", "Pet tag", "Cable marker", "Zip anchor",
  "Rail end plate",
];

let doc = fs.readFileSync("docs/DESIGNERS-2.md", "utf8");
let marked = 0;
for (const name of names) {
  const needle = `${name} —`;
  let index = doc.indexOf(needle);
  while (index >= 0) {
    const lineStart = doc.lastIndexOf("\n", index) + 1;
    const lineEnd = doc.indexOf("\n", lineStart);
    let line = doc.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (!line.includes("✓")) {
      line = line.replace(needle, `**${name}** ✓ —`);
      doc = doc.slice(0, lineStart) + line + doc.slice(lineEnd === -1 ? doc.length : lineEnd);
      marked += 1;
      index = -1;
    } else {
      index = doc.indexOf(needle, index + needle.length);
    }
  }
}
fs.writeFileSync("docs/DESIGNERS-2.md", doc);
console.log(`second-list entries marked built: ${marked}`);
