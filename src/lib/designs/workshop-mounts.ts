/** Workshop batch 3: templates, mounts and turning parts made from plates. */

import { obround, regularPolygon, roundedRect } from "@/lib/kit/outlines";
import { buildPrism } from "@/lib/kit/prism";
import type { LengthUnit, Point2D } from "@/lib/kit/units";

import { chamferRings, checkSize, checkWall, emptyResult, measure, round } from "./helpers";
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

function spread(count: number, from: number, to: number): number[] {
  const steps = Math.max(1, Math.round(count));
  if (steps === 1) return [(from + to) / 2];
  return Array.from({ length: steps }, (_, i) => from + ((to - from) * i) / (steps - 1));
}

function plate(outline: Point2D[], thicknessMm: number, holes: Point2D[][] = []) {
  return buildPrism({ rings: [outline, outline], holes, thicknessMm });
}

function circleAt(cx: number, cy: number, radius: number, segments = 48): Point2D[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (Math.PI * 2 * i) / segments;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

/* ------------------------------------------------------------- router template */

export const routerTemplate: AnyDesign = defineDesign({
  id: "router-template",
  name: "Router template",
  family: "fixings",
  eyebrow: "Guide plate",
  blurb: "A plate with a rounded opening that guides a router bushing.",
  lede: "A template plate for routing a repeatable opening. The cut-out is a rounded rectangle, and the four screw holes sit far enough outside it that the bushing runs on the opening without touching a screw head.",
  use: "Routing identical recesses for hinges, sockets, handles or inlays with a guide bushing.",
  notesTitle: "How the guide land is set",
  chips: [
    { label: "Plate", value: "40 – 170 mm" },
    { label: "Opening", value: "20 – 120 mm" },
    { label: "Thickness", value: "4 – 15 mm" },
  ],
  notes: [
    "The opening is a rounded rectangle with a real corner radius, so the bushing can follow it without catching. Each screw is placed outside the opening by a bushing-sized margin, which is checked before the plate is built.",
    "Make the template at solid and check it against the bushing with a test cut in scrap. A template that flexes by half a millimetre cuts a recess that is a millimetre oversize on both sides.",
  ],
  header: "Router Template Designer - units: mm",
  fields: [
    { key: "width", label: "Plate width", kind: "length", section: "Plate", default: "120", min: 40, max: 170 },
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "90", min: 40, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "8", min: 4, max: 15 },
    { key: "openingWidth", label: "Opening width", kind: "length", section: "Opening", default: "60", min: 20, max: 120 },
    { key: "openingHeight", label: "Opening height", kind: "length", section: "Opening", default: "40", min: 20, max: 120 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Opening", default: "6", min: 2, max: 20 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Screws", default: "4", min: 3, max: 8 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    openingWidthMm: rawLength(raw, "openingWidth"),
    openingHeightMm: rawLength(raw, "openingHeight"),
    cornerMm: rawLength(raw, "corner"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Plate width", p.widthMm, 40, 170);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 40, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 15);
    pushRange(errors, units, "openingWidth", "Opening width", p.openingWidthMm, 20, 120);
    pushRange(errors, units, "openingHeight", "Opening height", p.openingHeightMm, 20, 120);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 2, 20);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 3, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "width", p.widthMm, p.heightMm);

    if (p.openingWidthMm > p.widthMm - 16) errors.push({ field: "openingWidth", level: "error", message: "The opening leaves less than 8 mm of plate each side." });
    if (p.openingHeightMm > p.heightMm - 16) errors.push({ field: "openingHeight", level: "error", message: "The opening leaves less than 8 mm of plate above and below." });
    if (p.cornerMm > Math.min(p.openingWidthMm, p.openingHeightMm) / 2 - 1) errors.push({ field: "corner", level: "error", message: "The corner radius is larger than the opening allows." });
    const cornerX = p.widthMm / 2 - p.screwMm / 2 - 6;
    const cornerY = p.heightMm / 2 - p.screwMm / 2 - 6;
    if (cornerX - p.screwMm / 2 < p.openingWidthMm / 2 + 4 || cornerY - p.screwMm / 2 < p.openingHeightMm / 2 + 4) errors.push({ field: "screw", level: "error", message: "The screw holes run into the opening; thin the plate land or move the screws." });
    if (p.thicknessMm < 6) warnings.push({ field: "thickness", level: "warning", message: "A template under 6 mm can flex under the bushing." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Opening", value: `${U(p.openingWidthMm, units)} × ${U(p.openingHeightMm, units)}`, source: "input" },
        { label: "Corner", value: U(p.cornerMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Guide land", value: U((p.widthMm - p.openingWidthMm) / 2, units), source: "calc" },
        { label: "Screws", value: "4", source: "calc" },
      ],
      preview: previewOf(
        `${U(p.openingWidthMm, units)} × ${U(p.openingHeightMm, units)} opening`,
        `RT${R(p.openingWidthMm, 0)}-${R(p.openingHeightMm, 0)}`,
        p.widthMm,
        p.heightMm,
        [
          { label: "Plate", value: U(p.widthMm, units) },
          { label: "Opening", value: U(p.openingWidthMm, units) },
          { label: "Corner", value: U(p.cornerMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const holes: Point2D[][] = [roundedRect(p.openingWidthMm, p.openingHeightMm, p.cornerMm, 8)];
    const x = p.widthMm / 2 - p.screwMm / 2 - 6;
    const y = p.heightMm / 2 - p.screwMm / 2 - 6;
    for (const sx of [-x, x]) {
      for (const sy of [-y, y]) holes.push(circleAt(sx, sy, p.screwMm / 2));
    }
    return plate(roundedRect(p.widthMm, p.heightMm, 8), p.thicknessMm, holes);
  },
  fileName: (p) => `router-template-${R(p.openingWidthMm, 0)}x${R(p.openingHeightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ fan mount */

export const fanMount: AnyDesign = defineDesign({
  id: "fan-mount",
  name: "Fan mount plate",
  family: "wheels",
  eyebrow: "Panel adapter",
  blurb: "A square plate with a round fan opening and four fixing holes.",
  lede: "An adapter plate that mounts a square-frame fan on a panel opening. The opening clears the blade tips, and the four holes sit on the fan's own square pitch, so the plate can be drilled to match a case that has no fan cut-out.",
  use: "Adapting a standard fan to a cabinet, a duct or a panel with a different opening.",
  notesTitle: "How the fan opening clears the blades",
  chips: [
    { label: "Plate", value: "40 – 1000 mm" },
    { label: "Opening", value: "20 – 170 mm" },
    { label: "Fan pitch", value: "20 – 160 mm" },
  ],
  notes: [
    "The opening is a circle and the four screws are placed on a square pitch, not a circle, because that is how a fan frame is drilled. The designer checks the opening against the screw line and keeps the plate outside the screws.",
    "Make it from a stiff material and keep the plate at least 4 mm thick; a thin adapter bows into the blade tips when the screws are tightened. Deburr the opening so the blade tips cannot catch on a process seam.",
  ],
  header: "Fan Mount Designer - units: mm",
  fields: [
    { key: "plate", label: "Plate size", kind: "length", section: "Plate", default: "120", min: 40, max: 1000 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "4", min: 2.5, max: 10 },
    { key: "opening", label: "Fan opening", kind: "length", section: "Opening", default: "110", min: 20, max: 170 },
    { key: "pitch", label: "Fan hole pitch", kind: "length", section: "Screws", default: "105", min: 20, max: 160 },
    { key: "hole", label: "Screw hole", kind: "length", section: "Screws", default: "4.5", min: 3, max: 8 },
  ],
  parse: (raw) => ({
    plateMm: rawLength(raw, "plate"),
    thicknessMm: rawLength(raw, "thickness"),
    openingMm: rawLength(raw, "opening"),
    pitchMm: rawLength(raw, "pitch"),
    holeMm: rawLength(raw, "hole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "plate", "Plate size", p.plateMm, 40, 1000);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2.5, 10);
    pushRange(errors, units, "opening", "Fan opening", p.openingMm, 20, 170);
    pushRange(errors, units, "pitch", "Fan hole pitch", p.pitchMm, 20, 160);
    pushRange(errors, units, "hole", "Screw hole", p.holeMm, 3, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "plate", p.plateMm, p.thicknessMm);

    if (p.pitchMm + p.holeMm + 10 > p.plateMm) errors.push({ field: "pitch", level: "error", message: "The fan holes fall outside the plate; enlarge the plate." });
    const screwDiagonal = Math.hypot(p.pitchMm / 2, p.pitchMm / 2);
    if (screwDiagonal < p.openingMm / 2 + p.holeMm / 2 + 5) errors.push({ field: "opening", level: "error", message: "The opening runs into the fan screws; shrink it or widen the pitch." });
    if (p.openingMm > p.plateMm - 9.5) errors.push({ field: "opening", level: "error", message: "The opening leaves no rim on the plate." });
    if (p.thicknessMm < 3) warnings.push({ field: "thickness", level: "warning", message: "A plate under 3 mm bows into the fan blades." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.plateMm, units)} square`, source: "input" },
        { label: "Opening", value: U(p.openingMm, units), source: "input" },
        { label: "Fan pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Screws", value: "4", source: "calc" },
        { label: "Open area", value: `${R((Math.PI * (p.openingMm / 2) ** 2 * 100) / (p.plateMm * p.plateMm), 1)} %`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.plateMm, units)} plate · ${U(p.openingMm, units)} opening`,
        `FM${R(p.plateMm, 0)}-${R(p.openingMm, 0)}`,
        p.plateMm,
        p.plateMm,
        [
          { label: "Plate", value: U(p.plateMm, units) },
          { label: "Opening", value: U(p.openingMm, units) },
          { label: "Pitch", value: U(p.pitchMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const holes: Point2D[][] = [circleAt(0, 0, p.openingMm / 2, 96)];
    const half = p.pitchMm / 2;
    for (const x of [-half, half]) {
      for (const y of [-half, half]) holes.push(circleAt(x, y, p.holeMm / 2));
    }
    return plate(roundedRect(p.plateMm, p.plateMm, 10), p.thicknessMm, holes);
  },
  fileName: (p) => `fan-mount-${R(p.plateMm, 0)}-${R(p.openingMm, 0)}.stl`,
});

/* --------------------------------------------------------------------- trivet */

export const trivet: AnyDesign = defineDesign({
  id: "trivet",
  name: "Trivet",
  family: "vessels",
  eyebrow: "Hot plate",
  blurb: "A square trivet cut with an even row of heat-breaking slots.",
  lede: "A trivet that does the job with real open slots: hot air escapes through them, so the table sees far less heat than it would under a solid tile. The slots are obrounds, which leaves rounded bars that will not crack at a corner.",
  use: "Standing a hot pan, a casserole or a teapot on a table without marking it.",
  notesTitle: "How the slots spread the heat",
  chips: [
    { label: "Plate", value: "60 – 170 mm" },
    { label: "Slots", value: "3 – 9" },
    { label: "Slot length", value: "20 – 80 mm" },
  ],
  notes: [
    "The slots run parallel and are spaced by a fixed pitch, so the bars between them are all the same width and expand evenly. The plate is checked to keep a solid rim all round, which is what stops a hot pan from collapsing the edge.",
    "Make it in a heat-tolerant material that will not soften near a hob. A substantial wall and a solid top give the bars enough body to take a heavy pan.",
  ],
  header: "Trivet Designer - units: mm",
  fields: [
    { key: "size", label: "Plate size", kind: "length", section: "Plate", default: "140", min: 60, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "6", min: 3, max: 10 },
    { key: "slots", label: "Slots", kind: "count", section: "Slots", default: "5", min: 3, max: 9 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slots", default: "60", min: 20, max: 80 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slots", default: "8", min: 4, max: 14 },
    { key: "pitch", label: "Slot pitch", kind: "length", section: "Slots", default: "24", min: 15, max: 50 },
  ],
  parse: (raw) => ({
    sizeMm: rawLength(raw, "size"),
    thicknessMm: rawLength(raw, "thickness"),
    slots: rawCount(raw, "slots"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    pitchMm: rawLength(raw, "pitch"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "size", "Plate size", p.sizeMm, 60, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 10);
    pushInteger(errors, "slots", "Slots", p.slots, 3, 9);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 20, 80);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 4, 14);
    pushRange(errors, units, "pitch", "Slot pitch", p.pitchMm, 15, 50);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "size", p.sizeMm, p.thicknessMm);

    const count = Math.max(3, Math.round(p.slots));
    const span = (count - 1) * p.pitchMm + p.slotWidthMm;
    if (span > p.sizeMm - 14) errors.push({ field: "pitch", level: "error", message: "The slot row runs off the plate; reduce the pitch or the count." });
    if (p.slotLengthMm > p.sizeMm - 20) errors.push({ field: "slotLength", level: "error", message: "The slots reach the plate rim; shorten them." });
    if (p.pitchMm < p.slotWidthMm + 4) errors.push({ field: "pitch", level: "error", message: "The slots are closer than a bar width; widen the pitch." });
    const open = count * (p.slotLengthMm * p.slotWidthMm + Math.PI * (p.slotWidthMm / 2) ** 2);
    const openPct = (open / (p.sizeMm * p.sizeMm)) * 100;
    if (openPct > 45) warnings.push({ field: "slotLength", level: "warning", message: "Over 45 percent open leaves very little plate to carry a pan." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.sizeMm, units)} square`, source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slots", value: String(count), source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Bar", value: U(p.pitchMm - p.slotWidthMm, units), source: "calc" },
        { label: "Open area", value: `${R(openPct, 1)} %`, source: "calc" },
      ],
      preview: previewOf(
        `${count} slots · ${U(p.sizeMm, units)} plate`,
        `TR${R(p.sizeMm, 0)}-${count}`,
        p.sizeMm,
        p.sizeMm,
        [
          { label: "Plate", value: U(p.sizeMm, units) },
          { label: "Slots", value: String(count) },
          { label: "Open", value: `${R(openPct, 0)} %` },
        ],
      ),
    };
  },
  build: (p) => {
    const count = Math.max(3, Math.round(p.slots));
    const holes = spread(count, -((count - 1) * p.pitchMm) / 2, ((count - 1) * p.pitchMm) / 2).map((x) =>
      obround(x, 0, p.slotLengthMm - p.slotWidthMm, p.slotWidthMm, Math.PI / 2),
    );
    return plate(roundedRect(p.sizeMm, p.sizeMm, 12), p.thicknessMm, holes);
  },
  fileName: (p) => `trivet-${R(p.sizeMm, 0)}-${Math.round(p.slots)}.stl`,
});

/* ----------------------------------------------------------------- bell crank */

export const bellCrank: AnyDesign = defineDesign({
  id: "bell-crank",
  name: "Bell crank",
  family: "drives",
  eyebrow: "Three-point lever",
  blurb: "A triangular lever with a pivot and two link pins at right angles.",
  lede: "A bell crank cut as a thick triangular plate: one hole takes the pivot and the other two take the linkage pins. The three centres form a real triangle, so a pull on one pin turns into a push at the other without a separate bracket.",
  use: "Turning a pull through 90 degrees in a model linkage, a throttle or a brake mechanism.",
  notesTitle: "How the three centres are placed",
  chips: [
    { label: "Arm radius", value: "30 – 90 mm" },
    { label: "Pivot", value: "4 – 12 mm" },
    { label: "Link pin", value: "3 – 10 mm" },
  ],
  notes: [
    "The holes sit on the bisectors of an equilateral plate, so all three have the same wall to the edge and the pivot is equidistant from the two link pins. The designer checks the hole spacing, which is the triangle side less the two hole margins.",
    "Make the plate flat with the holes vertical and press a metal pin or a bolt through the pivot. Finished holes wear oval under a rocking load, so ream the pivot and use a bushing if the linkage runs often.",
  ],
  header: "Bell Crank Designer - units: mm",
  fields: [
    { key: "radius", label: "Arm radius", kind: "length", section: "Lever", default: "60", min: 30, max: 90 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Lever", default: "8", min: 4, max: 14 },
    { key: "pivot", label: "Pivot hole", kind: "length", section: "Holes", default: "8", min: 4, max: 12 },
    { key: "pin", label: "Link pin hole", kind: "length", section: "Holes", default: "5", min: 3, max: 10 },
  ],
  parse: (raw) => ({
    radiusMm: rawLength(raw, "radius"),
    thicknessMm: rawLength(raw, "thickness"),
    pivotMm: rawLength(raw, "pivot"),
    pinMm: rawLength(raw, "pin"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "radius", "Arm radius", p.radiusMm, 30, 90);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 4, 14);
    pushRange(errors, units, "pivot", "Pivot hole", p.pivotMm, 4, 12);
    pushRange(errors, units, "pin", "Link pin hole", p.pinMm, 3, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "radius", p.radiusMm * 2, p.thicknessMm);

    const margin = Math.max(p.pivotMm, p.pinMm) / 2 + 7;
    const centreRadius = p.radiusMm - margin;
    const side = Math.sqrt(3) * centreRadius;
    if (centreRadius < 6) errors.push({ field: "radius", level: "error", message: "The holes leave no material at the centre of the plate." });
    if (side < p.pivotMm / 2 + p.pinMm / 2 + 5) errors.push({ field: "radius", level: "error", message: "The pivot and pin holes run together; enlarge the lever." });
    if (p.radiusMm < Math.max(p.pivotMm, p.pinMm) + 14) errors.push({ field: "radius", level: "error", message: "The holes break through the edge; enlarge the lever." });
    if (p.thicknessMm < 6) warnings.push({ field: "thickness", level: "warning", message: "A thin lever will rock out of plane under a pushrod load." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Arm radius", value: U(p.radiusMm, units), source: "input" },
        { label: "Span", value: U(p.radiusMm * 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Pivot", value: U(p.pivotMm, units), source: "input" },
        { label: "Link pins", value: `2 × ${U(p.pinMm, units)}`, source: "calc" },
        { label: "Centre spacing", value: U(side, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.radiusMm * 2, units)} span · 3 holes`,
        `BC${R(p.radiusMm, 0)}-${R(p.pinMm, 1)}`,
        p.radiusMm * 2,
        p.thicknessMm,
        [
          { label: "Span", value: U(p.radiusMm * 2, units) },
          { label: "Pivot", value: U(p.pivotMm, units) },
          { label: "Pins", value: U(p.pinMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const margin = Math.max(p.pivotMm, p.pinMm) / 2 + 7;
    const centreRadius = p.radiusMm - margin;
    const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    const holes = angles.map((angle, index) =>
      circleAt(
        centreRadius * Math.cos(angle),
        centreRadius * Math.sin(angle),
        (index === 0 ? p.pivotMm : p.pinMm) / 2,
      ),
    );
    return plate(regularPolygon(3, p.radiusMm, -Math.PI / 2), p.thicknessMm, holes);
  },
  fileName: (p) => `bell-crank-${R(p.radiusMm, 0)}-${R(p.pivotMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- hex standoff */

export const hexStandoff: AnyDesign = defineDesign({
  id: "hex-standoff",
  name: "Hex standoff",
  family: "fixings",
  eyebrow: "Spanner spacer",
  blurb: "A hex-spanner spacer with a through bore that sets a board height.",
  lede: "A standoff with a real hexagon across the flats, so it can be held with a spanner while the screw is driven. The bore is a clearance hole and the wall is reported, which is the number that decides whether the spacer can take the clamping load.",
  use: "Setting a circuit board, a panel or a bracket a fixed distance off a chassis.",
  notesTitle: "How the hex and bore are sized",
  chips: [
    { label: "Across flats", value: "8 – 40 mm" },
    { label: "Bore", value: "3 – 20 mm" },
    { label: "Length", value: "5 – 60 mm" },
  ],
  notes: [
    "The outline is a regular hexagon and the across-flats size is converted to the circumradius the plot needs, so the spanner size on the readout is the size you actually measure. The bore is concentric and the wall is checked all round.",
    "Make a standoff upright with the bore vertical; a fixture inside the bore is easier to clean out than an oval hole is to fix. Use a solid wall and do not overtighten a screw into a spacer, because the material splits before the screw strips.",
  ],
  header: "Hex Standoff Designer - units: mm",
  fields: [
    { key: "acrossFlats", label: "Across flats", kind: "length", section: "Standoff", default: "12", min: 8, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Standoff", default: "4", min: 3, max: 20 },
    { key: "length", label: "Length", kind: "length", section: "Standoff", default: "20", min: 5, max: 60 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Standoff", default: "0.5", min: 0, max: 1.5 },
  ],
  parse: (raw) => ({
    flatsMm: rawLength(raw, "acrossFlats"),
    boreMm: rawLength(raw, "bore"),
    lengthMm: rawLength(raw, "length"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "acrossFlats", "Across flats", p.flatsMm, 8, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 20);
    pushRange(errors, units, "length", "Length", p.lengthMm, 5, 60);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0, 1.5);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "acrossFlats", p.flatsMm, p.lengthMm);

    const radius = p.flatsMm / Math.sqrt(3);
    const wall = radius - p.boreMm / 2;
    checkWall(errors, units, "bore", "hex wall at the corners", wall);
    if (p.boreMm >= p.flatsMm) errors.push({ field: "bore", level: "error", message: "The bore is wider than the hex." });
    if (p.lengthMm <= p.chamferMm * 2) errors.push({ field: "chamfer", level: "error", message: "The two chamfers meet in the middle." });
    if (p.lengthMm < p.boreMm * 1.5) warnings.push({ field: "length", level: "warning", message: "A short spacer is hard to hold square while the screw is driven." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Across flats", value: U(p.flatsMm, units), source: "input" },
        { label: "Across corners", value: U(radius * 2, units), source: "calc" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Wall", value: U(wall, units), source: "calc" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.flatsMm, units)} A/F · ${U(p.lengthMm, units)} long`,
        `HS${R(p.flatsMm, 1)}-${R(p.lengthMm, 0)}`,
        p.flatsMm,
        p.lengthMm,
        [
          { label: "A/F", value: U(p.flatsMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.flatsMm / Math.sqrt(3);
    const { rings, fractions } = chamferRings(regularPolygon(6, radius, 0), p.lengthMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: [circleAt(0, 0, p.boreMm / 2, 56)],
      thicknessMm: p.lengthMm,
    });
  },
  fileName: (p) => `hex-standoff-${R(p.flatsMm, 1)}-${R(p.lengthMm, 0)}.stl`,
});

/* --------------------------------------------------------------- sanding drum */

export const sandingDrum: AnyDesign = defineDesign({
  id: "sanding-drum",
  name: "Sanding drum",
  family: "motion",
  eyebrow: "Spindle drum",
  blurb: "A chamfered drum with a bore for a spindle-sander arbor.",
  lede: "A sanding drum for a spindle sander or a drill press: a straight cylinder with a real bore and a chamfer on both rims, so the abrasive sleeve slides on without catching. The drum diameter and length are independent of the bore.",
  use: "Sanding inside curves and tight profiles on a spindle sander or a drill press.",
  notesTitle: "How the drum takes the arbor",
  chips: [
    { label: "Drum Ø", value: "20 – 120 mm" },
    { label: "Length", value: "20 – 120 mm" },
    { label: "Bore", value: "5 – 20 mm" },
  ],
  notes: [
    "The bore is a straight through-hole sized to the arbor, and the wall between the bore and the drum face is reported directly. Both rims are chamfered, which is what lets a rubber sleeve or an abrasive band start without tearing.",
    "Make the drum with the bore vertical and at solid; a sanding drum is squeezed by its sleeve and a hollow one will collapse. Check the bore against the arbor with a test fit before gluing the abrasive on.",
  ],
  header: "Sanding Drum Designer - units: mm",
  fields: [
    { key: "diameter", label: "Drum diameter", kind: "length", section: "Drum", default: "50", min: 20, max: 120 },
    { key: "length", label: "Drum length", kind: "length", section: "Drum", default: "60", min: 20, max: 120 },
    { key: "bore", label: "Arbor bore", kind: "length", section: "Drum", default: "8", min: 5, max: 20 },
    { key: "chamfer", label: "Rim chamfer", kind: "length", section: "Drum", default: "1.5", min: 0, max: 5 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Drum diameter", p.diameterMm, 20, 120);
    pushRange(errors, units, "length", "Drum length", p.lengthMm, 20, 120);
    pushRange(errors, units, "bore", "Arbor bore", p.boreMm, 5, 20);
    pushRange(errors, units, "chamfer", "Rim chamfer", p.chamferMm, 0, 5);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.lengthMm);

    checkWall(errors, units, "bore", "drum wall", (p.diameterMm - p.boreMm) / 2);
    if (p.lengthMm <= p.chamferMm * 2) errors.push({ field: "chamfer", level: "error", message: "The two rim chamfers meet; reduce them." });
    if (p.chamferMm > p.diameterMm * 0.12) errors.push({ field: "chamfer", level: "error", message: "The rim chamfer is too large for the drum diameter." });
    if (p.lengthMm < p.diameterMm * 0.8) warnings.push({ field: "length", level: "warning", message: "A short drum is hard to keep square on the arbor." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Drum Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Arbor bore", value: U(p.boreMm, units), source: "input" },
        { label: "Wall", value: U((p.diameterMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Rim chamfer", value: U(p.chamferMm, units), source: "input" },
        { label: "Sanding area", value: `${R((Math.PI * p.diameterMm * p.lengthMm) / 100, 1)} cm²`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} × ${U(p.lengthMm, units)} drum`,
        `SD${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}`,
        p.diameterMm,
        p.lengthMm,
        [
          { label: "Drum", value: U(p.diameterMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const { rings, fractions } = chamferRings(circleAt(0, 0, p.diameterMm / 2, 96), p.lengthMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: [circleAt(0, 0, p.boreMm / 2, 64)],
      thicknessMm: p.lengthMm,
    });
  },
  fileName: (p) => `sanding-drum-${R(p.diameterMm, 0)}x${R(p.lengthMm, 0)}.stl`,
});

export const workshopMounts: AnyDesign[] = [
  routerTemplate,
  fanMount,
  trivet,
  bellCrank,
  hexStandoff,
  sandingDrum,
];
