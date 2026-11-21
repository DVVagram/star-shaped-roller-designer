/** Turned batch 1: knobs, barbs and fittings made as closed profiles of revolution. */

import { segmentsForRadius } from "@/lib/kit/outlines";
import { buildRevolution } from "@/lib/kit/revolve";
import type { LengthUnit, Point2D } from "@/lib/kit/units";

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

function spin(profile: Point2D[], maxRadius: number) {
  return buildRevolution({
    profile,
    segments: Math.min(256, Math.max(48, segmentsForRadius(maxRadius))),
  });
}

/* ---------------------------------------------------------------- thumb screw */

export const thumbScrew: AnyDesign = defineDesign({
  id: "thumb-screw",
  name: "Thumb screw",
  family: "fixings",
  eyebrow: "Finger drive",
  blurb: "A round-headed screw with a real shank for tool-free clamping.",
  lede: "A thumb screw turned from one closed profile: a straight shank, a flat seating face and a round head with a chamfer that is easy on the fingers. The head diameter and shank diameter are independent, so the grip and the hole can be sized separately.",
  use: "Clamping a cover, a jig plate or a camera arm by hand without reaching for a driver.",
  notesTitle: "How the head meets the shank",
  chips: [
    { label: "Shank", value: "4 – 20 mm" },
    { label: "Length", value: "10 – 100 mm" },
    { label: "Head", value: "12 – 50 mm" },
  ],
  notes: [
    "The profile runs down the shank, out across the head's underside and over a chamfered rim, so the seating face is a real flat annulus rather than a fillet. The chamfer is limited to half the head height so the rim cannot close on itself.",
    "Print it with the shank vertical and the head at the top; the underside then needs no support. A printed thread will not hold a real load, so size the shank as a clearance fit and use a metal insert or a nut on the far side.",
  ],
  header: "Thumb Screw Designer - units: mm",
  fields: [
    { key: "shank", label: "Shank diameter", kind: "length", section: "Screw", default: "8", min: 4, max: 20 },
    { key: "length", label: "Shank length", kind: "length", section: "Screw", default: "40", min: 10, max: 100 },
    { key: "head", label: "Head diameter", kind: "length", section: "Head", default: "24", min: 12, max: 50 },
    { key: "headHeight", label: "Head height", kind: "length", section: "Head", default: "10", min: 5, max: 20 },
    { key: "chamfer", label: "Head chamfer", kind: "length", section: "Head", default: "1", min: 0.5, max: 3 },
  ],
  parse: (raw) => ({
    shankMm: rawLength(raw, "shank"),
    lengthMm: rawLength(raw, "length"),
    headMm: rawLength(raw, "head"),
    headHeightMm: rawLength(raw, "headHeight"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "shank", "Shank diameter", p.shankMm, 4, 20);
    pushRange(errors, units, "length", "Shank length", p.lengthMm, 10, 100);
    pushRange(errors, units, "head", "Head diameter", p.headMm, 12, 50);
    pushRange(errors, units, "headHeight", "Head height", p.headHeightMm, 5, 20);
    pushRange(errors, units, "chamfer", "Head chamfer", p.chamferMm, 0.5, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    const total = p.lengthMm + p.headHeightMm;
    checkSize(errors, units, "head", p.headMm, total);

    if (p.headMm < p.shankMm + 4) errors.push({ field: "head", level: "error", message: "The head is not wider than the shank; there is no seating face." });
    if (p.chamferMm > p.headHeightMm / 2) errors.push({ field: "chamfer", level: "error", message: "The head chamfer is taller than half the head." });
    if (p.headMm < 18) warnings.push({ field: "head", level: "warning", message: "A head under 18 mm is hard to grip with cold fingers." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Shank", value: U(p.shankMm, units), source: "input" },
        { label: "Shank length", value: U(p.lengthMm, units), source: "input" },
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Head height", value: U(p.headHeightMm, units), source: "input" },
        { label: "Overall", value: U(total, units), source: "calc" },
        { label: "Seating face", value: U((p.headMm - p.shankMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.headMm, units)} head · ${U(total, units)} long`,
        `TS${R(p.headMm, 0)}-${R(total, 0)}`,
        p.headMm,
        total,
        [
          { label: "Head", value: U(p.headMm, units) },
          { label: "Shank", value: U(p.shankMm, units) },
          { label: "Overall", value: U(total, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const shankR = p.shankMm / 2;
    const headR = p.headMm / 2;
    const c = p.chamferMm;
    const top = p.lengthMm + p.headHeightMm;
    return spin(
      [
        { x: 0, y: 0 },
        { x: shankR, y: 0 },
        { x: shankR, y: p.lengthMm },
        { x: headR, y: p.lengthMm },
        { x: headR, y: top - c },
        { x: headR - c, y: top },
        { x: 0, y: top },
      ],
      headR,
    );
  },
  fileName: (p) => `thumb-screw-${R(p.headMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ thumb nut */

export const thumbNut: AnyDesign = defineDesign({
  id: "thumb-nut",
  name: "Thumb nut",
  family: "fixings",
  eyebrow: "Hand nut",
  blurb: "A chamfered round nut that is turned by hand on a clamp rod.",
  lede: "A round thumb nut with a straight bore and chamfered rims, sized so the outside can be gripped between finger and thumb. The wall between the bore and the outside is checked, because a printed nut fails there before the thread does.",
  use: "Tightening a clamp, a camera mount or a jig by hand where a spanner will not fit.",
  notesTitle: "How the wall is checked",
  chips: [
    { label: "Outside Ø", value: "10 – 60 mm" },
    { label: "Bore", value: "4 – 20 mm" },
    { label: "Height", value: "8 – 40 mm" },
  ],
  notes: [
    "The bore is a straight through-hole, so the nut can be tapped, glued onto a threaded insert, or used as a plain spacer. Both rims are chamfered to remove the sharp edge that otherwise cuts into a hand.",
    "Print the nut with the bore vertical and four perimeters. If it has to carry a real thread, tap it after printing or melt a metal nut into a hex pocket; a printed thread in PLA strips at very low torque.",
  ],
  header: "Thumb Nut Designer - units: mm",
  fields: [
    { key: "outer", label: "Outside diameter", kind: "length", section: "Nut", default: "24", min: 10, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "8", min: 4, max: 20 },
    { key: "height", label: "Height", kind: "length", section: "Nut", default: "14", min: 8, max: 40 },
    { key: "chamfer", label: "Rim chamfer", kind: "length", section: "Nut", default: "0.6", min: 0, max: 2 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outer"),
    boreMm: rawLength(raw, "bore"),
    heightMm: rawLength(raw, "height"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outer", "Outside diameter", p.outerMm, 10, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 20);
    pushRange(errors, units, "height", "Height", p.heightMm, 8, 40);
    pushRange(errors, units, "chamfer", "Rim chamfer", p.chamferMm, 0, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outer", p.outerMm, p.heightMm);

    checkWall(errors, units, "bore", "nut wall", (p.outerMm - p.boreMm) / 2);
    if (p.heightMm <= p.chamferMm * 2) errors.push({ field: "chamfer", level: "error", message: "The two rim chamfers meet in the middle." });
    if (p.outerMm < 16) warnings.push({ field: "outer", level: "warning", message: "Under 16 mm the nut is hard to turn by hand." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Wall", value: U((p.outerMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
        { label: "Grip face", value: U(p.heightMm - 2 * p.chamferMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} nut · ${U(p.boreMm, units)} bore`,
        `TN${R(p.outerMm, 0)}-${R(p.boreMm, 0)}`,
        p.outerMm,
        p.heightMm,
        [
          { label: "Outside", value: U(p.outerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.outerMm / 2;
    const boreR = p.boreMm / 2;
    const c = p.chamferMm;
    return spin(
      [
        { x: boreR, y: 0 },
        { x: outerR - c, y: 0 },
        { x: outerR, y: c },
        { x: outerR, y: p.heightMm - c },
        { x: outerR - c, y: p.heightMm },
        { x: boreR, y: p.heightMm },
      ],
      outerR,
    );
  },
  fileName: (p) => `thumb-nut-${R(p.outerMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* ------------------------------------------------------------------- dome nut */

export const domeNut: AnyDesign = defineDesign({
  id: "dome-nut",
  name: "Dome nut",
  family: "fixings",
  eyebrow: "Acorn cap",
  blurb: "A blind cap nut with a domed top that covers a stud end.",
  lede: "A cap nut with a closed dome: the bore runs part-way in, the dome closes the end and the stud is hidden. It is the finishing part on a exposed thread, and the dome height is independent of the overall height.",
  use: "Capping an exposed stud on furniture, a light fitting or a machine guard.",
  notesTitle: "How the blind bore is closed",
  chips: [
    { label: "Outside Ø", value: "12 – 60 mm" },
    { label: "Bore", value: "5 – 30 mm" },
    { label: "Height", value: "12 – 50 mm" },
  ],
  notes: [
    "The bore stops short of the dome, leaving a solid crown, and the dome is sampled as a quarter ellipse so the top is round rather than a cone. The remaining crown thickness is reported so you can see how much material is left above the stud.",
    "Print with the open end down and the dome up; the bore needs no support and the dome closes cleanly. A cap nut is usually decorative, so two perimeters are enough unless it is also carrying a load.",
  ],
  header: "Dome Nut Designer - units: mm",
  fields: [
    { key: "outer", label: "Outside diameter", kind: "length", section: "Nut", default: "24", min: 12, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "10", min: 5, max: 30 },
    { key: "height", label: "Overall height", kind: "length", section: "Nut", default: "20", min: 12, max: 50 },
    { key: "dome", label: "Dome height", kind: "length", section: "Dome", default: "6", min: 3, max: 15 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outer"),
    boreMm: rawLength(raw, "bore"),
    heightMm: rawLength(raw, "height"),
    domeMm: rawLength(raw, "dome"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outer", "Outside diameter", p.outerMm, 12, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 5, 30);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 12, 50);
    pushRange(errors, units, "dome", "Dome height", p.domeMm, 3, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outer", p.outerMm, p.heightMm);

    checkWall(errors, units, "bore", "nut wall", (p.outerMm - p.boreMm) / 2);
    if (p.domeMm > p.heightMm - 5) errors.push({ field: "dome", level: "error", message: "The dome leaves no bore depth; reduce it or raise the nut." });
    const crown = p.heightMm - p.domeMm - Math.min(3, p.heightMm - p.domeMm - 2);
    if (crown < 1.5) errors.push({ field: "dome", level: "error", message: "The crown above the bore is too thin." });
    if (p.domeMm > p.outerMm / 2) warnings.push({ field: "dome", level: "warning", message: "A dome taller than the radius looks like a spike." });

    const boreDepth = Math.max(2, p.heightMm - p.domeMm - Math.min(3, p.heightMm - p.domeMm - 2));
    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bore depth", value: U(boreDepth, units), source: "calc" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Dome", value: U(p.domeMm, units), source: "input" },
        { label: "Crown", value: U(p.heightMm - p.domeMm - boreDepth, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} cap · ${U(p.heightMm, units)} high`,
        `DN${R(p.outerMm, 0)}-${R(p.heightMm, 0)}`,
        p.outerMm,
        p.heightMm,
        [
          { label: "Outside", value: U(p.outerMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.outerMm / 2;
    const boreR = p.boreMm / 2;
    const boreDepth = Math.max(2, p.heightMm - p.domeMm - Math.min(3, p.heightMm - p.domeMm - 2));
    const domeStart = p.heightMm - p.domeMm;
    const dome: Point2D[] = [];
    for (let i = 0; i <= 18; i += 1) {
      const t = (i / 18) * (Math.PI / 2);
      dome.push({ x: outerR * Math.cos(t), y: domeStart + p.domeMm * Math.sin(t) });
    }
    return spin(
      [
        { x: boreR, y: 0 },
        { x: outerR, y: 0 },
        ...dome,
        { x: 0, y: boreDepth },
        { x: boreR, y: boreDepth },
      ],
      outerR,
    );
  },
  fileName: (p) => `dome-nut-${R(p.outerMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ hose barb */

export const hoseBarb: AnyDesign = defineDesign({
  id: "hose-barb",
  name: "Hose barb",
  family: "vessels",
  eyebrow: "Barbed spigot",
  blurb: "A barbed spigot that grips a flexible hose without a clamp.",
  lede: "A hose barb with real sawtooth ridges: each ridge ramps up and steps back so the hose slides on and then resists being pulled off. The bore is straight, the barb count is live, and the ridge height is reported with the hose stretch that it asks for.",
  use: "Joining a flexible hose to a pump, a filter, a tank outlet or a garden line.",
  notesTitle: "How the ridges hold the hose",
  chips: [
    { label: "Hose ID", value: "4 – 30 mm" },
    { label: "Barb Ø", value: "8 – 40 mm" },
    { label: "Length", value: "20 – 100 mm" },
  ],
  notes: [
    "Each barb is a ramp followed by a square shoulder, which is the shape that lets a hose slide on but catches when it is pulled. The ridge is kept small enough that the hose can still stretch over it, and the barbs are evenly spaced along the straight section.",
    "Print the barb with its axis vertical and smooth the ridges lightly; layer seams on a barb act as a knife on the inside of a soft hose. A dip in hot water makes the hose easier to fit, and a clip is still worth adding above 1 bar.",
  ],
  header: "Hose Barb Designer - units: mm",
  fields: [
    { key: "hose", label: "Hose inside Ø", kind: "length", section: "Hose", default: "10", min: 4, max: 30 },
    { key: "barb", label: "Barb diameter", kind: "length", section: "Barb", default: "14", min: 8, max: 40 },
    { key: "length", label: "Overall length", kind: "length", section: "Barb", default: "40", min: 20, max: 100 },
    { key: "bore", label: "Bore", kind: "length", section: "Barb", default: "7", min: 3, max: 25 },
    { key: "barbs", label: "Barb count", kind: "count", section: "Barb", default: "3", min: 2, max: 6 },
  ],
  parse: (raw) => ({
    hoseMm: rawLength(raw, "hose"),
    barbMm: rawLength(raw, "barb"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
    barbs: rawCount(raw, "barbs"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "hose", "Hose inside diameter", p.hoseMm, 4, 30);
    pushRange(errors, units, "barb", "Barb diameter", p.barbMm, 8, 40);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 20, 100);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 25);
    pushInteger(errors, "barbs", "Barb count", p.barbs, 2, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "barb", p.barbMm, p.lengthMm);

    const barbs = Math.max(2, Math.round(p.barbs));
    const spacing = (p.lengthMm - 8) / barbs;
    if (p.barbMm <= p.boreMm + 3) errors.push({ field: "barb", level: "error", message: "The wall is too thin for a barb; enlarge the barb or reduce the bore." });
    if (p.barbMm < p.hoseMm) errors.push({ field: "barb", level: "error", message: "The barb is narrower than the hose, so it will not grip." });
    if (p.barbMm > p.hoseMm + 8) warnings.push({ field: "barb", level: "warning", message: "A barb this much larger than the hose is very hard to fit." });
    if (spacing < 4) errors.push({ field: "barbs", level: "error", message: "The barbs are packed too tightly; shorten the count or lengthen the barb." });

    const ridge = Math.min(1.2, (p.barbMm / 2 - p.boreMm / 2) * 0.3);
    return {
      errors,
      warnings,
      readout: [
        { label: "Hose ID", value: U(p.hoseMm, units), source: "input" },
        { label: "Barb Ø", value: U(p.barbMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Barbs", value: String(barbs), source: "input" },
        { label: "Ridge", value: U(ridge, units), source: "calc" },
      ],
      preview: previewOf(
        `${barbs} barbs · ${U(p.barbMm, units)} spigot`,
        `HB${R(p.barbMm, 0)}-${barbs}`,
        p.barbMm,
        p.lengthMm,
        [
          { label: "Barb", value: U(p.barbMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Barbs", value: String(barbs) },
        ],
      ),
    };
  },
  build: (p) => {
    const barbs = Math.max(2, Math.round(p.barbs));
    const outerR = p.barbMm / 2;
    const boreR = p.boreMm / 2;
    const ridge = Math.min(1.2, (outerR - boreR) * 0.3);
    const spacing = (p.lengthMm - 8) / barbs;
    const points: Point2D[] = [
      { x: boreR, y: 0 },
      { x: outerR, y: 0 },
    ];
    for (let i = 0; i < barbs; i += 1) {
      const start = 4 + i * spacing;
      points.push(
        { x: outerR, y: start },
        { x: outerR + ridge, y: start + spacing * 0.55 },
        { x: outerR, y: start + spacing * 0.7 },
      );
    }
    points.push({ x: outerR, y: p.lengthMm }, { x: boreR, y: p.lengthMm });
    return spin(points, outerR + ridge);
  },
  fileName: (p) => `hose-barb-${R(p.barbMm, 0)}-${Math.round(p.barbs)}.stl`,
});

/* -------------------------------------------------------------- barbed reducer */

export const barbedReducer: AnyDesign = defineDesign({
  id: "barbed-reducer",
  name: "Barbed reducer",
  family: "vessels",
  eyebrow: "Hose step",
  blurb: "A one-piece barbed fitting that steps one hose size down to another.",
  lede: "A reducer with a barb at each end and a tapered shoulder between them, so a small hose and a large hose can share one line. Each end has its own ridge, and the bore is straight through so the flow is not stepped twice.",
  use: "Joining a small hose to a larger one on a cooler, a pump intake or a garden dripper line.",
  notesTitle: "How the two ends are stepped",
  chips: [
    { label: "Small Ø", value: "6 – 30 mm" },
    { label: "Large Ø", value: "10 – 50 mm" },
    { label: "Length", value: "30 – 120 mm" },
  ],
  notes: [
    "The shoulder between the two barbs is a straight taper, not a square step, which gives the hose something to slide over without tearing. The bore stays constant, and the wall at the small end is checked against the bore.",
    "Print it vertically with the small end down. A reducer is pulled at both ends, so give it at least four perimeters and test it with the hoses before it goes into a line that matters.",
  ],
  header: "Barbed Reducer Designer - units: mm",
  fields: [
    { key: "small", label: "Small barb Ø", kind: "length", section: "Barbs", default: "10", min: 6, max: 30 },
    { key: "large", label: "Large barb Ø", kind: "length", section: "Barbs", default: "20", min: 10, max: 50 },
    { key: "length", label: "Overall length", kind: "length", section: "Barbs", default: "60", min: 30, max: 120 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "6", min: 3, max: 20 },
  ],
  parse: (raw) => ({
    smallMm: rawLength(raw, "small"),
    largeMm: rawLength(raw, "large"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "small", "Small barb diameter", p.smallMm, 6, 30);
    pushRange(errors, units, "large", "Large barb diameter", p.largeMm, 10, 50);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 30, 120);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "large", p.largeMm, p.lengthMm);

    if (p.largeMm <= p.smallMm + 2) errors.push({ field: "large", level: "error", message: "The large end is not larger than the small end." });
    if (p.smallMm <= p.boreMm + 3) errors.push({ field: "bore", level: "error", message: "The bore leaves too little wall at the small end." });
    if (p.lengthMm < p.largeMm * 1.5) warnings.push({ field: "length", level: "warning", message: "A short reducer puts the two hose clips close together." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Small Ø", value: U(p.smallMm, units), source: "input" },
        { label: "Large Ø", value: U(p.largeMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Step", value: U((p.largeMm - p.smallMm) / 2, units), source: "calc" },
        { label: "Small wall", value: U((p.smallMm - p.boreMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.smallMm, units)} to ${U(p.largeMm, units)}`,
        `BR${R(p.smallMm, 0)}-${R(p.largeMm, 0)}`,
        p.largeMm,
        p.lengthMm,
        [
          { label: "Small", value: U(p.smallMm, units) },
          { label: "Large", value: U(p.largeMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const smallR = p.smallMm / 2;
    const largeR = p.largeMm / 2;
    const boreR = p.boreMm / 2;
    const ridge = Math.min(1, (smallR - boreR) * 0.3);
    return spin(
      [
        { x: boreR, y: 0 },
        { x: smallR, y: 0 },
        { x: smallR, y: p.lengthMm * 0.4 },
        { x: smallR + ridge, y: p.lengthMm * 0.47 },
        { x: smallR, y: p.lengthMm * 0.5 },
        { x: largeR, y: p.lengthMm * 0.55 },
        { x: largeR + ridge, y: p.lengthMm * 0.82 },
        { x: largeR, y: p.lengthMm * 0.9 },
        { x: largeR, y: p.lengthMm },
        { x: boreR, y: p.lengthMm },
      ],
      largeR + ridge,
    );
  },
  fileName: (p) => `barbed-reducer-${R(p.smallMm, 0)}-${R(p.largeMm, 0)}.stl`,
});

/* ------------------------------------------------------------ bulkhead fitting */

export const bulkheadFitting: AnyDesign = defineDesign({
  id: "bulkhead-fitting",
  name: "Bulkhead fitting",
  family: "vessels",
  eyebrow: "Tank pass-through",
  blurb: "A flanged barbed tube that passes a hose through a tank wall.",
  lede: "A bulkhead fitting turned as one closed profile: a wide flange that seals against a tank wall, a straight tube through the wall and a barb that holds the hose. The flange face is a real flat annulus, so a gasket has something to sit on.",
  use: "Passing a hose through a tank, a cooler or a reservoir wall with a sealed flange.",
  notesTitle: "How the flange seals",
  chips: [
    { label: "Tube Ø", value: "8 – 50 mm" },
    { label: "Flange Ø", value: "20 – 80 mm" },
    { label: "Length", value: "20 – 100 mm" },
  ],
  notes: [
    "The flange is at one end and the barb at the other, so the wall of the tank is clamped between the flange and a nut or a hose clip on the inside. The tube wall is reported, and the flange is checked to be wider than the tube by a real gasket land.",
    "Print it with the flange down and the tube vertical. A bulkhead joint leaks at the flange face, so print the face solid, sand it flat on a sheet of glass and use a rubber or fibre washer rather than relying on the plastic alone.",
  ],
  header: "Bulkhead Fitting Designer - units: mm",
  fields: [
    { key: "tube", label: "Tube diameter", kind: "length", section: "Tube", default: "20", min: 8, max: 50 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Flange", default: "40", min: 20, max: 80 },
    { key: "length", label: "Overall length", kind: "length", section: "Tube", default: "50", min: 20, max: 100 },
    { key: "wall", label: "Tube wall", kind: "length", section: "Tube", default: "3", min: 1.6, max: 8 },
    { key: "flangeT", label: "Flange thickness", kind: "length", section: "Flange", default: "6", min: 4, max: 15 },
  ],
  parse: (raw) => ({
    tubeMm: rawLength(raw, "tube"),
    flangeMm: rawLength(raw, "flange"),
    lengthMm: rawLength(raw, "length"),
    wallMm: rawLength(raw, "wall"),
    flangeTMm: rawLength(raw, "flangeT"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "tube", "Tube diameter", p.tubeMm, 8, 50);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 20, 80);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 20, 100);
    pushRange(errors, units, "wall", "Tube wall", p.wallMm, 1.6, 8);
    pushRange(errors, units, "flangeT", "Flange thickness", p.flangeTMm, 4, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.lengthMm);

    checkWall(errors, units, "wall", "tube wall", p.wallMm);
    if (p.flangeMm < p.tubeMm + 8) errors.push({ field: "flange", level: "error", message: "The flange leaves under 4 mm of sealing land." });
    if (p.lengthMm < p.flangeTMm + 12) errors.push({ field: "length", level: "error", message: "The tube is too short beyond the flange for a hose." });
    if (p.wallMm > p.tubeMm / 2 - 1) errors.push({ field: "wall", level: "error", message: "The wall closes the tube." });
    if (p.flangeTMm < 5) warnings.push({ field: "flangeT", level: "warning", message: "A flange under 5 mm will dish when the joint is tightened." });

    const bore = p.tubeMm - 2 * p.wallMm;
    return {
      errors,
      warnings,
      readout: [
        { label: "Tube Ø", value: U(p.tubeMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Bore", value: U(bore, units), source: "calc" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Flange", value: U(p.flangeTMm, units), source: "input" },
        { label: "Sealing land", value: U((p.flangeMm - p.tubeMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.flangeMm, units)} flange · ${U(p.lengthMm, units)} long`,
        `BF${R(p.flangeMm, 0)}-${R(p.tubeMm, 0)}`,
        p.flangeMm,
        p.lengthMm,
        [
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Tube", value: U(p.tubeMm, units) },
          { label: "Bore", value: U(bore, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const tubeR = p.tubeMm / 2;
    const flangeR = p.flangeMm / 2;
    const boreR = tubeR - p.wallMm;
    const ridge = Math.min(1, p.wallMm);
    return spin(
      [
        { x: boreR, y: 0 },
        { x: flangeR, y: 0 },
        { x: flangeR, y: p.flangeTMm },
        { x: tubeR, y: p.flangeTMm },
        { x: tubeR, y: p.lengthMm - 8 },
        { x: tubeR + ridge, y: p.lengthMm - 4 },
        { x: tubeR, y: p.lengthMm - 2 },
        { x: tubeR, y: p.lengthMm },
        { x: boreR, y: p.lengthMm },
      ],
      flangeR,
    );
  },
  fileName: (p) => `bulkhead-fitting-${R(p.flangeMm, 0)}-${R(p.tubeMm, 0)}.stl`,
});

/* --------------------------------------------------------------- cable grommet */

export const cableGrommet: AnyDesign = defineDesign({
  id: "cable-grommet",
  name: "Cable grommet",
  family: "fixings",
  eyebrow: "Panel ring",
  blurb: "A flanged ring with a panel groove that protects a cable through a hole.",
  lede: "A grommet with a real groove for the panel: the narrow waist sits in the sheet, and a flange on each side stops it pulling through. The bore is sized to the cable, so the ring both protects the insulation and closes the hole.",
  use: "Running a cable through a metal or wooden panel without the edge cutting the insulation.",
  notesTitle: "How the panel groove works",
  chips: [
    { label: "Cable Ø", value: "3 – 30 mm" },
    { label: "Panel", value: "1 – 10 mm" },
    { label: "Flange Ø", value: "10 – 60 mm" },
  ],
  notes: [
    "The groove width is the panel thickness and its diameter is chosen so the waist is a snug push fit. Both flanges are wider than the waist, which is what keeps the grommet in the hole instead of sliding through it.",
    "Print it in a soft filament such as TPU if the cable moves; a rigid grommet still protects the edge but transmits every tug. Print with the bore vertical and flare the flanges in the slicer if your printer struggles with the overhang.",
  ],
  header: "Cable Grommet Designer - units: mm",
  fields: [
    { key: "cable", label: "Cable diameter", kind: "length", section: "Cable", default: "10", min: 3, max: 30 },
    { key: "panel", label: "Panel thickness", kind: "length", section: "Panel", default: "3", min: 1, max: 10 },
    { key: "groove", label: "Groove diameter", kind: "length", section: "Panel", default: "18", min: 8, max: 50 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Panel", default: "24", min: 10, max: 60 },
    { key: "flangeT", label: "Flange thickness", kind: "length", section: "Panel", default: "3", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    cableMm: rawLength(raw, "cable"),
    panelMm: rawLength(raw, "panel"),
    grooveMm: rawLength(raw, "groove"),
    flangeMm: rawLength(raw, "flange"),
    flangeTMm: rawLength(raw, "flangeT"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cable", "Cable diameter", p.cableMm, 3, 30);
    pushRange(errors, units, "panel", "Panel thickness", p.panelMm, 1, 10);
    pushRange(errors, units, "groove", "Groove diameter", p.grooveMm, 8, 50);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 10, 60);
    pushRange(errors, units, "flangeT", "Flange thickness", p.flangeTMm, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.panelMm + 2 * p.flangeTMm);

    const bore = p.cableMm + 1;
    if (p.grooveMm < bore + 3) errors.push({ field: "groove", level: "error", message: "The groove leaves under 1.5 mm of wall around the cable." });
    if (p.flangeMm < p.grooveMm + 3) errors.push({ field: "flange", level: "error", message: "The flange is not wider than the groove, so the grommet can pull through." });
    if (p.flangeTMm < 2.5) warnings.push({ field: "flangeT", level: "warning", message: "A flange under 2.5 mm tears easily when the cable is pulled." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cable Ø", value: U(p.cableMm, units), source: "input" },
        { label: "Bore", value: U(bore, units), source: "calc" },
        { label: "Groove Ø", value: U(p.grooveMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Panel", value: U(p.panelMm, units), source: "input" },
        { label: "Overall height", value: U(p.panelMm + 2 * p.flangeTMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.cableMm, units)} cable · ${U(p.panelMm, units)} panel`,
        `CG${R(p.cableMm, 0)}-${R(p.grooveMm, 0)}`,
        p.flangeMm,
        p.panelMm + 2 * p.flangeTMm,
        [
          { label: "Cable", value: U(p.cableMm, units) },
          { label: "Groove", value: U(p.grooveMm, units) },
          { label: "Flange", value: U(p.flangeMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const boreR = (p.cableMm + 1) / 2;
    const grooveR = p.grooveMm / 2;
    const flangeR = p.flangeMm / 2;
    const ft = p.flangeTMm;
    const top = p.panelMm + 2 * ft;
    return spin(
      [
        { x: boreR, y: 0 },
        { x: flangeR, y: 0 },
        { x: flangeR, y: ft },
        { x: grooveR, y: ft },
        { x: grooveR, y: ft + p.panelMm },
        { x: flangeR, y: ft + p.panelMm },
        { x: flangeR, y: top },
        { x: boreR, y: top },
      ],
      flangeR,
    );
  },
  fileName: (p) => `cable-grommet-${R(p.cableMm, 0)}-${R(p.grooveMm, 0)}.stl`,
});

/* --------------------------------------------------------------- tube adapter */

export const tubeAdapter: AnyDesign = defineDesign({
  id: "tube-adapter",
  name: "Tube adapter",
  family: "vessels",
  eyebrow: "Stepped sleeve",
  blurb: "A stepped sleeve that joins two tube sizes with a straight bore.",
  lede: "A two-step sleeve for joining tubes of different outside diameters: one end slides into the small tube, the other into the large one, and a shoulder stops it going too far. The bore is straight, so a sample or a cable still passes through.",
  use: "Joining two rigid tubes of different sizes in a lab rig, a model or a light frame.",
  notesTitle: "How the shoulder locates the tubes",
  chips: [
    { label: "Large Ø", value: "10 – 60 mm" },
    { label: "Small Ø", value: "6 – 50 mm" },
    { label: "Bore", value: "4 – 40 mm" },
  ],
  notes: [
    "Each end is a plain cylinder, so it can be a push fit or glued into its tube, and the shoulder between them sets how far each tube goes on. The bore is a through-hole, which means the joint does not trap air or block a sample.",
    "Print it vertically with the small end down and check both fits on short offcuts before gluing. A push fit in a printed sleeve relaxes over a few days, so use a smear of adhesive or a cross pin for anything that has to stay together.",
  ],
  header: "Tube Adapter Designer - units: mm",
  fields: [
    { key: "large", label: "Large diameter", kind: "length", section: "Adapter", default: "25", min: 10, max: 60 },
    { key: "small", label: "Small diameter", kind: "length", section: "Adapter", default: "15", min: 6, max: 50 },
    { key: "length", label: "Overall length", kind: "length", section: "Adapter", default: "40", min: 20, max: 80 },
    { key: "bore", label: "Bore", kind: "length", section: "Adapter", default: "10", min: 4, max: 40 },
  ],
  parse: (raw) => ({
    largeMm: rawLength(raw, "large"),
    smallMm: rawLength(raw, "small"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "large", "Large diameter", p.largeMm, 10, 60);
    pushRange(errors, units, "small", "Small diameter", p.smallMm, 6, 50);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 20, 80);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "large", p.largeMm, p.lengthMm);

    if (p.largeMm <= p.smallMm + 1) errors.push({ field: "large", level: "error", message: "The large end must be larger than the small end." });
    if (p.smallMm <= p.boreMm + 3) errors.push({ field: "bore", level: "error", message: "The bore leaves too little wall at the small end." });
    if (p.lengthMm < p.largeMm) warnings.push({ field: "length", level: "warning", message: "A sleeve shorter than its large diameter has very little engagement." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Large Ø", value: U(p.largeMm, units), source: "input" },
        { label: "Small Ø", value: U(p.smallMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Step", value: U((p.largeMm - p.smallMm) / 2, units), source: "calc" },
        { label: "Small wall", value: U((p.smallMm - p.boreMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.smallMm, units)} to ${U(p.largeMm, units)} sleeve`,
        `TA${R(p.smallMm, 0)}-${R(p.largeMm, 0)}`,
        p.largeMm,
        p.lengthMm,
        [
          { label: "Small", value: U(p.smallMm, units) },
          { label: "Large", value: U(p.largeMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const largeR = p.largeMm / 2;
    const smallR = p.smallMm / 2;
    const boreR = p.boreMm / 2;
    return spin(
      [
        { x: boreR, y: 0 },
        { x: smallR, y: 0 },
        { x: smallR, y: p.lengthMm / 2 },
        { x: largeR, y: p.lengthMm / 2 },
        { x: largeR, y: p.lengthMm },
        { x: boreR, y: p.lengthMm },
      ],
      largeR,
    );
  },
  fileName: (p) => `tube-adapter-${R(p.smallMm, 0)}-${R(p.largeMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- pipette tip */

export const pipetteTip: AnyDesign = defineDesign({
  id: "pipette-tip",
  name: "Pipette tip",
  family: "vessels",
  eyebrow: "Tapered tip",
  blurb: "A thin-walled tapered tip with a controlled orifice and a real wall.",
  lede: "A pipette tip turned as a tapered annulus: the orifice is the small end, the barrel fits the pipette at the large end, and the wall is constant along the cone. The orifice and the wall are reported separately, because one controls the drop size and the other controls how easily the tip tears.",
  use: "Transferring small, repeatable drops or samples from a pipette or a syringe.",
  notesTitle: "How the orifice is set",
  chips: [
    { label: "Top Ø", value: "5 – 20 mm" },
    { label: "Tip Ø", value: "0.8 – 4 mm" },
    { label: "Length", value: "20 – 100 mm" },
  ],
  notes: [
    "The inner and outer cones share a taper, so the wall thickness stays even from the barrel to the orifice. The tip must be at least one wall thicker than the bore, which is checked before the profile is built.",
    "Print at the finest layer height you can and orient the tip upward; a tip printed on its side has a seam across the orifice and drips from it. This is a transfer tip for water, dye or a rinse, not a sterile laboratory consumable.",
  ],
  header: "Pipette Tip Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Tip", default: "8", min: 5, max: 20 },
    { key: "tip", label: "Orifice diameter", kind: "length", section: "Tip", default: "1.5", min: 0.8, max: 4 },
    { key: "length", label: "Length", kind: "length", section: "Tip", default: "50", min: 20, max: 100 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Tip", default: "0.5", min: 0.4, max: 1.5 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    tipMm: rawLength(raw, "tip"),
    lengthMm: rawLength(raw, "length"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 5, 20);
    pushRange(errors, units, "tip", "Orifice diameter", p.tipMm, 0.8, 4);
    pushRange(errors, units, "length", "Length", p.lengthMm, 20, 100);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 0.4, 1.5);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "length", p.topMm, p.lengthMm);

    const tipR = p.tipMm / 2;
    if (tipR <= p.wallMm + 0.1) errors.push({ field: "wall", level: "error", message: "The wall closes the orifice; thin it or widen the tip." });
    if (p.topMm <= p.tipMm + 2) errors.push({ field: "top", level: "error", message: "The taper is too shallow to fit a pipette barrel." });
    if (p.wallMm < 0.5) warnings.push({ field: "wall", level: "warning", message: "A wall this thin will split at the orifice seam." });

    const innerTip = Math.max(0.2, tipR - p.wallMm);
    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Orifice", value: U(p.tipMm, units), source: "input" },
        { label: "Inner orifice", value: U(innerTip * 2, units), source: "calc" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Taper", value: `${R((Math.atan2((p.topMm - p.tipMm) / 2, p.lengthMm) * 180) / Math.PI, 1)}°`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.tipMm, units)} orifice · ${U(p.lengthMm, units)} long`,
        `PT${R(p.topMm, 0)}-${R(p.tipMm, 1)}`,
        p.topMm,
        p.lengthMm,
        [
          { label: "Top", value: U(p.topMm, units) },
          { label: "Orifice", value: U(p.tipMm, units) },
          { label: "Wall", value: U(p.wallMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const topR = p.topMm / 2;
    const tipR = p.tipMm / 2;
    const innerTop = topR - p.wallMm;
    const innerTip = Math.max(0.2, tipR - p.wallMm);
    return spin(
      [
        { x: tipR, y: 0 },
        { x: topR, y: p.lengthMm },
        { x: innerTop, y: p.lengthMm },
        { x: innerTip, y: 0 },
      ],
      topR,
    );
  },
  fileName: (p) => `pipette-tip-${R(p.topMm, 0)}-${R(p.tipMm, 1)}.stl`,
});

/* --------------------------------------------------------------------- jar lid */

export const jarLid: AnyDesign = defineDesign({
  id: "jar-lid",
  name: "Jar lid",
  family: "vessels",
  eyebrow: "Push cap",
  blurb: "A push-fit lid with a sealing skirt and a solid top disc.",
  lede: "A push-fit lid for a jar or a tin: the skirt clears the jar's outside diameter by a printing allowance and the top disc is thick enough to take a label or a small stack. It is a friction lid, so there is no thread to strip and no model-specific thread to match.",
  use: "Covering a jar of screws, a jar of paint or a tin of mixed resin without a screw thread.",
  notesTitle: "How the skirt finds the jar",
  chips: [
    { label: "Jar Ø", value: "30 – 120 mm" },
    { label: "Height", value: "8 – 40 mm" },
    { label: "Wall", value: "2 – 6 mm" },
  ],
  notes: [
    "The inner skirt is the jar diameter plus a clearance allowance, so the lid fits over the rim instead of inside it. The wall and the top thickness are separate, which lets a wide lid stay stiff without becoming a solid block.",
    "Print it with the top down and the skirt rising; the inside then needs no support. Measure the jar with calipers and add the clearance you actually need: printed holes come out undersize, and a lid that is too tight splits at the skirt.",
  ],
  header: "Jar Lid Designer - units: mm",
  fields: [
    { key: "jar", label: "Jar diameter", kind: "length", section: "Jar", default: "70", min: 30, max: 120 },
    { key: "height", label: "Skirt height", kind: "length", section: "Lid", default: "18", min: 8, max: 40 },
    { key: "wall", label: "Skirt wall", kind: "length", section: "Lid", default: "3", min: 2, max: 6 },
    { key: "top", label: "Top thickness", kind: "length", section: "Lid", default: "3", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    jarMm: rawLength(raw, "jar"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    topMm: rawLength(raw, "top"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "jar", "Jar diameter", p.jarMm, 30, 120);
    pushRange(errors, units, "height", "Skirt height", p.heightMm, 8, 40);
    pushRange(errors, units, "wall", "Skirt wall", p.wallMm, 2, 6);
    pushRange(errors, units, "top", "Top thickness", p.topMm, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    const outer = p.jarMm + 0.8 + 2 * p.wallMm;
    checkSize(errors, units, "jar", outer, p.heightMm);

    checkWall(errors, units, "wall", "skirt wall", p.wallMm);
    if (p.heightMm < p.topMm + 4) errors.push({ field: "height", level: "error", message: "The skirt is too shallow to grip the jar." });
    if (p.wallMm < 2.5) warnings.push({ field: "wall", level: "warning", message: "A skirt under 2.5 mm splits when it is pushed on." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Jar Ø", value: U(p.jarMm, units), source: "input" },
        { label: "Inner Ø", value: U(p.jarMm + 0.8, units), source: "calc" },
        { label: "Outside Ø", value: U(outer, units), source: "calc" },
        { label: "Skirt height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Top", value: U(p.topMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(outer, units)} lid · ${U(p.heightMm, units)} high`,
        `JL${R(p.jarMm, 0)}-${R(p.heightMm, 0)}`,
        outer,
        p.heightMm,
        [
          { label: "Jar", value: U(p.jarMm, units) },
          { label: "Outside", value: U(outer, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const innerR = (p.jarMm + 0.8) / 2;
    const outerR = innerR + p.wallMm;
    return spin(
      [
        { x: innerR, y: 0 },
        { x: outerR, y: 0 },
        { x: outerR, y: p.heightMm },
        { x: 0, y: p.heightMm },
        { x: 0, y: p.heightMm - p.topMm },
        { x: innerR, y: p.heightMm - p.topMm },
      ],
      outerR,
    );
  },
  fileName: (p) => `jar-lid-${R(p.jarMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

export const revolveFasteners: AnyDesign[] = [
  thumbScrew,
  thumbNut,
  domeNut,
  hoseBarb,
  barbedReducer,
  bulkheadFitting,
  cableGrommet,
  tubeAdapter,
  pipetteTip,
  jarLid,
];
