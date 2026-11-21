/** Workshop batch 2: clamps, jigs and workholding plates. */

import { arcPoints, obround, roundedRect } from "@/lib/kit/outlines";
import { buildPrism } from "@/lib/kit/prism";
import type { LengthUnit, Point2D } from "@/lib/kit/units";

import { checkSize, emptyResult, measure, round } from "./helpers";
import {
  defineDesign,
  previewOf,
  pushInteger,
  pushRange,
  rawCount,
  rawLength,
  rawNumber,
  type AnyDesign,
  type DesignIssue,
} from "./types";

const U = (value: number, units: LengthUnit) => measure(value, units);
const R = (value: number, decimals = 2) => round(value, decimals);

function plate(outline: Point2D[], thicknessMm: number, holes: Point2D[][] = []) {
  return buildPrism({ rings: [outline, outline], holes, thicknessMm });
}

function circleAt(cx: number, cy: number, radius: number, segments = 44): Point2D[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (Math.PI * 2 * i) / segments;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function spread(count: number, from: number, to: number): number[] {
  const n = Math.max(1, Math.round(count));
  if (n === 1) return [(from + to) / 2];
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
}

/* -------------------------------------------------------------- saddle clamp */

export const saddleClamp: AnyDesign = defineDesign({
  id: "saddle-clamp",
  name: "Saddle clamp",
  family: "fixings",
  eyebrow: "Cable saddle",
  blurb: "A screw plate with a half-round seat that clamps a cable to a wall.",
  lede: "A saddle that spreads a screw's load around a cable or a conduit instead of pinching it at one point. The seat is a true half-round cut from the top edge, with a screw either side, so the cable is held without being crushed.",
  use: "Fixing a cable, a conduit or a small hose to a wall or a skirting without crushing it.",
  notesTitle: "How the seat is cut",
  chips: [
    { label: "Plate", value: "30 – 100 mm" },
    { label: "Length", value: "30 – 120 mm" },
    { label: "Cable Ø", value: "10 – 80 mm" },
  ],
  notes: [
    "The seat is a semicircle centred on the top edge, so the cable sits half-buried in the plate and the screw line stays below it. The plate width is checked against the seat plus two screw bosses before the outline is built.",
    "Print it with the plate flat and the seat opening upward. The screws compress the plate against the wall; do not overtighten or the seat will close onto the cable.",
  ],
  header: "Saddle Clamp Designer - units: mm",
  fields: [
    { key: "plateWidth", label: "Plate width", kind: "length", section: "Plate", default: "50", min: 30, max: 100 },
    { key: "plateLength", label: "Plate length", kind: "length", section: "Plate", default: "60", min: 30, max: 120 },
    { key: "cable", label: "Cable diameter", kind: "length", section: "Seat", default: "25", min: 10, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "5", min: 3, max: 12 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "4.5", min: 3, max: 8 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "plateWidth"),
    lengthMm: rawLength(raw, "plateLength"),
    cableMm: rawLength(raw, "cable"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "plateWidth", "Plate width", p.widthMm, 30, 100);
    pushRange(errors, units, "plateLength", "Plate length", p.lengthMm, 30, 120);
    pushRange(errors, units, "cable", "Cable diameter", p.cableMm, 10, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 12);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "plateLength", p.widthMm, p.lengthMm);

    const r = p.cableMm / 2;
    const boss = p.holeMm + 7;
    if (p.widthMm < p.cableMm + 2 * boss) errors.push({ field: "plateWidth", level: "error", message: "The plate is too narrow for the seat and its two screw bosses." });
    if (p.lengthMm < r + p.holeMm + 14) errors.push({ field: "plateLength", level: "error", message: "The plate is too short to hold the seat and a screw below it." });
    if (p.thicknessMm < p.holeMm) warnings.push({ field: "thickness", level: "warning", message: "The plate is thinner than the screw; use a washer." });

    const screwX = p.cableMm / 2 + boss / 2;
    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.lengthMm, units)}`, source: "input" },
        { label: "Seat", value: U(p.cableMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screws", value: "2", source: "calc" },
        { label: "Screw centres", value: U(screwX * 2, units), source: "calc" },
        { label: "Seat depth", value: U(r, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.cableMm, units)} seat · 2 screws`,
        `SC${R(p.widthMm, 0)}-${R(p.cableMm, 0)}`,
        p.widthMm,
        p.lengthMm,
        [
          { label: "Plate", value: U(p.widthMm, units) },
          { label: "Seat", value: U(p.cableMm, units) },
          { label: "Screws", value: "2" },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.cableMm / 2;
    const outline: Point2D[] = [
      { x: -p.widthMm / 2, y: -p.lengthMm / 2 },
      { x: p.widthMm / 2, y: -p.lengthMm / 2 },
      { x: p.widthMm / 2, y: p.lengthMm / 2 },
      { x: r, y: p.lengthMm / 2 },
      ...arcPoints(0, p.lengthMm / 2, r, 0, -Math.PI, 28),
      { x: -p.widthMm / 2, y: p.lengthMm / 2 },
    ];
    const screwX = p.cableMm / 2 + (p.holeMm + 7) / 2;
    const screwY = -p.lengthMm / 4;
    return plate(outline, p.thicknessMm, [
      circleAt(screwX, screwY, p.holeMm / 2),
      circleAt(-screwX, screwY, p.holeMm / 2),
    ]);
  },
  fileName: (p) => `saddle-clamp-${R(p.widthMm, 0)}-${R(p.cableMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- pipe saddle */

export const pipeSaddle: AnyDesign = defineDesign({
  id: "pipe-saddle",
  name: "Pipe saddle",
  family: "fixings",
  eyebrow: "Strap seat",
  blurb: "A wide half-round seat with two strap slots for an insulated pipe.",
  lede: "A pipe saddle for a strap rather than a screw: the plate is wide enough to spread the load through insulation, and two obround slots take a band or a cable tie over the pipe. The seat itself is a true half-round.",
  use: "Holding an insulated pipe or a duct against a joist with a strap instead of a screw clip.",
  notesTitle: "Why the slots are obround",
  chips: [
    { label: "Pipe Ø", value: "20 – 120 mm" },
    { label: "Plate", value: "40 – 150 mm" },
    { label: "Slot", value: "10 – 40 mm" },
  ],
  notes: [
    "The strap slots are obround so one plate takes several strap widths and the band can pull straight down without binding on a corner. They sit outboard of the seat, which keeps the strap clear of the insulated pipe.",
    "Print it flat with the seat up. A strap pulls the plate onto the pipe, so the plate needs to be stiff: six perimeters and a solid infill, not a thin shell.",
  ],
  header: "Pipe Saddle Designer - units: mm",
  fields: [
    { key: "pipe", label: "Pipe diameter", kind: "length", section: "Seat", default: "60", min: 20, max: 120 },
    { key: "plateWidth", label: "Plate width", kind: "length", section: "Plate", default: "110", min: 40, max: 150 },
    { key: "plateLength", label: "Plate length", kind: "length", section: "Plate", default: "70", min: 40, max: 140 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "6", min: 4, max: 12 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Strap", default: "20", min: 10, max: 40 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Strap", default: "8", min: 4, max: 15 },
  ],
  parse: (raw) => ({
    pipeMm: rawLength(raw, "pipe"),
    widthMm: rawLength(raw, "plateWidth"),
    lengthMm: rawLength(raw, "plateLength"),
    thicknessMm: rawLength(raw, "thickness"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "pipe", "Pipe diameter", p.pipeMm, 20, 120);
    pushRange(errors, units, "plateWidth", "Plate width", p.widthMm, 40, 150);
    pushRange(errors, units, "plateLength", "Plate length", p.lengthMm, 40, 140);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 12);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 10, 40);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 4, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "plateWidth", p.widthMm, p.lengthMm);

    const r = p.pipeMm / 2;
    const need = p.pipeMm + 2 * (p.slotWidthMm + 16);
    if (p.widthMm < need) errors.push({ field: "plateWidth", level: "error", message: `The strap slots need a plate at least ${U(need, units)} wide.` });
    if (p.lengthMm < r + p.slotLengthMm + 16) errors.push({ field: "plateLength", level: "error", message: "The plate is too short for the seat and its strap slots." });
    if (p.slotLengthMm <= p.slotWidthMm) errors.push({ field: "slotLength", level: "error", message: "The slot must be longer than it is wide." });
    if (p.slotWidthMm < p.slotLengthMm * 0.2) warnings.push({ field: "slotWidth", level: "warning", message: "A very narrow slot will tear under a strap." });
    const slotX = r + 10 + p.slotWidthMm / 2;

    return {
      errors,
      warnings,
      readout: [
        { label: "Pipe Ø", value: U(p.pipeMm, units), source: "input" },
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.lengthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Strap slots", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Slot centres", value: U(slotX * 2, units), source: "calc" },
        { label: "Seat depth", value: U(r, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.pipeMm, units)} pipe · strap slots`,
        `PA${R(p.widthMm, 0)}-${R(p.pipeMm, 0)}`,
        p.widthMm,
        p.lengthMm,
        [
          { label: "Pipe", value: U(p.pipeMm, units) },
          { label: "Plate", value: U(p.widthMm, units) },
          { label: "Slots", value: "2" },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.pipeMm / 2;
    const outline: Point2D[] = [
      { x: -p.widthMm / 2, y: -p.lengthMm / 2 },
      { x: p.widthMm / 2, y: -p.lengthMm / 2 },
      { x: p.widthMm / 2, y: p.lengthMm / 2 },
      { x: r, y: p.lengthMm / 2 },
      ...arcPoints(0, p.lengthMm / 2, r, 0, -Math.PI, 32),
      { x: -p.widthMm / 2, y: p.lengthMm / 2 },
    ];
    const slotX = r + 10 + p.slotWidthMm / 2;
    const slotY = -p.lengthMm / 4;
    return plate(outline, p.thicknessMm, [
      obround(slotX, slotY, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, Math.PI / 2),
      obround(-slotX, slotY, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, Math.PI / 2),
    ]);
  },
  fileName: (p) => `pipe-saddle-${R(p.pipeMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- cable comb */

export const cableComb: AnyDesign = defineDesign({
  id: "cable-comb",
  name: "Cable comb",
  family: "fixings",
  eyebrow: "Wire rake",
  blurb: "A slotted comb that fans a wire bundle into an even, tidy row.",
  lede: "A comb with real teeth and slots, used to separate and route the wires in a harness. The tooth width and the slot width are derived from the comb width and tooth count, so the pattern always closes exactly on both edges.",
  use: "Separating and routing wires in a cable harness, a control panel or a printer build.",
  notesTitle: "How the teeth divide the width",
  chips: [
    { label: "Width", value: "40 – 160 mm" },
    { label: "Teeth", value: "2 – 12" },
    { label: "Slot", value: "3 – 15 mm" },
  ],
  notes: [
    "The slot count is one less than the tooth count, and the teeth take whatever width is left after the slots. Both ends are full teeth, so the comb has a straight edge to register against a connector or a tie point.",
    "Print it with the comb flat and the teeth in the plane of the bed; a comb printed on edge has layer lines across every tooth root. Keep the teeth at least 2 mm wide or they will snap when a wire is pushed in.",
  ],
  header: "Cable Comb Designer - units: mm",
  fields: [
    { key: "width", label: "Comb width", kind: "length", section: "Comb", default: "90", min: 40, max: 160 },
    { key: "base", label: "Base height", kind: "length", section: "Comb", default: "16", min: 8, max: 30 },
    { key: "toothLength", label: "Tooth length", kind: "length", section: "Teeth", default: "40", min: 20, max: 80 },
    { key: "teeth", label: "Teeth", kind: "count", section: "Teeth", default: "6", min: 2, max: 12 },
    { key: "slot", label: "Slot width", kind: "length", section: "Teeth", default: "6", min: 3, max: 15 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Comb", default: "4", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    baseMm: rawLength(raw, "base"),
    toothMm: rawLength(raw, "toothLength"),
    teeth: rawCount(raw, "teeth"),
    slotMm: rawLength(raw, "slot"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Comb width", p.widthMm, 40, 160);
    pushRange(errors, units, "base", "Base height", p.baseMm, 8, 30);
    pushRange(errors, units, "toothLength", "Tooth length", p.toothMm, 20, 80);
    pushInteger(errors, "teeth", "Teeth", p.teeth, 2, 12);
    pushRange(errors, units, "slot", "Slot width", p.slotMm, 3, 15);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "width", p.widthMm, p.baseMm + p.toothMm);

    const n = Math.max(2, Math.round(p.teeth));
    const toothWidth = (p.widthMm - (n - 1) * p.slotMm) / n;
    if (toothWidth < 2) errors.push({ field: "teeth", level: "error", message: "The slots leave teeth under 2 mm; use fewer teeth, a wider comb or narrower slots." });
    if (toothWidth < 3) warnings.push({ field: "teeth", level: "warning", message: "Teeth under 3 mm are easy to snap when a wire is pressed in." });
    if (p.toothMm < p.slotMm * 2) warnings.push({ field: "toothLength", level: "warning", message: "Short teeth guide the wires poorly." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Comb", value: `${U(p.widthMm, units)} wide`, source: "input" },
        { label: "Teeth", value: String(n), source: "input" },
        { label: "Tooth width", value: U(toothWidth, units), source: "calc" },
        { label: "Slot", value: U(p.slotMm, units), source: "input" },
        { label: "Tooth length", value: U(p.toothMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${n} teeth · ${U(p.slotMm, units)} slots`,
        `CC${R(p.widthMm, 0)}-${n}`,
        p.widthMm,
        p.baseMm + p.toothMm,
        [
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Teeth", value: String(n) },
          { label: "Slot", value: U(p.slotMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const n = Math.max(2, Math.round(p.teeth));
    const toothWidth = (p.widthMm - (n - 1) * p.slotMm) / n;
    const top = p.baseMm + p.toothMm;
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.widthMm, y: 0 },
      { x: p.widthMm, y: p.baseMm },
    ];
    for (let i = n - 1; i >= 0; i -= 1) {
      const left = i * (toothWidth + p.slotMm);
      outline.push({ x: left + toothWidth, y: top }, { x: left, y: top });
      if (i > 0) {
        outline.push({ x: left, y: p.baseMm }, { x: left - p.slotMm, y: p.baseMm }, { x: left - p.slotMm, y: top });
      }
    }
    return plate(outline, p.thicknessMm);
  },
  fileName: (p) => `cable-comb-${R(p.widthMm, 0)}-${Math.round(p.teeth)}.stl`,
});

/* --------------------------------------------------------------- featherboard */

export const featherboard: AnyDesign = defineDesign({
  id: "featherboard",
  name: "Featherboard",
  family: "fixings",
  eyebrow: "Spring board",
  blurb: "A slotted board whose fingers press work against a saw fence.",
  lede: "A featherboard made from a plate crossed by angled slots. The narrow strips left between the slots are the fingers; they flex against the work and keep it tight to the fence without pinching it.",
  use: "Holding stock against a table-saw or router-table fence while keeping hands clear of the cutter.",
  notesTitle: "How the fingers are formed",
  chips: [
    { label: "Length", value: "80 – 170 mm" },
    { label: "Width", value: "30 – 90 mm" },
    { label: "Slots", value: "3 – 9" },
  ],
  notes: [
    "Each slot is an obround rotated to the feather angle, and the strip between two slots is the finger. The designer checks the slot's rotated envelope against the board and the pitch between slots, so no two cuts run together.",
    "Print in PETG rather than PLA if the board lives in a cold workshop; PLA fingers crack after a few seasons. Print flat with four perimeters so each finger is solid across its width.",
  ],
  header: "Featherboard Designer - units: mm",
  fields: [
    { key: "length", label: "Board length", kind: "length", section: "Board", default: "150", min: 80, max: 170 },
    { key: "width", label: "Board width", kind: "length", section: "Board", default: "60", min: 30, max: 90 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Board", default: "8", min: 4, max: 15 },
    { key: "slots", label: "Slots", kind: "count", section: "Fingers", default: "3", min: 3, max: 9 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Fingers", default: "35", min: 20, max: 60 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Fingers", default: "5", min: 3, max: 10 },
    { key: "angle", label: "Feather angle", kind: "number", section: "Fingers", default: "15", min: 0, max: 30 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    slots: rawCount(raw, "slots"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    angleDeg: rawNumber(raw, "angle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Board length", p.lengthMm, 80, 170);
    pushRange(errors, units, "width", "Board width", p.widthMm, 30, 90);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 15);
    pushInteger(errors, "slots", "Slots", p.slots, 3, 9);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 20, 60);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 3, 10);
    pushRange(errors, units, "angle", "Feather angle", p.angleDeg, 0, 30, false);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.widthMm);

    const count = Math.max(3, Math.round(p.slots));
    const rad = (p.angleDeg * Math.PI) / 180;
    const xExtent = p.slotLengthMm * Math.cos(rad) + p.slotWidthMm * Math.sin(rad);
    const yExtent = p.slotLengthMm * Math.sin(rad) + p.slotWidthMm * Math.cos(rad);
    const margin = Math.max(xExtent / 2 + 5, p.slotWidthMm + 5);
    const from = -p.lengthMm / 2 + margin;
    const to = p.lengthMm / 2 - margin;
    if (to <= from) errors.push({ field: "length", level: "error", message: "The slots are too long for the board." });
    else if (count > 1 && (to - from) / (count - 1) < xExtent + 4) errors.push({ field: "slots", level: "error", message: "The slots overlap along the board; use fewer or shorter slots." });
    if (yExtent > p.widthMm - 12) errors.push({ field: "slotLength", level: "error", message: "The rotated slot crosses the board edge; shorten it or reduce the angle." });
    if (p.thicknessMm < 6) warnings.push({ field: "thickness", level: "warning", message: "Under 6 mm the fingers have very little spring." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Board", value: `${U(p.lengthMm, units)} × ${U(p.widthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slots", value: String(count), source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Feather angle", value: `${R(p.angleDeg, 1)}°`, source: "input" },
        { label: "Finger pitch", value: U((to - from) / (count - 1) - p.slotWidthMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${count} fingers · ${R(p.angleDeg, 0)}°`,
        `FW${R(p.lengthMm, 0)}-${count}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Board", value: U(p.lengthMm, units) },
          { label: "Slots", value: String(count) },
          { label: "Angle", value: `${R(p.angleDeg, 0)}°` },
        ],
      ),
    };
  },
  build: (p) => {
    const count = Math.max(3, Math.round(p.slots));
    const rad = (p.angleDeg * Math.PI) / 180;
    const xExtent = p.slotLengthMm * Math.cos(rad) + p.slotWidthMm * Math.sin(rad);
    const margin = Math.max(xExtent / 2 + 5, p.slotWidthMm + 5);
    const holes = spread(count, -p.lengthMm / 2 + margin, p.lengthMm / 2 - margin).map((x) =>
      obround(x, 0, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, rad),
    );
    return plate(roundedRect(p.lengthMm, p.widthMm, 6), p.thicknessMm, holes);
  },
  fileName: (p) => `featherboard-${R(p.lengthMm, 0)}-${Math.round(p.slots)}.stl`,
});

/* ------------------------------------------------------------ hold-down clamp */

export const holdDownClamp: AnyDesign = defineDesign({
  id: "hold-down-clamp",
  name: "Hold-down clamp",
  family: "fixings",
  eyebrow: "Pivot arm",
  blurb: "A pivoting arm with a pivot hole and a long slot for a hold-down bolt.",
  lede: "A hold-down arm for a drill press or a router table: one end pivots on a pin and a bolt through the slot pulls the other end down onto the work. The slot length is the clamping range, and it is reported directly.",
  use: "Holding a workpiece flat on a drill-press or router table with one bolt and one pivot.",
  notesTitle: "How the slot sets the range",
  chips: [
    { label: "Length", value: "60 – 160 mm" },
    { label: "Width", value: "20 – 50 mm" },
    { label: "Pivot", value: "4 – 12 mm" },
  ],
  notes: [
    "The pivot hole is sized to the pin and the slot to the hold-down bolt. The slot is an obround, so the bolt can sit anywhere along the arm without binding, and its near end is kept clear of the pivot by a full wall.",
    "Print the arm flat with the slot vertical through the thickness. A hold-down is loaded in bending, so orient the layers along the arm and use at least five perimeters.",
  ],
  header: "Hold-Down Clamp Designer - units: mm",
  fields: [
    { key: "length", label: "Arm length", kind: "length", section: "Arm", default: "110", min: 60, max: 160 },
    { key: "width", label: "Arm width", kind: "length", section: "Arm", default: "28", min: 20, max: 50 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Arm", default: "6", min: 4, max: 12 },
    { key: "pivot", label: "Pivot hole", kind: "length", section: "Pivot", default: "6", min: 4, max: 12 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slot", default: "45", min: 20, max: 80 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slot", default: "7", min: 4, max: 12 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    pivotMm: rawLength(raw, "pivot"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Arm length", p.lengthMm, 60, 160);
    pushRange(errors, units, "width", "Arm width", p.widthMm, 20, 50);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 12);
    pushRange(errors, units, "pivot", "Pivot hole", p.pivotMm, 4, 12);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 20, 80);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 4, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.widthMm);

    const pivotX = -p.lengthMm / 2 + p.widthMm / 2 + 3;
    const slotCentre = p.lengthMm / 2 - p.slotLengthMm / 2 - 6;
    const gap = slotCentre - p.slotLengthMm / 2 - (pivotX + p.pivotMm / 2);
    if (p.widthMm < Math.max(p.pivotMm, p.slotWidthMm) + 8) errors.push({ field: "width", level: "error", message: "The arm is too narrow around the pivot and slot." });
    if (p.slotLengthMm >= p.lengthMm / 2) errors.push({ field: "slotLength", level: "error", message: "The slot is longer than half the arm." });
    if (gap < 4) errors.push({ field: "slotLength", level: "error", message: "The slot runs into the pivot; shorten it or lengthen the arm." });
    if (p.thicknessMm < p.slotWidthMm) warnings.push({ field: "thickness", level: "warning", message: "The arm is thinner than the bolt; add a washer." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Arm", value: `${U(p.lengthMm, units)} × ${U(p.widthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Pivot", value: U(p.pivotMm, units), source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Clamp range", value: U(p.slotLengthMm - p.slotWidthMm, units), source: "calc" },
        { label: "Pivot to slot", value: U(slotCentre - p.slotLengthMm / 2 - pivotX, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} arm · ${U(p.slotLengthMm, units)} slot`,
        `HD${R(p.lengthMm, 0)}-${R(p.slotLengthMm, 0)}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Arm", value: U(p.lengthMm, units) },
          { label: "Slot", value: U(p.slotLengthMm, units) },
          { label: "Pivot", value: U(p.pivotMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const pivotX = -p.lengthMm / 2 + p.widthMm / 2 + 3;
    const slotCentre = p.lengthMm / 2 - p.slotLengthMm / 2 - 6;
    return plate(roundedRect(p.lengthMm, p.widthMm, p.widthMm / 2), p.thicknessMm, [
      circleAt(pivotX, 0, p.pivotMm / 2),
      obround(slotCentre, 0, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, 0),
    ]);
  },
  fileName: (p) => `hold-down-${R(p.lengthMm, 0)}-${R(p.slotLengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------- eccentric clamp */

export const eccentricClamp: AnyDesign = defineDesign({
  id: "eccentric-clamp",
  name: "Eccentric clamp",
  family: "fixings",
  eyebrow: "Offset pivot",
  blurb: "A disc with an offset pivot that locks a fixture in a quarter turn.",
  lede: "An eccentric clamp disc: the pivot is offset from the centre, so rotating the disc moves its rim towards the work. The offset is the throw, and the second hole takes a handle pin so the clamp can be turned by hand.",
  use: "Locking a jig, a fence or a fixture with a quarter turn instead of a screw.",
  notesTitle: "How the offset makes a cam",
  chips: [
    { label: "Disc Ø", value: "30 – 120 mm" },
    { label: "Offset", value: "2 – 15 mm" },
    { label: "Pivot", value: "4 – 16 mm" },
  ],
  notes: [
    "A circle whose pivot is offset by e sweeps through a total lift of about 2e as it turns, which is enough to clamp a jig but not enough to jam it. The pivot and handle holes are checked against each other and against the rim with a real wall.",
    "Print the disc flat with the holes vertical. The rim takes the clamping load, so use a high perimeter count and keep the disc at least 6 mm thick for a jig that is used every day.",
  ],
  header: "Eccentric Clamp Designer - units: mm",
  fields: [
    { key: "diameter", label: "Disc diameter", kind: "length", section: "Disc", default: "60", min: 30, max: 120 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Disc", default: "8", min: 4, max: 16 },
    { key: "pivot", label: "Pivot hole", kind: "length", section: "Holes", default: "8", min: 4, max: 16 },
    { key: "offset", label: "Pivot offset", kind: "length", section: "Holes", default: "6", min: 2, max: 15 },
    { key: "handle", label: "Handle hole", kind: "length", section: "Holes", default: "5", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    pivotMm: rawLength(raw, "pivot"),
    offsetMm: rawLength(raw, "offset"),
    handleMm: rawLength(raw, "handle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Disc diameter", p.diameterMm, 30, 120);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 16);
    pushRange(errors, units, "pivot", "Pivot hole", p.pivotMm, 4, 16);
    pushRange(errors, units, "offset", "Pivot offset", p.offsetMm, 2, 15);
    pushRange(errors, units, "handle", "Handle hole", p.handleMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const r = p.diameterMm / 2;
    const handleX = -(r - p.handleMm / 2 - 6);
    if (p.offsetMm + p.pivotMm / 2 > r - 4) errors.push({ field: "offset", level: "error", message: "The pivot breaks through the rim; reduce the offset." });
    if (p.handleMm / 2 + 4 > r - p.pivotMm / 2 - p.offsetMm) errors.push({ field: "handle", level: "error", message: "The handle hole has no material around it." });
    const centres = Math.abs(handleX - p.offsetMm);
    if (centres < p.pivotMm / 2 + p.handleMm / 2 + 4) errors.push({ field: "pivot", level: "error", message: "The pivot and handle holes run together." });
    if (p.offsetMm < p.diameterMm * 0.05) warnings.push({ field: "offset", level: "warning", message: "A very small offset gives almost no clamping lift." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Pivot", value: U(p.pivotMm, units), source: "input" },
        { label: "Offset", value: U(p.offsetMm, units), source: "input" },
        { label: "Handle hole", value: U(p.handleMm, units), source: "input" },
        { label: "Clamp lift", value: U(p.offsetMm * 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} disc · ${U(p.offsetMm, units)} offset`,
        `EC${R(p.diameterMm, 0)}-${R(p.offsetMm, 1)}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Disc", value: U(p.diameterMm, units) },
          { label: "Offset", value: U(p.offsetMm, units) },
          { label: "Lift", value: U(p.offsetMm * 2, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    const handleX = -(r - p.handleMm / 2 - 6);
    return plate(circleAt(0, 0, r, 96), p.thicknessMm, [
      circleAt(p.offsetMm, 0, p.pivotMm / 2),
      circleAt(handleX, 0, p.handleMm / 2),
    ]);
  },
  fileName: (p) => `eccentric-clamp-${R(p.diameterMm, 0)}-${R(p.offsetMm, 1)}.stl`,
});

/* ------------------------------------------------------- zero-clearance insert */

export const zeroClearanceInsert: AnyDesign = defineDesign({
  id: "zero-clearance-insert",
  name: "Zero-clearance insert",
  family: "fixings",
  eyebrow: "Saw throat plate",
  blurb: "A round saw insert with a fine blade slot and two levelling screws.",
  lede: "A throat-plate insert for a table or band saw, cut as a round plate with a narrow blade slot. The slot supports the cut edge on both sides, which is what stops tear-out on thin stock.",
  use: "Replacing a wide saw throat plate to support thin stock and stop tear-out at the blade.",
  notesTitle: "How the blade slot is sized",
  chips: [
    { label: "Disc Ø", value: "60 – 180 mm" },
    { label: "Slot", value: "2 – 6 mm" },
    { label: "Slot length", value: "30 – 120 mm" },
  ],
  notes: [
    "The slot is a narrow obround along the cut line, with its ends kept inside the disc by a real wall. The two screw holes sit off the slot axis, so the levelling screws cannot pull the plate into the blade.",
    "Cut the slot in the printer only to a pilot width, fit the insert, then raise the running blade through it to cut the exact kerf. That last step is what makes the insert zero-clearance and is far safer than printing a guessed slot.",
  ],
  header: "Zero-Clearance Insert Designer - units: mm",
  fields: [
    { key: "diameter", label: "Disc diameter", kind: "length", section: "Plate", default: "140", min: 60, max: 180 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "5", min: 3, max: 10 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slot", default: "3", min: 2, max: 6 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slot", default: "70", min: 30, max: 120 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Screws", default: "4", min: 3, max: 6 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    slotLengthMm: rawLength(raw, "slotLength"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Disc diameter", p.diameterMm, 60, 180);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 10);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 2, 6);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 30, 120);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 3, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    const r = p.diameterMm / 2;
    if (p.slotLengthMm + 8 > p.diameterMm) errors.push({ field: "slotLength", level: "error", message: "The slot reaches the rim; shorten it or widen the disc." });
    const screwX = p.diameterMm * 0.3;
    const clear = Math.hypot(screwX, p.diameterMm * 0.18) - p.screwMm / 2;
    if (clear < p.slotWidthMm / 2 + 5) errors.push({ field: "screw", level: "error", message: "A levelling screw runs into the blade slot." });
    if (r - clear < 4) errors.push({ field: "screw", level: "error", message: "A levelling screw breaks through the rim." });
    if (p.thicknessMm > 8) warnings.push({ field: "thickness", level: "warning", message: "A thick insert may sit proud of the saw table." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Screws", value: "2", source: "calc" },
        { label: "Screw centres", value: U(screwX * 2, units), source: "calc" },
        { label: "Rim land", value: U(r - p.slotLengthMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} insert · ${U(p.slotWidthMm, units)} slot`,
        `ZI${R(p.diameterMm, 0)}-${R(p.slotWidthMm, 1)}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Disc", value: U(p.diameterMm, units) },
          { label: "Slot", value: U(p.slotWidthMm, units) },
          { label: "Screws", value: "2" },
        ],
      ),
    };
  },
  build: (p) => {
    const screwX = p.diameterMm * 0.3;
    const screwY = p.diameterMm * 0.18;
    return plate(circleAt(0, 0, p.diameterMm / 2, 96), p.thicknessMm, [
      obround(0, 0, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, 0),
      circleAt(screwX, screwY, p.screwMm / 2),
      circleAt(screwX, -screwY, p.screwMm / 2),
    ]);
  },
  fileName: (p) => `zero-clearance-${R(p.diameterMm, 0)}-${R(p.slotWidthMm, 1)}.stl`,
});

/* -------------------------------------------------------------- desk cable clip */

export const deskCableClip: AnyDesign = defineDesign({
  id: "desk-cable-clip",
  name: "Desk cable clip",
  family: "fixings",
  eyebrow: "Snap clip",
  blurb: "A C-shaped clip with a screw tab that keeps a cable on a desk edge.",
  lede: "A cable clip with a real C mouth: the cable snaps past a narrow opening and sits in a round seat, while one screw holds the clip to the underside of a desk. The mouth is narrower than the cable, so it grips instead of rattling loose.",
  use: "Keeping a charger or a monitor cable on the edge of a desk or under a shelf.",
  notesTitle: "How the mouth grips the cable",
  chips: [
    { label: "Cable Ø", value: "4 – 20 mm" },
    { label: "Plate", value: "24 – 60 mm" },
    { label: "Mouth", value: "4 – 14 mm" },
  ],
  notes: [
    "The seat is a circle and the mouth is a parallel-sided channel from the top edge into it. Because the mouth is narrower than the seat, the clip flexes once as the cable goes in and then holds it; the designer blocks a mouth wider than the cable.",
    "Print in PETG for the flex. A clip printed in brittle PLA will snap at the mouth on the first cable, and the layer lines should run around the C rather than across it.",
  ],
  header: "Desk Cable Clip Designer - units: mm",
  fields: [
    { key: "cable", label: "Cable diameter", kind: "length", section: "Seat", default: "8", min: 4, max: 20 },
    { key: "plateWidth", label: "Plate width", kind: "length", section: "Plate", default: "34", min: 24, max: 60 },
    { key: "plateHeight", label: "Plate height", kind: "length", section: "Plate", default: "30", min: 20, max: 50 },
    { key: "mouth", label: "Mouth width", kind: "length", section: "Seat", default: "6", min: 4, max: 14 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "5", min: 3, max: 10 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Screws", default: "3.5", min: 3, max: 6 },
  ],
  parse: (raw) => ({
    cableMm: rawLength(raw, "cable"),
    widthMm: rawLength(raw, "plateWidth"),
    heightMm: rawLength(raw, "plateHeight"),
    mouthMm: rawLength(raw, "mouth"),
    thicknessMm: rawLength(raw, "thickness"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cable", "Cable diameter", p.cableMm, 4, 20);
    pushRange(errors, units, "plateWidth", "Plate width", p.widthMm, 24, 60);
    pushRange(errors, units, "plateHeight", "Plate height", p.heightMm, 20, 50);
    pushRange(errors, units, "mouth", "Mouth width", p.mouthMm, 4, 14);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 10);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 3, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "plateWidth", p.widthMm, p.heightMm);

    if (p.mouthMm >= p.cableMm) errors.push({ field: "mouth", level: "error", message: "The mouth is as wide as the cable, so the clip cannot grip it." });
    if (p.cableMm > p.widthMm - 12) errors.push({ field: "plateWidth", level: "error", message: "The seat leaves no wall at the plate edges." });
    if (p.cableMm > p.heightMm - 10) errors.push({ field: "plateHeight", level: "error", message: "The seat leaves no material below it for the screw tab." });
    const r = p.cableMm / 2;
    const cy = p.heightMm * 0.08;
    const screwY = -p.heightMm / 2 + p.screwMm / 2 + 5;
    if (screwY + p.screwMm / 2 > cy - r - 4) errors.push({ field: "plateHeight", level: "error", message: "The screw hole runs into the cable seat; raise the seat or lengthen the plate." });
    if (p.mouthMm < p.cableMm * 0.5) warnings.push({ field: "mouth", level: "warning", message: "A mouth under half the cable diameter is very hard to snap a cable past." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cable Ø", value: U(p.cableMm, units), source: "input" },
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Mouth", value: U(p.mouthMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screw", value: U(p.screwMm, units), source: "input" },
        { label: "Grip overlap", value: U((p.cableMm - p.mouthMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.cableMm, units)} cable · ${U(p.mouthMm, units)} mouth`,
        `DC${R(p.cableMm, 0)}-${R(p.mouthMm, 1)}`,
        p.widthMm,
        p.heightMm,
        [
          { label: "Cable", value: U(p.cableMm, units) },
          { label: "Plate", value: U(p.widthMm, units) },
          { label: "Mouth", value: U(p.mouthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.cableMm / 2;
    const cy = p.heightMm * 0.08;
    const halfMouth = p.mouthMm / 2;
    const yJoin = cy + Math.sqrt(Math.max(0, r * r - halfMouth * halfMouth));
    const theta = Math.acos(Math.min(1, halfMouth / r));
    const outline: Point2D[] = [
      { x: -p.widthMm / 2, y: -p.heightMm / 2 },
      { x: p.widthMm / 2, y: -p.heightMm / 2 },
      { x: p.widthMm / 2, y: p.heightMm / 2 },
      { x: halfMouth, y: p.heightMm / 2 },
      { x: halfMouth, y: yJoin },
      ...arcPoints(0, cy, r, theta, -Math.PI - theta, 36),
      { x: -halfMouth, y: yJoin },
      { x: -halfMouth, y: p.heightMm / 2 },
      { x: -p.widthMm / 2, y: p.heightMm / 2 },
    ];
    const screwY = -p.heightMm / 2 + p.screwMm / 2 + 5;
    return plate(outline, p.thicknessMm, [circleAt(0, screwY, p.screwMm / 2)]);
  },
  fileName: (p) => `desk-cable-clip-${R(p.cableMm, 0)}-${R(p.mouthMm, 1)}.stl`,
});

/* ----------------------------------------------------------------- hinge leaf */

export const hingeLeaf: AnyDesign = defineDesign({
  id: "hinge-leaf",
  name: "Hinge leaf",
  family: "fixings",
  eyebrow: "Pivot plate",
  blurb: "A flat hinge leaf with a pivot hole and a row of screw holes.",
  lede: "A replacement leaf for a small strap hinge: a rounded plate with a pivot hole at one end and an evenly spaced screw row along the other. The pivot is a real bore, so the leaf can be pinned to a matching knuckle.",
  use: "Replacing a broken leaf on a small cabinet or box hinge, or building a pinned lid.",
  notesTitle: "How the pivot and screws are kept apart",
  chips: [
    { label: "Length", value: "40 – 150 mm" },
    { label: "Width", value: "20 – 60 mm" },
    { label: "Screws", value: "2 – 6" },
  ],
  notes: [
    "The pivot sits at one end and the screws start beyond it, so the pin load and the screw load do not share the same hole. The screw row is checked for pitch and for a full wall to the rounded edge.",
    "Print the leaf flat with the pivot bore vertical. A hinge leaf is loaded at the pivot, so keep the wall around the pivot at least one screw diameter and print at 100 percent infill around it.",
  ],
  header: "Hinge Leaf Designer - units: mm",
  fields: [
    { key: "length", label: "Leaf length", kind: "length", section: "Leaf", default: "80", min: 40, max: 150 },
    { key: "width", label: "Leaf width", kind: "length", section: "Leaf", default: "30", min: 20, max: 60 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Leaf", default: "4", min: 2.5, max: 8 },
    { key: "pivot", label: "Pivot hole", kind: "length", section: "Pivot", default: "6", min: 4, max: 12 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Screws", default: "4", min: 3, max: 8 },
    { key: "screws", label: "Screws", kind: "count", section: "Screws", default: "3", min: 2, max: 6 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    pivotMm: rawLength(raw, "pivot"),
    screwMm: rawLength(raw, "screw"),
    screws: rawCount(raw, "screws"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Leaf length", p.lengthMm, 40, 150);
    pushRange(errors, units, "width", "Leaf width", p.widthMm, 20, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2.5, 8);
    pushRange(errors, units, "pivot", "Pivot hole", p.pivotMm, 4, 12);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 3, 8);
    pushInteger(errors, "screws", "Screws", p.screws, 2, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.widthMm);

    const count = Math.max(2, Math.round(p.screws));
    const pivotX = -p.lengthMm / 2 + p.pivotMm / 2 + 6;
    const from = pivotX + p.pivotMm / 2 + p.screwMm / 2 + 6;
    const to = p.lengthMm / 2 - p.screwMm / 2 - 6;
    if (p.widthMm < Math.max(p.pivotMm, p.screwMm) + 10) errors.push({ field: "width", level: "error", message: "The leaf is too narrow around the holes." });
    if (to <= from) errors.push({ field: "length", level: "error", message: "The leaf is too short for the pivot and screw row." });
    else if (count > 1 && (to - from) / (count - 1) < p.screwMm + 2) errors.push({ field: "screws", level: "error", message: "The screws are closer than one diameter." });
    if (p.thicknessMm < 3) warnings.push({ field: "thickness", level: "warning", message: "A leaf under 3 mm will bend at the pivot." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Leaf", value: `${U(p.lengthMm, units)} × ${U(p.widthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Pivot", value: U(p.pivotMm, units), source: "input" },
        { label: "Screws", value: String(count), source: "input" },
        { label: "Screw pitch", value: U((to - from) / (count - 1), units), source: "calc" },
        { label: "Pivot to screw", value: U(from - p.screwMm / 2 - pivotX, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} leaf · ${count} screws`,
        `HL${R(p.lengthMm, 0)}-${count}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Leaf", value: U(p.lengthMm, units) },
          { label: "Pivot", value: U(p.pivotMm, units) },
          { label: "Screws", value: String(count) },
        ],
      ),
    };
  },
  build: (p) => {
    const count = Math.max(2, Math.round(p.screws));
    const pivotX = -p.lengthMm / 2 + p.pivotMm / 2 + 6;
    const from = pivotX + p.pivotMm / 2 + p.screwMm / 2 + 6;
    const to = p.lengthMm / 2 - p.screwMm / 2 - 6;
    const holes: Point2D[][] = [circleAt(pivotX, 0, p.pivotMm / 2)];
    for (const x of spread(count, from, to)) holes.push(circleAt(x, 0, p.screwMm / 2));
    return plate(roundedRect(p.lengthMm, p.widthMm, p.widthMm / 2), p.thicknessMm, holes);
  },
  fileName: (p) => `hinge-leaf-${R(p.lengthMm, 0)}-${Math.round(p.screws)}.stl`,
});

/* ----------------------------------------------------------------- slotted shim */

export const slottedShim: AnyDesign = defineDesign({
  id: "slotted-shim",
  name: "Slotted shim",
  family: "fixings",
  eyebrow: "U shim",
  blurb: "A U-shaped shim that slides under a bolt without lifting the machine.",
  lede: "A shim with an open slot, so it can be pushed under a machine foot or a flange with the bolt already in place. The slot is cut from one edge and the plate thickness sets the lift, which makes a stack of shims a graduated level.",
  use: "Levelling a machine, a door frame or a bearing housing without dismantling the fixing.",
  notesTitle: "Why the slot is open",
  chips: [
    { label: "Length", value: "30 – 160 mm" },
    { label: "Width", value: "20 – 120 mm" },
    { label: "Slot", value: "4 – 40 mm" },
  ],
  notes: [
    "The slot opens through one short edge, which is what lets the shim slide in around a bolt. Its depth is checked against the plate length so a bridge of material always remains at the far end.",
    "Print a set at 0.2, 0.4 and 0.8 mm, or use the thickness field to make one at the exact lift you need. Print them flat and measure the first one with calipers; first-layer squish changes a thin shim more than any other dimension.",
  ],
  header: "Slotted Shim Designer - units: mm",
  fields: [
    { key: "length", label: "Shim length", kind: "length", section: "Shim", default: "80", min: 30, max: 160 },
    { key: "width", label: "Shim width", kind: "length", section: "Shim", default: "50", min: 20, max: 120 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Shim", default: "1.5", min: 0.5, max: 6 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slot", default: "12", min: 4, max: 40 },
    { key: "slotDepth", label: "Slot depth", kind: "length", section: "Slot", default: "30", min: 10, max: 100 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    slotDepthMm: rawLength(raw, "slotDepth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Shim length", p.lengthMm, 30, 160);
    pushRange(errors, units, "width", "Shim width", p.widthMm, 20, 120);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 0.5, 6);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 4, 40);
    pushRange(errors, units, "slotDepth", "Slot depth", p.slotDepthMm, 10, 100);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.widthMm);

    if (p.slotWidthMm > p.widthMm - 10) errors.push({ field: "slotWidth", level: "error", message: "The slot leaves no side wall; narrow it." });
    if (p.slotDepthMm > p.lengthMm - 8) errors.push({ field: "slotDepth", level: "error", message: "The slot leaves no bridge at the far end; reduce its depth." });
    if (p.thicknessMm < 1) warnings.push({ field: "thickness", level: "warning", message: "Under 1 mm the first layer is hard to control accurately." });
    const bridge = p.lengthMm - p.slotDepthMm;

    return {
      errors,
      warnings,
      readout: [
        { label: "Shim", value: `${U(p.lengthMm, units)} × ${U(p.widthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slot", value: `${U(p.slotWidthMm, units)} wide`, source: "input" },
        { label: "Slot depth", value: U(p.slotDepthMm, units), source: "input" },
        { label: "End bridge", value: U(bridge, units), source: "calc" },
        { label: "Side wall", value: U((p.widthMm - p.slotWidthMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.thicknessMm, units)} lift · ${U(p.slotWidthMm, units)} slot`,
        `SH${R(p.lengthMm, 0)}-${R(p.thicknessMm, 1)}`,
        p.lengthMm,
        p.widthMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Lift", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const halfW = p.widthMm / 2;
    const halfL = p.lengthMm / 2;
    const halfS = p.slotWidthMm / 2;
    const outline: Point2D[] = [
      { x: -halfW, y: -halfL },
      { x: -halfS, y: -halfL },
      { x: -halfS, y: -halfL + p.slotDepthMm },
      { x: halfS, y: -halfL + p.slotDepthMm },
      { x: halfS, y: -halfL },
      { x: halfW, y: -halfL },
      { x: halfW, y: halfL },
      { x: -halfW, y: halfL },
    ];
    return plate(outline, p.thicknessMm);
  },
  fileName: (p) => `slotted-shim-${R(p.lengthMm, 0)}-${R(p.thicknessMm, 1)}.stl`,
});

export const workshopClamps: AnyDesign[] = [
  saddleClamp,
  pipeSaddle,
  cableComb,
  featherboard,
  holdDownClamp,
  eccentricClamp,
  zeroClearanceInsert,
  deskCableClip,
  hingeLeaf,
  slottedShim,
];
