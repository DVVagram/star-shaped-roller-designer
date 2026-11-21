/** Second library, part 1: flanges, nuts, knobs and small brackets. */

import { buildPrism } from "@/lib/kit/prism";
import { TWO_PI, type LengthUnit, type Point2D } from "@/lib/kit/units";
import {
  arcPoints,
  obround,
  regularPolygon,
  roundedRect,
} from "@/lib/kit/outlines";
import { toothedRing } from "./geometry";

import {
  boltCircle,
  chamferRings,
  checkHoleFits,
  checkSize,
  checkWall,
  circle,
  circleAt,
  emptyResult,
  measure,
  round,
} from "./helpers";
import {
  defineDesign,
  previewOf,
  pushInteger,
  pushRange,
  rawCount,
  rawLength,
  type AnyDesign,
  type DesignIssue,
} from "./types";

const U = (value: number, units: LengthUnit) => measure(value, units);
const R = (value: number, decimals = 2) => round(value, decimals);

/* ----------------------------------------------------------- square flange */

export const squareFlange: AnyDesign = defineDesign({
  id: "square-flange",
  name: "Square flange",
  family: "fixings",
  eyebrow: "Four bolts",
  blurb: "A rounded square flange with a centred bore and a four-bolt circle.",
  lede: "A bearing or pipe flange on a square footprint: a centred bore, four bolt holes on a pitch circle and rounded corners that clear a fillet in the corner of a frame.",
  chips: [
    { label: "Width", value: "30 – 170 mm" },
    { label: "Bolts", value: "2 – 8" },
    { label: "Bore", value: "4 – 120 mm" },
  ],
  notes: [
    "The bolt circle is the diameter through the hole centres and the corner radius is a real round on the outline, so the plate is not a rectangle with sharp corners. The bore and every bolt hole are through-holes cut from the same cap triangulation as the outline.",
    "Keep at least 2 mm between a bolt hole and the bore, and at least one bolt diameter from the edge. A flange can creep under bolt preload, so torque it gently and use washers.",
  ],
  header: "Square Flange Designer - units: mm",
  fields: [
    { key: "width", label: "Width across", kind: "length", section: "Flange", default: "70", min: 30, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Flange", default: "8", min: 2, max: 30 },
    { key: "bore", label: "Bore", kind: "length", section: "Flange", default: "24", min: 4, max: 120 },
    { key: "boltCircle", label: "Bolt circle", kind: "length", section: "Bolts", default: "54", min: 16, max: 160 },
    { key: "boltHole", label: "Bolt hole", kind: "length", section: "Bolts", default: "6", min: 2, max: 20 },
    { key: "bolts", label: "Bolts", kind: "count", section: "Bolts", default: "4", min: 2, max: 8 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Flange", default: "8", min: 0, max: 30 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    pcdMm: rawLength(raw, "boltCircle"),
    boltMm: rawLength(raw, "boltHole"),
    bolts: rawCount(raw, "bolts"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Width", p.widthMm, 30, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 30);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 120);
    pushRange(errors, units, "boltCircle", "Bolt circle", p.pcdMm, 16, 160);
    pushRange(errors, units, "boltHole", "Bolt hole", p.boltMm, 2, 20);
    pushInteger(errors, "bolts", "Bolts", p.bolts, 2, 8);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "width", p.widthMm, p.thicknessMm);
    checkWall(errors, units, "bore", "web between the bore and the bolts", (p.pcdMm - p.boltMm - p.boreMm) / 2);
    if (p.pcdMm + p.boltMm > p.widthMm - 2) errors.push({ field: "boltCircle", level: "error", message: "The bolt circle reaches the edge of the flange." });
    if (p.thicknessMm < 3) warnings.push({ field: "thickness", level: "warning", message: "A flange thinner than 3 mm cups under a bolt." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bolt circle", value: U(p.pcdMm, units), source: "input" },
        { label: "Bolts", value: String(Math.round(p.bolts)), source: "input" },
        { label: "Edge land", value: U((p.widthMm - p.pcdMm - p.boltMm) / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} square · ${Math.round(p.bolts)} bolts`,
        `SF${R(p.widthMm, 0)}-${R(p.pcdMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Bolt circle", value: U(p.pcdMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [roundedRect(p.widthMm, p.widthMm, p.cornerMm), roundedRect(p.widthMm, p.widthMm, p.cornerMm)],
      holes: [circle(p.boreMm / 2), ...boltCircle(p.bolts, p.pcdMm, p.boltMm, Math.PI / 4)],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `square-flange-${R(p.widthMm, 0)}-${R(p.pcdMm, 0)}pcd.stl`,
});

/* ------------------------------------------------------------- oval flange */

export const ovalFlange: AnyDesign = defineDesign({
  id: "oval-flange",
  name: "Oval flange",
  family: "fixings",
  eyebrow: "Two bolts",
  blurb: "A two-bolt oval flange with a centred bore.",
  lede: "A stadium-shaped flange with one bore and two bolt holes on the long axis, sized for a pump port or a small pipe connection.",
  chips: [
    { label: "Length", value: "40 – 170 mm" },
    { label: "Width", value: "16 – 120 mm" },
    { label: "Bore", value: "4 – 90 mm" },
  ],
  notes: [
    "The outline is a true stadium: two semicircles of the flange width joined by straight sides, so the overall length is the entered length and the ends are perfectly round. Both bolt holes sit on the centre line at the entered pitch.",
    "An oval flange saves weight over a square one but has less sealing land around the bore. If the joint has to hold pressure, keep at least 4 mm of land.",
  ],
  header: "Oval Flange Designer - units: mm",
  fields: [
    { key: "length", label: "Overall length", kind: "length", section: "Flange", default: "90", min: 40, max: 170 },
    { key: "width", label: "Width", kind: "length", section: "Flange", default: "44", min: 16, max: 120 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Flange", default: "8", min: 2, max: 30 },
    { key: "bore", label: "Bore", kind: "length", section: "Flange", default: "26", min: 4, max: 90 },
    { key: "boltPitch", label: "Bolt pitch", kind: "length", section: "Bolts", default: "66", min: 12, max: 160 },
    { key: "boltHole", label: "Bolt hole", kind: "length", section: "Bolts", default: "8", min: 2, max: 20 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    pitchMm: rawLength(raw, "boltPitch"),
    boltMm: rawLength(raw, "boltHole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 40, 170);
    pushRange(errors, units, "width", "Width", p.widthMm, 16, 120);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 30);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 90);
    pushRange(errors, units, "boltPitch", "Bolt pitch", p.pitchMm, 12, 160);
    pushRange(errors, units, "boltHole", "Bolt hole", p.boltMm, 2, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);
    if (p.widthMm >= p.lengthMm) errors.push({ field: "width", level: "error", message: "The width must be smaller than the overall length." });
    if (p.boreMm + 2 * 2 > p.widthMm) errors.push({ field: "bore", level: "error", message: "The bore leaves less than 2 mm of land at the sides." });
    if (p.pitchMm / 2 + p.boltMm / 2 > p.lengthMm / 2 - 0.5) errors.push({ field: "boltPitch", level: "error", message: "A bolt hole breaks out of the end." });
    if (p.boreMm / 2 + 1.6 > p.pitchMm / 2 - p.boltMm / 2) errors.push({ field: "boltPitch", level: "error", message: "The bolt holes break into the bore; widen the pitch or shrink the bore." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bolt pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Side land", value: U((p.widthMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} × ${U(p.widthMm, units)} oval`,
        `OF${R(p.lengthMm, 0)}-${R(p.boreMm, 0)}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Bolt pitch", value: U(p.pitchMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [obround(0, 0, p.lengthMm - p.widthMm, p.widthMm, 0), obround(0, 0, p.lengthMm - p.widthMm, p.widthMm, 0)],
      holes: [
        circle(p.boreMm / 2),
        circleAt(p.pitchMm / 2, 0, p.boltMm / 2),
        circleAt(-p.pitchMm / 2, 0, p.boltMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `oval-flange-${R(p.lengthMm, 0)}x${R(p.widthMm, 0)}.stl`,
});

/* ----------------------------------------------------------- bearing plate */

export const bearingPlate: AnyDesign = defineDesign({
  id: "bearing-plate",
  name: "Bearing plate",
  family: "fixings",
  eyebrow: "Press-fit pocket",
  blurb: "A square plate with a bearing bore and four mounting holes.",
  lede: "A plate for a 608-size bearing or any press fit: one central bore sized to the bearing outside diameter and four mounting holes on a square pitch.",
  chips: [
    { label: "Plate", value: "30 – 170 mm" },
    { label: "Bore", value: "8 – 120 mm" },
    { label: "Holes", value: "4" },
  ],
  notes: [
    "The bearing bore is a plain through-hole, not a shouldered pocket, so the bearing needs a retaining ring or a second plate to stop it walking. The four mounting holes are on a square pitch, which is the usual 608 bracket pattern.",
    "Make the plate with the bore vertical and drill or ream it to size; a bored hole comes out about 0.15 mm under nominal.",
  ],
  header: "Bearing Plate Designer - units: mm",
  fields: [
    { key: "size", label: "Plate width", kind: "length", section: "Plate", default: "72", min: 30, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "8", min: 3, max: 30 },
    { key: "bore", label: "Bearing bore", kind: "length", section: "Bearing", default: "22", min: 8, max: 120 },
    { key: "boltPitch", label: "Mounting pitch", kind: "length", section: "Mounting", default: "56", min: 16, max: 160 },
    { key: "boltHole", label: "Mounting hole", kind: "length", section: "Mounting", default: "4.5", min: 2, max: 12 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Plate", default: "8", min: 0, max: 30 },
  ],
  parse: (raw) => ({
    sizeMm: rawLength(raw, "size"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    pitchMm: rawLength(raw, "boltPitch"),
    boltMm: rawLength(raw, "boltHole"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "size", "Plate width", p.sizeMm, 30, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 30);
    pushRange(errors, units, "bore", "Bearing bore", p.boreMm, 8, 120);
    pushRange(errors, units, "boltPitch", "Mounting pitch", p.pitchMm, 16, 160);
    pushRange(errors, units, "boltHole", "Mounting hole", p.boltMm, 2, 12);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "size", p.sizeMm, p.thicknessMm);
    checkWall(errors, units, "bore", "ring between the bearing and the bolts", p.pitchMm / Math.SQRT2 - p.boreMm / 2 - p.boltMm / 2);
    if (p.pitchMm + p.boltMm > p.sizeMm - 2) errors.push({ field: "boltPitch", level: "error", message: "The mounting holes reach the edge of the plate." });
    const plateOutline = roundedRect(p.sizeMm, p.sizeMm, p.cornerMm);
    checkHoleFits(errors, units, "boltPitch", "A mounting hole", { x: p.pitchMm / 2, y: p.pitchMm / 2 }, p.boltMm / 2, plateOutline);
    checkHoleFits(errors, units, "bore", "The bearing bore", { x: 0, y: 0 }, p.boreMm / 2, plateOutline);
    if (p.boreMm >= p.sizeMm - 2 * p.cornerMm) warnings.push({ field: "bore", level: "warning", message: "The bore almost touches the rounded corners." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.sizeMm, units)} square`, source: "input" },
        { label: "Bearing bore", value: U(p.boreMm, units), source: "input" },
        { label: "Mounting pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Hole", value: U(p.boltMm, units), source: "input" },
        { label: "Corner to bore", value: U((p.sizeMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.sizeMm, units)} plate · ${U(p.boreMm, units)} bore`,
        `BP${R(p.sizeMm, 0)}-${R(p.boreMm, 0)}`,
        p.sizeMm,
        p.thicknessMm,
        [
          { label: "Plate", value: U(p.sizeMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Pitch", value: U(p.pitchMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const half = p.pitchMm / 2;
    return buildPrism({
      rings: [roundedRect(p.sizeMm, p.sizeMm, p.cornerMm), roundedRect(p.sizeMm, p.sizeMm, p.cornerMm)],
      holes: [
        circle(p.boreMm / 2),
        circleAt(half, half, p.boltMm / 2),
        circleAt(-half, half, p.boltMm / 2),
        circleAt(half, -half, p.boltMm / 2),
        circleAt(-half, -half, p.boltMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `bearing-plate-${R(p.sizeMm, 0)}-${R(p.boreMm, 0)}bore.stl`,
});

/* ------------------------------------------------------------- NEMA plate */

export const nemaPlate: AnyDesign = defineDesign({
  id: "nema-plate",
  name: "NEMA 17 plate",
  family: "fixings",
  eyebrow: "Stepper mount",
  blurb: "A stepper motor plate with the standard 31 mm mounting square.",
  lede: "The standard NEMA 17 face: a 70 mm plate, four M3 holes on a 31 mm square and a central opening for the boss and shaft.",
  chips: [
    { label: "Plate", value: "40 – 170 mm" },
    { label: "Pitch", value: "31 mm" },
    { label: "Opening", value: "8 – 60 mm" },
  ],
  notes: [
    "The 31 mm square and 3.4 mm holes are the NEMA 17 face pattern; the centre opening clears the 22 mm boss. All five holes are cut through the same plate, so the pattern is exact and the plate stays closed.",
    "Make the plate flat and bolt the motor on with washers: a plate can compress under the screw heads and the motor will not sit square if the holes are countersunk by hand.",
  ],
  header: "NEMA 17 Plate Designer - units: mm",
  fields: [
    { key: "size", label: "Plate width", kind: "length", section: "Plate", default: "70", min: 40, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "6", min: 3, max: 20 },
    { key: "opening", label: "Centre opening", kind: "length", section: "Motor", default: "24", min: 8, max: 60 },
    { key: "holePitch", label: "Mounting square", kind: "length", section: "Motor", default: "31", min: 10, max: 120 },
    { key: "hole", label: "Mounting hole", kind: "length", section: "Motor", default: "3.4", min: 2, max: 10 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Plate", default: "4", min: 0, max: 20 },
  ],
  parse: (raw) => ({
    sizeMm: rawLength(raw, "size"),
    thicknessMm: rawLength(raw, "thickness"),
    openingMm: rawLength(raw, "opening"),
    pitchMm: rawLength(raw, "holePitch"),
    holeMm: rawLength(raw, "hole"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "size", "Plate width", p.sizeMm, 40, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 20);
    pushRange(errors, units, "opening", "Centre opening", p.openingMm, 8, 60);
    pushRange(errors, units, "holePitch", "Mounting square", p.pitchMm, 10, 120);
    pushRange(errors, units, "hole", "Mounting hole", p.holeMm, 2, 10);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "size", p.sizeMm, p.thicknessMm);
    if (p.openingMm + 2 * p.holeMm >= p.pitchMm * Math.SQRT2) errors.push({ field: "opening", level: "error", message: "The opening breaks into the mounting holes." });
    if (p.pitchMm + p.holeMm > p.sizeMm - 2) errors.push({ field: "holePitch", level: "error", message: "The mounting holes reach the plate edge." });
    if (p.openingMm < 22.5) warnings.push({ field: "opening", level: "warning", message: "Under 22 mm the opening will not clear the motor boss." });
    if (p.holeMm < 3.2) warnings.push({ field: "hole", level: "warning", message: "Under 3.2 mm an M3 screw will bind in the hole." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.sizeMm, units)} square`, source: "input" },
        { label: "Mounting square", value: U(p.pitchMm, units), source: "input" },
        { label: "Hole", value: U(p.holeMm, units), source: "input" },
        { label: "Opening", value: U(p.openingMm, units), source: "input" },
        { label: "Boss clearance", value: U((p.openingMm - 22) / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.sizeMm, units)} · ${U(p.pitchMm, units)} square`,
        `NP${R(p.sizeMm, 0)}-${R(p.pitchMm, 0)}`,
        p.sizeMm,
        p.thicknessMm,
        [
          { label: "Plate", value: U(p.sizeMm, units) },
          { label: "Pitch", value: U(p.pitchMm, units) },
          { label: "Opening", value: U(p.openingMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const half = p.pitchMm / 2;
    return buildPrism({
      rings: [roundedRect(p.sizeMm, p.sizeMm, p.cornerMm), roundedRect(p.sizeMm, p.sizeMm, p.cornerMm)],
      holes: [
        circle(p.openingMm / 2),
        circleAt(half, half, p.holeMm / 2),
        circleAt(-half, half, p.holeMm / 2),
        circleAt(half, -half, p.holeMm / 2),
        circleAt(-half, -half, p.holeMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `nema17-plate-${R(p.sizeMm, 0)}.stl`,
});

/* ------------------------------------------------------------- T-slot nut */

export const tSlotNut: AnyDesign = defineDesign({
  id: "t-slot-nut",
  name: "T-slot nut",
  family: "fixings",
  eyebrow: "Extrusion slot",
  blurb: "A rectangular nut that drops into an aluminium extrusion slot.",
  lede: "A low rectangular nut with a central bore, chamfered so it starts into a T-slot without catching, sized by the slot width it has to pass through.",
  chips: [
    { label: "Width", value: "6 – 40 mm" },
    { label: "Length", value: "10 – 80 mm" },
    { label: "Bore", value: "3 – 24 mm" },
  ],
  notes: [
    "The body is a rounded rectangle sized to the slot width and long enough to bridge the slot opening. Both faces are chamfered with four stacked outlines, so the nut rocks into the slot instead of shaving a burr off the extrusion.",
    "This is a drop-in nut, not a spring-loaded one: hold it in the slot with a finger until the first thread bites. Make it with the bore vertical for the strongest thread land.",
  ],
  header: "T-Slot Nut Designer - units: mm",
  fields: [
    { key: "width", label: "Slot width", kind: "length", section: "Nut", default: "20", min: 6, max: 40 },
    { key: "length", label: "Length", kind: "length", section: "Nut", default: "30", min: 10, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Nut", default: "8", min: 3, max: 20 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "8", min: 3, max: 24 },
    { key: "chamfer", label: "Edge chamfer", kind: "length", section: "Nut", default: "0.8", min: 0, max: 3 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Nut", default: "3", min: 0, max: 12 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    lengthMm: rawLength(raw, "length"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    chamferMm: rawLength(raw, "chamfer"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Slot width", p.widthMm, 6, 40);
    pushRange(errors, units, "length", "Length", p.lengthMm, 10, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 20);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 24);
    pushRange(errors, units, "chamfer", "Edge chamfer", p.chamferMm, 0, 3);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);
    checkWall(errors, units, "bore", "wall around the bore", p.widthMm / 2 - p.boreMm / 2);
    if (p.lengthMm <= p.widthMm) warnings.push({ field: "length", level: "warning", message: "A nut shorter than the slot is wide may turn in the slot." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Slot width", value: U(p.widthMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Side wall", value: U((p.widthMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} slot · ${U(p.lengthMm, units)} long`,
        `TS${R(p.widthMm, 0)}-${R(p.boreMm, 0)}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Slot", value: U(p.widthMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Thickness", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const { rings, fractions } = chamferRings(
      roundedRect(p.widthMm, p.lengthMm, p.cornerMm),
      p.thicknessMm,
      p.chamferMm,
    );
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: [circle(p.boreMm / 2)],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `t-slot-nut-${R(p.widthMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* -------------------------------------------------------------- square nut */

export const squareNut: AnyDesign = defineDesign({
  id: "square-nut",
  name: "Square nut",
  family: "fixings",
  eyebrow: "Four flats",
  blurb: "A chamfered square nut sized by its across-flats dimension.",
  lede: "A square nut with a real chamfer on both faces, sized the way a machinist sizes it: across the flats, with the bore you actually need.",
  chips: [
    { label: "Across flats", value: "5 – 60 mm" },
    { label: "Bore", value: "2 – 40 mm" },
    { label: "Chamfer", value: "0 – 2 mm" },
  ],
  notes: [
    "The square is built on its across-flats dimension, so a 17 mm nut really measures 17 mm between opposite flats. Four stacked outlines scale the square inwards at each face to cut the chamfer; the bore stays a straight through-hole.",
    "Threads are not modelled. Size the bore for a tap, or for a self-tapping screw if the nut is a one-off.",
  ],
  header: "Square Nut Designer - units: mm",
  fields: [
    { key: "acrossFlats", label: "Across flats", kind: "length", section: "Nut", default: "17", min: 5, max: 60 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Nut", default: "8", min: 2, max: 30 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "10", min: 2, max: 40 },
    { key: "chamfer", label: "Face chamfer", kind: "length", section: "Nut", default: "1", min: 0, max: 2 },
  ],
  parse: (raw) => ({
    acrossMm: rawLength(raw, "acrossFlats"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "acrossFlats", "Across flats", p.acrossMm, 5, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 30);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 40);
    pushRange(errors, units, "chamfer", "Face chamfer", p.chamferMm, 0, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "acrossFlats", p.acrossMm * Math.SQRT2, p.thicknessMm);
    checkWall(errors, units, "bore", "wall at the flats", (p.acrossMm - p.boreMm) / 2);
    if (p.boreMm >= p.acrossMm * 0.78) warnings.push({ field: "bore", level: "warning", message: "The corners are very thin at this bore." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Across flats", value: U(p.acrossMm, units), source: "input" },
        { label: "Across corners", value: U(p.acrossMm * Math.SQRT2, units), source: "calc" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Wall at flat", value: U((p.acrossMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.acrossMm, units)} across flats`,
        `SN${R(p.acrossMm, 0)}-${R(p.boreMm, 0)}`,
        p.acrossMm * Math.SQRT2,
        p.thicknessMm,
        [
          { label: "Across flats", value: U(p.acrossMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Thickness", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const square = regularPolygon(4, p.acrossMm / Math.SQRT2, Math.PI / 4);
    const { rings, fractions } = chamferRings(square, p.thicknessMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: [circle(p.boreMm / 2)],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `square-nut-${R(p.acrossMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* ------------------------------------------------------------ coupling nut */

export const couplingNut: AnyDesign = defineDesign({
  id: "coupling-nut",
  name: "Coupling nut",
  family: "fixings",
  eyebrow: "Long hex",
  blurb: "A long hex nut that joins two threaded studs end to end.",
  lede: "A hex bar with a through-bore and chamfered ends, long enough to take a stud from each side and lock the joint.",
  chips: [
    { label: "Across flats", value: "6 – 70 mm" },
    { label: "Length", value: "10 – 120 mm" },
    { label: "Bore", value: "2 – 50 mm" },
  ],
  notes: [
    "The hexagon is sized across flats and the bore runs straight through, so the nut can be turned onto either stud. The chamfer at each end is a real 45° break, not a rounded edge.",
    "A coupling nut carries load along its walls. If the joint matters, make it longer than the stud engagement and pin it.",
  ],
  header: "Coupling Nut Designer - units: mm",
  fields: [
    { key: "acrossFlats", label: "Across flats", kind: "length", section: "Nut", default: "19", min: 6, max: 70 },
    { key: "length", label: "Length", kind: "length", section: "Nut", default: "30", min: 10, max: 120 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "10", min: 2, max: 50 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Nut", default: "1", min: 0, max: 2.5 },
  ],
  parse: (raw) => ({
    acrossMm: rawLength(raw, "acrossFlats"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "acrossFlats", "Across flats", p.acrossMm, 6, 70);
    pushRange(errors, units, "length", "Length", p.lengthMm, 10, 120);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 50);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0, 2.5);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", p.acrossMm * 1.16, p.lengthMm);
    checkWall(errors, units, "bore", "wall at the flats", (p.acrossMm - p.boreMm) / 2);
    if (p.lengthMm < p.boreMm * 1.6) warnings.push({ field: "length", level: "warning", message: "A coupling nut shorter than 1.6 bores joins very little thread." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Across flats", value: U(p.acrossMm, units), source: "input" },
        { label: "Across corners", value: U(p.acrossMm * (2 / Math.sqrt(3)), units), source: "calc" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Engagement", value: U(p.lengthMm / 2, units), source: "calc" },
        { label: "Wall at flat", value: U((p.acrossMm - p.boreMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} long · ${U(p.acrossMm, units)} AF`,
        `CN${R(p.acrossMm, 0)}-${R(p.lengthMm, 0)}`,
        p.acrossMm * 1.16,
        p.lengthMm,
        [
          { label: "Across flats", value: U(p.acrossMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const hex = regularPolygon(6, p.acrossMm / Math.sqrt(3), Math.PI / 6);
    const { rings, fractions } = chamferRings(hex, p.lengthMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: [circle(p.boreMm / 2)],
      thicknessMm: p.lengthMm,
    });
  },
  fileName: (p) => `coupling-nut-${R(p.acrossMm, 0)}af-${R(p.lengthMm, 0)}l.stl`,
});

/* -------------------------------------------------------------- cross knob */

export const crossKnob: AnyDesign = defineDesign({
  id: "cross-knob",
  name: "Cross knob",
  family: "fixings",
  eyebrow: "Four lobes",
  blurb: "A four-lobed grip knob with a smooth waist between the lobes.",
  lede: "A four-lobed knob whose outline follows a raised cosine, so the grip meets the waist without a notch and the span is exact.",
  chips: [
    { label: "Lobes", value: "3 – 8" },
    { label: "Span", value: "16 – 140 mm" },
    { label: "Bore", value: "2 – 30 mm" },
  ],
  notes: [
    "Each lobe owns one pitch of the outline and the radius rises and falls smoothly across it. A four-lobe knob is the size a hand can spin; more lobes give a finer grip but less leverage.",
    "Make it face down with the bore vertical. The bore is a plain through-hole, so size it for the screw or the threaded insert you plan to fit.",
  ],
  header: "Cross Knob Designer - units: mm",
  fields: [
    { key: "lobes", label: "Lobes", kind: "count", section: "Knob", default: "4", min: 3, max: 8 },
    { key: "span", label: "Span", kind: "length", section: "Knob", default: "46", min: 16, max: 140 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Knob", default: "14", min: 3, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Knob", default: "6", min: 2, max: 30 },
  ],
  parse: (raw) => ({
    lobes: rawCount(raw, "lobes"),
    spanMm: rawLength(raw, "span"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "lobes", "Lobes", p.lobes, 3, 8);
    pushRange(errors, units, "span", "Span", p.spanMm, 16, 140);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const root = p.spanMm * 0.7;
    checkSize(errors, units, "span", p.spanMm, p.thicknessMm);
    checkWall(errors, units, "bore", "grip around the bore", root / 2 - p.boreMm / 2);
    if (p.thicknessMm > p.spanMm * 0.6) warnings.push({ field: "thickness", level: "warning", message: "A knob thicker than 60 % of its span is hard to grip." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Lobes", value: String(Math.round(p.lobes)), source: "input" },
        { label: "Span", value: U(p.spanMm, units), source: "input" },
        { label: "Waist Ø", value: U(root, units), source: "calc" },
        { label: "Lobe depth", value: U((p.spanMm - root) / 2, units), source: "calc" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.lobes)} lobes · ${U(p.spanMm, units)} span`,
        `CK${R(p.spanMm, 0)}-${Math.round(p.lobes)}`,
        p.spanMm,
        p.thicknessMm,
        [
          { label: "Span", value: U(p.spanMm, units) },
          { label: "Waist", value: U(root, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const root = (p.spanMm * 0.7) / 2;
    const tip = p.spanMm / 2;
    const pitch = TWO_PI / Math.round(p.lobes);
    const outline = toothedRing({
      count: p.lobes,
      rootRadiusMm: root,
      tipRadiusMm: tip,
      tipLandMm: Math.max(2, pitch * tip * 0.34),
      rootLandMm: Math.max(2, pitch * root * 0.3),
      flank: "smooth",
      stepsPerFlank: 10,
    });
    return buildPrism({
      rings: [outline, outline],
      holes: [circle(p.boreMm / 2)],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `cross-knob-${R(p.spanMm, 0)}-${Math.round(p.lobes)}lobe.stl`,
});

/* ------------------------------------------------------------ pointer knob */

export const pointerKnob: AnyDesign = defineDesign({
  id: "pointer-knob",
  name: "Pointer knob",
  family: "fixings",
  eyebrow: "Index mark",
  blurb: "A round knob with a moulded pointer that shows its position.",
  lede: "A round grip with one flat pointer tab moulded into the rim, so the knob reads its position against a panel mark without a separate indicator.",
  chips: [
    { label: "Body", value: "14 – 90 mm" },
    { label: "Pointer", value: "3 – 40 mm" },
    { label: "Bore", value: "2 – 20 mm" },
  ],
  notes: [
    "The pointer is a tab tangent to the body circle, joined by two short straight sides, so the outline stays a single closed curve with no re-entrant corner. Its width is set independently of its reach.",
    "A pointer knob only reads correctly if it cannot slip on the shaft. Add a flat or a grub screw to the shaft, or make the bore undersized and ream it to a press fit.",
  ],
  header: "Pointer Knob Designer - units: mm",
  fields: [
    { key: "body", label: "Body diameter", kind: "length", section: "Knob", default: "32", min: 14, max: 90 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Knob", default: "14", min: 3, max: 40 },
    { key: "pointer", label: "Pointer reach", kind: "length", section: "Pointer", default: "10", min: 3, max: 40 },
    { key: "pointerWidth", label: "Pointer width", kind: "length", section: "Pointer", default: "8", min: 2, max: 24 },
    { key: "bore", label: "Bore", kind: "length", section: "Knob", default: "6", min: 2, max: 20 },
  ],
  parse: (raw) => ({
    bodyMm: rawLength(raw, "body"),
    thicknessMm: rawLength(raw, "thickness"),
    pointerMm: rawLength(raw, "pointer"),
    pointerWidthMm: rawLength(raw, "pointerWidth"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "body", "Body diameter", p.bodyMm, 14, 90);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 40);
    pushRange(errors, units, "pointer", "Pointer reach", p.pointerMm, 3, 40);
    pushRange(errors, units, "pointerWidth", "Pointer width", p.pointerWidthMm, 2, 24);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "body", p.bodyMm + 2 * p.pointerMm, p.thicknessMm);
    checkWall(errors, units, "bore", "grip around the bore", p.bodyMm / 2 - p.boreMm / 2);
    if (p.pointerWidthMm >= p.bodyMm) errors.push({ field: "pointerWidth", level: "error", message: "The pointer is wider than the knob body." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Body Ø", value: U(p.bodyMm, units), source: "input" },
        { label: "Pointer reach", value: U(p.pointerMm, units), source: "input" },
        { label: "Pointer width", value: U(p.pointerWidthMm, units), source: "input" },
        { label: "Overall length", value: U(p.bodyMm + p.pointerMm, units), source: "calc" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.bodyMm, units)} body · ${U(p.pointerMm, units)} pointer`,
        `PK${R(p.bodyMm, 0)}-${R(p.pointerMm, 0)}`,
        p.bodyMm + 2 * p.pointerMm,
        p.thicknessMm,
        [
          { label: "Body", value: U(p.bodyMm, units) },
          { label: "Pointer", value: U(p.pointerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.bodyMm / 2;
    const half = Math.min(p.pointerWidthMm / 2, r * 0.9);
    const start = Math.asin(half / r);
    const points: Point2D[] = [
      ...arcPoints(0, 0, r, start, TWO_PI - start, 48),
      { x: r + p.pointerMm, y: -half },
      { x: r + p.pointerMm, y: half },
    ];
    return buildPrism({
      rings: [points, points],
      holes: [circle(p.boreMm / 2)],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `pointer-knob-${R(p.bodyMm, 0)}-${R(p.pointerMm, 0)}.stl`,
});

/* ----------------------------------------------------------- pivot bracket */

export const pivotBracket: AnyDesign = defineDesign({
  id: "pivot-bracket",
  name: "Pivot bracket",
  family: "fixings",
  eyebrow: "Three holes",
  blurb: "A rounded plate with a pivot bore and two mounting holes.",
  lede: "A flat bracket with a central pivot and two fixing holes on a common pitch, for a lever, a latch or an adjustable arm.",
  chips: [
    { label: "Plate", value: "30 – 170 mm" },
    { label: "Pivot", value: "3 – 40 mm" },
    { label: "Pitch", value: "10 – 150 mm" },
  ],
  notes: [
    "The three holes are cut from one plate, with the pivot on the centre line and the mounting holes symmetric about it. Rounded corners keep the plate from splitting at a screw corner.",
    "A pivot wears quickly. Bush it with a short length of tube, or make the pivot bore 0.2 mm oversize and use a metal pin.",
  ],
  header: "Pivot Bracket Designer - units: mm",
  fields: [
    { key: "width", label: "Width", kind: "length", section: "Plate", default: "60", min: 30, max: 170 },
    { key: "height", label: "Height", kind: "length", section: "Plate", default: "40", min: 20, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "8", min: 3, max: 20 },
    { key: "pivot", label: "Pivot bore", kind: "length", section: "Pivot", default: "8", min: 3, max: 40 },
    { key: "holePitch", label: "Mounting pitch", kind: "length", section: "Pivot", default: "40", min: 10, max: 150 },
    { key: "hole", label: "Mounting hole", kind: "length", section: "Pivot", default: "6", min: 2, max: 20 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Plate", default: "8", min: 0, max: 30 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    pivotMm: rawLength(raw, "pivot"),
    pitchMm: rawLength(raw, "holePitch"),
    holeMm: rawLength(raw, "hole"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Width", p.widthMm, 30, 170);
    pushRange(errors, units, "height", "Height", p.heightMm, 20, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 20);
    pushRange(errors, units, "pivot", "Pivot bore", p.pivotMm, 3, 40);
    pushRange(errors, units, "holePitch", "Mounting pitch", p.pitchMm, 10, 150);
    pushRange(errors, units, "hole", "Mounting hole", p.holeMm, 2, 20);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "width", p.widthMm, p.thicknessMm);
    checkWall(errors, units, "pivot", "web between the pivot and a mounting hole", p.pitchMm / 2 - p.pivotMm / 2 - p.holeMm / 2);
    if (p.pitchMm + p.holeMm >= p.widthMm - 2) errors.push({ field: "holePitch", level: "error", message: "A mounting hole breaks out of the plate." });
    if (p.heightMm <= p.pivotMm + p.holeMm) warnings.push({ field: "height", level: "warning", message: "The plate is barely wider than the holes." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Pivot bore", value: U(p.pivotMm, units), source: "input" },
        { label: "Mounting pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Mounting holes", value: U(p.holeMm, units), source: "input" },
        { label: "Web", value: U(p.pitchMm / 2 - p.pivotMm / 2 - p.holeMm / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} × ${U(p.heightMm, units)} bracket`,
        `PB${R(p.widthMm, 0)}-${R(p.pivotMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}` },
          { label: "Pivot", value: U(p.pivotMm, units) },
          { label: "Pitch", value: U(p.pitchMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [roundedRect(p.widthMm, p.heightMm, p.cornerMm), roundedRect(p.widthMm, p.heightMm, p.cornerMm)],
      holes: [
        circle(p.pivotMm / 2),
        circleAt(p.pitchMm / 2, 0, p.holeMm / 2),
        circleAt(-p.pitchMm / 2, 0, p.holeMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `pivot-bracket-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

export const prismHardware: AnyDesign[] = [
  squareFlange,
  ovalFlange,
  bearingPlate,
  nemaPlate,
  tSlotNut,
  squareNut,
  couplingNut,
  crossKnob,
  pointerKnob,
  pivotBracket,
];
