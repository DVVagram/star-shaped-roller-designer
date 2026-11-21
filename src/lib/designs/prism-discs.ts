/** Second library, part 3: drilled discs, plates and rails. */

import { buildPrism } from "@/lib/kit/prism";
import type { Point2D } from "@/lib/kit/units";
import { obround, roundedRect } from "@/lib/kit/outlines";

import {
  boltCircle,
  chamferRings,
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

const U = (value: number, units: Parameters<typeof measure>[1]) => measure(value, units);
const R = (value: number, decimals = 2) => round(value, decimals);

function ringOfHoles(count: number, pcdMm: number, holeMm: number, phase = 0): Point2D[][] {
  return boltCircle(count, pcdMm, holeMm, phase);
}

/** Square grid of holes that actually fits inside a round plate with its rim. */
function strainerGrid(p: {
  outerMm: number;
  rimMm: number;
  centreMm: number;
  holeMm: number;
  pitchMm: number;
}): { x: number; y: number }[] {
  const usable = (p.outerMm / 2 - p.rimMm) * 2;
  const columns = Math.max(0, Math.floor((usable - p.holeMm) / p.pitchMm) + 1);
  const limit = p.outerMm / 2 - p.rimMm - 0.8 - p.holeMm / 2;
  const clearCentre = p.centreMm / 2 + p.holeMm / 2 + 1.2;
  const points: { x: number; y: number }[] = [];
  for (let row = 0; row < columns; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column - (columns - 1) / 2) * p.pitchMm;
      const y = (row - (columns - 1) / 2) * p.pitchMm;
      const radius = Math.hypot(x, y);
      if (radius > limit || radius < clearCentre) continue;
      points.push({ x, y });
    }
  }
  return points;
}

/* --------------------------------------------------------------- brake rotor */

export const brakeRotor: AnyDesign = defineDesign({
  id: "brake-rotor",
  name: "Brake rotor",
  family: "drives",
  eyebrow: "Drilled disc",
  blurb: "A vented-look rotor blank with a bolt circle and a ring of drillings.",
  lede: "A disc with a centre bore, a mounting bolt circle and a ring of cooling holes, sized like a small motorcycle or kart rotor.",
  chips: [
    { label: "Rotor Ø", value: "40 – 1000 mm" },
    { label: "Holes", value: "0 – 36" },
    { label: "Bolt circle", value: "12 – 140 mm" },
  ],
  notes: [
    "The cooling holes are evenly spaced on their own pitch circle, so the pattern is symmetric and the disc stays balanced. The mounting bolt circle is a separate pattern inside it, and every hole is a through-hole in the same cap triangulation as the rim.",
    "A rotor is a demonstration part, not a brake: a rigid material loses stiffness well below brake temperatures. Use it for a go-kart mock-up or a display, and never on a vehicle that has to stop.",
  ],
  header: "Brake Rotor Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Rotor diameter", kind: "length", section: "Rotor", default: "160", min: 40, max: 1000 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Rotor", default: "6", min: 2, max: 20 },
    { key: "bore", label: "Centre bore", kind: "length", section: "Rotor", default: "30", min: 6, max: 100 },
    { key: "boltCircle", label: "Bolt circle", kind: "length", section: "Mounting", default: "60", min: 12, max: 140 },
    { key: "boltHole", label: "Bolt hole", kind: "length", section: "Mounting", default: "8", min: 3, max: 16 },
    { key: "bolts", label: "Bolts", kind: "count", section: "Mounting", default: "5", min: 2, max: 8 },
    { key: "ventHoles", label: "Cooling holes", kind: "count", section: "Cooling", default: "16", min: 0, max: 36 },
    { key: "ventHole", label: "Cooling hole", kind: "length", section: "Cooling", default: "6", min: 2, max: 14 },
    { key: "ventCircle", label: "Cooling circle", kind: "length", section: "Cooling", default: "112", min: 20, max: 170 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    pcdMm: rawLength(raw, "boltCircle"),
    boltMm: rawLength(raw, "boltHole"),
    bolts: rawCount(raw, "bolts"),
    ventCount: rawCount(raw, "ventHoles"),
    ventMm: rawLength(raw, "ventHole"),
    ventPcdMm: rawLength(raw, "ventCircle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Rotor diameter", p.outerMm, 40, 1000);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 20);
    pushRange(errors, units, "bore", "Centre bore", p.boreMm, 6, 100);
    pushRange(errors, units, "boltCircle", "Bolt circle", p.pcdMm, 12, 140);
    pushRange(errors, units, "boltHole", "Bolt hole", p.boltMm, 3, 16);
    pushInteger(errors, "bolts", "Bolts", p.bolts, 2, 8);
    pushInteger(errors, "ventHoles", "Cooling holes", p.ventCount, 0, 36);
    pushRange(errors, units, "ventHole", "Cooling hole", p.ventMm, 2, 14);
    pushRange(errors, units, "ventCircle", "Cooling circle", p.ventPcdMm, 20, 170);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    checkWall(errors, units, "bore", "web between the bore and the bolts", (p.pcdMm - p.boltMm - p.boreMm) / 2);
    if (p.ventCount > 0) {
      if (p.ventPcdMm + p.ventMm >= p.outerMm - 2) errors.push({ field: "ventCircle", level: "error", message: "A cooling hole breaks through the rim." });
      if (p.ventPcdMm - p.ventMm <= p.pcdMm + p.boltMm) errors.push({ field: "ventCircle", level: "error", message: "The cooling holes run into the mounting bolts." });
      const arc = (Math.PI * p.ventPcdMm) / Math.max(1, Math.round(p.ventCount));
      if (arc <= p.ventMm + 2) errors.push({ field: "ventHoles", level: "error", message: "The cooling holes are closer than one diameter." });
    }
    if (p.thicknessMm < 4) warnings.push({ field: "thickness", level: "warning", message: "Under 4 mm the disc is a plate, not a rotor." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Rotor Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Centre bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bolt circle", value: U(p.pcdMm, units), source: "input" },
        { label: "Cooling holes", value: String(Math.round(p.ventCount)), source: "input" },
        { label: "Rim land", value: U((p.outerMm - p.ventPcdMm - p.ventMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} rotor · ${Math.round(p.ventCount)} holes`,
        `BR${R(p.outerMm, 0)}-${R(p.ventPcdMm, 0)}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Rotor Ø", value: U(p.outerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Bolt circle", value: U(p.pcdMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [circle(p.outerMm / 2), circle(p.outerMm / 2)],
      holes: [
        circle(p.boreMm / 2),
        ...boltCircle(p.bolts, p.pcdMm, p.boltMm),
        ...ringOfHoles(p.ventCount, p.ventPcdMm, p.ventMm, 0.2),
      ],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `brake-rotor-${R(p.outerMm, 0)}-${R(p.pcdMm, 0)}pcd.stl`,
});

/* -------------------------------------------------------------- index plate */

export const indexPlate: AnyDesign = defineDesign({
  id: "index-plate",
  name: "Index plate",
  family: "drives",
  eyebrow: "Detent ring",
  blurb: "A disc with a ring of evenly spaced detent holes.",
  lede: "A dividing plate with a ring of identical detent holes on a pitch circle, used to index a fixture or a rotary table by equal steps.",
  chips: [
    { label: "Holes", value: "2 – 72" },
    { label: "Plate Ø", value: "40 – 1000 mm" },
    { label: "Hole", value: "2 – 16 mm" },
  ],
  notes: [
    "The holes are placed by angle, so the last one closes exactly on the first and the step is 360° divided by the count. The index angle is reported directly, which is the number the fixture uses.",
    "A detent hole wears oval. If the plate is a working dividing plate, press a metal bush into each hole or use it only for light indexing.",
  ],
  header: "Index Plate Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Plate diameter", kind: "length", section: "Plate", default: "120", min: 40, max: 1000 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "8", min: 2, max: 20 },
    { key: "bore", label: "Centre bore", kind: "length", section: "Plate", default: "10", min: 3, max: 60 },
    { key: "holes", label: "Detent holes", kind: "count", section: "Detents", default: "12", min: 2, max: 72 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Detents", default: "5", min: 2, max: 16 },
    { key: "holeCircle", label: "Hole circle", kind: "length", section: "Detents", default: "96", min: 16, max: 170 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    holes: rawCount(raw, "holes"),
    holeMm: rawLength(raw, "hole"),
    pcdMm: rawLength(raw, "holeCircle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Plate diameter", p.outerMm, 40, 1000);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 20);
    pushRange(errors, units, "bore", "Centre bore", p.boreMm, 3, 60);
    pushInteger(errors, "holes", "Detent holes", p.holes, 2, 72);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 16);
    pushRange(errors, units, "holeCircle", "Hole circle", p.pcdMm, 16, 170);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const count = Math.max(2, Math.round(p.holes));
    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    checkWall(errors, units, "bore", "ring around the bore", p.pcdMm / 2 - p.holeMm / 2 - p.boreMm / 2);
    if (p.pcdMm + p.holeMm >= p.outerMm) errors.push({ field: "holeCircle", level: "error", message: "A detent hole breaks through the rim." });
    const arc = (Math.PI * p.pcdMm) / count;
    if (arc <= p.holeMm + 1) errors.push({ field: "holes", level: "error", message: "The detent holes touch; use fewer or a larger circle." });
    if (count % 4 === 0 && arc < p.holeMm * 1.6) warnings.push({ field: "holes", level: "warning", message: "At this spacing the webs between holes are thin." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Holes", value: String(count), source: "input" },
        { label: "Index angle", value: `${R(360 / count, 2)}°`, source: "calc" },
        { label: "Hole circle", value: U(p.pcdMm, units), source: "input" },
        { label: "Hole", value: U(p.holeMm, units), source: "input" },
        { label: "Rim land", value: U((p.outerMm - p.pcdMm - p.holeMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${count} detents · ${R(360 / count, 1)}° step`,
        `IP${count}-${R(p.pcdMm, 0)}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Plate", value: U(p.outerMm, units) },
          { label: "Holes", value: String(count) },
          { label: "Step", value: `${R(360 / count, 1)}°` },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [circle(p.outerMm / 2), circle(p.outerMm / 2)],
      holes: [circle(p.boreMm / 2), ...ringOfHoles(p.holes, p.pcdMm, p.holeMm)],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `index-plate-${Math.round(p.holes)}-${R(p.pcdMm, 0)}.stl`,
});

/* -------------------------------------------------------------- vent grille */

export const ventGrille: AnyDesign = defineDesign({
  id: "vent-grille",
  name: "Vent grille",
  family: "fixings",
  eyebrow: "Slot array",
  blurb: "A vent plate cut with rows of obround slots and bars you set.",
  lede: "A vent or speaker grille made from rows of true stadium slots, with the bar between slots set independently of the slot width.",
  chips: [
    { label: "Rows", value: "1 – 12" },
    { label: "Slots", value: "1 – 8" },
    { label: "Plate", value: "20 – 170 mm" },
  ],
  notes: [
    "Each slot is an obround hole with semicircular ends, so the grille has no sharp internal corner to crack. Rows and columns are centred on the plate, and the pitch sets the bar width between them.",
    "A grille loses most of its stiffness to its slots: keep the outer land at least two bar widths, or the plate will bow when it is screwed down.",
  ],
  header: "Vent Grille Designer - units: mm",
  fields: [
    { key: "width", label: "Plate width", kind: "length", section: "Plate", default: "120", min: 20, max: 170 },
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "80", min: 20, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "4", min: 1.5, max: 12 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slots", default: "50", min: 6, max: 150 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slots", default: "6", min: 2, max: 20 },
    { key: "rows", label: "Rows", kind: "count", section: "Slots", default: "4", min: 1, max: 12 },
    { key: "columns", label: "Columns", kind: "count", section: "Slots", default: "2", min: 1, max: 8 },
    { key: "pitch", label: "Row pitch", kind: "length", section: "Slots", default: "14", min: 4, max: 40 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    rows: rawCount(raw, "rows"),
    columns: rawCount(raw, "columns"),
    pitchMm: rawLength(raw, "pitch"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Plate width", p.widthMm, 20, 170);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 20, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 12);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 6, 150);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 2, 20);
    pushInteger(errors, "rows", "Rows", p.rows, 1, 12);
    pushInteger(errors, "columns", "Columns", p.columns, 1, 8);
    pushRange(errors, units, "pitch", "Row pitch", p.pitchMm, 4, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const rows = Math.max(1, Math.round(p.rows));
    const columns = Math.max(1, Math.round(p.columns));
    const stack = (rows - 1) * p.pitchMm + p.slotWidthMm;
    checkSize(errors, units, "width", p.widthMm, p.heightMm);
    if (p.slotLengthMm >= p.widthMm - 4) errors.push({ field: "slotLength", level: "error", message: "The slots reach the edge of the plate." });
    if (stack >= p.heightMm - 4) errors.push({ field: "pitch", level: "error", message: "The slot rows run off the plate." });
    if (columns > 1 && p.slotLengthMm + p.slotWidthMm + 2 >= p.widthMm / columns) errors.push({ field: "columns", level: "error", message: "The slot columns overlap." });
    if (p.pitchMm < p.slotWidthMm + 1.6) errors.push({ field: "pitch", level: "error", message: "The slot rows overlap; increase the pitch." });
    if (p.pitchMm - p.slotWidthMm < 2) warnings.push({ field: "pitch", level: "warning", message: "The bars between rows are under 2 mm." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Slots", value: `${rows} × ${columns}`, source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Bar", value: U(p.pitchMm - p.slotWidthMm, units), source: "calc" },
        { label: "Open area", value: `${R(((rows * columns * (p.slotLengthMm * p.slotWidthMm + Math.PI * (p.slotWidthMm / 2) ** 2)) / (p.widthMm * p.heightMm)) * 100, 1)} %`, source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${rows} × ${columns} slots`,
        `VG${rows}X${columns}-${R(p.slotLengthMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}` },
          { label: "Slots", value: `${rows} × ${columns}` },
          { label: "Bar", value: U(p.pitchMm - p.slotWidthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const rows = Math.max(1, Math.round(p.rows));
    const columns = Math.max(1, Math.round(p.columns));
    const holes: Point2D[][] = [];
    const columnPitch = p.widthMm / columns;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < columns; c += 1) {
        holes.push(
          obround(
            (c - (columns - 1) / 2) * columnPitch,
            (r - (rows - 1) / 2) * p.pitchMm,
            p.slotLengthMm,
            p.slotWidthMm,
            0,
          ),
        );
      }
    }
    return buildPrism({
      rings: [roundedRect(p.widthMm, p.heightMm, 4), roundedRect(p.widthMm, p.heightMm, 4)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `vent-grille-${Math.round(p.rows)}x${Math.round(p.columns)}.stl`,
});

/* --------------------------------------------------------- perforated plate */

export const perforatedPlate: AnyDesign = defineDesign({
  id: "perforated-plate",
  name: "Perforated plate",
  family: "fixings",
  eyebrow: "Hole grid",
  blurb: "A plate with a centred grid of equal holes.",
  lede: "A flat plate drilled on a square grid, sized by pitch and margin so the pattern always fits inside the plate instead of clipping the edge.",
  chips: [
    { label: "Hole", value: "1 – 20 mm" },
    { label: "Pitch", value: "3 – 50 mm" },
    { label: "Plate", value: "20 – 170 mm" },
  ],
  notes: [
    "The count is computed from the plate and the pitch, then the grid is centred, so no hole is ever half-cut by the rim. Increasing the pitch removes holes rather than moving the pattern off-centre.",
    "A perforated plate is much weaker than the same plate left solid. Keep at least one hole diameter of land at the edge and two diameters between holes for anything structural.",
  ],
  header: "Perforated Plate Designer - units: mm",
  fields: [
    { key: "width", label: "Plate width", kind: "length", section: "Plate", default: "100", min: 20, max: 170 },
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "60", min: 20, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "3", min: 1.5, max: 12 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Pattern", default: "4", min: 1, max: 20 },
    { key: "pitch", label: "Hole pitch", kind: "length", section: "Pattern", default: "10", min: 3, max: 50 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    pitchMm: rawLength(raw, "pitch"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Plate width", p.widthMm, 20, 170);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 20, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 12);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 1, 20);
    pushRange(errors, units, "pitch", "Hole pitch", p.pitchMm, 3, 50);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const columns = Math.max(1, Math.floor((p.widthMm - p.holeMm - 4) / p.pitchMm) + 1);
    const rows = Math.max(1, Math.floor((p.heightMm - p.holeMm - 4) / p.pitchMm) + 1);
    checkSize(errors, units, "width", p.widthMm, p.heightMm);
    if (p.pitchMm <= p.holeMm + 1) errors.push({ field: "pitch", level: "error", message: "The holes touch; the pitch must exceed the hole by 1 mm." });
    if (p.holeMm + 4 >= p.widthMm || p.holeMm + 4 >= p.heightMm) errors.push({ field: "hole", level: "error", message: "The hole is too large for the plate." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Pattern", value: `${rows} × ${columns}`, source: "calc" },
        { label: "Holes", value: String(rows * columns), source: "calc" },
        { label: "Hole", value: U(p.holeMm, units), source: "input" },
        { label: "Pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Open area", value: `${R(((rows * columns * Math.PI * (p.holeMm / 2) ** 2) / (p.widthMm * p.heightMm)) * 100, 1)} %`, source: "calc" },
      ],
      preview: previewOf(
        `${rows} × ${columns} holes`,
        `PP${R(p.holeMm, 1)}-${R(p.pitchMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}` },
          { label: "Holes", value: String(rows * columns) },
          { label: "Open area", value: `${R(((rows * columns * Math.PI * (p.holeMm / 2) ** 2) / (p.widthMm * p.heightMm)) * 100, 1)} %` },
        ],
      ),
    };
  },
  build: (p) => {
    const columns = Math.max(1, Math.floor((p.widthMm - p.holeMm - 4) / p.pitchMm) + 1);
    const rows = Math.max(1, Math.floor((p.heightMm - p.holeMm - 4) / p.pitchMm) + 1);
    const holes: Point2D[][] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < columns; c += 1) {
        holes.push(
          circleAt(
            (c - (columns - 1) / 2) * p.pitchMm,
            (r - (rows - 1) / 2) * p.pitchMm,
            p.holeMm / 2,
          ),
        );
      }
    }
    return buildPrism({
      rings: [roundedRect(p.widthMm, p.heightMm, 3), roundedRect(p.widthMm, p.heightMm, 3)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `perforated-plate-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

/* ----------------------------------------------------------- precision spacer */

export const precisionSpacer: AnyDesign = defineDesign({
  id: "precision-spacer",
  name: "Precision spacer",
  family: "drives",
  eyebrow: "Chamfered ring",
  blurb: "A chamfered ring that sets a shaft stack height.",
  lede: "A short ring with a straight bore and a real chamfer on both outside edges, used to space a bearing, a pulley or a gear along a shaft.",
  chips: [
    { label: "Outside Ø", value: "6 – 90 mm" },
    { label: "Bore", value: "2 – 70 mm" },
    { label: "Length", value: "1 – 60 mm" },
  ],
  notes: [
    "The bore is a plain through-hole and the outside is chamfered with four stacked outlines, so the ring seats without a burr rolling under the part it spaces. The wall is reported directly.",
    "A spacer only sets a height if both faces are parallel. Make it on a flat face with the bore vertical, and skim the faces if the stack has to be exact.",
  ],
  header: "Precision Spacer Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outside diameter", kind: "length", section: "Spacer", default: "25", min: 6, max: 90 },
    { key: "bore", label: "Bore", kind: "length", section: "Spacer", default: "10", min: 2, max: 70 },
    { key: "length", label: "Length", kind: "length", section: "Spacer", default: "20", min: 1, max: 60 },
    { key: "chamfer", label: "Face chamfer", kind: "length", section: "Spacer", default: "0.5", min: 0, max: 2 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    boreMm: rawLength(raw, "bore"),
    lengthMm: rawLength(raw, "length"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outside diameter", p.outerMm, 6, 90);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 70);
    pushRange(errors, units, "length", "Length", p.lengthMm, 1, 60);
    pushRange(errors, units, "chamfer", "Face chamfer", p.chamferMm, 0, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkWall(errors, units, "bore", "ring wall", (p.outerMm - p.boreMm) / 2);
    if (p.boreMm >= p.outerMm) errors.push({ field: "bore", level: "error", message: "The bore is wider than the spacer." });
    if (p.lengthMm < p.chamferMm * 2) errors.push({ field: "chamfer", level: "error", message: "The two chamfers meet in the middle." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Wall", value: U((p.outerMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
        { label: "Bearing area", value: `${R((Math.PI * (p.outerMm ** 2 - p.boreMm ** 2)) / 4 / 100, 2)} cm²`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} × ${U(p.lengthMm, units)} spacer`,
        `PS${R(p.outerMm, 0)}-${R(p.boreMm, 0)}`,
        p.outerMm,
        p.lengthMm,
        [
          { label: "Outside", value: U(p.outerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const { rings, fractions } = chamferRings(circle(p.outerMm / 2), p.lengthMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: [circle(p.boreMm / 2)],
      thicknessMm: p.lengthMm,
    });
  },
  fileName: (p) => `spacer-${R(p.outerMm, 0)}x${R(p.boreMm, 0)}x${R(p.lengthMm, 1)}.stl`,
});

/* ---------------------------------------------------------------- fan grille */

export const fanGrille: AnyDesign = defineDesign({
  id: "fan-grille",
  name: "Fan grille",
  family: "fixings",
  eyebrow: "Perforated disc",
  blurb: "A round grille with concentric rings of holes.",
  lede: "A disc grille with two or three concentric rings of holes and a centre boss opening, sized to cover a fan without blocking its flow.",
  chips: [
    { label: "Grille Ø", value: "30 – 1000 mm" },
    { label: "Rings", value: "1 – 4" },
    { label: "Holes", value: "2 – 14 mm" },
  ],
  notes: [
    "Each ring of holes is placed on its own pitch circle with a fixed angular spacing, so the pattern is radial and balanced. The centre opening clears the fan hub and the rim land carries the mounting screws.",
    "Open area matters more than hole count: the designer reports the percentage of the disc that is open, which is the number a fan actually sees.",
  ],
  header: "Fan Grille Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Grille diameter", kind: "length", section: "Grille", default: "80", min: 30, max: 1000 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Grille", default: "3", min: 1.5, max: 10 },
    { key: "centre", label: "Centre opening", kind: "length", section: "Grille", default: "20", min: 0, max: 80 },
    { key: "rings", label: "Hole rings", kind: "count", section: "Pattern", default: "3", min: 1, max: 4 },
    { key: "perRing", label: "Holes per ring", kind: "count", section: "Pattern", default: "12", min: 4, max: 36 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Pattern", default: "4", min: 2, max: 14 },
    { key: "firstRing", label: "First ring Ø", kind: "length", section: "Pattern", default: "38", min: 10, max: 150 },
    { key: "ringGap", label: "Ring spacing", kind: "length", section: "Pattern", default: "15", min: 5, max: 40 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
    centreMm: rawLength(raw, "centre"),
    rings: rawCount(raw, "rings"),
    perRing: rawCount(raw, "perRing"),
    holeMm: rawLength(raw, "hole"),
    firstMm: rawLength(raw, "firstRing"),
    gapMm: rawLength(raw, "ringGap"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Grille diameter", p.outerMm, 30, 1000);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 10);
    pushRange(errors, units, "centre", "Centre opening", p.centreMm, 0, 80);
    pushInteger(errors, "rings", "Hole rings", p.rings, 1, 4);
    pushInteger(errors, "perRing", "Holes per ring", p.perRing, 4, 36);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 14);
    pushRange(errors, units, "firstRing", "First ring", p.firstMm, 10, 150);
    pushRange(errors, units, "ringGap", "Ring spacing", p.gapMm, 5, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const rings = Math.max(1, Math.round(p.rings));
    const outerRing = p.firstMm + (rings - 1) * p.gapMm;
    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    if (outerRing + p.holeMm >= p.outerMm) errors.push({ field: "rings", level: "error", message: "The last ring of holes breaks through the rim." });
    if (p.centreMm > 0) checkWall(errors, units, "centre", "land inside the first ring", (p.firstMm - p.holeMm - p.centreMm) / 2);
    const arc = (Math.PI * p.firstMm) / Math.max(4, Math.round(p.perRing));
    if (arc <= p.holeMm + 1) errors.push({ field: "perRing", level: "error", message: "The holes touch on the inner ring." });

    const holes = rings * Math.round(p.perRing);
    const open =
      (p.centreMm > 0 ? Math.PI * (p.centreMm / 2) ** 2 : 0) +
      holes * Math.PI * (p.holeMm / 2) ** 2;
    const openPct = (open / (Math.PI * (p.outerMm / 2) ** 2)) * 100;
    if (openPct > 55) warnings.push({ field: "hole", level: "warning", message: "Over half the grille is open; it will flex under a fan." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Grille Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Rings", value: String(rings), source: "input" },
        { label: "Holes", value: String(holes), source: "calc" },
        { label: "Outer ring Ø", value: U(outerRing, units), source: "calc" },
        { label: "Open area", value: `${R(openPct, 1)} %`, source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${rings} rings · ${holes} holes`,
        `FG${R(p.outerMm, 0)}-${rings}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Grille", value: U(p.outerMm, units) },
          { label: "Holes", value: String(holes) },
          { label: "Open", value: `${R(openPct, 0)} %` },
        ],
      ),
    };
  },
  build: (p) => {
    const rings = Math.max(1, Math.round(p.rings));
    const holes: Point2D[][] = [];
    if (p.centreMm > 0) holes.push(circle(p.centreMm / 2));
    for (let r = 0; r < rings; r += 1) {
      const pcd = p.firstMm + r * p.gapMm;
      holes.push(...boltCircle(p.perRing, pcd, p.holeMm, (r * Math.PI) / Math.max(4, Math.round(p.perRing))));
    }
    return buildPrism({
      rings: [circle(p.outerMm / 2), circle(p.outerMm / 2)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `fan-grille-${R(p.outerMm, 0)}-${Math.round(p.rings)}ring.stl`,
});

/* -------------------------------------------------------------- baffle plate */

export const bafflePlate: AnyDesign = defineDesign({
  id: "baffle-plate",
  name: "Baffle plate",
  family: "vessels",
  eyebrow: "Flow restriction",
  blurb: "A bored disc with a ring of transfer holes.",
  lede: "A disc that sits inside a tube or a pot: one centre bore and a ring of transfer holes, so flow passes through a known open area instead of around the plate.",
  chips: [
    { label: "Disc Ø", value: "30 – 1000 mm" },
    { label: "Holes", value: "0 – 24" },
    { label: "Bore", value: "2 – 60 mm" },
  ],
  notes: [
    "The centre bore and the ring of holes are both through-holes in one plate, and the rim is left plain so the plate can be a push fit in a tube. The open area is reported as a percentage of the disc.",
    "A baffle in a hot vessel will creep. If it has to hold position, add a groove for an O-ring or trap it between two shoulders.",
  ],
  header: "Baffle Plate Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Disc diameter", kind: "length", section: "Plate", default: "140", min: 30, max: 1000 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "4", min: 1.5, max: 16 },
    { key: "bore", label: "Centre bore", kind: "length", section: "Plate", default: "12", min: 2, max: 60 },
    { key: "holes", label: "Transfer holes", kind: "count", section: "Holes", default: "6", min: 0, max: 24 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Holes", default: "10", min: 2, max: 30 },
    { key: "holeCircle", label: "Hole circle", kind: "length", section: "Holes", default: "100", min: 16, max: 170 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    holes: rawCount(raw, "holes"),
    holeMm: rawLength(raw, "hole"),
    pcdMm: rawLength(raw, "holeCircle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Disc diameter", p.outerMm, 30, 1000);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 16);
    pushRange(errors, units, "bore", "Centre bore", p.boreMm, 2, 60);
    pushInteger(errors, "holes", "Transfer holes", p.holes, 0, 24);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 30);
    pushRange(errors, units, "holeCircle", "Hole circle", p.pcdMm, 16, 170);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    if (p.holes > 0) {
      if (p.pcdMm + p.holeMm >= p.outerMm) errors.push({ field: "holeCircle", level: "error", message: "A transfer hole breaks through the rim." });
      if (p.pcdMm - p.holeMm <= p.boreMm) errors.push({ field: "holeCircle", level: "error", message: "The transfer holes run into the centre bore." });
    }
    const count = Math.round(p.holes);
    const area =
      Math.PI * (p.boreMm / 2) ** 2 + count * Math.PI * (p.holeMm / 2) ** 2;
    const openPct = (area / (Math.PI * (p.outerMm / 2) ** 2)) * 100;

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Centre bore", value: U(p.boreMm, units), source: "input" },
        { label: "Transfer holes", value: String(count), source: "input" },
        { label: "Hole circle", value: U(p.pcdMm, units), source: "input" },
        { label: "Open area", value: `${R(openPct, 1)} %`, source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} disc · ${R(openPct, 0)} % open`,
        `BF${R(p.outerMm, 0)}-${R(p.boreMm, 0)}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Disc", value: U(p.outerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Open", value: `${R(openPct, 0)} %` },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [circle(p.outerMm / 2), circle(p.outerMm / 2)],
      holes: [circle(p.boreMm / 2), ...ringOfHoles(p.holes, p.pcdMm, p.holeMm, 0.3)],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `baffle-${R(p.outerMm, 0)}-${R(p.pcdMm, 0)}.stl`,
});

/* -------------------------------------------------------------- dovetail rail */

export const dovetailRail: AnyDesign = defineDesign({
  id: "dovetail-rail",
  name: "Dovetail rail",
  family: "fixings",
  eyebrow: "Sliding way",
  blurb: "A dovetail-section rail for a sliding carriage.",
  lede: "A straight rail whose cross-section is a dovetail: wide at the base, narrow at the top, with a running fit for a matching carriage.",
  chips: [
    { label: "Base", value: "10 – 80 mm" },
    { label: "Top", value: "6 – 60 mm" },
    { label: "Length", value: "10 – 170 mm" },
  ],
  notes: [
    "The rail is a single prism whose cross-section is the dovetail, extruded along its length, so the angled flanks are planar and the section is constant. The flank angle follows from the base and top widths and the height.",
    "A dovetail needs clearance: leave 0.2–0.3 mm between the rail and the carriage, or the surface compression will seize the slide.",
  ],
  header: "Dovetail Rail Designer - units: mm",
  fields: [
    { key: "base", label: "Base width", kind: "length", section: "Section", default: "40", min: 10, max: 80 },
    { key: "top", label: "Top width", kind: "length", section: "Section", default: "28", min: 6, max: 60 },
    { key: "height", label: "Section height", kind: "length", section: "Section", default: "12", min: 3, max: 40 },
    { key: "length", label: "Rail length", kind: "length", section: "Rail", default: "120", min: 10, max: 170 },
    { key: "relief", label: "Flank relief depth", kind: "length", section: "Relief", default: "1.2", min: 0, max: 5 },
    { key: "reliefWidth", label: "Relief width", kind: "length", section: "Relief", default: "5", min: 2, max: 20 },
  ],
  parse: (raw) => ({
    baseMm: rawLength(raw, "base"),
    topMm: rawLength(raw, "top"),
    heightMm: rawLength(raw, "height"),
    lengthMm: rawLength(raw, "length"),
    reliefMm: rawLength(raw, "relief"),
    reliefWidthMm: rawLength(raw, "reliefWidth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "base", "Base width", p.baseMm, 10, 80);
    pushRange(errors, units, "top", "Top width", p.topMm, 6, 60);
    pushRange(errors, units, "height", "Section height", p.heightMm, 3, 40);
    pushRange(errors, units, "length", "Rail length", p.lengthMm, 10, 170);
    pushRange(errors, units, "relief", "Flank relief depth", p.reliefMm, 0, 5);
    pushRange(errors, units, "reliefWidth", "Relief width", p.reliefWidthMm, 2, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", p.baseMm, p.lengthMm);
    if (p.topMm >= p.baseMm) warnings.push({ field: "top", level: "warning", message: "A top as wide as the base is a plain bar, not a dovetail." });
    const flankHalf = p.baseMm / 2 - ((p.baseMm - p.topMm) / 2) * 0.55;
    if (p.reliefMm > 0 && p.reliefMm >= flankHalf - 0.5) errors.push({ field: "relief", level: "error", message: "The flank relief reaches the centre of the rail." });
    if (p.reliefWidthMm > p.heightMm * 0.6) errors.push({ field: "reliefWidth", level: "error", message: "The relief groove is taller than the flank." });
    const angle = (Math.atan2((p.baseMm - p.topMm) / 2, p.heightMm) * 180) / Math.PI;

    return {
      errors,
      warnings,
      readout: [
        { label: "Base", value: U(p.baseMm, units), source: "input" },
        { label: "Top", value: U(p.topMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Flank angle", value: `${R(angle, 1)}°`, source: "calc" },
        { label: "Flank relief", value: `${U(p.reliefMm, units)} × ${U(p.reliefWidthMm, units)}`, source: "input" },
      ],
      preview: previewOf(
        `${U(p.baseMm, units)} base · ${U(p.lengthMm, units)} long`,
        `DR${R(p.baseMm, 0)}-${R(p.topMm, 0)}`,
        p.baseMm,
        p.lengthMm,
        [
          { label: "Base", value: U(p.baseMm, units) },
          { label: "Top", value: U(p.topMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const halfBase = p.baseMm / 2;
    const halfTop = p.topMm / 2;
    const xAt = (y: number) => halfBase - ((halfBase - halfTop) * y) / p.heightMm;
    const y0 = p.heightMm * 0.55;
    const y1 = Math.min(p.heightMm - 0.5, y0 + p.reliefWidthMm);
    const relief = Math.min(p.reliefMm, xAt(y0) - 0.5);
    const outline: Point2D[] = [
      { x: -halfBase, y: 0 },
      { x: halfBase, y: 0 },
    ];
    if (relief > 0) {
      outline.push(
        { x: xAt(y0), y: y0 },
        { x: xAt(y0) - relief, y: y0 },
        { x: xAt(y1) - relief, y: y1 },
        { x: xAt(y1), y: y1 },
      );
    }
    outline.push({ x: halfTop, y: p.heightMm }, { x: -halfTop, y: p.heightMm });
    if (relief > 0) {
      outline.push(
        { x: -xAt(y1), y: y1 },
        { x: -xAt(y1) + relief, y: y1 },
        { x: -xAt(y0) + relief, y: y0 },
        { x: -xAt(y0), y: y0 },
      );
    }
    return buildPrism({ rings: [outline, outline], holes: [], thicknessMm: p.lengthMm });
  },
  fileName: (p) => `dovetail-rail-${R(p.baseMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* -------------------------------------------------------------- sink strainer */

export const sinkStrainer: AnyDesign = defineDesign({
  id: "sink-strainer",
  name: "Sink strainer",
  family: "vessels",
  eyebrow: "Drain plate",
  blurb: "A perforated drain plate with a centre opening.",
  lede: "A round drain plate with a centre outlet and a square grid of holes, for a sink, a shower tray or a plant pot.",
  chips: [
    { label: "Plate Ø", value: "20 – 140 mm" },
    { label: "Holes", value: "1 – 12 mm" },
    { label: "Pitch", value: "3 – 30 mm" },
  ],
  notes: [
    "The grid is computed to fit inside the plate with a solid rim, so no hole is clipped by the edge. The centre opening takes the waste fitting and the rim is wide enough to sit on a recessed seat.",
    "A strainer works by open area, not hole count: the designer reports the open percentage so you can compare two patterns before making.",
  ],
  header: "Sink Strainer Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Plate diameter", kind: "length", section: "Plate", default: "70", min: 20, max: 140 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "2.5", min: 1, max: 8 },
    { key: "centre", label: "Centre opening", kind: "length", section: "Plate", default: "14", min: 2, max: 50 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Pattern", default: "4", min: 1, max: 12 },
    { key: "pitch", label: "Hole pitch", kind: "length", section: "Pattern", default: "8", min: 3, max: 30 },
    { key: "rim", label: "Solid rim", kind: "length", section: "Plate", default: "5", min: 2, max: 20 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
    centreMm: rawLength(raw, "centre"),
    holeMm: rawLength(raw, "hole"),
    pitchMm: rawLength(raw, "pitch"),
    rimMm: rawLength(raw, "rim"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Plate diameter", p.outerMm, 20, 140);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1, 8);
    pushRange(errors, units, "centre", "Centre opening", p.centreMm, 2, 50);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 1, 12);
    pushRange(errors, units, "pitch", "Hole pitch", p.pitchMm, 3, 30);
    pushRange(errors, units, "rim", "Solid rim", p.rimMm, 2, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const usable = (p.outerMm / 2 - p.rimMm) * 2;
    const columns = Math.max(0, Math.floor((usable - p.holeMm) / p.pitchMm) + 1);
    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    if (p.pitchMm <= p.holeMm + 0.8) errors.push({ field: "pitch", level: "error", message: "The holes touch; widen the pitch." });
    if (columns === 0) errors.push({ field: "hole", level: "error", message: "No hole fits inside the solid rim." });
    if (p.centreMm + 4 > usable) errors.push({ field: "centre", level: "error", message: "The centre opening reaches the rim." });

    const count = strainerGrid(p).length;
    if (count === 0) errors.push({ field: "hole", level: "error", message: "No hole fits inside the round plate." });
    const open =
      Math.PI * (p.centreMm / 2) ** 2 + count * Math.PI * (p.holeMm / 2) ** 2;
    const openPct = (open / (Math.PI * (p.outerMm / 2) ** 2)) * 100;
    if (openPct < 8) warnings.push({ field: "pitch", level: "warning", message: "Under 8 % open area drains very slowly." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Pattern", value: `${columns} × ${columns}`, source: "calc" },
        { label: "Centre opening", value: U(p.centreMm, units), source: "input" },
        { label: "Hole", value: U(p.holeMm, units), source: "input" },
        { label: "Open area", value: `${R(openPct, 1)} %`, source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${columns} × ${columns} holes · ${R(openPct, 0)} % open`,
        `SS${R(p.outerMm, 0)}-${R(p.holeMm, 1)}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Plate", value: U(p.outerMm, units) },
          { label: "Holes", value: String(count) },
          { label: "Open", value: `${R(openPct, 0)} %` },
        ],
      ),
    };
  },
  build: (p) => {
    const holes: Point2D[][] = [circle(p.centreMm / 2)];
    for (const point of strainerGrid(p)) {
      holes.push(circleAt(point.x, point.y, p.holeMm / 2));
    }
    return buildPrism({
      rings: [circle(p.outerMm / 2), circle(p.outerMm / 2)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `sink-strainer-${R(p.outerMm, 0)}-${R(p.holeMm, 1)}.stl`,
});

/* ------------------------------------------------------------- mounting ring */

export const mountingRing: AnyDesign = defineDesign({
  id: "mounting-ring",
  name: "Mounting ring",
  family: "fixings",
  eyebrow: "Clamp ring",
  blurb: "A bored ring with a ring of clamp bolts.",
  lede: "A flat ring that clamps a flange, a lens or a boot: a large bore, a ring of bolts outside it and a land wide enough to seal.",
  chips: [
    { label: "Outside Ø", value: "20 – 1000 mm" },
    { label: "Bore", value: "10 – 160 mm" },
    { label: "Bolts", value: "2 – 12" },
  ],
  notes: [
    "The bolts sit between the bore and the rim, with the land reported on both sides so the ring is not a washer with holes in the wrong place. The outline is a circle and the bore is a true through-hole.",
    "A clamp ring needs to be stiff: if the land is under 4 mm it will dish between the bolts and leak. Thicken the ring before adding more bolts.",
  ],
  header: "Mounting Ring Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outside diameter", kind: "length", section: "Ring", default: "90", min: 20, max: 1000 },
    { key: "bore", label: "Bore", kind: "length", section: "Ring", default: "60", min: 10, max: 160 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Ring", default: "8", min: 2, max: 20 },
    { key: "bolts", label: "Bolts", kind: "count", section: "Bolts", default: "6", min: 2, max: 12 },
    { key: "boltHole", label: "Bolt hole", kind: "length", section: "Bolts", default: "6", min: 2, max: 16 },
    { key: "boltCircle", label: "Bolt circle", kind: "length", section: "Bolts", default: "75", min: 16, max: 170 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    boreMm: rawLength(raw, "bore"),
    thicknessMm: rawLength(raw, "thickness"),
    bolts: rawCount(raw, "bolts"),
    boltMm: rawLength(raw, "boltHole"),
    pcdMm: rawLength(raw, "boltCircle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outside diameter", p.outerMm, 20, 1000);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 10, 160);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 20);
    pushInteger(errors, "bolts", "Bolts", p.bolts, 2, 12);
    pushRange(errors, units, "boltHole", "Bolt hole", p.boltMm, 2, 16);
    pushRange(errors, units, "boltCircle", "Bolt circle", p.pcdMm, 16, 170);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    if (p.boreMm >= p.outerMm) errors.push({ field: "bore", level: "error", message: "The bore is wider than the ring." });
    checkWall(errors, units, "bore", "land inside the bolts", (p.pcdMm - p.boltMm - p.boreMm) / 2);
    checkWall(errors, units, "boltCircle", "land outside the bolts", (p.outerMm - p.pcdMm - p.boltMm) / 2);
    if (p.thicknessMm < 5) warnings.push({ field: "thickness", level: "warning", message: "A ring under 5 mm dishes between the bolts." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bolts", value: String(Math.round(p.bolts)), source: "input" },
        { label: "Bolt circle", value: U(p.pcdMm, units), source: "input" },
        { label: "Inner land", value: U((p.pcdMm - p.boltMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Outer land", value: U((p.outerMm - p.pcdMm - p.boltMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} ring · ${Math.round(p.bolts)} bolts`,
        `MR${R(p.outerMm, 0)}-${R(p.pcdMm, 0)}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Outside", value: U(p.outerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Bolt circle", value: U(p.pcdMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [circle(p.outerMm / 2), circle(p.outerMm / 2)],
      holes: [circle(p.boreMm / 2), ...boltCircle(p.bolts, p.pcdMm, p.boltMm)],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `mounting-ring-${R(p.outerMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

export const prismDiscs: AnyDesign[] = [
  brakeRotor,
  indexPlate,
  ventGrille,
  perforatedPlate,
  precisionSpacer,
  fanGrille,
  bafflePlate,
  dovetailRail,
  sinkStrainer,
  mountingRing,
];
