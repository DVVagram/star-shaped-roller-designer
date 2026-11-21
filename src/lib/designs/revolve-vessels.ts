/** Hollow vessels, funnels and fluid shells, all solids of revolution. */

import { buildRevolution, ProfileBuilder } from "@/lib/kit/revolve";
import { segmentsForRadius } from "@/lib/kit/outlines";
import type { Point2D } from "@/lib/kit/units";

import {
  checkSize,
  checkWall,
  emptyResult,
  measure,
  round,
} from "./helpers";
import {
  defineDesign,
  previewOf,
  pushRange,
  pushWarning,
  rawLength,
  type AnyDesign,
  type DesignIssue,
} from "./types";

function revolve(profile: Point2D[], maxRadius: number) {
  return buildRevolution({
    profile,
    segments: Math.min(256, Math.max(48, segmentsForRadius(maxRadius))),
  });
}

/** Interior volume in millilitres, integrated from the inner radius in slices. */
function capacityMl(
  radiusAt: (heightMm: number) => number,
  fromMm: number,
  toMm: number,
): number {
  const steps = 240;
  const dz = (toMm - fromMm) / steps;
  let volume = 0;
  for (let i = 0; i < steps; i += 1) {
    const z = fromMm + (i + 0.5) * dz;
    const radius = Math.max(0, radiusAt(z));
    volume += Math.PI * radius * radius * dz;
  }
  return volume / 1000;
}

/* ----------------------------------------------------------------- funnel */

export const funnel: AnyDesign = defineDesign({
  id: "funnel",
  name: "Funnel",
  family: "vessels",
  eyebrow: "Pour without spilling",
  blurb: "A conical funnel with a straight spout and a real wall thickness.",
  lede: "The cone runs from the rim down to a spout, and the inner surface is the same cone offset by the wall. Set the rim, spout and height and the funnel's capacity follows from the geometry rather than from a guess.",
  chips: [
    { label: "Rim Ø", value: "30 – 1000 mm" },
    { label: "Spout Ø", value: "3 – 40 mm" },
    { label: "Wall", value: "1 – 8 mm" },
  ],
  notes: [
    "Both the outer and inner cone are straight lines through the same apex angle, with a constant horizontal offset of one wall thickness. The spout is a straight tube below the cone and the rim is a flat annular face, so the shell closes without a separate lip.",
    "A funnel pours better with a small air gap beside the spout. If it glugs, cut a shallow notch in the inner rim or use a wider spout — a 6 mm bore is about the practical minimum for water.",
  ],
  header: "Funnel Designer - units: mm",
  fields: [
    { key: "rimDiameter", label: "Rim diameter", kind: "length", section: "Funnel", default: "120", min: 30, max: 1000 },
    { key: "spoutDiameter", label: "Spout bore", kind: "length", section: "Spout", default: "20", min: 3, max: 40 },
    { key: "height", label: "Overall height", kind: "length", section: "Funnel", default: "100", min: 25, max: 1000 },
    { key: "spoutLength", label: "Spout length", kind: "length", section: "Spout", default: "20", min: 3, max: 80 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Funnel", default: "2.5", min: 1, max: 8 },
  ],
  parse: (raw) => ({
    rimMm: rawLength(raw, "rimDiameter"),
    spoutMm: rawLength(raw, "spoutDiameter"),
    heightMm: rawLength(raw, "height"),
    spoutLengthMm: rawLength(raw, "spoutLength"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "rimDiameter", "Rim diameter", p.rimMm, 30, 1000);
    pushRange(errors, units, "spoutDiameter", "Spout bore", p.spoutMm, 3, 40);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 25, 1000);
    pushRange(errors, units, "spoutLength", "Spout length", p.spoutLengthMm, 3, 80);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const rim = p.rimMm / 2;
    const spout = p.spoutMm / 2;
    checkSize(errors, units, "rimDiameter", p.rimMm, p.heightMm);
    checkWall(errors, units, "spoutDiameter", "spout wall", p.wallMm);
    if (p.heightMm <= p.spoutLengthMm + 2) {
      errors.push({ field: "height", level: "error", message: "The cone needs height above the spout." });
    }
    if (rim <= spout + p.wallMm * 2) {
      errors.push({ field: "rimDiameter", level: "error", message: "The rim is not wider than the spout." });
    }
    if (p.spoutLengthMm < 8) pushWarning(warnings, "spoutLength", "A short spout splashes; 15 mm or more is easier to aim.");

    const coneAngle = (Math.atan((rim - spout - p.wallMm) / (p.heightMm - p.spoutLengthMm)) * 180) / Math.PI;

    return {
      errors,
      warnings,
      readout: [
        { label: "Rim Ø", value: measure(p.rimMm, units), source: "input" },
        { label: "Spout bore", value: measure(p.spoutMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Cone wall angle", value: `${round(coneAngle, 1)}°`, source: "calc" },
        { label: "Spout length", value: measure(p.spoutLengthMm, units), source: "input" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.rimMm, units)} rim · ${measure(p.spoutMm, units)} spout`,
        `FN${round(p.rimMm, 0)}-${round(p.spoutMm, 0)}`,
        p.rimMm,
        p.heightMm,
        [
          { label: "Rim Ø", value: measure(p.rimMm, units) },
          { label: "Spout", value: measure(p.spoutMm, units) },
          { label: "Height", value: measure(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const rim = p.rimMm / 2;
    const spout = p.spoutMm / 2;
    const outerSpout = spout + p.wallMm;
    const profile: Point2D[] = [
      { x: outerSpout, y: 0 },
      { x: outerSpout, y: p.spoutLengthMm },
      { x: rim, y: p.heightMm },
      { x: rim - p.wallMm, y: p.heightMm },
      { x: spout, y: p.spoutLengthMm },
      { x: spout, y: 0 },
    ];
    return revolve(profile, rim);
  },
  fileName: (p) => `funnel-${round(p.rimMm, 0)}rim-${round(p.spoutMm, 0)}spout.stl`,
});

/* ------------------------------------------------------------------- vase */

export const vase: AnyDesign = defineDesign({
  id: "vase",
  name: "Vase",
  family: "vessels",
  eyebrow: "Thrown profile",
  blurb: "A hollow vase whose belly and taper are both parametric.",
  lede: "A straight taper plus a sine belly gives a thrown-looking profile without any hand-drawn curves. Set the rim, base, height, wall and belly, and the inner wall follows the outer one exactly, leaving a real floor at the bottom.",
  chips: [
    { label: "Height", value: "40 – 1000 mm" },
    { label: "Rim Ø", value: "20 – 160 mm" },
    { label: "Belly", value: "0 – 40 mm" },
  ],
  notes: [
    "The outer radius is `base/2 + (rim/2 − base/2)u + belly·sin(πu)`, and the inner radius is that minus the wall. The floor is flat at the entered thickness, so the capacity can be integrated exactly from the inner profile.",
    "Make a vase with a 1.2 mm wall and three or four solid bottom sections. A wider belly holds more but tips more easily; keep the base at least a third of the rim for stability.",
  ],
  header: "Vase Designer - units: mm",
  fields: [
    { key: "rimDiameter", label: "Rim diameter", kind: "length", section: "Vase", default: "90", min: 20, max: 160 },
    { key: "baseDiameter", label: "Base diameter", kind: "length", section: "Vase", default: "60", min: 16, max: 140 },
    { key: "height", label: "Height", kind: "length", section: "Vase", default: "120", min: 40, max: 1000 },
    { key: "belly", label: "Belly swell", kind: "length", section: "Vase", default: "10", min: 0, max: 40, hint: "Extra radius at mid-height." },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Vase", default: "2.5", min: 1, max: 8 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Vase", default: "4", min: 1.5, max: 20 },
  ],
  parse: (raw) => ({
    rimMm: rawLength(raw, "rimDiameter"),
    baseMm: rawLength(raw, "baseDiameter"),
    heightMm: rawLength(raw, "height"),
    bellyMm: rawLength(raw, "belly"),
    wallMm: rawLength(raw, "wall"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "rimDiameter", "Rim diameter", p.rimMm, 20, 160);
    pushRange(errors, units, "baseDiameter", "Base diameter", p.baseMm, 16, 140);
    pushRange(errors, units, "height", "Height", p.heightMm, 40, 1000);
    pushRange(errors, units, "belly", "Belly swell", p.bellyMm, 0, 40);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 1.5, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerAt = (u: number) =>
      p.baseMm / 2 + (p.rimMm / 2 - p.baseMm / 2) * u + p.bellyMm * Math.sin(Math.PI * u);
    checkSize(errors, units, "rimDiameter", p.rimMm + p.bellyMm * 2, p.heightMm);
    const smallest = Math.min(outerAt(0), outerAt(1));
    checkWall(errors, units, "wall", "wall at the narrowest point", smallest - p.wallMm);
    if (p.floorMm >= p.heightMm * 0.5) {
      errors.push({ field: "floor", level: "error", message: "The floor is thicker than half the vase." });
    }
    if (p.wallMm < 1.2) pushWarning(warnings, "wall", "Under 1.2 mm a wall can leak through its thickness.");

    const innerAt = (u: number) => Math.max(0, outerAt(u) - p.wallMm);
    const floorU = p.floorMm / p.heightMm;
    let capacity = 0;
    const steps = 200;
    for (let i = 0; i < steps; i += 1) {
      const u = floorU + (1 - floorU) * ((i + 0.5) / steps);
      capacity += Math.PI * innerAt(u) ** 2 * ((1 - floorU) * p.heightMm / steps);
    }
    let maxOuter = 0;
    for (let i = 0; i <= 160; i += 1) maxOuter = Math.max(maxOuter, outerAt(i / 160));

    return {
      errors,
      warnings,
      readout: [
        { label: "Rim Ø", value: measure(p.rimMm, units), source: "input" },
        { label: "Base Ø", value: measure(p.baseMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Max Ø", value: measure(maxOuter * 2, units), source: "calc" },
        { label: "Capacity", value: `${round(capacity / 1000, 2)} L`, source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
        { label: "Floor", value: measure(p.floorMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.heightMm, units)} tall · ${round(capacity / 1000, 2)} L`,
        `VS${round(p.heightMm, 0)}-${round(p.rimMm, 0)}`,
        maxOuter * 2,
        p.heightMm,
        [
          { label: "Rim Ø", value: measure(p.rimMm, units) },
          { label: "Max Ø", value: measure(maxOuter * 2, units) },
          { label: "Capacity", value: `${round(capacity / 1000, 2)} L` },
        ],
      ),
    };
  },
  build: (p) => {
    const outerAt = (u: number) =>
      p.baseMm / 2 + (p.rimMm / 2 - p.baseMm / 2) * u + p.bellyMm * Math.sin(Math.PI * u);
    const innerAt = (u: number) => Math.max(0.2, outerAt(u) - p.wallMm);
    const floorU = p.floorMm / p.heightMm;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: p.floorMm });
    builder.line({ x: innerAt(floorU), y: p.floorMm });
    for (let i = 1; i <= 56; i += 1) {
      const u = floorU + ((1 - floorU) * i) / 56;
      builder.point({ x: innerAt(u), y: u * p.heightMm });
    }
    builder.line({ x: outerAt(1), y: p.heightMm });
    for (let i = 55; i >= 0; i -= 1) {
      const u = i / 56;
      builder.point({ x: outerAt(u), y: u * p.heightMm });
    }
    builder.line({ x: 0, y: 0 });
    return revolve(builder.build(), (p.rimMm + 2 * p.bellyMm) / 2);
  },
  fileName: (p) => `vase-${round(p.heightMm, 0)}h-${round(p.rimMm, 0)}rim.stl`,
});

/* -------------------------------------------------------------------- cup */

export const cup: AnyDesign = defineDesign({
  id: "cup",
  name: "Tapered cup",
  family: "vessels",
  eyebrow: "Straight taper",
  blurb: "A straight-walled cup with a true floor and a measured capacity.",
  lede: "A simple truncated cone, hollowed with a constant wall and a flat floor. Because the taper is linear the capacity, rim wall and stack height are all closed-form numbers, and the readout reports the volume in millilitres.",
  chips: [
    { label: "Top Ø", value: "30 – 140 mm" },
    { label: "Height", value: "30 – 1000 mm" },
    { label: "Capacity", value: "ml" },
  ],
  notes: [
    "The outer wall is a straight line from the base radius to the rim radius; the inner wall is the same line offset inward by the wall. The floor closes the bottom at the entered thickness, so the cavity is a frustum minus that floor.",
    "Make a cup upright with a substantial wall. A 4 mm floor keeps the base flat; a 1.2 mm wall is enough for a mug that only holds cold drinks.",
  ],
  header: "Tapered Cup Designer - units: mm",
  fields: [
    { key: "topDiameter", label: "Top diameter", kind: "length", section: "Cup", default: "80", min: 30, max: 140 },
    { key: "bottomDiameter", label: "Base diameter", kind: "length", section: "Cup", default: "60", min: 20, max: 130 },
    { key: "height", label: "Height", kind: "length", section: "Cup", default: "90", min: 30, max: 1000 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Cup", default: "2.5", min: 1, max: 8 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Cup", default: "3", min: 1.5, max: 20 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "topDiameter"),
    bottomMm: rawLength(raw, "bottomDiameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "topDiameter", "Top diameter", p.topMm, 30, 140);
    pushRange(errors, units, "bottomDiameter", "Base diameter", p.bottomMm, 20, 130);
    pushRange(errors, units, "height", "Height", p.heightMm, 30, 1000);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 1.5, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerTop = p.topMm / 2;
    const outerBottom = p.bottomMm / 2;
    checkSize(errors, units, "topDiameter", p.topMm, p.heightMm);
    checkWall(errors, units, "wall", "wall at the base", outerBottom - p.wallMm);
    if (p.floorMm >= p.heightMm * 0.6) errors.push({ field: "floor", level: "error", message: "The floor leaves almost no cup." });
    if (outerTop < outerBottom + p.wallMm) pushWarning(warnings, "topDiameter", "The cup narrows towards the rim, which is hard to drink from.");

    const innerRadius = (u: number) =>
      Math.max(0, outerBottom + (outerTop - outerBottom) * u - p.wallMm);
    const capacity = capacityMl(
      (z) => innerRadius(z / p.heightMm),
      p.floorMm,
      p.heightMm,
    );

    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: measure(p.topMm, units), source: "input" },
        { label: "Base Ø", value: measure(p.bottomMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Capacity", value: `${round(capacity, 0)} ml`, source: "calc" },
        { label: "Rim wall", value: measure(p.wallMm, units), source: "input" },
        { label: "Floor", value: measure(p.floorMm, units), source: "input" },
      ],
      preview: previewOf(
        `${round(capacity, 0)} ml · ${measure(p.heightMm, units)} tall`,
        `CP${round(p.topMm, 0)}-${round(p.heightMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Top Ø", value: measure(p.topMm, units) },
          { label: "Capacity", value: `${round(capacity, 0)} ml` },
          { label: "Height", value: measure(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerTop = p.topMm / 2;
    const outerBottom = p.bottomMm / 2;
    const floorU = p.floorMm / p.heightMm;
    const innerAt = (u: number) =>
      Math.max(0.2, outerBottom + (outerTop - outerBottom) * u - p.wallMm);
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: p.floorMm });
    builder.line({ x: innerAt(floorU), y: p.floorMm });
    for (let i = 1; i <= 24; i += 1) {
      const u = floorU + ((1 - floorU) * i) / 24;
      builder.point({ x: innerAt(u), y: u * p.heightMm });
    }
    builder.line({ x: outerTop, y: p.heightMm });
    builder.line({ x: outerBottom, y: 0 });
    builder.line({ x: 0, y: 0 });
    return revolve(builder.build(), outerTop);
  },
  fileName: (p) => `cup-${round(p.topMm, 0)}d-${round(p.heightMm, 0)}h.stl`,
});

/* ------------------------------------------------------------------- bowl */

export const bowl: AnyDesign = defineDesign({
  id: "bowl",
  name: "Bowl",
  family: "vessels",
  eyebrow: "Curved wall",
  blurb: "A shallow bowl with a flat foot and a sine-curved wall.",
  lede: "The wall leaves a flat foot and curves out to the rim on a quarter sine, which is stable to make and comfortable to hold. The cavity follows the same curve inside, and the readout gives its capacity and the wall angle at the rim.",
  chips: [
    { label: "Rim Ø", value: "40 – 1000 mm" },
    { label: "Height", value: "20 – 100 mm" },
    { label: "Capacity", value: "ml" },
  ],
  notes: [
    "The outer radius is `foot/2 + (rim/2 − foot/2)·sin(πu/2)`, so it leaves the foot vertically and reaches the rim horizontally. The inner radius is one wall inside it, and the floor is flat across the foot.",
    "A bowl made upright needs a chamfer on the foot or a wide base, because the first stages carry the whole footprint. If the wall angle at the rim is under about 40° from vertical, forming it starts to need a fixture.",
  ],
  header: "Bowl Designer - units: mm",
  fields: [
    { key: "rimDiameter", label: "Rim diameter", kind: "length", section: "Bowl", default: "140", min: 40, max: 1000 },
    { key: "footDiameter", label: "Foot diameter", kind: "length", section: "Bowl", default: "50", min: 15, max: 120 },
    { key: "height", label: "Height", kind: "length", section: "Bowl", default: "60", min: 20, max: 100 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Bowl", default: "3", min: 1, max: 8 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Bowl", default: "4", min: 1.5, max: 20 },
  ],
  parse: (raw) => ({
    rimMm: rawLength(raw, "rimDiameter"),
    footMm: rawLength(raw, "footDiameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "rimDiameter", "Rim diameter", p.rimMm, 40, 1000);
    pushRange(errors, units, "footDiameter", "Foot diameter", p.footMm, 15, 120);
    pushRange(errors, units, "height", "Height", p.heightMm, 20, 100);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 1.5, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerAt = (u: number) =>
      p.footMm / 2 + (p.rimMm / 2 - p.footMm / 2) * Math.sin((Math.PI * u) / 2);
    checkSize(errors, units, "rimDiameter", p.rimMm, p.heightMm);
    checkWall(errors, units, "wall", "wall at the foot", p.footMm / 2 - p.wallMm);
    if (p.footMm >= p.rimMm) errors.push({ field: "footDiameter", level: "error", message: "The foot is wider than the rim." });
    if (p.floorMm >= p.heightMm * 0.7) errors.push({ field: "floor", level: "error", message: "The floor fills most of the bowl." });

    const capacity = capacityMl(
      (z) => Math.max(0, outerAt(z / p.heightMm) - p.wallMm),
      p.floorMm,
      p.heightMm,
    );
    const rimSlope =
      (Math.atan(
        ((p.rimMm - p.footMm) / 2) * (Math.PI / 2) / p.heightMm,
      ) *
        180) /
      Math.PI;
    if (rimSlope > 55) pushWarning(warnings, "height", "The rim overhangs steeply; slow down the outer wall.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Rim Ø", value: measure(p.rimMm, units), source: "input" },
        { label: "Foot Ø", value: measure(p.footMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Capacity", value: `${round(capacity, 0)} ml`, source: "calc" },
        { label: "Rim slope", value: `${round(rimSlope, 1)}°`, source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${round(capacity, 0)} ml · ${measure(p.rimMm, units)} rim`,
        `BW${round(p.rimMm, 0)}-${round(p.heightMm, 0)}`,
        p.rimMm,
        p.heightMm,
        [
          { label: "Rim Ø", value: measure(p.rimMm, units) },
          { label: "Capacity", value: `${round(capacity, 0)} ml` },
          { label: "Foot Ø", value: measure(p.footMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerAt = (u: number) =>
      p.footMm / 2 + (p.rimMm / 2 - p.footMm / 2) * Math.sin((Math.PI * u) / 2);
    const innerAt = (u: number) => Math.max(0.2, outerAt(u) - p.wallMm);
    const floorU = p.floorMm / p.heightMm;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: p.floorMm });
    builder.line({ x: innerAt(floorU), y: p.floorMm });
    for (let i = 1; i <= 40; i += 1) {
      const u = floorU + ((1 - floorU) * i) / 40;
      builder.point({ x: innerAt(u), y: u * p.heightMm });
    }
    builder.line({ x: outerAt(1), y: p.heightMm });
    for (let i = 40; i >= 0; i -= 1) {
      const u = i / 40;
      builder.point({ x: outerAt(u), y: u * p.heightMm });
    }
    builder.line({ x: 0, y: 0 });
    return revolve(builder.build(), p.rimMm / 2);
  },
  fileName: (p) => `bowl-${round(p.rimMm, 0)}rim-${round(p.heightMm, 0)}h.stl`,
});

/* ----------------------------------------------------------------- bottle */

export const bottle: AnyDesign = defineDesign({
  id: "bottle",
  name: "Bottle",
  family: "vessels",
  eyebrow: "Body, shoulder, neck",
  blurb: "A hollow bottle with a smooth shoulder and a straight neck.",
  lede: "The body is a cylinder, the shoulder blends from body to neck on a smoothstep, and the neck runs straight to the rim. Everything is hollow with a real wall and floor, and the capacity is integrated from the inner profile.",
  chips: [
    { label: "Height", value: "60 – 1000 mm" },
    { label: "Body Ø", value: "20 – 140 mm" },
    { label: "Neck Ø", value: "8 – 60 mm" },
  ],
  notes: [
    "The shoulder uses a smoothstep rather than a radius, so it leaves the body and enters the neck with zero slope. That is what keeps the wall from creasing at the two transitions and lets a spiral make run continuously through them.",
    "A bottle is not pressure-tight unless it has a substantial wall and a solid floor. For a screw cap, model the thread separately — this body has a plain neck sized for a push-fit stopper.",
  ],
  header: "Bottle Designer - units: mm",
  fields: [
    { key: "bodyDiameter", label: "Body diameter", kind: "length", section: "Bottle", default: "70", min: 20, max: 140 },
    { key: "neckDiameter", label: "Neck diameter", kind: "length", section: "Neck", default: "24", min: 8, max: 60 },
    { key: "height", label: "Overall height", kind: "length", section: "Bottle", default: "170", min: 60, max: 1000 },
    { key: "neckHeight", label: "Neck height", kind: "length", section: "Neck", default: "30", min: 8, max: 80 },
    { key: "shoulderHeight", label: "Shoulder height", kind: "length", section: "Bottle", default: "35", min: 8, max: 80 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Bottle", default: "2.2", min: 1, max: 8 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Bottle", default: "4", min: 1.5, max: 20 },
  ],
  parse: (raw) => ({
    bodyMm: rawLength(raw, "bodyDiameter"),
    neckMm: rawLength(raw, "neckDiameter"),
    heightMm: rawLength(raw, "height"),
    neckHeightMm: rawLength(raw, "neckHeight"),
    shoulderMm: rawLength(raw, "shoulderHeight"),
    wallMm: rawLength(raw, "wall"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "bodyDiameter", "Body diameter", p.bodyMm, 20, 140);
    pushRange(errors, units, "neckDiameter", "Neck diameter", p.neckMm, 8, 60);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 60, 1000);
    pushRange(errors, units, "neckHeight", "Neck height", p.neckHeightMm, 8, 80);
    pushRange(errors, units, "shoulderHeight", "Shoulder height", p.shoulderMm, 8, 80);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 1.5, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "bodyDiameter", p.bodyMm, p.heightMm);
    checkWall(errors, units, "neckDiameter", "neck wall", p.neckMm / 2 - p.wallMm);
    if (p.bodyMm <= p.neckMm) errors.push({ field: "bodyDiameter", level: "error", message: "The body is no wider than the neck." });
    if (p.heightMm <= p.neckHeightMm + p.shoulderMm + p.floorMm + 4) {
      errors.push({ field: "height", level: "error", message: "There is no body left below the shoulder and floor." });
    }

    const bodyEnd = p.heightMm - p.neckHeightMm - p.shoulderMm;
    const outerAt = (z: number) => {
      const bodyR = p.bodyMm / 2;
      const neckR = p.neckMm / 2;
      if (z <= bodyEnd) return bodyR;
      if (z <= bodyEnd + p.shoulderMm) {
        const u = (z - bodyEnd) / p.shoulderMm;
        const smooth = u * u * (3 - 2 * u);
        return bodyR + (neckR - bodyR) * smooth;
      }
      return neckR;
    };
    const capacity = capacityMl(
      (z) => Math.max(0, outerAt(z) - p.wallMm),
      p.floorMm,
      p.heightMm,
    );
    if (p.wallMm < 2) pushWarning(warnings, "wall", "Under 2 mm the body flexes and may leak at the shoulder.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Body Ø", value: measure(p.bodyMm, units), source: "input" },
        { label: "Neck Ø", value: measure(p.neckMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Capacity", value: `${round(capacity / 1000, 2)} L`, source: "calc" },
        { label: "Neck length", value: measure(p.neckHeightMm, units), source: "input" },
        { label: "Shoulder", value: measure(p.shoulderMm, units), source: "input" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${round(capacity / 1000, 2)} L · ${measure(p.heightMm, units)} tall`,
        `BT${round(p.bodyMm, 0)}-${round(p.heightMm, 0)}`,
        p.bodyMm,
        p.heightMm,
        [
          { label: "Body Ø", value: measure(p.bodyMm, units) },
          { label: "Neck Ø", value: measure(p.neckMm, units) },
          { label: "Capacity", value: `${round(capacity / 1000, 2)} L` },
        ],
      ),
    };
  },
  build: (p) => {
    const bodyR = p.bodyMm / 2;
    const neckR = p.neckMm / 2;
    const bodyEnd = p.heightMm - p.neckHeightMm - p.shoulderMm;
    const outerAt = (z: number) => {
      if (z <= bodyEnd) return bodyR;
      if (z <= bodyEnd + p.shoulderMm) {
        const u = (z - bodyEnd) / p.shoulderMm;
        return bodyR + (neckR - bodyR) * (u * u * (3 - 2 * u));
      }
      return neckR;
    };
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: p.floorMm });
    builder.line({ x: Math.max(0.2, outerAt(p.floorMm) - p.wallMm), y: p.floorMm });
    for (let i = 1; i <= 72; i += 1) {
      const z = p.floorMm + ((p.heightMm - p.floorMm) * i) / 72;
      builder.point({ x: Math.max(0.2, outerAt(z) - p.wallMm), y: z });
    }
    builder.line({ x: neckR, y: p.heightMm });
    for (let i = 72; i >= 0; i -= 1) {
      const z = (p.heightMm * i) / 72;
      builder.point({ x: outerAt(z), y: z });
    }
    builder.line({ x: 0, y: 0 });
    return revolve(builder.build(), bodyR);
  },
  fileName: (p) => `bottle-${round(p.bodyMm, 0)}d-${round(p.heightMm, 0)}h.stl`,
});

/* ------------------------------------------------------------------- bell */

export const bell: AnyDesign = defineDesign({
  id: "bell",
  name: "Bell",
  family: "vessels",
  eyebrow: "Flared shell",
  blurb: "A flared bell with a solid crown and a hollow skirt.",
  lede: "The outer wall follows a squared flare from a narrow crown down to a wide lip; the inside is one wall inboard with a solid crown above it. Set the lip and crown diameters and the flare is defined without any freehand curve.",
  chips: [
    { label: "Lip Ø", value: "30 – 1000 mm" },
    { label: "Height", value: "20 – 120 mm" },
    { label: "Crown", value: "8 – 80 mm" },
  ],
  notes: [
    "The radius is `crown/2 + (lip/2 − crown/2)(1 − u)²`, so the flare is steep at the lip and flat at the crown. The inner surface is offset by the wall and stops at the crown thickness, leaving a solid disc over the cavity.",
    "A bell rings because its wall is thin and its lip is free. Make it with the lip down and a wide base; anything left inside the cavity will change the tone and are hard to remove.",
  ],
  header: "Bell Designer - units: mm",
  fields: [
    { key: "lipDiameter", label: "Lip diameter", kind: "length", section: "Bell", default: "90", min: 30, max: 1000 },
    { key: "crownDiameter", label: "Crown diameter", kind: "length", section: "Bell", default: "30", min: 8, max: 80 },
    { key: "height", label: "Height", kind: "length", section: "Bell", default: "80", min: 20, max: 120 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Bell", default: "3", min: 1, max: 8 },
    { key: "crownThickness", label: "Crown thickness", kind: "length", section: "Bell", default: "6", min: 2, max: 20 },
  ],
  parse: (raw) => ({
    lipMm: rawLength(raw, "lipDiameter"),
    crownMm: rawLength(raw, "crownDiameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    crownThicknessMm: rawLength(raw, "crownThickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "lipDiameter", "Lip diameter", p.lipMm, 30, 1000);
    pushRange(errors, units, "crownDiameter", "Crown diameter", p.crownMm, 8, 80);
    pushRange(errors, units, "height", "Height", p.heightMm, 20, 120);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    pushRange(errors, units, "crownThickness", "Crown thickness", p.crownThicknessMm, 2, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "lipDiameter", p.lipMm, p.heightMm);
    checkWall(errors, units, "wall", "wall at the crown", p.crownMm / 2 - p.wallMm);
    if (p.crownThicknessMm >= p.heightMm * 0.8) errors.push({ field: "crownThickness", level: "error", message: "The crown fills the bell." });
    if (p.lipMm <= p.crownMm) errors.push({ field: "lipDiameter", level: "error", message: "The lip is not wider than the crown." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Lip Ø", value: measure(p.lipMm, units), source: "input" },
        { label: "Crown Ø", value: measure(p.crownMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Flare", value: measure((p.lipMm - p.crownMm) / 2, units), source: "calc" },
        { label: "Cavity depth", value: measure(p.heightMm - p.crownThicknessMm, units), source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.lipMm, units)} lip · ${measure(p.heightMm, units)} tall`,
        `BL${round(p.lipMm, 0)}-${round(p.heightMm, 0)}`,
        p.lipMm,
        p.heightMm,
        [
          { label: "Lip Ø", value: measure(p.lipMm, units) },
          { label: "Crown Ø", value: measure(p.crownMm, units) },
          { label: "Height", value: measure(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const lipR = p.lipMm / 2;
    const crownR = p.crownMm / 2;
    const outerAt = (u: number) => crownR + (lipR - crownR) * (1 - u) ** 2;
    const ceiling = p.heightMm - p.crownThicknessMm;
    const ceilingU = ceiling / p.heightMm;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: p.heightMm });
    builder.line({ x: crownR, y: p.heightMm });
    for (let i = 1; i <= 48; i += 1) {
      const u = 1 - i / 48;
      builder.point({ x: outerAt(u), y: u * p.heightMm });
    }
    builder.line({ x: outerAt(0) - p.wallMm, y: 0 });
    for (let i = 1; i <= 40; i += 1) {
      const u = (ceilingU * i) / 40;
      builder.point({ x: Math.max(0.2, outerAt(u) - p.wallMm), y: u * p.heightMm });
    }
    builder.line({ x: 0, y: ceiling });
    return revolve(builder.build(), lipR);
  },
  fileName: (p) => `bell-${round(p.lipMm, 0)}lip.stl`,
});

/* ------------------------------------------------------------- lamp shade */

export const lampShade: AnyDesign = defineDesign({
  id: "lamp-shade",
  name: "Lamp shade",
  family: "vessels",
  eyebrow: "Cone shell",
  blurb: "A truncated-cone shade with a real wall and open ends.",
  lede: "A straight cone shell, open at both ends, with the wall thickness measured radially. Set the two diameters and the height and the shade's slope, wall and surface area are fixed; the mesh is a true conical tube.",
  chips: [
    { label: "Bottom Ø", value: "40 – 1000 mm" },
    { label: "Top Ø", value: "20 – 160 mm" },
    { label: "Height", value: "30 – 160 mm" },
  ],
  notes: [
    "The profile is a closed quadrilateral in the radius–height plane: up the outside, across the top rim, down the inside and across the bottom rim. Revolving it gives a tube with two open ends, so the shell has no cap to trap heat.",
    "Keep at least 25 mm between a shade and the bulb. a rigid material softens around 60 °C, so use a tough material or a low-power LED, and never put a shade on a halogen lamp.",
  ],
  header: "Lamp Shade Designer - units: mm",
  fields: [
    { key: "bottomDiameter", label: "Bottom diameter", kind: "length", section: "Shade", default: "160", min: 40, max: 1000 },
    { key: "topDiameter", label: "Top diameter", kind: "length", section: "Shade", default: "60", min: 20, max: 160 },
    { key: "height", label: "Height", kind: "length", section: "Shade", default: "120", min: 30, max: 160 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Shade", default: "2", min: 1, max: 8 },
  ],
  parse: (raw) => ({
    bottomMm: rawLength(raw, "bottomDiameter"),
    topMm: rawLength(raw, "topDiameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "bottomDiameter", "Bottom diameter", p.bottomMm, 40, 1000);
    pushRange(errors, units, "topDiameter", "Top diameter", p.topMm, 20, 160);
    pushRange(errors, units, "height", "Height", p.heightMm, 30, 160);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const bottom = p.bottomMm / 2;
    const top = p.topMm / 2;
    checkSize(errors, units, "bottomDiameter", p.bottomMm, p.heightMm);
    if (top <= p.wallMm || bottom <= p.wallMm) errors.push({ field: "wall", level: "error", message: "The wall is thicker than the radii." });
    if (p.bottomMm <= p.topMm) pushWarning(warnings, "topDiameter", "The shade widens towards the top, which is unusual for a lamp.");

    const slant = Math.hypot(p.heightMm, Math.abs(bottom - top));
    const area = Math.PI * (bottom + top) * slant;

    return {
      errors,
      warnings,
      readout: [
        { label: "Bottom Ø", value: measure(p.bottomMm, units), source: "input" },
        { label: "Top Ø", value: measure(p.topMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
        { label: "Slant", value: measure(slant, units), source: "calc" },
        { label: "Slope", value: `${round((Math.atan2(Math.abs(bottom - top), p.heightMm) * 180) / Math.PI, 1)}°`, source: "calc" },
        { label: "Surface", value: `${round(area / 100, 0)} cm²`, source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.bottomMm, units)} → ${measure(p.topMm, units)}`,
        `LS${round(p.bottomMm, 0)}-${round(p.topMm, 0)}`,
        p.bottomMm,
        p.heightMm,
        [
          { label: "Bottom Ø", value: measure(p.bottomMm, units) },
          { label: "Top Ø", value: measure(p.topMm, units) },
          { label: "Height", value: measure(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const bottom = p.bottomMm / 2;
    const top = p.topMm / 2;
    const profile: Point2D[] = [
      { x: bottom - p.wallMm, y: 0 },
      { x: bottom, y: 0 },
      { x: top, y: p.heightMm },
      { x: top - p.wallMm, y: p.heightMm },
    ];
    return revolve(profile, bottom);
  },
  fileName: (p) => `lamp-shade-${round(p.bottomMm, 0)}-${round(p.topMm, 0)}.stl`,
});

/* --------------------------------------------------------- parabolic dish */

export const parabolicDish: AnyDesign = defineDesign({
  id: "parabolic-dish",
  name: "Parabolic dish",
  family: "vessels",
  eyebrow: "Focus",
  blurb: "A true paraboloid shell with its focal length reported.",
  lede: "A real paraboloid, generated from z = r²/4f rather than from a circular arc. Set the rim diameter and the focal length and the depth, f/D ratio and focal point follow exactly — useful for a reflector, a lamp or a sound dish.",
  chips: [
    { label: "Rim Ø", value: "40 – 1000 mm" },
    { label: "Focal length", value: "10 – 160 mm" },
    { label: "Wall", value: "1 – 8 mm" },
  ],
  notes: [
    "The surface is sampled from `z = r²/(4f)`, so its focus sits exactly f above the vertex. The inner surface is the same paraboloid offset down by the wall, and the rim face closes the shell between them.",
    "Make the dish face-up with the convex side down if you want the reflective surface clean; the fixture marks then stay on the back. A dish is never optically smooth — it is a light or sound collector, not a telescope mirror.",
  ],
  header: "Parabolic Dish Designer - units: mm",
  fields: [
    { key: "diameter", label: "Rim diameter", kind: "length", section: "Dish", default: "120", min: 40, max: 1000 },
    { key: "focalLength", label: "Focal length", kind: "length", section: "Dish", default: "60", min: 10, max: 160 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Dish", default: "3", min: 1, max: 8 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    focalMm: rawLength(raw, "focalLength"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Rim diameter", p.diameterMm, 40, 1000);
    pushRange(errors, units, "focalLength", "Focal length", p.focalMm, 10, 160);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const radius = p.diameterMm / 2;
    const depth = (radius * radius) / (4 * p.focalMm);
    checkSize(errors, units, "diameter", p.diameterMm, depth);
    if (depth < p.wallMm) errors.push({ field: "focalLength", level: "error", message: "The dish is shallower than its wall — shorten the focal length or use a thinner wall." });
    if (depth > p.diameterMm) pushWarning(warnings, "focalLength", "A very deep dish is hard to make without a fixture.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Rim Ø", value: measure(p.diameterMm, units), source: "input" },
        { label: "Focal length", value: measure(p.focalMm, units), source: "input" },
        { label: "Depth", value: measure(depth, units), source: "calc" },
        { label: "f / D", value: round(p.focalMm / p.diameterMm, 3), source: "calc" },
        { label: "Focal point", value: measure(p.focalMm - depth, units), source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `f/${round(p.focalMm / p.diameterMm, 2)} · ${measure(depth, units)} deep`,
        `PD${round(p.diameterMm, 0)}-${round(p.focalMm, 0)}`,
        p.diameterMm,
        depth,
        [
          { label: "Rim Ø", value: measure(p.diameterMm, units) },
          { label: "Depth", value: measure(depth, units) },
          { label: "Focal", value: measure(p.focalMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const depth = (radius * radius) / (4 * p.focalMm);
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    for (let i = 1; i <= 64; i += 1) {
      const r = (radius * i) / 64;
      builder.point({ x: r, y: (r * r) / (4 * p.focalMm) });
    }
    builder.line({ x: radius, y: depth - p.wallMm });
    for (let i = 63; i >= 0; i -= 1) {
      const r = (radius * i) / 64;
      builder.point({ x: r, y: (r * r) / (4 * p.focalMm) - p.wallMm });
    }
    return revolve(builder.build(), radius);
  },
  fileName: (p) => `parabolic-dish-${round(p.diameterMm, 0)}d-f${round(p.focalMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ spool */

export const spool: AnyDesign = defineDesign({
  id: "spool",
  name: "Cable spool",
  family: "vessels",
  eyebrow: "Flanges and barrel",
  blurb: "A reusable wire or cable spool with a wide barrel and two retaining flanges.",
  lede: "Two flanges and a narrow barrel with a through bore. Set the barrel and flange diameters, the overall width and the flange thickness, and the winding width follows — the spool is a single revolved shell.",
  chips: [
    { label: "Barrel Ø", value: "20 – 140 mm" },
    { label: "Flange Ø", value: "40 – 1000 mm" },
    { label: "Width", value: "10 – 100 mm" },
  ],
  notes: [
    "The cross-section is a rotated C: along the bore, out across the flange, in to the barrel, along the barrel, out to the second flange and back to the bore. Revolving it gives one closed shell with a continuous bore, so no separate hub is needed.",
    "Keep the barrel at least 25 mm wider than the bore for a stiff core, and make the flanges thick enough that they do not dish when the material pulls tight. A 5 mm flange is a good starting point.",
  ],
  header: "Cable Spool Designer - units: mm",
  fields: [
    { key: "flangeDiameter", label: "Flange diameter", kind: "length", section: "Spool", default: "70", min: 40, max: 1000 },
    { key: "barrelDiameter", label: "Barrel diameter", kind: "length", section: "Spool", default: "40", min: 20, max: 140 },
    { key: "width", label: "Overall width", kind: "length", section: "Spool", default: "50", min: 10, max: 100 },
    { key: "flangeThickness", label: "Flange thickness", kind: "length", section: "Spool", default: "5", min: 2, max: 20 },
    { key: "bore", label: "Bore", kind: "length", section: "Spool", default: "10", min: 2, max: 40 },
  ],
  parse: (raw) => ({
    flangeMm: rawLength(raw, "flangeDiameter"),
    barrelMm: rawLength(raw, "barrelDiameter"),
    widthMm: rawLength(raw, "width"),
    flangeThicknessMm: rawLength(raw, "flangeThickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "flangeDiameter", "Flange diameter", p.flangeMm, 40, 1000);
    pushRange(errors, units, "barrelDiameter", "Barrel diameter", p.barrelMm, 20, 140);
    pushRange(errors, units, "width", "Overall width", p.widthMm, 10, 100);
    pushRange(errors, units, "flangeThickness", "Flange thickness", p.flangeThicknessMm, 2, 20);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const barrelR = p.barrelMm / 2;
    const boreR = p.boreMm / 2;
    checkSize(errors, units, "flangeDiameter", p.flangeMm, p.widthMm);
    checkWall(errors, units, "bore", "core around the bore", barrelR - boreR);
    if (p.flangeMm <= p.barrelMm + 2) errors.push({ field: "flangeDiameter", level: "error", message: "The flanges are not wider than the barrel." });
    if (p.flangeThicknessMm * 2 >= p.widthMm) errors.push({ field: "flangeThickness", level: "error", message: "The two flanges meet in the middle." });
    if (p.barrelMm < p.flangeMm * 0.4) pushWarning(warnings, "barrelDiameter", "A small barrel makes a deep, tippy spool.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Flange Ø", value: measure(p.flangeMm, units), source: "input" },
        { label: "Barrel Ø", value: measure(p.barrelMm, units), source: "input" },
        { label: "Overall width", value: measure(p.widthMm, units), source: "input" },
        { label: "Winding width", value: measure(p.widthMm - 2 * p.flangeThicknessMm, units), source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Flange", value: measure(p.flangeThicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.widthMm, units)} wide · ${measure(p.flangeMm, units)} flange`,
        `SP${round(p.flangeMm, 0)}-${round(p.widthMm, 0)}`,
        p.flangeMm,
        p.widthMm,
        [
          { label: "Flange Ø", value: measure(p.flangeMm, units) },
          { label: "Barrel Ø", value: measure(p.barrelMm, units) },
          { label: "Width", value: measure(p.widthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const flangeR = p.flangeMm / 2;
    const barrelR = p.barrelMm / 2;
    const boreR = p.boreMm / 2;
    const t = p.flangeThicknessMm;
    const w = p.widthMm;
    const profile: Point2D[] = [
      { x: boreR, y: 0 },
      { x: flangeR, y: 0 },
      { x: flangeR, y: t },
      { x: barrelR, y: t },
      { x: barrelR, y: w - t },
      { x: flangeR, y: w - t },
      { x: flangeR, y: w },
      { x: boreR, y: w },
    ];
    return revolve(profile, flangeR);
  },
  fileName: (p) => `spool-${round(p.flangeMm, 0)}-${round(p.widthMm, 0)}w.stl`,
});

/* ------------------------------------------------------ flanged bushing */

export const flangedBushing: AnyDesign = defineDesign({
  id: "flanged-bushing",
  name: "Flanged bushing",
  family: "vessels",
  eyebrow: "Sleeve and collar",
  blurb: "A plain bearing sleeve with a locating flange.",
  lede: "A cylindrical sleeve with a collar at one end. The flange sets the axial position and spreads the load, while the sleeve takes the shaft; both diameters, the bore and the lengths are independent.",
  chips: [
    { label: "Sleeve Ø", value: "6 – 120 mm" },
    { label: "Flange Ø", value: "10 – 1000 mm" },
    { label: "Bore", value: "2 – 100 mm" },
  ],
  notes: [
    "The cross-section runs from the bore out across the flange, down the sleeve outside and back across the far end, so the bore is one continuous cylinder from face to face. That makes the bushing a single shell with no joint at the flange.",
    "A bushing is a wear part, not a bearing. Give it 0.2–0.3 mm of running clearance and a drop of grease; if it runs hot, the shaft needs a real bronze bush instead.",
  ],
  header: "Flanged Bushing Designer - units: mm",
  fields: [
    { key: "flangeDiameter", label: "Flange diameter", kind: "length", section: "Bushing", default: "30", min: 10, max: 1000 },
    { key: "flangeThickness", label: "Flange thickness", kind: "length", section: "Bushing", default: "4", min: 1.5, max: 20 },
    { key: "sleeveDiameter", label: "Sleeve diameter", kind: "length", section: "Bushing", default: "18", min: 6, max: 120 },
    { key: "length", label: "Overall length", kind: "length", section: "Bushing", default: "25", min: 5, max: 120 },
    { key: "bore", label: "Bore", kind: "length", section: "Bushing", default: "12", min: 2, max: 100 },
  ],
  parse: (raw) => ({
    flangeMm: rawLength(raw, "flangeDiameter"),
    flangeThicknessMm: rawLength(raw, "flangeThickness"),
    sleeveMm: rawLength(raw, "sleeveDiameter"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "flangeDiameter", "Flange diameter", p.flangeMm, 10, 1000);
    pushRange(errors, units, "flangeThickness", "Flange thickness", p.flangeThicknessMm, 1.5, 20);
    pushRange(errors, units, "sleeveDiameter", "Sleeve diameter", p.sleeveMm, 6, 120);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 5, 120);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 100);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const flangeR = p.flangeMm / 2;
    const sleeveR = p.sleeveMm / 2;
    checkSize(errors, units, "flangeDiameter", p.flangeMm, p.lengthMm);
    checkWall(errors, units, "bore", "sleeve wall", sleeveR - p.boreMm / 2);
    if (flangeR <= sleeveR) errors.push({ field: "flangeDiameter", level: "error", message: "The flange is not wider than the sleeve." });
    if (p.flangeThicknessMm >= p.lengthMm) errors.push({ field: "flangeThickness", level: "error", message: "The flange is thicker than the bushing." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Flange Ø", value: measure(p.flangeMm, units), source: "input" },
        { label: "Sleeve Ø", value: measure(p.sleeveMm, units), source: "input" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Sleeve wall", value: measure((p.sleeveMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Length", value: measure(p.lengthMm, units), source: "input" },
        { label: "Flange", value: measure(p.flangeThicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.sleeveMm, units)} × ${measure(p.lengthMm, units)} sleeve`,
        `FB${round(p.sleeveMm, 0)}-${round(p.boreMm, 0)}`,
        p.flangeMm,
        p.lengthMm,
        [
          { label: "Flange Ø", value: measure(p.flangeMm, units) },
          { label: "Bore", value: measure(p.boreMm, units) },
          { label: "Length", value: measure(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const flangeR = p.flangeMm / 2;
    const sleeveR = p.sleeveMm / 2;
    const boreR = p.boreMm / 2;
    const profile: Point2D[] = [
      { x: boreR, y: 0 },
      { x: flangeR, y: 0 },
      { x: flangeR, y: p.flangeThicknessMm },
      { x: sleeveR, y: p.flangeThicknessMm },
      { x: sleeveR, y: p.lengthMm },
      { x: boreR, y: p.lengthMm },
    ];
    return revolve(profile, flangeR);
  },
  fileName: (p) => `flanged-bushing-${round(p.sleeveMm, 0)}-${round(p.boreMm, 0)}b.stl`,
});

/* ----------------------------------------------------------------- gasket */

export const gasket: AnyDesign = defineDesign({
  id: "gasket",
  name: "Gasket ring",
  family: "vessels",
  eyebrow: "Flat seal",
  blurb: "A rectangular-section sealing ring with exact diameters.",
  lede: "A flat annulus for a face seal, sized by its outer and inner diameters and its compressed thickness. Both circles are generated at the entered size, so the seal lands on the flange face instead of being approximated.",
  chips: [
    { label: "Outer Ø", value: "10 – 1000 mm" },
    { label: "Inner Ø", value: "5 – 160 mm" },
    { label: "Thickness", value: "0.5 – 10 mm" },
  ],
  notes: [
    "The cross-section is a rectangle, so the seal has parallel faces and a constant radial width. That is the right shape for a confined gasket: it compresses in thickness rather than extruding sideways.",
    "Make a gasket in a soft material (a flexible material if you have it) at solid. For a water seal, give it a thin coat of grease and compress it by about 20 % of its free thickness.",
  ],
  header: "Gasket Ring Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outer diameter", kind: "length", section: "Gasket", default: "40", min: 10, max: 1000 },
    { key: "innerDiameter", label: "Inner diameter", kind: "length", section: "Gasket", default: "30", min: 5, max: 160 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Gasket", default: "2", min: 0.5, max: 10 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    innerMm: rawLength(raw, "innerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outer diameter", p.outerMm, 10, 1000);
    pushRange(errors, units, "innerDiameter", "Inner diameter", p.innerMm, 5, 160);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 0.5, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    checkWall(errors, units, "innerDiameter", "seal width", (p.outerMm - p.innerMm) / 2);
    if (p.thicknessMm > (p.outerMm - p.innerMm) / 2) pushWarning(warnings, "thickness", "The gasket is thicker than it is wide; it will buckle.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Outer Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Inner Ø", value: measure(p.innerMm, units), source: "input" },
        { label: "Seal width", value: measure((p.outerMm - p.innerMm) / 2, units), source: "calc" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
        { label: "Seal area", value: `${round((Math.PI / 4) * (p.outerMm ** 2 - p.innerMm ** 2) / 100, 2)} cm²`, source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.outerMm, units)} × ${measure(p.innerMm, units)}`,
        `GK${round(p.outerMm, 0)}-${round(p.innerMm, 1)}`,
        p.outerMm,
        p.thicknessMm,
        [
          { label: "Outer Ø", value: measure(p.outerMm, units) },
          { label: "Inner Ø", value: measure(p.innerMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const profile: Point2D[] = [
      { x: p.innerMm / 2, y: 0 },
      { x: p.outerMm / 2, y: 0 },
      { x: p.outerMm / 2, y: p.thicknessMm },
      { x: p.innerMm / 2, y: p.thicknessMm },
    ];
    return revolve(profile, p.outerMm / 2);
  },
  fileName: (p) => `gasket-${round(p.outerMm, 1)}-${round(p.innerMm, 1)}.stl`,
});

export const revolveVessels: AnyDesign[] = [
  funnel,
  vase,
  cup,
  bowl,
  bottle,
  bell,
  lampShade,
  parabolicDish,
  spool,
  flangedBushing,
  gasket,
];
