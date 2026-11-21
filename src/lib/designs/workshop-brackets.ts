/** Workshop batch 1: brackets, hooks and stands cut from real plate profiles. */

import { obround, roundedRect } from "@/lib/kit/outlines";
import { buildPrism } from "@/lib/kit/prism";
import type { LengthUnit, Point2D } from "@/lib/kit/units";

import { checkHoleFits, checkSize, emptyResult, measure, round } from "./helpers";
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

function plate(outline: Point2D[], thicknessMm: number, holes: Point2D[][] = []) {
  return buildPrism({ rings: [outline, outline], holes, thicknessMm });
}

function spread(count: number, from: number, to: number): number[] {
  const n = Math.max(1, Math.round(count));
  if (n === 1) return [(from + to) / 2];
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
}

/* ------------------------------------------------------------ corner bracket */

export const cornerBracket: AnyDesign = defineDesign({
  id: "corner-bracket",
  name: "Corner bracket",
  family: "fixings",
  eyebrow: "Right-angle plate",
  blurb: "An L plate with a real leg width and a screw line down each leg.",
  lede: "A right-angle bracket cut as one flat L and made on its face. Both legs carry their own row of screws, and the leg width and plate thickness are independent, so the bracket can be as stiff as the joint needs.",
  use: "Joining two boards or panels at 90 degrees inside a cabinet, a frame or a repair.",
  notesTitle: "How the two legs are drilled",
  chips: [
    { label: "Leg A", value: "30 – 120 mm" },
    { label: "Leg B", value: "30 – 120 mm" },
    { label: "Thickness", value: "2.5 – 10 mm" },
  ],
  notes: [
    "Each leg gets its own evenly spaced screw row, offset from the inside corner by the leg width, so a screw can never split the corner itself. The rows are checked for a screw diameter of clearance between centres before the mesh is built.",
    "Make the bracket flat on one face with a solid wall. A bracket is weakest at the inside corner, so keep the leg width at least four times the plate thickness for a loaded joint.",
  ],
  header: "Corner Bracket Designer - units: mm",
  fields: [
    { key: "legA", label: "Leg A length", kind: "length", section: "Legs", default: "70", min: 30, max: 120 },
    { key: "legB", label: "Leg B length", kind: "length", section: "Legs", default: "60", min: 30, max: 120 },
    { key: "legWidth", label: "Leg width", kind: "length", section: "Legs", default: "18", min: 10, max: 40 },
    { key: "thickness", label: "Plate thickness", kind: "length", section: "Plate", default: "4", min: 2.5, max: 10 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "4.5", min: 3, max: 10 },
    { key: "holes", label: "Screws per leg", kind: "count", section: "Screws", default: "2", min: 1, max: 4 },
  ],
  parse: (raw) => ({
    legAMm: rawLength(raw, "legA"),
    legBMm: rawLength(raw, "legB"),
    legWidthMm: rawLength(raw, "legWidth"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    holes: rawCount(raw, "holes"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "legA", "Leg A length", p.legAMm, 30, 120);
    pushRange(errors, units, "legB", "Leg B length", p.legBMm, 30, 120);
    pushRange(errors, units, "legWidth", "Leg width", p.legWidthMm, 10, 40);
    pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, 2.5, 10);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 10);
    pushInteger(errors, "holes", "Screws per leg", p.holes, 1, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "legA", Math.max(p.legAMm, p.legBMm), p.thicknessMm);

    const count = Math.max(1, Math.round(p.holes));
    const margin = p.holeMm / 2 + 3;
    const fromA = p.legWidthMm + margin;
    const toA = p.legAMm - margin;
    const fromB = p.legWidthMm + margin;
    const toB = p.legBMm - margin;
    const pitch = count > 1 ? (toA - fromA) / (count - 1) : Infinity;
    if (toA <= fromA) errors.push({ field: "legA", level: "error", message: "Leg A is too short for its screw row; lengthen it or use fewer screws." });
    else if (count > 1 && pitch < p.holeMm + 2) errors.push({ field: "holes", level: "error", message: "The screws on leg A are closer than one diameter; lengthen the leg or use fewer." });
    if (toB <= fromB) errors.push({ field: "legB", level: "error", message: "Leg B is too short for its screw row; lengthen it or use fewer screws." });
    else if (count > 1 && (toB - fromB) / (count - 1) < p.holeMm + 2) errors.push({ field: "holes", level: "error", message: "The screws on leg B are closer than one diameter; lengthen the leg or use fewer." });
    if (p.thicknessMm < p.holeMm + 2) warnings.push({ field: "thickness", level: "warning", message: "The plate is barely thicker than the screw; a countersink will break through." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Leg A", value: U(p.legAMm, units), source: "input" },
        { label: "Leg B", value: U(p.legBMm, units), source: "input" },
        { label: "Leg width", value: U(p.legWidthMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screws", value: String(count * 2), source: "calc" },
        { label: "Screw pitch", value: count > 1 ? U(pitch, units) : "single", source: "calc" },
      ],
      preview: previewOf(
        `${U(p.legAMm, units)} × ${U(p.legBMm, units)} L`,
        `CB${R(p.legAMm, 0)}-${R(p.legBMm, 0)}`,
        p.legAMm,
        p.legBMm,
        [
          { label: "Leg A", value: U(p.legAMm, units) },
          { label: "Leg B", value: U(p.legBMm, units) },
          { label: "Screws", value: String(count * 2) },
        ],
      ),
    };
  },
  build: (p) => {
    const w = p.legWidthMm;
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.legAMm, y: 0 },
      { x: p.legAMm, y: w },
      { x: w, y: w },
      { x: w, y: p.legBMm },
      { x: 0, y: p.legBMm },
    ];
    const holes: Point2D[][] = [];
    for (const x of spread(p.holes, w + p.holeMm / 2 + 3, p.legAMm - p.holeMm / 2 - 3)) {
      holes.push(circlePoint(x, w / 2, p.holeMm / 2));
    }
    for (const y of spread(p.holes, w + p.holeMm / 2 + 3, p.legBMm - p.holeMm / 2 - 3)) {
      holes.push(circlePoint(w / 2, y, p.holeMm / 2));
    }
    return plate(outline, p.thicknessMm, holes);
  },
  fileName: (p) => `corner-bracket-${R(p.legAMm, 0)}x${R(p.legBMm, 0)}.stl`,
});

function circlePoint(cx: number, cy: number, radius: number): Point2D[] {
  const segments = 40;
  return Array.from({ length: segments }, (_, i) => {
    const angle = (Math.PI * 2 * i) / segments;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

/* ---------------------------------------------------------------- flat brace */

export const flatBrace: AnyDesign = defineDesign({
  id: "flat-brace",
  name: "Flat brace",
  family: "fixings",
  eyebrow: "Screw strap",
  blurb: "A rounded strap with an even row of screws for a flat splice.",
  lede: "A straight strap with round ends and an evenly spaced screw row. It bridges a split, joins two boards edge to edge, or backs a butt joint where a plate cannot be seen.",
  use: "Splicing two boards or repairing a split on the flat face of a frame or a panel.",
  notesTitle: "How the screw row is spaced",
  chips: [
    { label: "Length", value: "60 – 170 mm" },
    { label: "Width", value: "12 – 60 mm" },
    { label: "Screws", value: "2 – 8" },
  ],
  notes: [
    "The screws are distributed between two margins that each leave a full hole plus three millimetres to the rounded end. The designer checks the resulting pitch, so a short strap with many screws is rejected instead of drilling overlapping holes.",
    "Make the strap flat with the screw holes vertical. A solid wall around each hole carries far more load than a thin section, and a countersink on the outer face keeps the screw head from lifting the strap.",
  ],
  header: "Flat Brace Designer - units: mm",
  fields: [
    { key: "length", label: "Overall length", kind: "length", section: "Strap", default: "120", min: 60, max: 170 },
    { key: "width", label: "Strap width", kind: "length", section: "Strap", default: "24", min: 12, max: 60 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Strap", default: "4", min: 2.5, max: 10 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "5", min: 3, max: 10 },
    { key: "holes", label: "Screws", kind: "count", section: "Screws", default: "4", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    holes: rawCount(raw, "holes"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 60, 170);
    pushRange(errors, units, "width", "Strap width", p.widthMm, 12, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2.5, 10);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 10);
    pushInteger(errors, "holes", "Screws", p.holes, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);

    const count = Math.max(2, Math.round(p.holes));
    const margin = p.holeMm / 2 + 4;
    const from = -p.lengthMm / 2 + margin;
    const to = p.lengthMm / 2 - margin;
    const pitch = count > 1 ? (to - from) / (count - 1) : 0;
    if (to <= from) errors.push({ field: "length", level: "error", message: "The strap is too short for its screw margins." });
    else if (pitch < p.holeMm + 2) errors.push({ field: "holes", level: "error", message: "The screws are closer than one diameter; lengthen the strap or use fewer." });
    if (p.widthMm < p.holeMm + 6) errors.push({ field: "width", level: "error", message: "The strap is too narrow for the screw heads." });
    if (p.thicknessMm < p.holeMm * 0.6) warnings.push({ field: "thickness", level: "warning", message: "A thin strap will dish under a tight screw." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screws", value: String(count), source: "input" },
        { label: "Screw pitch", value: U(pitch, units), source: "calc" },
        { label: "End land", value: U(margin - p.holeMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} strap · ${count} screws`,
        `FB${R(p.lengthMm, 0)}-${count}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Screws", value: String(count) },
        ],
      ),
    };
  },
  build: (p) => {
    const count = Math.max(2, Math.round(p.holes));
    const holes = spread(count, -p.lengthMm / 2 + p.holeMm / 2 + 4, p.lengthMm / 2 - p.holeMm / 2 - 4).map(
      (x) => circlePoint(x, 0, p.holeMm / 2),
    );
    return plate(roundedRect(p.lengthMm, p.widthMm, p.widthMm / 2), p.thicknessMm, holes);
  },
  fileName: (p) => `flat-brace-${R(p.lengthMm, 0)}-${Math.round(p.holes)}.stl`,
});

/* ------------------------------------------------------------------- T plate */

export const tBracket: AnyDesign = defineDesign({
  id: "t-bracket",
  name: "T bracket",
  family: "fixings",
  eyebrow: "Tie plate",
  blurb: "A T plate with a screw row along the bar and down the stem.",
  lede: "A T-shaped tie plate for fixing a rail to a post or a stud to a plate. The top bar and the stem carry independent screw counts, so the fixing can follow the grain instead of a fixed pattern.",
  use: "Fixing a rail, a stud or a brace to a post when one screw line has to run across the joint.",
  notesTitle: "How the bar and stem are tied",
  chips: [
    { label: "Bar", value: "40 – 160 mm" },
    { label: "Stem", value: "30 – 140 mm" },
    { label: "Stem width", value: "12 – 40 mm" },
  ],
  notes: [
    "The bar screws sit on the bar centre line and the stem screws on the stem centre line, each row bounded by a hole radius plus four millimetres. The two rows cannot collide because the bar begins above the stem, which the outline enforces.",
    "Make it flat and drive the screws with washers. The T is loaded across the bar-stem junction, so keep the plate at least 4 mm thick and use a solid wall rather than a solid section.",
  ],
  header: "T Bracket Designer - units: mm",
  fields: [
    { key: "barWidth", label: "Bar width", kind: "length", section: "Bar", default: "90", min: 40, max: 160 },
    { key: "barHeight", label: "Bar height", kind: "length", section: "Bar", default: "20", min: 10, max: 40 },
    { key: "stemWidth", label: "Stem width", kind: "length", section: "Stem", default: "26", min: 12, max: 40 },
    { key: "stemLength", label: "Stem length", kind: "length", section: "Stem", default: "80", min: 30, max: 140 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "4", min: 2.5, max: 10 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "4.5", min: 3, max: 10 },
    { key: "barHoles", label: "Bar screws", kind: "count", section: "Screws", default: "2", min: 1, max: 3 },
    { key: "stemHoles", label: "Stem screws", kind: "count", section: "Screws", default: "2", min: 1, max: 3 },
  ],
  parse: (raw) => ({
    barMm: rawLength(raw, "barWidth"),
    barHeightMm: rawLength(raw, "barHeight"),
    stemMm: rawLength(raw, "stemWidth"),
    stemLengthMm: rawLength(raw, "stemLength"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    barHoles: rawCount(raw, "barHoles"),
    stemHoles: rawCount(raw, "stemHoles"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "barWidth", "Bar width", p.barMm, 40, 160);
    pushRange(errors, units, "barHeight", "Bar height", p.barHeightMm, 10, 40);
    pushRange(errors, units, "stemWidth", "Stem width", p.stemMm, 12, 40);
    pushRange(errors, units, "stemLength", "Stem length", p.stemLengthMm, 30, 140);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2.5, 10);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 10);
    pushInteger(errors, "barHoles", "Bar screws", p.barHoles, 1, 3);
    pushInteger(errors, "stemHoles", "Stem screws", p.stemHoles, 1, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "barWidth", p.barMm, p.stemLengthMm + p.barHeightMm);

    const r = p.holeMm / 2;
    const barFrom = -p.barMm / 2 + r + 4;
    const barTo = p.barMm / 2 - r - 4;
    const stemFrom = r + 4;
    const stemTo = p.stemLengthMm - r - 4;
    if (p.barMm < p.stemMm + p.holeMm * 2 + 12) errors.push({ field: "barWidth", level: "error", message: "The bar is too narrow for screws either side of the stem." });
    if (barTo <= barFrom) errors.push({ field: "barWidth", level: "error", message: "The bar leaves no room for its screw row." });
    else if (Math.round(p.barHoles) > 1 && (barTo - barFrom) / (Math.round(p.barHoles) - 1) < p.holeMm + 2) errors.push({ field: "barHoles", level: "error", message: "The bar screws are closer than one diameter." });
    if (stemTo <= stemFrom) errors.push({ field: "stemLength", level: "error", message: "The stem leaves no room for its screw row." });
    else if (Math.round(p.stemHoles) > 1 && (stemTo - stemFrom) / (Math.round(p.stemHoles) - 1) < p.holeMm + 2) errors.push({ field: "stemHoles", level: "error", message: "The stem screws are closer than one diameter." });
    if (p.stemMm < p.holeMm + 8) errors.push({ field: "stemWidth", level: "error", message: "The stem is too narrow around the screw holes." });

    const barCount = Math.round(p.barHoles);
    const stemCount = Math.round(p.stemHoles);
    return {
      errors,
      warnings,
      readout: [
        { label: "Bar", value: `${U(p.barMm, units)} × ${U(p.barHeightMm, units)}`, source: "input" },
        { label: "Stem", value: `${U(p.stemMm, units)} × ${U(p.stemLengthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screws", value: String(barCount + stemCount), source: "calc" },
        { label: "Bar pitch", value: barCount > 1 ? U((barTo - barFrom) / (barCount - 1), units) : "single", source: "calc" },
        { label: "Stem pitch", value: stemCount > 1 ? U((stemTo - stemFrom) / (stemCount - 1), units) : "single", source: "calc" },
      ],
      preview: previewOf(
        `${U(p.barMm, units)} bar · ${U(p.stemLengthMm, units)} stem`,
        `TB${R(p.barMm, 0)}-${R(p.stemLengthMm, 0)}`,
        p.barMm,
        p.stemLengthMm + p.barHeightMm,
        [
          { label: "Bar", value: U(p.barMm, units) },
          { label: "Stem", value: U(p.stemLengthMm, units) },
          { label: "Screws", value: String(barCount + stemCount) },
        ],
      ),
    };
  },
  build: (p) => {
    const halfStem = p.stemMm / 2;
    const outline: Point2D[] = [
      { x: -halfStem, y: 0 },
      { x: halfStem, y: 0 },
      { x: halfStem, y: p.stemLengthMm },
      { x: p.barMm / 2, y: p.stemLengthMm },
      { x: p.barMm / 2, y: p.stemLengthMm + p.barHeightMm },
      { x: -p.barMm / 2, y: p.stemLengthMm + p.barHeightMm },
      { x: -p.barMm / 2, y: p.stemLengthMm },
      { x: -halfStem, y: p.stemLengthMm },
    ];
    const holes: Point2D[][] = [];
    const r = p.holeMm / 2;
    for (const x of spread(p.barHoles, -p.barMm / 2 + r + 4, p.barMm / 2 - r - 4)) {
      holes.push(circlePoint(x, p.stemLengthMm + p.barHeightMm / 2, r));
    }
    for (const y of spread(p.stemHoles, r + 4, p.stemLengthMm - r - 4)) {
      holes.push(circlePoint(0, y, r));
    }
    return plate(outline, p.thicknessMm, holes);
  },
  fileName: (p) => `t-bracket-${R(p.barMm, 0)}-${R(p.stemLengthMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- cross brace */

export const crossBrace: AnyDesign = defineDesign({
  id: "cross-brace",
  name: "Cross brace",
  family: "fixings",
  eyebrow: "Four-way plate",
  blurb: "A plus-shaped plate with one screw in each of its four arms.",
  lede: "A four-way tie plate for the node where two rails cross. Each arm carries its own screw, set clear of the crossing so the four fixings never fight for the same timber.",
  use: "Tying two crossing rails or four frame members together at a single flat node.",
  notesTitle: "How the arms are spaced",
  chips: [
    { label: "Arm span", value: "40 – 160 mm" },
    { label: "Bar width", value: "12 – 50 mm" },
    { label: "Screw hole", value: "3 – 10 mm" },
  ],
  notes: [
    "Every arm is the same length, so the four screws sit on a true square and the load is shared evenly. The hole centre is placed clear of the crossing square by a full radius plus four millimetres, which is what keeps the cap triangulation clean.",
    "Make the plate flat. A plus plate is loaded in shear at the inside corners, so round the outside corners in the software or leave the default sharp corners and use a solid wall.",
  ],
  header: "Cross Brace Designer - units: mm",
  fields: [
    { key: "arm", label: "Arm span", kind: "length", section: "Cross", default: "100", min: 40, max: 160 },
    { key: "barWidth", label: "Bar width", kind: "length", section: "Cross", default: "24", min: 12, max: 50 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Cross", default: "4", min: 2.5, max: 10 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "4.5", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    armMm: rawLength(raw, "arm"),
    barMm: rawLength(raw, "barWidth"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "arm", "Arm span", p.armMm, 40, 160);
    pushRange(errors, units, "barWidth", "Bar width", p.barMm, 12, 50);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2.5, 10);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "arm", p.armMm, p.thicknessMm);
    const r = p.holeMm / 2;
    const minimum = p.barMm + 2 * r + 12;
    if (p.armMm < minimum) errors.push({ field: "arm", level: "error", message: `The arms need at least ${U(minimum, units)} to clear the crossing.` });
    if (p.barMm < p.holeMm + 6) errors.push({ field: "barWidth", level: "error", message: "The bar is too narrow for the screw holes." });
    const centre = p.armMm / 2 - r - 4;
    const pitch = centre * 2;

    return {
      errors,
      warnings,
      readout: [
        { label: "Arm span", value: U(p.armMm, units), source: "input" },
        { label: "Bar width", value: U(p.barMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screws", value: "4", source: "calc" },
        { label: "Screw square", value: U(pitch, units), source: "calc" },
        { label: "Screw hole", value: U(p.holeMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.armMm, units)} span · 4 screws`,
        `XB${R(p.armMm, 0)}-${R(p.barMm, 0)}`,
        p.armMm,
        p.thicknessMm,
        [
          { label: "Span", value: U(p.armMm, units) },
          { label: "Bar", value: U(p.barMm, units) },
          { label: "Screw square", value: U(pitch, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const w = p.barMm / 2;
    const a = p.armMm / 2;
    const outline: Point2D[] = [
      { x: -w, y: -a },
      { x: w, y: -a },
      { x: w, y: -w },
      { x: a, y: -w },
      { x: a, y: w },
      { x: w, y: w },
      { x: w, y: a },
      { x: -w, y: a },
      { x: -w, y: w },
      { x: -a, y: w },
      { x: -a, y: -w },
      { x: -w, y: -w },
    ];
    const r = p.holeMm / 2;
    const c = a - r - 4;
    return plate(outline, p.thicknessMm, [
      circlePoint(c, 0, r),
      circlePoint(-c, 0, r),
      circlePoint(0, c, r),
      circlePoint(0, -c, r),
    ]);
  },
  fileName: (p) => `cross-brace-${R(p.armMm, 0)}.stl`,
});

/* -------------------------------------------------------------- french cleat */

export const frenchCleat: AnyDesign = defineDesign({
  id: "french-cleat",
  name: "French cleat",
  family: "fixings",
  eyebrow: "Hanging cleat",
  blurb: "A 45° bevel cleat that hooks a cabinet flat to a wall batten.",
  lede: "One half of a french cleat pair: a straight batten whose top front corner is bevelled at 45 degrees. Two identical pieces, one on the wall and one on the cabinet, lock together and hang the load flat against the wall.",
  use: "Hanging a cabinet, a headboard or a heavy frame on a wall with one straight batten.",
  notesTitle: "Why the bevel is 45 degrees",
  chips: [
    { label: "Length", value: "60 – 175 mm" },
    { label: "Section", value: "30 – 120 mm" },
    { label: "Height", value: "20 – 60 mm" },
  ],
  notes: [
    "The two mating faces are both at 45 degrees, so the joint closes by sliding down and pulls the cabinet tight to the wall as it seats. The bevel is a real line in the extruded section, not a chamfer applied to the ends.",
    "Make it with the bevel up and the long axis flat, or make it on its back with a fixture under the bevel. Two wall thicknesses plus a solid section is stronger here than a thick wall, because the cleat fails by splitting along the process marks.",
  ],
  header: "French Cleat Designer - units: mm",
  fields: [
    { key: "length", label: "Cleat length", kind: "length", section: "Cleat", default: "120", min: 60, max: 175 },
    { key: "section", label: "Section width", kind: "length", section: "Section", default: "60", min: 30, max: 120 },
    { key: "height", label: "Section height", kind: "length", section: "Section", default: "32", min: 20, max: 60 },
    { key: "bevel", label: "Bevel size", kind: "length", section: "Section", default: "14", min: 6, max: 20 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    sectionMm: rawLength(raw, "section"),
    heightMm: rawLength(raw, "height"),
    bevelMm: rawLength(raw, "bevel"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Cleat length", p.lengthMm, 60, 175);
    pushRange(errors, units, "section", "Section width", p.sectionMm, 30, 120);
    pushRange(errors, units, "height", "Section height", p.heightMm, 20, 60);
    pushRange(errors, units, "bevel", "Bevel size", p.bevelMm, 6, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.sectionMm, p.heightMm);
    if (p.bevelMm > p.heightMm - 6) errors.push({ field: "bevel", level: "error", message: "The bevel removes the whole top face; reduce it." });
    if (p.bevelMm > p.sectionMm - 6) errors.push({ field: "bevel", level: "error", message: "The bevel reaches the back face; reduce it." });
    if (p.bevelMm < 8) warnings.push({ field: "bevel", level: "warning", message: "A bevel under 8 mm gives very little hook." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Section", value: `${U(p.sectionMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Bevel", value: U(p.bevelMm, units), source: "input" },
        { label: "Hook angle", value: "45°", source: "calc" },
        { label: "Bearing face", value: U(p.bevelMm * Math.SQRT2, units), source: "calc" },
        { label: "Back face", value: U(p.heightMm - p.bevelMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} cleat · 45° hook`,
        `FC${R(p.lengthMm, 0)}-${R(p.sectionMm, 0)}`,
        p.lengthMm,
        p.heightMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Section", value: U(p.sectionMm, units) },
          { label: "Bevel", value: U(p.bevelMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.sectionMm, y: 0 },
      { x: p.sectionMm, y: p.heightMm - p.bevelMm },
      { x: p.sectionMm - p.bevelMm, y: p.heightMm },
      { x: 0, y: p.heightMm },
    ];
    return plate(outline, p.lengthMm);
  },
  fileName: (p) => `french-cleat-${R(p.lengthMm, 0)}x${R(p.sectionMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- phone stand */

export const phoneStand: AnyDesign = defineDesign({
  id: "phone-stand",
  name: "Phone stand",
  family: "fixings",
  eyebrow: "Desk wedge",
  blurb: "A leaning wedge with a front lip that holds a phone at reading angle.",
  lede: "A desk stand cut as a wedge profile: a flat foot, a front lip that stops the phone sliding, and a sloped back that sets the viewing angle. Width is a separate dimension, so the same stand fits a phone in a case.",
  use: "Holding a phone upright on a desk for video calls, recipes or a bedside clock.",
  notesTitle: "How the lean angle is set",
  chips: [
    { label: "Depth", value: "60 – 140 mm" },
    { label: "Height", value: "40 – 120 mm" },
    { label: "Width", value: "50 – 120 mm" },
  ],
  notes: [
    "The phone rests on the slope between the lip and the back edge, so the lean angle is the angle of that slope, reported from the same two points that build the profile. The lip height is independent of the slope, which lets a thick case clear it.",
    "Make it lying on one side so the process marks run across the wedge rather than along the lip. A lip formed upright is a lever that snaps off the first time the phone is dropped into the stand.",
  ],
  header: "Phone Stand Designer - units: mm",
  fields: [
    { key: "depth", label: "Foot depth", kind: "length", section: "Stand", default: "90", min: 60, max: 140 },
    { key: "height", label: "Back height", kind: "length", section: "Stand", default: "75", min: 40, max: 120 },
    { key: "width", label: "Stand width", kind: "length", section: "Stand", default: "70", min: 50, max: 120 },
    { key: "lip", label: "Lip height", kind: "length", section: "Lip", default: "14", min: 6, max: 24 },
    { key: "lipThickness", label: "Lip thickness", kind: "length", section: "Lip", default: "10", min: 4, max: 20 },
  ],
  parse: (raw) => ({
    depthMm: rawLength(raw, "depth"),
    heightMm: rawLength(raw, "height"),
    widthMm: rawLength(raw, "width"),
    lipMm: rawLength(raw, "lip"),
    lipThicknessMm: rawLength(raw, "lipThickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "depth", "Foot depth", p.depthMm, 60, 140);
    pushRange(errors, units, "height", "Back height", p.heightMm, 40, 120);
    pushRange(errors, units, "width", "Stand width", p.widthMm, 50, 120);
    pushRange(errors, units, "lip", "Lip height", p.lipMm, 6, 24);
    pushRange(errors, units, "lipThickness", "Lip thickness", p.lipThicknessMm, 4, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "width", p.widthMm, p.heightMm);
    if (p.lipThicknessMm >= p.depthMm * 0.35) errors.push({ field: "lipThickness", level: "error", message: "The lip takes up too much of the foot; thin it or deepen the stand." });
    if (p.heightMm < p.lipMm + 18) errors.push({ field: "height", level: "error", message: "The back is too low above the lip to lean a phone on." });
    if (p.lipMm < 8) warnings.push({ field: "lip", level: "warning", message: "A lip under 8 mm will not stop a phone in a thick case." });
    const base = Math.max(2, p.lipMm * 0.4);
    const angle = (Math.atan2(p.heightMm - base, p.depthMm - p.lipThicknessMm) * 180) / Math.PI;

    return {
      errors,
      warnings,
      readout: [
        { label: "Foot depth", value: U(p.depthMm, units), source: "input" },
        { label: "Back height", value: U(p.heightMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Lip", value: `${U(p.lipMm, units)} high`, source: "input" },
        { label: "Lean angle", value: `${R(angle, 1)}°`, source: "calc" },
        { label: "Foot at lip", value: U(base, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} wide · ${R(angle, 0)}° lean`,
        `PS${R(p.widthMm, 0)}-${R(p.heightMm, 0)}`,
        p.depthMm,
        p.heightMm,
        [
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Lean", value: `${R(angle, 0)}°` },
        ],
      ),
    };
  },
  build: (p) => {
    const base = Math.max(2, p.lipMm * 0.4);
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.depthMm, y: 0 },
      { x: p.depthMm, y: p.lipMm },
      { x: p.depthMm - p.lipThicknessMm, y: p.lipMm },
      { x: p.depthMm - p.lipThicknessMm, y: base },
      { x: 0, y: p.heightMm },
    ];
    return plate(outline, p.widthMm);
  },
  fileName: (p) => `phone-stand-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- door wedge */

export const doorWedge: AnyDesign = defineDesign({
  id: "door-wedge",
  name: "Door wedge",
  family: "fixings",
  eyebrow: "Floor wedge",
  blurb: "A tapered wedge with a finger hole for holding a door open.",
  lede: "A floor wedge with a real taper, a wide base for grip and an optional finger hole for pulling it out. The taper is set by the length and height, so the same wedge can be a light doorstop or a heavy industrial chock.",
  use: "Holding a door open on a floor, or chocking a wheel that must not roll.",
  notesTitle: "How the taper is measured",
  chips: [
    { label: "Length", value: "60 – 150 mm" },
    { label: "Height", value: "15 – 60 mm" },
    { label: "Width", value: "40 – 100 mm" },
  ],
  notes: [
    "The wedge is a right triangle in profile: the full height stands at the back edge and the taper runs to nothing at the toe. The finger hole is placed inside the thick end and checked against every edge with a real wall clearance.",
    "Make it on one side with the taper rising across the grain, not along it, so the tip does not delaminate under a door. A little rubber cement or a strip of grip tape under the base stops it sliding on a hard floor.",
  ],
  header: "Door Wedge Designer - units: mm",
  fields: [
    { key: "length", label: "Wedge length", kind: "length", section: "Wedge", default: "100", min: 60, max: 150 },
    { key: "height", label: "Back height", kind: "length", section: "Wedge", default: "35", min: 15, max: 60 },
    { key: "width", label: "Wedge width", kind: "length", section: "Wedge", default: "60", min: 40, max: 100 },
    { key: "fingerHole", label: "Finger hole", kind: "length", section: "Wedge", default: "14", min: 0, max: 30 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    heightMm: rawLength(raw, "height"),
    widthMm: rawLength(raw, "width"),
    holeMm: rawLength(raw, "fingerHole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Wedge length", p.lengthMm, 60, 150);
    pushRange(errors, units, "height", "Back height", p.heightMm, 15, 60);
    pushRange(errors, units, "width", "Wedge width", p.widthMm, 40, 100);
    pushRange(errors, units, "fingerHole", "Finger hole", p.holeMm, 0, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.lengthMm, p.heightMm);

    const toe = Math.max(0.8, p.heightMm * 0.04);
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.lengthMm, y: 0 },
      { x: p.lengthMm, y: toe },
      { x: 0, y: p.heightMm },
    ];
    if (p.holeMm > 0) {
      checkHoleFits(
        errors,
        units,
        "fingerHole",
        "Finger hole",
        { x: p.lengthMm * 0.22, y: p.heightMm * 0.28 },
        p.holeMm / 2,
        outline,
      );
    }
    const angle = (Math.atan2(p.heightMm - toe, p.lengthMm) * 180) / Math.PI;
    if (p.holeMm === 0) warnings.push({ field: "fingerHole", level: "warning", message: "Without a finger hole the wedge has to be kicked out from the toe." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Back height", value: U(p.heightMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Taper", value: `${R(angle, 1)}°`, source: "calc" },
        { label: "Finger hole", value: p.holeMm > 0 ? U(p.holeMm, units) : "none", source: "input" },
        { label: "Base area", value: `${R((p.lengthMm * p.widthMm) / 100, 1)} cm²`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} wedge · ${R(angle, 0)}°`,
        `DW${R(p.lengthMm, 0)}-${R(p.heightMm, 0)}`,
        p.lengthMm,
        p.heightMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Taper", value: `${R(angle, 0)}°` },
        ],
      ),
    };
  },
  build: (p) => {
    const toe = Math.max(0.8, p.heightMm * 0.04);
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.lengthMm, y: 0 },
      { x: p.lengthMm, y: toe },
      { x: 0, y: p.heightMm },
    ];
    const holes: Point2D[][] = [];
    if (p.holeMm > 0) {
      holes.push(circlePoint(p.lengthMm * 0.22, p.heightMm * 0.28, p.holeMm / 2));
    }
    return plate(outline, p.widthMm, holes);
  },
  fileName: (p) => `door-wedge-${R(p.lengthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ wall hook */

export const wallHook: AnyDesign = defineDesign({
  id: "wall-hook",
  name: "Wall hook",
  family: "fixings",
  eyebrow: "J hook",
  blurb: "A screw plate with a J arm and a turned-up lip that keeps a load on.",
  lede: "A wall hook cut as one flat J: a screw plate, a straight arm and a lip that turns up at the end. The arm and lip are part of the same profile, so the hook cannot pull off the plate under load.",
  use: "Hanging a bag, a cable, a tool or a coat on a wall, a shed or the side of a bench.",
  notesTitle: "How the load reaches the screws",
  chips: [
    { label: "Height", value: "40 – 120 mm" },
    { label: "Arm", value: "30 – 100 mm" },
    { label: "Plate", value: "6 – 20 mm" },
  ],
  notes: [
    "The arm leaves the plate at the bottom and the lip rises at its end, so a hanging load pulls the arm down and into the plate rather than peeling it away. Screw holes sit on the plate centre line, above the arm, with a full wall to the plate edges.",
    "Make it with the plate flat and the arm rising in the Z direction; the process marks then run around the hook instead of across the root of the arm. Use a solid wall with 0.2 mm of material at the arm root.",
  ],
  header: "Wall Hook Designer - units: mm",
  fields: [
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "80", min: 40, max: 120 },
    { key: "width", label: "Hook width", kind: "length", section: "Plate", default: "45", min: 30, max: 80 },
    { key: "thickness", label: "Plate thickness", kind: "length", section: "Plate", default: "10", min: 6, max: 20 },
    { key: "arm", label: "Arm length", kind: "length", section: "Hook", default: "60", min: 30, max: 100 },
    { key: "lip", label: "Lip height", kind: "length", section: "Hook", default: "16", min: 8, max: 30 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "4", min: 3, max: 8 },
    { key: "screws", label: "Screws", kind: "count", section: "Screws", default: "2", min: 1, max: 3 },
  ],
  parse: (raw) => ({
    heightMm: rawLength(raw, "height"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    armMm: rawLength(raw, "arm"),
    lipMm: rawLength(raw, "lip"),
    holeMm: rawLength(raw, "hole"),
    screws: rawCount(raw, "screws"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "height", "Plate height", p.heightMm, 40, 120);
    pushRange(errors, units, "width", "Hook width", p.widthMm, 30, 80);
    pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, 6, 20);
    pushRange(errors, units, "arm", "Arm length", p.armMm, 30, 100);
    pushRange(errors, units, "lip", "Lip height", p.lipMm, 8, 30);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 8);
    pushInteger(errors, "screws", "Screws", p.screws, 1, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "height", p.heightMm, p.widthMm);

    if (p.armMm < p.thicknessMm + p.lipMm + 8) errors.push({ field: "arm", level: "error", message: "The arm is too short for its lip and root; lengthen it." });
    if (p.lipMm < p.thicknessMm + 4) errors.push({ field: "lip", level: "error", message: "The lip does not rise above the arm; raise it." });
    if (p.heightMm < p.lipMm + 22) errors.push({ field: "height", level: "error", message: "The plate is too short above the arm for its screw row." });
    if (p.thicknessMm < p.holeMm + 4) errors.push({ field: "thickness", level: "error", message: "The plate is too thin around the screw holes." });
    const count = Math.round(p.screws);
    const from = p.thicknessMm + p.holeMm / 2 + 4;
    const to = p.heightMm - p.holeMm / 2 - 4;
    if (to <= from) errors.push({ field: "height", level: "error", message: "No room for the screw row above the arm." });
    else if (count > 1 && (to - from) / (count - 1) < p.holeMm + 2) errors.push({ field: "screws", level: "error", message: "The screws are closer than one diameter." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.heightMm, units)} × ${U(p.widthMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Arm reach", value: U(p.armMm, units), source: "input" },
        { label: "Lip", value: U(p.lipMm, units), source: "input" },
        { label: "Screws", value: String(count), source: "input" },
        { label: "Load centre", value: U(p.armMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.armMm, units)} reach · ${count} screws`,
        `WH${R(p.heightMm, 0)}-${R(p.armMm, 0)}`,
        p.armMm + p.thicknessMm,
        p.heightMm,
        [
          { label: "Reach", value: U(p.armMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Screws", value: String(count) },
        ],
      ),
    };
  },
  build: (p) => {
    const t = p.thicknessMm;
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.armMm, y: 0 },
      { x: p.armMm, y: p.lipMm },
      { x: p.armMm - t, y: p.lipMm },
      { x: p.armMm - t, y: t },
      { x: t, y: t },
      { x: t, y: p.heightMm },
      { x: 0, y: p.heightMm },
    ];
    const count = Math.max(1, Math.round(p.screws));
    const holes = spread(count, t + p.holeMm / 2 + 4, p.heightMm - p.holeMm / 2 - 4).map(
      (y) => circlePoint(t / 2, y, p.holeMm / 2),
    );
    return plate(outline, p.widthMm, holes);
  },
  fileName: (p) => `wall-hook-${R(p.heightMm, 0)}x${R(p.armMm, 0)}.stl`,
});

/* -------------------------------------------------------------- pegboard hook */

export const pegboardHook: AnyDesign = defineDesign({
  id: "pegboard-hook",
  name: "Pegboard hook",
  family: "fixings",
  eyebrow: "Two-pin hook",
  blurb: "A pegboard hook with two pins on the 25.4 mm grid and a turned-up lip.",
  lede: "A hook that hangs from two pegboard holes instead of one, so it cannot spin under a load. The pins sit on the standard 25.4 mm grid and the arm carries a lip that stops tools sliding off.",
  use: "Hanging tools, spanners and cables on a workshop pegboard without the hook rotating.",
  notesTitle: "How the two pins share the load",
  chips: [
    { label: "Plate", value: "30 – 80 mm" },
    { label: "Height", value: "60 – 140 mm" },
    { label: "Arm", value: "40 – 110 mm" },
  ],
  notes: [
    "Two pins on a vertical pitch stop the hook swinging about a single hole; the plate is a full 30 mm wide so the upper pin has material all round it. The arm leaves the bottom of the plate and turns up at the tip, which keeps a tool from walking off when the board is knocked.",
    "Make it with the plate flat and the pins vertical, then press it into the board before loading it. The pins are the weak point: use a solid wall and never scale the pin diameter below 5 mm.",
  ],
  header: "Pegboard Hook Designer - units: mm",
  fields: [
    { key: "plateWidth", label: "Plate width", kind: "length", section: "Plate", default: "44", min: 30, max: 80 },
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "90", min: 60, max: 140 },
    { key: "thickness", label: "Plate thickness", kind: "length", section: "Plate", default: "5", min: 3, max: 10 },
    { key: "arm", label: "Arm length", kind: "length", section: "Hook", default: "60", min: 40, max: 110 },
    { key: "lip", label: "Lip height", kind: "length", section: "Hook", default: "18", min: 10, max: 30 },
    { key: "pinPitch", label: "Pin pitch", kind: "length", section: "Pins", default: "25.4", min: 20, max: 40 },
    { key: "pin", label: "Pin hole", kind: "length", section: "Pins", default: "5", min: 3, max: 8 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "plateWidth"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    armMm: rawLength(raw, "arm"),
    lipMm: rawLength(raw, "lip"),
    pitchMm: rawLength(raw, "pinPitch"),
    pinMm: rawLength(raw, "pin"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "plateWidth", "Plate width", p.widthMm, 30, 80);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 60, 140);
    pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, 3, 10);
    pushRange(errors, units, "arm", "Arm length", p.armMm, 40, 110);
    pushRange(errors, units, "lip", "Lip height", p.lipMm, 10, 30);
    pushRange(errors, units, "pinPitch", "Pin pitch", p.pitchMm, 20, 40);
    pushRange(errors, units, "pin", "Pin hole", p.pinMm, 3, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "height", p.heightMm, p.armMm + p.widthMm);

    const top = p.heightMm - p.pinMm / 2 - 6;
    const bottom = top - p.pitchMm;
    if (bottom - p.pinMm / 2 < p.thicknessMm + 6) errors.push({ field: "height", level: "error", message: "The lower pin runs into the arm; raise the plate or reduce the pitch." });
    if (p.armMm < p.thicknessMm + p.lipMm + 10) errors.push({ field: "arm", level: "error", message: "The arm is too short for its lip and root." });
    if (p.lipMm < p.thicknessMm + 4) errors.push({ field: "lip", level: "error", message: "The lip does not rise above the arm." });
    if (p.pitchMm < 20) warnings.push({ field: "pinPitch", level: "warning", message: "A pitch under 20 mm will not match a standard board." });

    if (p.pinMm > p.widthMm - 8) errors.push({ field: "plateWidth", level: "error", message: "The plate is too narrow for the pin holes." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Arm reach", value: U(p.armMm, units), source: "input" },
        { label: "Lip", value: U(p.lipMm, units), source: "input" },
        { label: "Pin pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Pin hole", value: U(p.pinMm, units), source: "input" },
        { label: "Pin centres", value: U(top, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.armMm, units)} reach · ${U(p.pitchMm, units)} pitch`,
        `PH${R(p.heightMm, 0)}-${R(p.armMm, 0)}`,
        p.armMm + p.widthMm,
        p.heightMm,
        [
          { label: "Reach", value: U(p.armMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Pitch", value: U(p.pitchMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline: Point2D[] = [
      { x: 0, y: 0 },
      { x: p.widthMm, y: 0 },
      { x: p.widthMm + p.armMm, y: 0 },
      { x: p.widthMm + p.armMm, y: p.lipMm },
      { x: p.widthMm + p.armMm - p.thicknessMm, y: p.lipMm },
      { x: p.widthMm + p.armMm - p.thicknessMm, y: p.thicknessMm },
      { x: p.widthMm, y: p.thicknessMm },
      { x: p.widthMm, y: p.heightMm },
      { x: 0, y: p.heightMm },
    ];
    const top = p.heightMm - p.pinMm / 2 - 6;
    return plate(outline, p.thicknessMm, [
      circlePoint(p.widthMm / 2, top, p.pinMm / 2),
      circlePoint(p.widthMm / 2, top - p.pitchMm, p.pinMm / 2),
    ]);
  },
  fileName: (p) => `pegboard-hook-${R(p.armMm, 0)}x${R(p.pitchMm, 0)}.stl`,
});

/* --------------------------------------------------------------- door strike */

export const doorStrike: AnyDesign = defineDesign({
  id: "door-strike",
  name: "Door strike",
  family: "fixings",
  eyebrow: "Latch plate",
  blurb: "A screw plate with an obround latch slot for a small door or gate.",
  lede: "A strike plate for a cabinet latch or a light gate: a rounded plate with an obround bolt slot and a screw above and below it. The slot is a true stadium, so the bolt is guided rather than caught on a sharp corner.",
  use: "Catching a sliding or swinging latch on a cabinet, a gate or a pet door.",
  notesTitle: "How the bolt slot is cut",
  chips: [
    { label: "Plate", value: "30 – 90 mm" },
    { label: "Height", value: "60 – 150 mm" },
    { label: "Slot length", value: "20 – 70 mm" },
  ],
  notes: [
    "The slot is an obround hole with semicircular ends, cut through the plate on the centre line. Its length is checked against the plate, and the two screw holes are kept clear of the slot by at least half a screw diameter plus four millimetres.",
    "Make the plate flat with the slot vertical and countersink the screw holes from the front. A strike takes a repeated impact, so make it solid rather than a sparse section.",
  ],
  header: "Door Strike Designer - units: mm",
  fields: [
    { key: "plateWidth", label: "Plate width", kind: "length", section: "Plate", default: "55", min: 30, max: 90 },
    { key: "plateHeight", label: "Plate height", kind: "length", section: "Plate", default: "90", min: 60, max: 150 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "3", min: 2, max: 6 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slot", default: "40", min: 20, max: 70 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slot", default: "14", min: 8, max: 30 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Screws", default: "4", min: 3, max: 8 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "plateWidth"),
    heightMm: rawLength(raw, "plateHeight"),
    thicknessMm: rawLength(raw, "thickness"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "plateWidth", "Plate width", p.widthMm, 30, 90);
    pushRange(errors, units, "plateHeight", "Plate height", p.heightMm, 60, 150);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 6);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 20, 70);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 8, 30);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 3, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "plateHeight", p.widthMm, p.heightMm);

    if (p.slotLengthMm <= p.slotWidthMm + 4) errors.push({ field: "slotLength", level: "error", message: "The slot is barely longer than it is wide; lengthen it." });
    if (p.slotWidthMm > p.widthMm - 12) errors.push({ field: "slotWidth", level: "error", message: "The slot reaches the plate edges; narrow it." });
    if (p.slotLengthMm > p.heightMm - 2 * (p.screwMm + 12)) errors.push({ field: "slotLength", level: "error", message: "The slot leaves no room for the screws; shorten it or lengthen the plate." });
    const screwY = p.heightMm / 2 - p.screwMm / 2 - 8;
    if (screwY - p.screwMm / 2 < p.slotLengthMm / 2 + 4) errors.push({ field: "plateHeight", level: "error", message: "The screws run into the slot; lengthen the plate." });
    if (p.thicknessMm < 2.5) warnings.push({ field: "thickness", level: "warning", message: "Under 2.5 mm the plate will bend at the slot." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Screws", value: "2", source: "calc" },
        { label: "Screw centres", value: U(screwY * 2, units), source: "calc" },
        { label: "Side land", value: U((p.widthMm - p.slotWidthMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.slotLengthMm, units)} slot · 2 screws`,
        `DS${R(p.heightMm, 0)}-${R(p.slotLengthMm, 0)}`,
        p.widthMm,
        p.heightMm,
        [
          { label: "Plate", value: U(p.widthMm, units) },
          { label: "Slot", value: U(p.slotLengthMm, units) },
          { label: "Screws", value: "2" },
        ],
      ),
    };
  },
  build: (p) => {
    const screwY = p.heightMm / 2 - p.screwMm / 2 - 8;
    return plate(roundedRect(p.widthMm, p.heightMm, 6), p.thicknessMm, [
      obround(0, 0, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, Math.PI / 2),
      circlePoint(0, screwY, p.screwMm / 2),
      circlePoint(0, -screwY, p.screwMm / 2),
    ]);
  },
  fileName: (p) => `door-strike-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

export const workshopBrackets: AnyDesign[] = [
  cornerBracket,
  flatBrace,
  tBracket,
  crossBrace,
  frenchCleat,
  phoneStand,
  doorWedge,
  wallHook,
  pegboardHook,
  doorStrike,
];
