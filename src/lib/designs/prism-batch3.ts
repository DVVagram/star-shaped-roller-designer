/** Plate batch 3: dials, flanges, tags and grids cut from flat stock. */

import { circleOutline, obround, roundedRect } from "@/lib/kit/outlines";
import { buildPrism } from "@/lib/kit/prism";
import type { LengthUnit, Point2D } from "@/lib/kit/units";
import { MIN_WALL_MM } from "@/lib/kit/units";

import { checkSize, checkWall, emptyResult, measure, round } from "./helpers";
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

function circleAt(cx: number, cy: number, radius: number, segments = 40): Point2D[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (Math.PI * 2 * i) / segments;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function plate(outline: Point2D[], thicknessMm: number, holes: Point2D[][] = []) {
  return buildPrism({ rings: [outline, outline], holes, thicknessMm });
}

/* ------------------------------------------------------------------ dial plate */

export const dialPlate: AnyDesign = defineDesign({
  id: "dial-plate",
  name: "Dial plate",
  family: "fixings",
  eyebrow: "Marked disc",
  blurb: "A bored disc with a ring of index holes for marking positions.",
  lede: "A dial plate with a centre bore and a ring of evenly spaced tick holes, so a pointer or a detent can be set to a repeatable angle. The tick ring sits inboard of the rim and outboard of the bore, which keeps every hole fully supported by the plate.",
  use: "Marking repeatable positions on a rotary fixture, a pointer or an index mechanism.",
  notesTitle: "How the tick ring is spaced",
  chips: [
    { label: "Plate Ø", value: "40 – 160 mm" },
    { label: "Ticks", value: "6 – 36" },
    { label: "Thickness", value: "2 – 8 mm" },
  ],
  notes: [
    "The tick holes are placed on a pitch circle derived from the plate radius, then spaced evenly around it. The design checks that they clear both the centre bore and the rim, so a dense ring cannot break through the edge.",
    "Drill the centre bore first and use it to locate the plate for the tick ring, so the marks stay concentric. Deburr both faces; a raised burr around a tick hole reads as a false mark.",
  ],
  header: "Dial Plate Designer - units: mm",
  fields: [
    { key: "diameter", label: "Plate diameter", kind: "length", section: "Plate", default: "90", min: 40, max: 160 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "4", min: 2, max: 8 },
    { key: "bore", label: "Centre bore", kind: "length", section: "Bore", default: "10", min: 4, max: 40 },
    { key: "ticks", label: "Tick count", kind: "count", section: "Ticks", default: "12", min: 6, max: 36 },
    { key: "tick", label: "Tick hole", kind: "length", section: "Ticks", default: "2", min: 1, max: 4 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    ticks: rawCount(raw, "ticks"),
    tickMm: rawLength(raw, "tick"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Plate diameter", p.diameterMm, 40, 160);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 8);
    pushRange(errors, units, "bore", "Centre bore", p.boreMm, 4, 40);
    pushInteger(errors, "ticks", "Tick count", p.ticks, 6, 36);
    pushRange(errors, units, "tick", "Tick hole", p.tickMm, 1, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const radius = p.diameterMm / 2;
    const pitch = radius - 6;
    const tickR = p.tickMm / 2;
    const boreR = p.boreMm / 2;
    if (pitch - tickR <= boreR + 1) errors.push({ field: "bore", level: "error", message: "The tick ring overlaps the centre bore." });
    if (pitch + tickR >= radius - MIN_WALL_MM) errors.push({ field: "diameter", level: "error", message: "The tick ring reaches the rim." });
    const spacing = (Math.PI * 2 * pitch) / p.ticks;
    if (spacing < p.tickMm + 0.8) errors.push({ field: "ticks", level: "error", message: "The tick holes merge at this count." });
    if (p.ticks > 24) warnings.push({ field: "ticks", level: "warning", message: "Above twenty-four marks the ring becomes hard to read." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Centre bore", value: U(p.boreMm, units), source: "input" },
        { label: "Tick count", value: String(p.ticks), source: "input" },
        { label: "Tick hole", value: U(p.tickMm, units), source: "input" },
        { label: "Pitch Ø", value: U(pitch * 2, units), source: "calc" },
        { label: "Step angle", value: `${R(360 / p.ticks, 2)}°`, source: "calc" },
      ],
      preview: previewOf(
        `${p.ticks} ticks · ${U(p.diameterMm, units)} plate`,
        `DP${R(p.diameterMm, 0)}-${p.ticks}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Plate", value: U(p.diameterMm, units) },
          { label: "Ticks", value: String(p.ticks) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const pitch = radius - 6;
    const holes = [circleAt(0, 0, p.boreMm / 2)];
    for (let i = 0; i < p.ticks; i += 1) {
      const angle = (Math.PI * 2 * i) / p.ticks;
      holes.push(circleAt(pitch * Math.cos(angle), pitch * Math.sin(angle), p.tickMm / 2, 16));
    }
    return plate(circleOutline(radius, 72), p.thicknessMm, holes);
  },
  fileName: (p) => `dial-plate-${R(p.diameterMm, 0)}-${p.ticks}.stl`,
});

/* ---------------------------------------------------------------- blind flange */

export const blindFlange: AnyDesign = defineDesign({
  id: "blind-flange",
  name: "Blind flange",
  family: "fixings",
  eyebrow: "Blank disc",
  blurb: "A solid disc with a bolt circle that blanks off a port.",
  lede: "A blind flange: a plain disc with a ring of bolt holes and no bore, used to close a port or a pipe end. The bolt circle is kept inboard of the rim and the plate is thick enough that the bolt heads are not bearing on a knife edge.",
  use: "Blanking an unused port, a duct opening or a pipe stub while it is out of service.",
  notesTitle: "How the bolt circle clears the rim",
  chips: [
    { label: "Flange Ø", value: "40 – 160 mm" },
    { label: "Bolt circle Ø", value: "30 – 140 mm" },
    { label: "Bolts", value: "2 – 12" },
  ],
  notes: [
    "Every bolt hole sits on one pitch circle, and the design checks that the circle plus the hole radius stays inside the plate edge. That leaves a continuous rim rather than a scalloped outline that would tear at a bolt.",
    "Make the plate from flat stock and drill the bolt holes from the mating flange or a template, not from the outside diameter, or the pattern will not line up. This is a blanking plate only; it carries no pressure rating and no seal is included.",
  ],
  header: "Blind Flange Designer - units: mm",
  fields: [
    { key: "diameter", label: "Flange diameter", kind: "length", section: "Flange", default: "90", min: 40, max: 160 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Flange", default: "10", min: 4, max: 20 },
    { key: "boltCircle", label: "Bolt circle Ø", kind: "length", section: "Bolts", default: "70", min: 30, max: 140 },
    { key: "bolts", label: "Bolt count", kind: "count", section: "Bolts", default: "6", min: 2, max: 12 },
    { key: "bolt", label: "Bolt hole", kind: "length", section: "Bolts", default: "6", min: 3, max: 12 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boltCircleMm: rawLength(raw, "boltCircle"),
    bolts: rawCount(raw, "bolts"),
    boltMm: rawLength(raw, "bolt"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Flange diameter", p.diameterMm, 40, 160);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 20);
    pushRange(errors, units, "boltCircle", "Bolt circle", p.boltCircleMm, 30, 140);
    pushInteger(errors, "bolts", "Bolt count", p.bolts, 2, 12);
    pushRange(errors, units, "bolt", "Bolt hole", p.boltMm, 3, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const radius = p.diameterMm / 2;
    const circleR = p.boltCircleMm / 2;
    if (circleR + p.boltMm / 2 >= radius - MIN_WALL_MM) errors.push({ field: "boltCircle", level: "error", message: "A bolt hole reaches the flange rim." });
    const spacing = (Math.PI * 2 * circleR) / p.bolts;
    if (spacing < p.boltMm + 1) errors.push({ field: "bolts", level: "error", message: "The bolt holes merge at this count." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Flange Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Bolt circle Ø", value: U(p.boltCircleMm, units), source: "input" },
        { label: "Bolts", value: String(p.bolts), source: "input" },
        { label: "Bolt hole", value: U(p.boltMm, units), source: "input" },
        { label: "Rim land", value: U(radius - circleR - p.boltMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${p.bolts} bolts · ${U(p.boltCircleMm, units)} circle`,
        `BF${R(p.diameterMm, 0)}-${p.bolts}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Flange", value: U(p.diameterMm, units) },
          { label: "Bolt circle", value: U(p.boltCircleMm, units) },
          { label: "Bolts", value: String(p.bolts) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const holes: Point2D[][] = [];
    for (let i = 0; i < p.bolts; i += 1) {
      const angle = (Math.PI * 2 * i) / p.bolts;
      holes.push(
        circleAt(
          (p.boltCircleMm / 2) * Math.cos(angle),
          (p.boltCircleMm / 2) * Math.sin(angle),
          p.boltMm / 2,
        ),
      );
    }
    return plate(circleOutline(radius, 72), p.thicknessMm, holes);
  },
  fileName: (p) => `blind-flange-${R(p.diameterMm, 0)}-${p.bolts}.stl`,
});

/* --------------------------------------------------------------- orifice plate */

export const orificePlate: AnyDesign = defineDesign({
  id: "orifice-plate",
  name: "Orifice plate",
  family: "vessels",
  eyebrow: "Restrictor",
  blurb: "A bored disc with a bolt circle that sets a fixed restriction.",
  lede: "A flat disc with one exact centre bore and a surrounding bolt circle, made to sit between two flanges as a fixed restrictor. The bore is kept clear of the bolt holes, so the restriction is a clean circle rather than a scalloped opening.",
  use: "Setting a repeatable restriction in a model flow rig, a sprayer line or a test duct.",
  notesTitle: "How the bore sits clear",
  chips: [
    { label: "Plate Ø", value: "20 – 120 mm" },
    { label: "Bore", value: "3 – 60 mm" },
    { label: "Bolt circle Ø", value: "30 – 110 mm" },
  ],
  notes: [
    "The centre bore is the restriction, and the bolt circle is pushed out until every bolt hole clears it by at least a wall thickness. That stops the bolts from breaking into the bore and changing the area you thought you had.",
    "Ream the centre bore and deburr both faces: a burr changes the effective area more than a few hundredths of diameter. This is a shape model, not a calibrated orifice, so flow still has to be measured on the bench.",
  ],
  header: "Orifice Plate Designer - units: mm",
  fields: [
    { key: "diameter", label: "Plate diameter", kind: "length", section: "Plate", default: "60", min: 20, max: 120 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "3", min: 2, max: 10 },
    { key: "bore", label: "Orifice bore", kind: "length", section: "Bore", default: "20", min: 3, max: 60 },
    { key: "boltCircle", label: "Bolt circle Ø", kind: "length", section: "Bolts", default: "45", min: 30, max: 110 },
    { key: "bolt", label: "Bolt hole", kind: "length", section: "Bolts", default: "5", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    boltCircleMm: rawLength(raw, "boltCircle"),
    boltMm: rawLength(raw, "bolt"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Plate diameter", p.diameterMm, 20, 120);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 10);
    pushRange(errors, units, "bore", "Orifice bore", p.boreMm, 3, 60);
    pushRange(errors, units, "boltCircle", "Bolt circle", p.boltCircleMm, 30, 110);
    pushRange(errors, units, "bolt", "Bolt hole", p.boltMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const radius = p.diameterMm / 2;
    const circleR = p.boltCircleMm / 2;
    if (circleR + p.boltMm / 2 >= radius - MIN_WALL_MM) errors.push({ field: "boltCircle", level: "error", message: "A bolt hole reaches the plate rim." });
    if (circleR - p.boltMm / 2 <= p.boreMm / 2 + MIN_WALL_MM) errors.push({ field: "boltCircle", level: "error", message: "The bolt circle breaks into the orifice bore." });
    const area = Math.PI * (p.boreMm / 2) ** 2;
    const areaText = units === "in" ? `${R(area / 645.16, 3)} in²` : `${R(area, 1)} mm²`;
    if (p.boreMm > p.diameterMm * 0.7) warnings.push({ field: "bore", level: "warning", message: "A bore over 70 percent of the plate leaves very little flange." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bolt circle Ø", value: U(p.boltCircleMm, units), source: "input" },
        { label: "Bolt hole", value: U(p.boltMm, units), source: "input" },
        { label: "Bore area", value: areaText, source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.boreMm, units)} bore · ${areaText}`,
        `OP${R(p.diameterMm, 0)}-${R(p.boreMm, 0)}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Plate", value: U(p.diameterMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Bolt circle", value: U(p.boltCircleMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const holes = [circleAt(0, 0, p.boreMm / 2)];
    for (let i = 0; i < 4; i += 1) {
      const angle = Math.PI / 4 + (Math.PI / 2) * i;
      holes.push(
        circleAt(
          (p.boltCircleMm / 2) * Math.cos(angle),
          (p.boltCircleMm / 2) * Math.sin(angle),
          p.boltMm / 2,
        ),
      );
    }
    return plate(circleOutline(radius, 72), p.thicknessMm, holes);
  },
  fileName: (p) => `orifice-plate-${R(p.diameterMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* --------------------------------------------------------------- encoder disc */

export const encoderDisc: AnyDesign = defineDesign({
  id: "encoder-disc",
  name: "Encoder disc",
  family: "motion",
  eyebrow: "Slotted disc",
  blurb: "A thin bored disc with a fine ring of windows for an optical sensor.",
  lede: "A thin disc with a centre bore and many small windows around its edge, used as the code wheel for an optical or a magnetic sensor. The window ring is checked for pitch and rim clearance, so a dense pattern cannot merge into one slot.",
  use: "Building a code wheel for a model encoder, a tachometer or a rotary index sensor.",
  notesTitle: "How the windows are pitched",
  chips: [
    { label: "Disc Ø", value: "30 – 120 mm" },
    { label: "Windows", value: "8 – 60" },
    { label: "Window Ø", value: "1 – 3 mm" },
  ],
  notes: [
    "The windows sit on a pitch circle inboard of the rim, spaced by the count, and each is checked to clear its neighbour. Because the disc is thin, both faces are flat and parallel, which keeps the window edges crisp for a sensor.",
    "Cut the disc flat and drill or mill the windows from one side on a rotary table, indexing from the centre bore. A window ring that is off-centre produces a once-per-revolution error that no amount of sensor adjustment will fix.",
  ],
  header: "Encoder Disc Designer - units: mm",
  fields: [
    { key: "diameter", label: "Disc diameter", kind: "length", section: "Disc", default: "60", min: 30, max: 120 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Disc", default: "2", min: 1.5, max: 6 },
    { key: "bore", label: "Centre bore", kind: "length", section: "Disc", default: "8", min: 4, max: 30 },
    { key: "windows", label: "Window count", kind: "count", section: "Windows", default: "24", min: 8, max: 60 },
    { key: "window", label: "Window hole", kind: "length", section: "Windows", default: "1.5", min: 1, max: 3 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    windows: rawCount(raw, "windows"),
    windowMm: rawLength(raw, "window"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Disc diameter", p.diameterMm, 30, 120);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 6);
    pushRange(errors, units, "bore", "Centre bore", p.boreMm, 4, 30);
    pushInteger(errors, "windows", "Window count", p.windows, 8, 60);
    pushRange(errors, units, "window", "Window hole", p.windowMm, 1, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const radius = p.diameterMm / 2;
    const pitch = radius - 5;
    if (pitch - p.windowMm / 2 <= p.boreMm / 2 + 1) errors.push({ field: "bore", level: "error", message: "The window ring overlaps the bore." });
    if (pitch + p.windowMm / 2 >= radius - MIN_WALL_MM) errors.push({ field: "diameter", level: "error", message: "The windows reach the rim." });
    const spacing = (Math.PI * 2 * pitch) / p.windows;
    if (spacing < p.windowMm + 0.8) errors.push({ field: "windows", level: "error", message: "The windows merge at this count." });
    if (p.thicknessMm > p.windowMm * 3) warnings.push({ field: "thickness", level: "warning", message: "A disc much thicker than its windows casts a blurred edge." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Windows", value: String(p.windows), source: "input" },
        { label: "Window hole", value: U(p.windowMm, units), source: "input" },
        { label: "Pitch Ø", value: U(pitch * 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${p.windows} windows · ${U(p.diameterMm, units)} disc`,
        `ED${R(p.diameterMm, 0)}-${p.windows}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Disc", value: U(p.diameterMm, units) },
          { label: "Windows", value: String(p.windows) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const pitch = radius - 5;
    const holes = [circleAt(0, 0, p.boreMm / 2)];
    for (let i = 0; i < p.windows; i += 1) {
      const angle = (Math.PI * 2 * i) / p.windows;
      holes.push(circleAt(pitch * Math.cos(angle), pitch * Math.sin(angle), p.windowMm / 2, 12));
    }
    return plate(circleOutline(radius, 72), p.thicknessMm, holes);
  },
  fileName: (p) => `encoder-disc-${R(p.diameterMm, 0)}-${p.windows}.stl`,
});

/* ------------------------------------------------------------- soft jaw blank */

export const softJawBlank: AnyDesign = defineDesign({
  id: "soft-jaw-blank",
  name: "Soft jaw blank",
  family: "fixings",
  eyebrow: "Jaw plate",
  blurb: "A rectangular jaw blank with two mounting holes on a set pitch.",
  lede: "A soft jaw blank: a thick rectangular plate with two mounting holes on a pitch you choose, ready to be machined to the part it has to hold. The blank is deliberately plain so the gripping shape can be cut after it is bolted down.",
  use: "Making a custom soft jaw for a vice or a chuck, or a sacrificial packing plate.",
  notesTitle: "How the mounting pitch is set",
  chips: [
    { label: "Length", value: "40 – 200 mm" },
    { label: "Width", value: "20 – 80 mm" },
    { label: "Bolt pitch", value: "20 – 160 mm" },
  ],
  notes: [
    "The two mounting holes sit on the length centre line at the chosen pitch, and the design checks that both holes clear the ends and the sides. That leaves the corners free for clamps or for the gripping cut.",
    "Bolt the blank down first, then machine the grip in place so the jaw matches the vice it is fitted to. Keep the bolt heads below the gripping face; a proud head marks the workpiece.",
  ],
  header: "Soft Jaw Blank Designer - units: mm",
  fields: [
    { key: "length", label: "Length", kind: "length", section: "Blank", default: "100", min: 40, max: 200 },
    { key: "width", label: "Width", kind: "length", section: "Blank", default: "40", min: 20, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Blank", default: "15", min: 6, max: 30 },
    { key: "pitch", label: "Bolt pitch", kind: "length", section: "Bolts", default: "60", min: 20, max: 160 },
    { key: "bolt", label: "Bolt hole", kind: "length", section: "Bolts", default: "6", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    pitchMm: rawLength(raw, "pitch"),
    boltMm: rawLength(raw, "bolt"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Length", p.lengthMm, 40, 200);
    pushRange(errors, units, "width", "Width", p.widthMm, 20, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 6, 30);
    pushRange(errors, units, "pitch", "Bolt pitch", p.pitchMm, 20, 160);
    pushRange(errors, units, "bolt", "Bolt hole", p.boltMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);

    if (p.pitchMm / 2 + p.boltMm / 2 >= p.lengthMm / 2 - MIN_WALL_MM) errors.push({ field: "pitch", level: "error", message: "A bolt hole reaches the end of the blank." });
    checkWall(errors, units, "bolt", "jaw wall", p.widthMm / 2 - p.boltMm / 2);
    if (p.thicknessMm < p.boltMm) warnings.push({ field: "thickness", level: "warning", message: "A blank thinner than the bolt hole flexes under clamping." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Bolt pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Bolt hole", value: U(p.boltMm, units), source: "input" },
        { label: "End land", value: U(p.lengthMm / 2 - p.pitchMm / 2 - p.boltMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} × ${U(p.widthMm, units)} blank`,
        `SJ${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Pitch", value: U(p.pitchMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = roundedRect(p.lengthMm, p.widthMm, Math.min(4, p.widthMm * 0.1));
    const holes = [
      circleAt(-p.pitchMm / 2, 0, p.boltMm / 2),
      circleAt(p.pitchMm / 2, 0, p.boltMm / 2),
    ];
    return plate(outline, p.thicknessMm, holes);
  },
  fileName: (p) => `soft-jaw-blank-${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* -------------------------------------------------------------------- pot grid */

export const potGrid: AnyDesign = defineDesign({
  id: "pot-grid",
  name: "Pot grid",
  family: "vessels",
  eyebrow: "Drain disc",
  blurb: "A bored disc with a square grid of holes that drains a pot.",
  lede: "A drainage disc with a grid of holes worked out from the hole count you ask for. The grid is checked against the rim and the spacing between holes, so a dense pattern cannot collapse into one ragged opening.",
  use: "Draining a plant pot, a tray or a home-made planter that has no drainage holes.",
  notesTitle: "How the grid is fitted to the disc",
  chips: [
    { label: "Disc Ø", value: "40 – 300 mm" },
    { label: "Holes", value: "4 – 60" },
    { label: "Hole Ø", value: "2 – 12 mm" },
  ],
  notes: [
    "The holes are laid out on the smallest square grid that holds the requested count, then centred on the disc. The design checks the corner hole against the rim and the pitch against the hole diameter, so the grid stays a grid.",
    "Drill from one face with a backing board to stop breakout, then finish both faces flat and keep the holes clear of the rim so the disc does not crack through. A grid that is slightly small still drains; a disc that cracks does not.",
  ],
  header: "Pot Grid Designer - units: mm",
  fields: [
    { key: "diameter", label: "Disc diameter", kind: "length", section: "Disc", default: "100", min: 40, max: 300 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Disc", default: "3", min: 2, max: 8 },
    { key: "holes", label: "Hole count", kind: "count", section: "Grid", default: "12", min: 4, max: 60 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Grid", default: "4", min: 2, max: 12 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    holes: rawCount(raw, "holes"),
    holeMm: rawLength(raw, "hole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Disc diameter", p.diameterMm, 40, 300);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 8);
    pushInteger(errors, "holes", "Hole count", p.holes, 4, 60);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const cols = Math.ceil(Math.sqrt(p.holes));
    const rows = Math.ceil(p.holes / cols);
    const step = (p.diameterMm - 12) / Math.max(cols, rows);
    const corner = Math.hypot(((cols - 1) / 2) * step, ((rows - 1) / 2) * step) + p.holeMm / 2;
    if (corner > p.diameterMm / 2 - MIN_WALL_MM) errors.push({ field: "holes", level: "error", message: "The grid reaches the rim; use fewer holes or a larger disc." });
    if (step < p.holeMm + 1) errors.push({ field: "hole", level: "error", message: "The holes merge at this size and count." });
    if (p.holes > 30) warnings.push({ field: "holes", level: "warning", message: "Above thirty holes the disc loses much of its strength." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Holes", value: String(p.holes), source: "input" },
        { label: "Hole Ø", value: U(p.holeMm, units), source: "input" },
        { label: "Grid", value: `${cols} × ${rows}`, source: "calc" },
        { label: "Pitch", value: U(step, units), source: "calc" },
      ],
      preview: previewOf(
        `${p.holes} holes · ${U(p.diameterMm, units)} disc`,
        `PG${R(p.diameterMm, 0)}-${p.holes}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Disc", value: U(p.diameterMm, units) },
          { label: "Holes", value: String(p.holes) },
          { label: "Hole", value: U(p.holeMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cols = Math.ceil(Math.sqrt(p.holes));
    const rows = Math.ceil(p.holes / cols);
    const step = (p.diameterMm - 12) / Math.max(cols, rows);
    const holes: Point2D[][] = [];
    for (let index = 0; index < p.holes; index += 1) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = (col - (cols - 1) / 2) * step;
      const y = (row - (rows - 1) / 2) * step;
      holes.push(circleAt(x, y, p.holeMm / 2, 20));
    }
    return plate(circleOutline(p.diameterMm / 2, 72), p.thicknessMm, holes);
  },
  fileName: (p) => `pot-grid-${R(p.diameterMm, 0)}-${p.holes}.stl`,
});

/* --------------------------------------------------------------------- pet tag */

export const petTag: AnyDesign = defineDesign({
  id: "pet-tag",
  name: "Pet tag",
  family: "fixings",
  eyebrow: "Name plate",
  blurb: "A rounded tag with a ring hole that takes a split ring.",
  lede: "A rounded tag with a single hole near the top edge, sized to take a split ring or a small clip. The hole is placed with a real land above it, so the tag does not tear out at the point where it hangs.",
  use: "Hanging a name or an identification tag on a collar, a bag or a set of keys.",
  notesTitle: "How the ring hole clears the edge",
  chips: [
    { label: "Width", value: "20 – 70 mm" },
    { label: "Height", value: "15 – 50 mm" },
    { label: "Ring hole", value: "3 – 12 mm" },
  ],
  notes: [
    "The ring hole is positioned from the top edge by its own radius plus a land, rather than from the centre, so the amount of material above the hole does not depend on the tag height. The corners are rounded so the tag does not catch on fabric.",
    "Drill the ring hole before finishing the edges, and chamfer both sides so the ring does not wear through. If the tag is engraved, leave the land above the hole plain so the engraving does not weaken it.",
  ],
  header: "Pet Tag Designer - units: mm",
  fields: [
    { key: "width", label: "Width", kind: "length", section: "Tag", default: "40", min: 20, max: 70 },
    { key: "height", label: "Height", kind: "length", section: "Tag", default: "30", min: 15, max: 50 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Tag", default: "2", min: 1.5, max: 5 },
    { key: "hole", label: "Ring hole", kind: "length", section: "Hole", default: "5", min: 3, max: 12 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Tag", default: "6", min: 2, max: 10 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Width", p.widthMm, 20, 70);
    pushRange(errors, units, "height", "Height", p.heightMm, 15, 50);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 5);
    pushRange(errors, units, "hole", "Ring hole", p.holeMm, 3, 12);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 2, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "width", p.widthMm, p.heightMm);

    const cy = p.heightMm / 2 - p.holeMm / 2 - 2.5;
    if (cy - p.holeMm / 2 <= -p.heightMm / 2 + 2) errors.push({ field: "height", level: "error", message: "The tag is too short for a ring hole." });
    if (p.holeMm >= p.widthMm - 4) errors.push({ field: "hole", level: "error", message: "The ring hole is as wide as the tag." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Ring hole", value: U(p.holeMm, units), source: "input" },
        { label: "Land above", value: U(2.5, units), source: "calc" },
        { label: "Corner", value: U(p.cornerMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} × ${U(p.heightMm, units)} tag`,
        `PT${R(p.widthMm, 0)}-${R(p.heightMm, 0)}`,
        p.widthMm,
        p.heightMm,
        [
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Hole", value: U(p.holeMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = roundedRect(p.widthMm, p.heightMm, Math.min(p.cornerMm, p.heightMm / 2 - 0.5));
    const cy = p.heightMm / 2 - p.holeMm / 2 - 2.5;
    return plate(outline, p.thicknessMm, [circleAt(0, cy, p.holeMm / 2)]);
  },
  fileName: (p) => `pet-tag-${R(p.widthMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- cable marker */

export const cableMarker: AnyDesign = defineDesign({
  id: "cable-marker",
  name: "Cable marker",
  family: "fixings",
  eyebrow: "Tie label",
  blurb: "A flat label with two tie slots that wraps onto a cable bundle.",
  lede: "A small flat plate with a slot near each end, made to be tied onto a cable or a bundle with two ties. The slots are obround rather than round, so a tie can sit flat and the marker can be slid along the cable before it is cinched.",
  use: "Labelling a cable, a hose or a bundle of wires at both ends of a run.",
  notesTitle: "How the tie slots sit",
  chips: [
    { label: "Length", value: "20 – 80 mm" },
    { label: "Width", value: "8 – 30 mm" },
    { label: "Slot width", value: "2 – 8 mm" },
  ],
  notes: [
    "Both slots are obround and aligned across the width, so a tie passes through and bears on a flat land rather than on a sharp edge. The slots are inset from each end far enough that the plate cannot tear out under a cinched tie.",
    "Deburr the slots before fitting; a sharp inner edge cuts a nylon tie under tension. Write on the marker before tying it on, and leave the plate flat so the label stays readable.",
  ],
  header: "Cable Marker Designer - units: mm",
  fields: [
    { key: "length", label: "Length", kind: "length", section: "Marker", default: "40", min: 20, max: 80 },
    { key: "width", label: "Width", kind: "length", section: "Marker", default: "14", min: 8, max: 30 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Marker", default: "2", min: 1, max: 4 },
    { key: "slot", label: "Slot width", kind: "length", section: "Slots", default: "4", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    slotMm: rawLength(raw, "slot"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Length", p.lengthMm, 20, 80);
    pushRange(errors, units, "width", "Width", p.widthMm, 8, 30);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1, 4);
    pushRange(errors, units, "slot", "Slot width", p.slotMm, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.widthMm);

    const slotLength = p.slotMm * 1.6;
    const centre = p.lengthMm / 4;
    if (centre - (slotLength + p.slotMm) / 2 < 2) errors.push({ field: "slot", level: "error", message: "A slot reaches the end of the marker." });
    if (p.slotMm >= p.widthMm - 2) errors.push({ field: "slot", level: "error", message: "The slot is as wide as the marker." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slot width", value: U(p.slotMm, units), source: "input" },
        { label: "Slot spacing", value: U(p.lengthMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} marker · two slots`,
        `CM${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Slot", value: U(p.slotMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = roundedRect(p.lengthMm, p.widthMm, Math.min(3, p.widthMm * 0.2));
    const slotLength = p.slotMm * 1.6;
    const centre = p.lengthMm / 4;
    return plate(outline, p.thicknessMm, [
      obround(-centre, 0, slotLength, p.slotMm, 0),
      obround(centre, 0, slotLength, p.slotMm, 0),
    ]);
  },
  fileName: (p) => `cable-marker-${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ zip anchor */

export const zipAnchor: AnyDesign = defineDesign({
  id: "zip-anchor",
  name: "Zip anchor",
  family: "fixings",
  eyebrow: "Tie base",
  blurb: "A screw-down base with a through slot that takes a cable tie.",
  lede: "A small mounting base with one screw hole and one tie slot. The screw holds the base flat to a surface while the tie passes through the slot to bundle a cable, so the cable does not have to be drilled or clamped.",
  use: "Anchoring a cable bundle to a wall, a panel or a frame with a cable tie.",
  notesTitle: "How the tie loads the base",
  chips: [
    { label: "Length", value: "20 – 70 mm" },
    { label: "Width", value: "12 – 40 mm" },
    { label: "Slot width", value: "3 – 10 mm" },
  ],
  notes: [
    "The screw hole sits at one end and the tie slot at the other, so the pull from a cinched tie goes into the base rather than lifting the screw. The slot is obround and wide enough for a standard tie without pinching it.",
    "Fit a screw head that clears the tie path and check the base sits flat before cinching. A tie pulled hard against a loose base will rock the screw and enlarge the hole, so snug the screw first and the tie second.",
  ],
  header: "Zip Anchor Designer - units: mm",
  fields: [
    { key: "length", label: "Length", kind: "length", section: "Base", default: "40", min: 20, max: 70 },
    { key: "width", label: "Width", kind: "length", section: "Base", default: "24", min: 12, max: 40 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Base", default: "4", min: 2, max: 8 },
    { key: "slot", label: "Slot width", kind: "length", section: "Holes", default: "5", min: 3, max: 10 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Holes", default: "4", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    slotMm: rawLength(raw, "slot"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Length", p.lengthMm, 20, 70);
    pushRange(errors, units, "width", "Width", p.widthMm, 12, 40);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 8);
    pushRange(errors, units, "slot", "Slot width", p.slotMm, 3, 10);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);

    const slotY = p.widthMm * 0.18;
    const screwY = -p.widthMm * 0.18;
    if (slotY + p.slotMm / 2 >= p.widthMm / 2 - MIN_WALL_MM) errors.push({ field: "slot", level: "error", message: "The slot reaches the side of the base." });
    if (slotY - p.slotMm / 2 <= screwY + p.screwMm / 2 + 1) errors.push({ field: "slot", level: "error", message: "The slot and the screw hole merge." });
    if (screwY - p.screwMm / 2 <= -p.widthMm / 2 + MIN_WALL_MM) errors.push({ field: "screw", level: "error", message: "The screw hole reaches the edge." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slot width", value: U(p.slotMm, units), source: "input" },
        { label: "Screw hole", value: U(p.screwMm, units), source: "input" },
        { label: "Hole spacing", value: U(slotY - screwY, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} base · ${U(p.slotMm, units)} slot`,
        `ZA${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Slot", value: U(p.slotMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = roundedRect(p.lengthMm, p.widthMm, Math.min(4, p.widthMm * 0.2));
    const slotY = p.widthMm * 0.18;
    const screwY = -p.widthMm * 0.18;
    return plate(outline, p.thicknessMm, [
      obround(0, slotY, p.slotMm * 1.4, p.slotMm, 0),
      circleAt(0, screwY, p.screwMm / 2),
    ]);
  },
  fileName: (p) => `zip-anchor-${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* --------------------------------------------------------------- rail end plate */

export const railEndPlate: AnyDesign = defineDesign({
  id: "rail-end-plate",
  name: "Rail end plate",
  family: "fixings",
  eyebrow: "End cap",
  blurb: "A rounded plate with two fixing holes that caps a rail end.",
  lede: "A flat end plate that closes the end of a rail, a tube or a length of extrusion. Two fixing holes sit symmetrically about the centre line, and the rounded corners keep the plate from catching on a bench or a frame.",
  use: "Capping the open end of a rail or an extrusion so it cannot collect swarf or cut a hand.",
  notesTitle: "How the plate centres on the rail",
  chips: [
    { label: "Width", value: "20 – 80 mm" },
    { label: "Height", value: "20 – 80 mm" },
    { label: "Hole inset", value: "5 – 20 mm" },
  ],
  notes: [
    "The two holes are inset from the ends by the same amount on each side, so the plate can be flipped or rotated without redrilling. The corners are rounded to a small radius that stays inside the rail section.",
    "Make the plate a little under the rail section, and drill the fixing holes from the rail itself or a transfer punch so it cannot stand proud. A plate that overhangs an extrusion catches on everything that slides past it.",
  ],
  header: "Rail End Plate Designer - units: mm",
  fields: [
    { key: "width", label: "Width", kind: "length", section: "Plate", default: "40", min: 20, max: 80 },
    { key: "height", label: "Height", kind: "length", section: "Plate", default: "40", min: 20, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "6", min: 3, max: 12 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Holes", default: "5", min: 3, max: 10 },
    { key: "inset", label: "Hole inset", kind: "length", section: "Holes", default: "8", min: 5, max: 20 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    insetMm: rawLength(raw, "inset"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Width", p.widthMm, 20, 80);
    pushRange(errors, units, "height", "Height", p.heightMm, 20, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 12);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 3, 10);
    pushRange(errors, units, "inset", "Hole inset", p.insetMm, 5, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "width", p.widthMm, p.heightMm);

    const x = p.widthMm / 2 - p.insetMm;
    if (x - p.holeMm / 2 < 2) errors.push({ field: "inset", level: "error", message: "The hole reaches the end of the plate." });
    if (p.holeMm / 2 >= p.heightMm / 2 - 2) errors.push({ field: "hole", level: "error", message: "The hole reaches the side of the plate." });
    if (x <= 0) errors.push({ field: "inset", level: "error", message: "The inset pushes the holes past the centre." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Hole", value: U(p.holeMm, units), source: "input" },
        { label: "Hole spacing", value: U(x * 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} × ${U(p.heightMm, units)} plate`,
        `RP${R(p.widthMm, 0)}-${R(p.heightMm, 0)}`,
        p.widthMm,
        p.heightMm,
        [
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Holes", value: U(p.holeMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = roundedRect(p.widthMm, p.heightMm, Math.min(5, p.widthMm * 0.12, p.heightMm * 0.12));
    const x = p.widthMm / 2 - p.insetMm;
    return plate(outline, p.thicknessMm, [
      circleAt(-x, 0, p.holeMm / 2),
      circleAt(x, 0, p.holeMm / 2),
    ]);
  },
  fileName: (p) => `rail-end-plate-${R(p.widthMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

export const prismBatch3: AnyDesign[] = [
  dialPlate,
  blindFlange,
  orificePlate,
  encoderDisc,
  softJawBlank,
  potGrid,
  petTag,
  cableMarker,
  zipAnchor,
  railEndPlate,
];
