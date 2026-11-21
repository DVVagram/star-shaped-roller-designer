/** Second library, part 2: brackets, tags and hole-pattern plates. */

import { buildPrism } from "@/lib/kit/prism";
import { type LengthUnit, type Point2D } from "@/lib/kit/units";
import { obround, roundedRect } from "@/lib/kit/outlines";

import {
  checkSize,
  checkWall,
  circleAt,
  emptyResult,
  measure,
  round,
} from "./helpers";
import {
  defineDesign,
  previewOf,
  pushRange,
  rawCount,
  rawLength,
  type AnyDesign,
  type DesignIssue,
} from "./types";

const U = (value: number, units: LengthUnit) => measure(value, units);
const R = (value: number, decimals = 2) => round(value, decimals);

/* -------------------------------------------------------------- slot bracket */

export const slotBracket: AnyDesign = defineDesign({
  id: "slot-bracket",
  name: "Slot bracket",
  family: "fixings",
  eyebrow: "Adjustable",
  blurb: "A bracket with one fixed hole and one adjustment slot.",
  lede: "A flat bracket with a pivot hole at one end and an obround slot at the other, so the part can be set anywhere along the slot and then locked.",
  chips: [
    { label: "Length", value: "30 – 170 mm" },
    { label: "Slot", value: "4 – 90 mm" },
    { label: "Thickness", value: "3 – 16 mm" },
  ],
  notes: [
    "The slot is a true stadium hole: overall length is the slot length plus its width, and its ends are semicircles of the slot width. Both ends of the plate are rounded to the plate width.",
    "A slot bracket needs a washer under the bolt head, otherwise the head bears on the slot edges and the plate creeps when it is tightened.",
  ],
  header: "Slot Bracket Designer - units: mm",
  fields: [
    { key: "length", label: "Overall length", kind: "length", section: "Bracket", default: "80", min: 30, max: 170 },
    { key: "width", label: "Width", kind: "length", section: "Bracket", default: "30", min: 12, max: 90 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Bracket", default: "8", min: 3, max: 16 },
    { key: "pivot", label: "Pivot bore", kind: "length", section: "Holes", default: "8", min: 2, max: 30 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Holes", default: "30", min: 4, max: 90 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Holes", default: "9", min: 3, max: 24 },
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
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 30, 170);
    pushRange(errors, units, "width", "Width", p.widthMm, 12, 90);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 16);
    pushRange(errors, units, "pivot", "Pivot bore", p.pivotMm, 2, 30);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 4, 90);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 3, 24);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const endR = p.widthMm / 2;
    const pivotX = -p.lengthMm / 2 + endR;
    const slotX = p.lengthMm / 2 - endR - p.slotLengthMm / 2 - p.slotWidthMm / 2;
    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);
    checkWall(errors, units, "pivot", "edge to the pivot", endR - p.pivotMm / 2);
    if (p.slotWidthMm >= p.widthMm - 2) errors.push({ field: "slotWidth", level: "error", message: "The slot is as wide as the bracket." });
    const slotHalf = (p.slotLengthMm + p.slotWidthMm) / 2;
    if (slotX - slotHalf <= pivotX + p.pivotMm / 2 + 2) errors.push({ field: "slotLength", level: "error", message: "The slot runs into the pivot hole." });
    if (slotX + slotHalf > p.lengthMm / 2 - 1.6) errors.push({ field: "slotLength", level: "error", message: "The slot breaks out of the rounded end." });
    if (p.slotWidthMm / 2 >= endR - 1.6) errors.push({ field: "slotWidth", level: "error", message: "The slot is too wide for the bracket's rounded end." });
    if (p.thicknessMm < 4) warnings.push({ field: "thickness", level: "warning", message: "Under 4 mm the slot lips bend under a bolt." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Pivot bore", value: U(p.pivotMm, units), source: "input" },
        { label: "Slot", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Travel", value: U(p.slotLengthMm, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} · ${U(p.slotLengthMm, units)} slot`,
        `SB${R(p.lengthMm, 0)}-${R(p.slotLengthMm, 0)}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Slot", value: U(p.slotLengthMm, units) },
          { label: "Pivot", value: U(p.pivotMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const endR = p.widthMm / 2;
    const pivotX = -p.lengthMm / 2 + endR;
    const slotX = p.lengthMm / 2 - endR - p.slotLengthMm / 2 - p.slotWidthMm / 2;
    return buildPrism({
      rings: [obround(0, 0, p.lengthMm - p.widthMm, p.widthMm, 0), obround(0, 0, p.lengthMm - p.widthMm, p.widthMm, 0)],
      holes: [
        circleAt(pivotX, 0, p.pivotMm / 2),
        obround(slotX, 0, p.slotLengthMm, p.slotWidthMm, 0),
      ],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `slot-bracket-${R(p.lengthMm, 0)}-${R(p.slotLengthMm, 0)}slot.stl`,
});

/* ---------------------------------------------------------------- link plate */

export const linkPlate: AnyDesign = defineDesign({
  id: "link-plate",
  name: "Link plate",
  family: "fixings",
  eyebrow: "Two pins",
  blurb: "A dog-bone plate that joins two pins at a fixed centre distance.",
  lede: "A stadium plate with two equal bores at an exact centre distance — the flat link of a linkage, a chain substitute or a pair of rods.",
  chips: [
    { label: "Pitch", value: "8 – 150 mm" },
    { label: "Bore", value: "2 – 30 mm" },
    { label: "Width", value: "6 – 60 mm" },
  ],
  notes: [
    "The outline is a stadium of the plate width, so the overall length is the pin pitch plus the plate width, and the ends are true semicircles around each pin. Both bores are the same size and sit on the pin centres.",
    "A link is weakest across the pin holes. Keep at least one bore diameter of material outside each hole and press a metal pin or a screw through it.",
  ],
  header: "Link Plate Designer - units: mm",
  fields: [
    { key: "pitch", label: "Pin pitch", kind: "length", section: "Link", default: "66", min: 8, max: 150 },
    { key: "width", label: "Plate width", kind: "length", section: "Link", default: "16", min: 6, max: 60 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Link", default: "6", min: 2, max: 20 },
    { key: "bore", label: "Pin bore", kind: "length", section: "Link", default: "8", min: 2, max: 30 },
  ],
  parse: (raw) => ({
    pitchMm: rawLength(raw, "pitch"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "pitch", "Pin pitch", p.pitchMm, 8, 150);
    pushRange(errors, units, "width", "Plate width", p.widthMm, 6, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 20);
    pushRange(errors, units, "bore", "Pin bore", p.boreMm, 2, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "pitch", p.pitchMm + p.widthMm, p.thicknessMm);
    checkWall(errors, units, "bore", "ring around the pin", p.widthMm / 2 - p.boreMm / 2);
    if (p.boreMm >= p.widthMm - 1) errors.push({ field: "bore", level: "error", message: "The bore leaves no material at the edge." });
    if (p.pitchMm <= p.boreMm + 1.2) {
      errors.push({ field: "pitch", level: "error", message: "The two bores nearly meet; increase the pin pitch or reduce the bore." });
    }
    if (p.thicknessMm < p.boreMm * 0.4) warnings.push({ field: "thickness", level: "warning", message: "A thin link ovalises its pin holes under load." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Pin pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Overall length", value: U(p.pitchMm + p.widthMm, units), source: "calc" },
        { label: "Plate width", value: U(p.widthMm, units), source: "input" },
        { label: "Pin bore", value: U(p.boreMm, units), source: "input" },
        { label: "End wall", value: U((p.widthMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.pitchMm, units)} pitch · ${U(p.boreMm, units)} bore`,
        `LP${R(p.pitchMm, 0)}-${R(p.boreMm, 0)}`,
        p.pitchMm + p.widthMm,
        p.thicknessMm,
        [
          { label: "Pitch", value: U(p.pitchMm, units) },
          { label: "Length", value: U(p.pitchMm + p.widthMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [obround(0, 0, p.pitchMm, p.widthMm, 0), obround(0, 0, p.pitchMm, p.widthMm, 0)],
      holes: [
        circleAt(p.pitchMm / 2, 0, p.boreMm / 2),
        circleAt(-p.pitchMm / 2, 0, p.boreMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `link-plate-${R(p.pitchMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* --------------------------------------------------------------- drill guide */

export const drillGuide: AnyDesign = defineDesign({
  id: "drill-guide",
  name: "Drill guide",
  family: "fixings",
  eyebrow: "Bushing block",
  blurb: "A thick block of guide holes on a fixed pitch.",
  lede: "A block with a row of equal guide holes, used to keep a hand drill square and on pitch. Thickness is the bearing length that keeps the bit true.",
  chips: [
    { label: "Holes", value: "1 – 9" },
    { label: "Pitch", value: "6 – 40 mm" },
    { label: "Block", value: "3 – 30 mm" },
  ],
  notes: [
    "Every hole is a straight through-bore, so the guide only works if the block is thick enough: a guide hole needs about one diameter of length to hold a bit square. The block is sized from the hole count and pitch rather than the other way round.",
    "Drill slowly and clear the chips — a guide will melt if the bit runs hot. Use it for wood and plastics, not for metal.",
  ],
  header: "Drill Guide Designer - units: mm",
  fields: [
    { key: "holes", label: "Holes", kind: "count", section: "Guide", default: "5", min: 1, max: 9 },
    { key: "holePitch", label: "Hole pitch", kind: "length", section: "Guide", default: "16", min: 6, max: 40 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Guide", default: "8", min: 2, max: 24 },
    { key: "thickness", label: "Block thickness", kind: "length", section: "Guide", default: "14", min: 3, max: 30 },
    { key: "margin", label: "End margin", kind: "length", section: "Guide", default: "8", min: 3, max: 20 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Guide", default: "4", min: 0, max: 12 },
  ],
  parse: (raw) => ({
    holes: rawCount(raw, "holes"),
    pitchMm: rawLength(raw, "holePitch"),
    holeMm: rawLength(raw, "hole"),
    thicknessMm: rawLength(raw, "thickness"),
    marginMm: rawLength(raw, "margin"),
    cornerMm: rawLength(raw, "corner"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "holes", "Holes", p.holes, 1, 9, false);
    pushRange(errors, units, "holePitch", "Hole pitch", p.pitchMm, 6, 40);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 24);
    pushRange(errors, units, "thickness", "Block thickness", p.thicknessMm, 3, 30);
    pushRange(errors, units, "margin", "End margin", p.marginMm, 3, 20);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const count = Math.max(1, Math.round(p.holes));
    const width = (count - 1) * p.pitchMm + p.holeMm + 2 * p.marginMm;
    const height = p.holeMm + 2 * p.marginMm;
    checkSize(errors, units, "holePitch", width, p.thicknessMm);
    if (p.pitchMm < p.holeMm + 1.5) errors.push({ field: "holePitch", level: "error", message: "The holes run into each other; widen the pitch." });
    if (p.thicknessMm < p.holeMm) warnings.push({ field: "thickness", level: "warning", message: "The block is thinner than the hole — it will not hold a bit square." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Holes", value: String(count), source: "input" },
        { label: "Pitch", value: U(p.pitchMm, units), source: "input" },
        { label: "Hole", value: U(p.holeMm, units), source: "input" },
        { label: "Block", value: `${U(width, units)} × ${U(height, units)}`, source: "calc" },
        { label: "Bearing length", value: U(p.thicknessMm, units), source: "input" },
        { label: "Web", value: U(p.pitchMm - p.holeMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${count} × ${U(p.holeMm, units)} holes`,
        `DG${count}-${R(p.holeMm, 0)}`,
        width,
        p.thicknessMm,
        [
          { label: "Block", value: `${U(width, units)} × ${U(height, units)}` },
          { label: "Holes", value: String(count) },
          { label: "Thickness", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const count = Math.max(1, Math.round(p.holes));
    const width = (count - 1) * p.pitchMm + p.holeMm + 2 * p.marginMm;
    const height = p.holeMm + 2 * p.marginMm;
    const holes: Point2D[][] = [];
    for (let i = 0; i < count; i += 1) {
      holes.push(circleAt((i - (count - 1) / 2) * p.pitchMm, 0, p.holeMm / 2));
    }
    return buildPrism({
      rings: [roundedRect(width, height, p.cornerMm), roundedRect(width, height, p.cornerMm)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `drill-guide-${Math.round(p.holes)}x${R(p.holeMm, 0)}.stl`,
});

/* -------------------------------------------------------------------- keytag */

export const keytag: AnyDesign = defineDesign({
  id: "keytag",
  name: "Key tag",
  family: "fixings",
  eyebrow: "Rounded tag",
  blurb: "A stiff stadium tag with a ring hole for a key ring or a hook.",
  lede: "A stadium tag with one ring hole, thin enough to flex and thick enough to survive a pocket.",
  chips: [
    { label: "Length", value: "30 – 120 mm" },
    { label: "Width", value: "12 – 60 mm" },
    { label: "Hole", value: "2 – 12 mm" },
  ],
  notes: [
    "The ring hole sits on the centre line at the rounded end, with a full hole diameter of material around it. The tag is a true stadium, so the end is a semicircle rather than a clipped corner.",
    "Make it flat in a tough material. A tag made in a rigid material snaps at the ring hole after a few months of pocket wear.",
  ],
  header: "Key Tag Designer - units: mm",
  fields: [
    { key: "length", label: "Length", kind: "length", section: "Tag", default: "60", min: 30, max: 120 },
    { key: "width", label: "Width", kind: "length", section: "Tag", default: "28", min: 12, max: 60 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Tag", default: "4", min: 1.5, max: 10 },
    { key: "hole", label: "Ring hole", kind: "length", section: "Tag", default: "5", min: 2, max: 12 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Length", p.lengthMm, 30, 120);
    pushRange(errors, units, "width", "Width", p.widthMm, 12, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 10);
    pushRange(errors, units, "hole", "Ring hole", p.holeMm, 2, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);
    const ringX = -p.lengthMm / 2 + p.widthMm / 2;
    checkWall(errors, units, "hole", "ring land", p.widthMm / 2 - p.holeMm / 2);
    if (p.widthMm >= p.lengthMm) errors.push({ field: "width", level: "error", message: "The tag must be longer than it is wide." });
    if (p.holeMm < 4) warnings.push({ field: "hole", level: "warning", message: "A hole under 4 mm will not pass most split rings." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Ring hole", value: U(p.holeMm, units), source: "input" },
        { label: "Ring land", value: U((p.widthMm - p.holeMm) / 2, units), source: "calc" },
        { label: "Hole centre", value: U(ringX, units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.lengthMm, units)} × ${U(p.widthMm, units)} tag`,
        `KT${R(p.lengthMm, 0)}-${R(p.widthMm, 0)}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Hole", value: U(p.holeMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [obround(0, 0, p.lengthMm - p.widthMm, p.widthMm, 0), obround(0, 0, p.lengthMm - p.widthMm, p.widthMm, 0)],
      holes: [circleAt(-p.lengthMm / 2 + p.widthMm / 2, 0, p.holeMm / 2)],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `keytag-${R(p.lengthMm, 0)}x${R(p.widthMm, 0)}.stl`,
});

/* -------------------------------------------------------------- plant label */

export const plantLabel: AnyDesign = defineDesign({
  id: "plant-label",
  name: "Plant label",
  family: "fixings",
  eyebrow: "Stake",
  blurb: "A writing plate on a pointed stake that pushes into soil beside a row.",
  lede: "A flat label with a tapering point, pushed into soil beside a row. The plate stays above the surface and the point starts without crushing the stem.",
  chips: [
    { label: "Height", value: "40 – 170 mm" },
    { label: "Width", value: "12 – 80 mm" },
    { label: "Thickness", value: "1 – 5 mm" },
  ],
  notes: [
    "The outline is one closed polygon: a rectangular writing plate and a triangular point, with no separate parts to snap off. The point length is measured from the bottom of the plate.",
    "A label made flat with the point in the base plane is strongest along the stake. Use a tough material outdoors; a rigid material goes brittle in sunlight and frost.",
  ],
  header: "Plant Label Designer - units: mm",
  fields: [
    { key: "height", label: "Overall height", kind: "length", section: "Label", default: "120", min: 40, max: 170 },
    { key: "width", label: "Plate width", kind: "length", section: "Label", default: "40", min: 12, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Label", default: "2", min: 1, max: 5 },
    { key: "tip", label: "Point length", kind: "length", section: "Label", default: "25", min: 5, max: 80 },
    { key: "hang", label: "Hang hole", kind: "length", section: "Label", default: "6", min: 0, max: 20, hint: "0 for no hole." },
  ],
  parse: (raw) => ({
    heightMm: rawLength(raw, "height"),
    widthMm: rawLength(raw, "width"),
    thicknessMm: rawLength(raw, "thickness"),
    tipMm: rawLength(raw, "tip"),
    hangMm: rawLength(raw, "hang"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "height", "Overall height", p.heightMm, 40, 170);
    pushRange(errors, units, "width", "Plate width", p.widthMm, 12, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1, 5);
    pushRange(errors, units, "tip", "Point length", p.tipMm, 5, 80);
    pushRange(errors, units, "hang", "Hang hole", p.hangMm, 0, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "height", p.widthMm, p.heightMm);
    if (p.tipMm >= p.heightMm - 5) errors.push({ field: "tip", level: "error", message: "The point leaves no writing plate." });
    if (p.hangMm > 0 && p.hangMm / 2 > p.widthMm / 2 - 6) errors.push({ field: "hang", level: "error", message: "The hang hole is too wide for the plate." });
    if (p.hangMm > 0 && p.hangMm + 8 > p.heightMm - p.tipMm) errors.push({ field: "hang", level: "error", message: "The hang hole leaves no writing plate." });
    if (p.thicknessMm < 1.5) warnings.push({ field: "thickness", level: "warning", message: "Under 1.5 mm the label curls and the stake buckles." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Overall height", value: U(p.heightMm, units), source: "input" },
        { label: "Plate width", value: U(p.widthMm, units), source: "input" },
        { label: "Writing plate", value: U(p.heightMm - p.tipMm, units), source: "calc" },
        { label: "Point", value: U(p.tipMm, units), source: "input" },
        { label: "Point angle", value: `${R((Math.atan2(p.widthMm / 2, p.tipMm) * 180) / Math.PI, 1)}°`, source: "calc" },
        { label: "Hang hole", value: p.hangMm > 0 ? U(p.hangMm, units) : "none", source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.heightMm, units)} stake · ${U(p.widthMm, units)} plate`,
        `PL${R(p.heightMm, 0)}-${R(p.widthMm, 0)}`,
        p.widthMm,
        p.heightMm,
        [
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Point", value: U(p.tipMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const halfW = p.widthMm / 2;
    const halfH = p.heightMm / 2;
    const points: Point2D[] = [
      { x: -halfW, y: halfH },
      { x: halfW, y: halfH },
      { x: halfW, y: -halfH + p.tipMm },
      { x: 0, y: -halfH },
      { x: -halfW, y: -halfH + p.tipMm },
    ];
    const holes: Point2D[][] = [];
    if (p.hangMm > 0.5) {
      holes.push(circleAt(0, halfH - 4 - p.hangMm / 2, p.hangMm / 2));
    }
    return buildPrism({ rings: [points, points], holes, thicknessMm: p.thicknessMm });
  },
  fileName: (p) => `plant-label-${R(p.heightMm, 0)}x${R(p.widthMm, 0)}.stl`,
});

/* -------------------------------------------------------------- gusset plate */

export const gussetPlate: AnyDesign = defineDesign({
  id: "gusset-plate",
  name: "Gusset plate",
  family: "fixings",
  eyebrow: "Corner brace",
  blurb: "A right-triangle brace with three fixing holes.",
  lede: "A flat triangular gusset with three holes on the two legs, for bracing a right-angle joint without a folded bracket.",
  chips: [
    { label: "Legs", value: "30 – 170 mm" },
    { label: "Holes", value: "3" },
    { label: "Thickness", value: "2 – 16 mm" },
  ],
  notes: [
    "The triangle is right-angled with equal legs, and the holes sit on a square inset from both legs so a screwdriver clears the corner. The outline is a plain triangle, so the plate is flat and can be formed without a fixture.",
    "A flat gusset only braces one plane. For a three-dimensional corner, use two plates at 90° or a folded bracket.",
  ],
  header: "Gusset Plate Designer - units: mm",
  fields: [
    { key: "leg", label: "Leg length", kind: "length", section: "Plate", default: "60", min: 30, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "6", min: 2, max: 16 },
    { key: "hole", label: "Hole diameter", kind: "length", section: "Holes", default: "6", min: 2, max: 20 },
    { key: "inset", label: "Hole inset", kind: "length", section: "Holes", default: "12", min: 4, max: 60 },
  ],
  parse: (raw) => ({
    legMm: rawLength(raw, "leg"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    insetMm: rawLength(raw, "inset"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "leg", "Leg length", p.legMm, 30, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 16);
    pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 20);
    pushRange(errors, units, "inset", "Hole inset", p.insetMm, 4, 60);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "leg", p.legMm * Math.SQRT2, p.thicknessMm);
    if (p.insetMm * 2 + p.holeMm > p.legMm) errors.push({ field: "inset", level: "error", message: "Two holes do not fit on the leg." });
    // The two outboard holes sit on the diagonal; keep them clear of the hypotenuse.
    if (-p.legMm + 4 * p.insetMm > -(p.holeMm / 2 + 1.6) * Math.SQRT2) errors.push({ field: "inset", level: "error", message: "The outboard holes run past the hypotenuse." });
    if (3 * p.insetMm + p.holeMm / 2 > p.legMm - 1.6) errors.push({ field: "inset", level: "error", message: "The outboard holes run off the leg." });
    if (p.insetMm - p.holeMm / 2 < 0.8) errors.push({ field: "hole", level: "error", message: "The holes break out of the legs." });
    if (p.insetMm <= p.holeMm) warnings.push({ field: "inset", level: "warning", message: "The holes are closer to the edge than one diameter." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Legs", value: U(p.legMm, units), source: "input" },
        { label: "Hypotenuse", value: U(p.legMm * Math.SQRT2, units), source: "calc" },
        { label: "Holes", value: U(p.holeMm, units), source: "input" },
        { label: "Hole inset", value: U(p.insetMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Plate area", value: `${R((p.legMm * p.legMm) / 2 / 100, 1)} cm²`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.legMm, units)} legs · ${U(p.holeMm, units)} holes`,
        `GP${R(p.legMm, 0)}-${R(p.holeMm, 0)}`,
        p.legMm,
        p.thicknessMm,
        [
          { label: "Legs", value: U(p.legMm, units) },
          { label: "Holes", value: U(p.holeMm, units) },
          { label: "Thickness", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const leg = p.legMm;
    const points: Point2D[] = [
      { x: -leg / 2, y: -leg / 2 },
      { x: leg / 2, y: -leg / 2 },
      { x: -leg / 2, y: leg / 2 },
    ];
    const a = -leg / 2 + p.insetMm;
    const b = -leg / 2 + p.insetMm * 3;
    return buildPrism({
      rings: [points, points],
      holes: [
        circleAt(a, a, p.holeMm / 2),
        circleAt(b, a, p.holeMm / 2),
        circleAt(a, b, p.holeMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `gusset-${R(p.legMm, 0)}-${R(p.holeMm, 0)}.stl`,
});

/* ------------------------------------------------------- keyhole escutcheon */

export const keyholePlate: AnyDesign = defineDesign({
  id: "keyhole-plate",
  name: "Keyhole plate",
  family: "fixings",
  eyebrow: "Escutcheon",
  blurb: "A flat plate with a keyhole opening that hangs on a screw head.",
  lede: "A flat escutcheon with one keyhole opening — a round clearance at the bottom and a narrower slot above — for a lock, a hanging slot or a keyed hanger.",
  chips: [
    { label: "Plate", value: "20 – 120 mm" },
    { label: "Keyhole", value: "4 – 30 mm" },
    { label: "Thickness", value: "1.5 – 10 mm" },
  ],
  notes: [
    "The opening is a single closed polygon: a circular clearance blended into a parallel-sided slot. That makes it a legal through-hole, so the plate stays one watertight shell instead of needing a boolean cut.",
    "Keyhole hangers hold by the head of a screw, so the slot width must be just under the screw head and the round hole just over it.",
  ],
  header: "Keyhole Plate Designer - units: mm",
  fields: [
    { key: "width", label: "Plate width", kind: "length", section: "Plate", default: "44", min: 20, max: 120 },
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "70", min: 20, max: 140 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "3", min: 1.5, max: 10 },
    { key: "hole", label: "Keyhole Ø", kind: "length", section: "Opening", default: "12", min: 4, max: 30 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Opening", default: "8", min: 2, max: 24 },
    { key: "slotLength", label: "Slot rise", kind: "length", section: "Opening", default: "22", min: 4, max: 60 },
    { key: "corner", label: "Corner radius", kind: "length", section: "Plate", default: "6", min: 0, max: 20 },
    { key: "screw", label: "Fixing screw", kind: "length", section: "Mounting", default: "4", min: 0, max: 10, hint: "0 for a hanger with no screws." },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "hole"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    slotLengthMm: rawLength(raw, "slotLength"),
    cornerMm: rawLength(raw, "corner"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Plate width", p.widthMm, 20, 120);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 20, 140);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 10);
    pushRange(errors, units, "hole", "Keyhole diameter", p.holeMm, 4, 30);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 2, 24);
    pushRange(errors, units, "slotLength", "Slot rise", p.slotLengthMm, 4, 60);
    pushRange(errors, units, "corner", "Corner radius", p.cornerMm, 0, 20);
    pushRange(errors, units, "screw", "Fixing screw", p.screwMm, 0, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "height", p.widthMm, p.heightMm);
    if (p.screwMm > 0) {
      if (2 * (p.widthMm / 2 - 8) < p.screwMm + 2) errors.push({ field: "screw", level: "error", message: "The two fixing screws touch; widen the plate or use smaller screws." });
      const top = -p.heightMm / 2 + p.holeMm / 2 + 6 + p.slotLengthMm;
      if (p.heightMm / 2 - 8 - p.screwMm / 2 < top + 1.6) errors.push({ field: "screw", level: "error", message: "The fixing screws run into the keyhole." });
    }
    if (p.holeMm <= p.slotWidthMm) errors.push({ field: "slotWidth", level: "error", message: "The slot must be narrower than the keyhole." });
    if (p.slotWidthMm + 2 > p.widthMm || p.holeMm + 2 > p.widthMm) errors.push({ field: "hole", level: "error", message: "The opening leaves no plate at the sides." });
    if (p.holeMm + p.slotLengthMm + 2 > p.heightMm) errors.push({ field: "slotLength", level: "error", message: "The opening breaks out of the plate." });
    if (p.thicknessMm < 2) warnings.push({ field: "thickness", level: "warning", message: "A 2 mm plate is fragile around a keyhole." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Keyhole Ø", value: U(p.holeMm, units), source: "input" },
        { label: "Slot", value: `${U(p.slotWidthMm, units)} × ${U(p.slotLengthMm, units)}`, source: "input" },
        { label: "Overall opening", value: U(p.holeMm + p.slotLengthMm, units), source: "calc" },
        { label: "Side land", value: U((p.widthMm - Math.max(p.holeMm, p.slotWidthMm)) / 2, units), source: "calc" },
        { label: "Fixing screws", value: p.screwMm > 0 ? `2 × ${U(p.screwMm, units)}` : "none", source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} × ${U(p.heightMm, units)} plate`,
        `KP${R(p.widthMm, 0)}-${R(p.holeMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}` },
          { label: "Keyhole", value: U(p.holeMm, units) },
          { label: "Slot", value: U(p.slotLengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.holeMm / 2;
    const cy = -p.heightMm / 2 + r + 6;
    const top = cy + p.slotLengthMm;
    const half = p.slotWidthMm / 2;
    // Where the slot sides meet the clearance circle, measured from its centre.
    const rise = Math.sqrt(Math.max(0, r * r - half * half));
    const start = Math.acos(Math.min(0.999, half / r));
    const sweep = Math.PI + 2 * start;
    const points: Point2D[] = [
      { x: half, y: top },
      { x: half, y: cy + rise },
    ];
    const steps = 40;
    for (let i = 1; i <= steps; i += 1) {
      const angle = start - (sweep * i) / steps;
      points.push({ x: r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    points.push({ x: -half, y: top });
    const holes: Point2D[][] = [points];
    if (p.screwMm > 0) {
      const sx = p.widthMm / 2 - 8;
      const sy = p.heightMm / 2 - 8;
      holes.push(
        circleAt(sx, sy, p.screwMm / 2),
        circleAt(-sx, sy, p.screwMm / 2),
      );
    }
    return buildPrism({
      rings: [roundedRect(p.widthMm, p.heightMm, p.cornerMm), roundedRect(p.widthMm, p.heightMm, p.cornerMm)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `keyhole-plate-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

/* -------------------------------------------------------------- switch plate */

export const switchPlate: AnyDesign = defineDesign({
  id: "switch-plate",
  name: "Switch plate",
  family: "fixings",
  eyebrow: "Panel opening",
  blurb: "A panel plate with a rounded rectangular opening.",
  lede: "A flat panel plate with one rounded rectangular opening — a switch, a socket or a gauge bezel — and a chamfered edge that sits flush against the panel.",
  chips: [
    { label: "Plate", value: "30 – 170 mm" },
    { label: "Opening", value: "8 – 120 mm" },
    { label: "Thickness", value: "1.5 – 12 mm" },
  ],
  notes: [
    "The opening is a rounded rectangle with its own corner radius, so a switch or a gauge drops in without a sharp corner to crack. It is a through-hole like any other, cut from the same cap as the plate.",
    "Measure the device, not the old plate: formed plates can shrink about 0.2 %, and a switch that rubs its opening will not sit flat.",
  ],
  header: "Switch Plate Designer - units: mm",
  fields: [
    { key: "width", label: "Plate width", kind: "length", section: "Plate", default: "70", min: 30, max: 170 },
    { key: "height", label: "Plate height", kind: "length", section: "Plate", default: "115", min: 30, max: 170 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "5", min: 1.5, max: 12 },
    { key: "openingWidth", label: "Opening width", kind: "length", section: "Opening", default: "22", min: 8, max: 120 },
    { key: "openingHeight", label: "Opening height", kind: "length", section: "Opening", default: "45", min: 8, max: 120 },
    { key: "openingCorner", label: "Opening radius", kind: "length", section: "Opening", default: "3", min: 0, max: 20 },
    { key: "corner", label: "Plate radius", kind: "length", section: "Plate", default: "6", min: 0, max: 20 },
    { key: "screw", label: "Fixing screw", kind: "length", section: "Mounting", default: "4", min: 0, max: 10 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    openingWidthMm: rawLength(raw, "openingWidth"),
    openingHeightMm: rawLength(raw, "openingHeight"),
    openingCornerMm: rawLength(raw, "openingCorner"),
    cornerMm: rawLength(raw, "corner"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Plate width", p.widthMm, 30, 170);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 30, 170);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 12);
    pushRange(errors, units, "openingWidth", "Opening width", p.openingWidthMm, 8, 120);
    pushRange(errors, units, "openingHeight", "Opening height", p.openingHeightMm, 8, 120);
    pushRange(errors, units, "openingCorner", "Opening radius", p.openingCornerMm, 0, 20);
    pushRange(errors, units, "corner", "Plate radius", p.cornerMm, 0, 20);
    pushRange(errors, units, "screw", "Fixing screw", p.screwMm, 0, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "width", p.widthMm, Math.max(p.heightMm, p.thicknessMm));
    checkWall(errors, units, "openingWidth", "plate at the sides", (p.widthMm - p.openingWidthMm) / 2);
    if (p.openingHeightMm >= p.heightMm - 2) errors.push({ field: "openingHeight", level: "error", message: "The opening reaches the top or bottom edge." });
    if (p.screwMm > 0 && (p.heightMm - p.openingHeightMm) / 4 < p.screwMm / 2 + 1.6) {
      errors.push({ field: "screw", level: "error", message: "No room for a fixing screw beside the opening." });
    }

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Opening", value: `${U(p.openingWidthMm, units)} × ${U(p.openingHeightMm, units)}`, source: "input" },
        { label: "Side land", value: U((p.widthMm - p.openingWidthMm) / 2, units), source: "calc" },
        { label: "Top land", value: U((p.heightMm - p.openingHeightMm) / 2, units), source: "calc" },
        { label: "Opening radius", value: U(p.openingCornerMm, units), source: "input" },
        { label: "Fixing screws", value: p.screwMm > 0 ? `2 × ${U(p.screwMm, units)}` : "none", source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} × ${U(p.heightMm, units)} plate`,
        `SP${R(p.widthMm, 0)}-${R(p.heightMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}` },
          { label: "Opening", value: `${U(p.openingWidthMm, units)} × ${U(p.openingHeightMm, units)}` },
          { label: "Thickness", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const holes: Point2D[][] = [roundedRect(p.openingWidthMm, p.openingHeightMm, p.openingCornerMm)];
    if (p.screwMm > 0) {
      const y = (p.openingHeightMm + p.heightMm) / 4;
      holes.push(circleAt(0, y, p.screwMm / 2), circleAt(0, -y, p.screwMm / 2));
    }
    return buildPrism({
      rings: [roundedRect(p.widthMm, p.heightMm, p.cornerMm), roundedRect(p.widthMm, p.heightMm, p.cornerMm)],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `switch-plate-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------ cable mount */

export const cableMount: AnyDesign = defineDesign({
  id: "cable-mount",
  name: "Cable tie mount",
  family: "fixings",
  eyebrow: "Two slots",
  blurb: "A small plate with two tie slots and a screw hole.",
  lede: "A low mount that screws to a surface and takes a cable tie through two slots, so a bundle can be fixed without drilling the surface it sits on.",
  chips: [
    { label: "Plate", value: "12 – 60 mm" },
    { label: "Slots", value: "2" },
    { label: "Thickness", value: "1.5 – 8 mm" },
  ],
  notes: [
    "Both tie slots are obround through-holes, wide enough for a 4 mm tie and long enough to pass a bundle, with a screw hole between them. The slots and the screw hole are cut from the same plate, so the mount is one closed part.",
    "Screw the mount down before tightening the tie: a tie pulled hard will bow a thin plate off the surface.",
  ],
  header: "Cable Tie Mount Designer - units: mm",
  fields: [
    { key: "width", label: "Plate width", kind: "length", section: "Mount", default: "24", min: 12, max: 60 },
    { key: "height", label: "Plate height", kind: "length", section: "Mount", default: "24", min: 12, max: 60 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Mount", default: "5", min: 1.5, max: 8 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slots", default: "4", min: 2, max: 10 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slots", default: "10", min: 3, max: 30 },
    { key: "screw", label: "Screw hole", kind: "length", section: "Slots", default: "4", min: 2, max: 12 },
  ],
  parse: (raw) => ({
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    thicknessMm: rawLength(raw, "thickness"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    slotLengthMm: rawLength(raw, "slotLength"),
    screwMm: rawLength(raw, "screw"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "width", "Plate width", p.widthMm, 12, 60);
    pushRange(errors, units, "height", "Plate height", p.heightMm, 12, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 1.5, 8);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 2, 10);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 3, 30);
    pushRange(errors, units, "screw", "Screw hole", p.screwMm, 2, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "width", p.widthMm, p.thicknessMm);
    if (p.slotLengthMm + p.slotWidthMm >= p.heightMm - 4) errors.push({ field: "slotLength", level: "error", message: "The two slots do not fit down the plate." });
    if (p.screwMm / 2 + 1.6 > p.widthMm / 4 - p.slotWidthMm / 2) errors.push({ field: "screw", level: "error", message: "The screw hole runs into a slot." });
    if (p.slotWidthMm >= p.heightMm / 2) errors.push({ field: "slotWidth", level: "error", message: "The slots are as wide as the mount." });
    if (p.thicknessMm < 2.5) warnings.push({ field: "thickness", level: "warning", message: "A mount under 2.5 mm bows when the tie is tightened." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}`, source: "input" },
        { label: "Slots", value: `${U(p.slotLengthMm, units)} × ${U(p.slotWidthMm, units)}`, source: "input" },
        { label: "Screw hole", value: U(p.screwMm, units), source: "input" },
        { label: "Tie size", value: U(Math.max(2, p.slotWidthMm - 0.4), units), source: "calc" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Slot land", value: U((p.heightMm - p.slotLengthMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.widthMm, units)} × ${U(p.heightMm, units)} mount`,
        `CM${R(p.widthMm, 0)}-${R(p.heightMm, 0)}`,
        p.widthMm,
        p.thicknessMm,
        [
          { label: "Plate", value: `${U(p.widthMm, units)} × ${U(p.heightMm, units)}` },
          { label: "Slot", value: U(p.slotLengthMm, units) },
          { label: "Screw", value: U(p.screwMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildPrism({
      rings: [roundedRect(p.widthMm, p.heightMm, Math.min(6, p.widthMm / 4, p.heightMm / 4)), roundedRect(p.widthMm, p.heightMm, Math.min(6, p.widthMm / 4, p.heightMm / 4))],
      holes: [
        obround(-p.widthMm / 4, 0, p.slotLengthMm, p.slotWidthMm, Math.PI / 2),
        obround(p.widthMm / 4, 0, p.slotLengthMm, p.slotWidthMm, Math.PI / 2),
        circleAt(0, 0, p.screwMm / 2),
      ],
      thicknessMm: p.thicknessMm,
    }),
  fileName: (p) => `cable-mount-${R(p.widthMm, 0)}x${R(p.heightMm, 0)}.stl`,
});

export const prismPlates: AnyDesign[] = [
  slotBracket,
  linkPlate,
  drillGuide,
  keytag,
  plantLabel,
  gussetPlate,
  keyholePlate,
  switchPlate,
  cableMount,
];
