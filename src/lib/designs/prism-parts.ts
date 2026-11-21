/** Plates, fixings, knobs and hand tools. */

import { buildPrism } from "@/lib/kit/prism";
import { TWO_PI, type Point2D } from "@/lib/kit/units";
import {
  arcPoints,
  circleOutline,
  lobedOutline,
  regularPolygon,
  roundedRect,
} from "@/lib/kit/outlines";

import {
  boxWrenchParts,
  handwheelParts,
  openEndWrenchOutline,
  sawBladeOutline,
  toothedRing,
} from "./geometry";
import { obround } from "@/lib/kit/outlines";

import {
  boreHoles,
  chamferRings,
  checkSize,
  checkWall,
  circle,
  distanceToRing,
  emptyResult,
  measure,
  round,
} from "./helpers";
import {
  defineDesign,
  previewOf,
  pushInteger,
  pushRange,
  pushWarning,
  rawCount,
  rawLength,
  rawNumber,
  type AnyDesign,
  type DesignIssue,
} from "./types";

const deg = (value: number) => `${round(value, 1)}°`;

/* --------------------------------------------------------------- wing nut */

export const wingNut: AnyDesign = defineDesign({
  id: "wing-nut",
  name: "Wing nut",
  family: "fixings",
  eyebrow: "Tool-free",
  blurb: "A two-wing nut you can spin down by hand.",
  lede: "Two rounded wings grow out of a round boss around the bore. The wing profile is a raised cosine, so the wings meet the waist with no notch to start a crack and the span is exactly what you enter.",
  chips: [
    { label: "Wings", value: "2 – 4" },
    { label: "Span", value: "16 – 120 mm" },
    { label: "Bore", value: "1 – 40 mm" },
  ],
  notes: [
    "The outline radius follows `waist/2 + (span/2 − waist/2)(1 − cos(wings·θ))/2`, which puts a wing at every half period and a smooth waist between them. The bore is a plain through-hole, sized for the stud rather than the thread.",
    "Print a wing nut on its face with the wings in the bed plane. Layer lines then run along the wings instead of across them, which is where a printed wing usually splits.",
  ],
  header: "Wing Nut Designer - units: mm",
  fields: [
    { key: "wings", label: "Wings", kind: "count", section: "Nut", default: "2", min: 2, max: 4 },
    { key: "span", label: "Wing span", kind: "length", section: "Nut", default: "40", min: 16, max: 120 },
    { key: "waist", label: "Waist diameter", kind: "length", section: "Nut", default: "18", min: 6, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Nut", default: "10", min: 2, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "6", min: 1, max: 40 },
  ],
  parse: (raw) => ({
    wings: rawCount(raw, "wings"),
    spanMm: rawLength(raw, "span"),
    waistMm: rawLength(raw, "waist"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "wings", "Wings", p.wings, 2, 4);
    pushRange(errors, units, "span", "Wing span", p.spanMm, 16, 120);
    pushRange(errors, units, "waist", "Waist diameter", p.waistMm, 6, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "span", p.spanMm, p.thicknessMm);
    checkWall(errors, units, "bore", "boss around the bore", p.waistMm / 2 - p.boreMm / 2);
    if (p.spanMm <= p.waistMm + 4) {
      errors.push({ field: "span", level: "error", message: "The wings need at least 2 mm of reach past the waist." });
    }
    if (p.thicknessMm < p.waistMm * 0.25) pushWarning(warnings, "thickness", "A thin wing nut twists off at the waist.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Wings", value: String(Math.round(p.wings)), source: "input" },
        { label: "Wing span", value: measure(p.spanMm, units), source: "input" },
        { label: "Waist Ø", value: measure(p.waistMm, units), source: "input" },
        { label: "Wing reach", value: measure((p.spanMm - p.waistMm) / 2, units), source: "calc" },
        { label: "Boss wall", value: measure(Math.max(0, p.waistMm / 2 - p.boreMm / 2), units), source: "calc" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.wings)} wings · ${measure(p.spanMm, units)} span`,
        `WN${round(p.spanMm, 0)}-${round(p.boreMm, 1)}`,
        p.spanMm,
        p.thicknessMm,
        [
          { label: "Span", value: measure(p.spanMm, units) },
          { label: "Waist", value: measure(p.waistMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = lobedOutline(
      p.wings,
      p.waistMm / 2,
      p.spanMm / 2,
      0,
      24,
    );
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `wing-nut-${round(p.spanMm, 0)}s-${round(p.boreMm, 1)}b.stl`,
});

/* -------------------------------------------------------------- star knob */

export const starKnob: AnyDesign = defineDesign({
  id: "star-knob",
  name: "Star knob",
  family: "fixings",
  eyebrow: "Five-lobe grip",
  blurb: "A lobed knob with a real grip depth and a mounting bore.",
  lede: "Rounded lobes around a circular waist give a grip that is comfortable in the hand and easy to turn with the fingertips. Set the lobe count, tip and root diameter and the knob is generated from a raised-cosine profile.",
  chips: [
    { label: "Lobes", value: "3 – 12" },
    { label: "Tip Ø", value: "16 – 140 mm" },
    { label: "Height", value: "4 – 60 mm" },
  ],
  notes: [
    "Each lobe is a haversine bump, so there are no sharp valleys. The grip depth is half the difference between the tip and root diameters, and the lobe count sets how many times the hand finds a purchase per turn.",
    "A knob with a deep bore and a thin skirt can split when it is tightened. Keep at least 2.5 mm of wall around the bore, or add a metal insert.",
  ],
  header: "Star Knob Designer - units: mm",
  fields: [
    { key: "lobes", label: "Lobes", kind: "count", section: "Knob", default: "5", min: 3, max: 12 },
    { key: "tipDiameter", label: "Tip diameter", kind: "length", section: "Knob", default: "44", min: 16, max: 140 },
    { key: "rootDiameter", label: "Root diameter", kind: "length", section: "Knob", default: "34", min: 10, max: 130 },
    { key: "height", label: "Height", kind: "length", section: "Knob", default: "18", min: 4, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Knob", default: "6", min: 1, max: 40 },
  ],
  parse: (raw) => ({
    lobes: rawCount(raw, "lobes"),
    tipDiameterMm: rawLength(raw, "tipDiameter"),
    rootDiameterMm: rawLength(raw, "rootDiameter"),
    heightMm: rawLength(raw, "height"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "lobes", "Lobes", p.lobes, 3, 12);
    pushRange(errors, units, "tipDiameter", "Tip diameter", p.tipDiameterMm, 16, 140);
    pushRange(errors, units, "rootDiameter", "Root diameter", p.rootDiameterMm, 10, 130);
    pushRange(errors, units, "height", "Height", p.heightMm, 4, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "tipDiameter", p.tipDiameterMm, p.heightMm);
    checkWall(errors, units, "bore", "wall at the waist", p.rootDiameterMm / 2 - p.boreMm / 2);
    if (p.tipDiameterMm < p.rootDiameterMm + 2) {
      errors.push({ field: "tipDiameter", level: "error", message: "The lobes need at least 1 mm of depth." });
    }
    if (p.heightMm < 6) pushWarning(warnings, "height", "Under 6 mm tall there is little to grip.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Lobes", value: String(Math.round(p.lobes)), source: "input" },
        { label: "Tip Ø", value: measure(p.tipDiameterMm, units), source: "input" },
        { label: "Root Ø", value: measure(p.rootDiameterMm, units), source: "input" },
        { label: "Grip depth", value: measure((p.tipDiameterMm - p.rootDiameterMm) / 2, units), source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.lobes)} lobes · ${measure(p.tipDiameterMm, units)}`,
        `SK${Math.round(p.lobes)}-${round(p.tipDiameterMm, 0)}`,
        p.tipDiameterMm,
        p.heightMm,
        [
          { label: "Tip Ø", value: measure(p.tipDiameterMm, units) },
          { label: "Root Ø", value: measure(p.rootDiameterMm, units) },
          { label: "Height", value: measure(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = lobedOutline(p.lobes, p.rootDiameterMm / 2, p.tipDiameterMm / 2, 0, 20);
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.heightMm,
    });
  },
  fileName: (p) => `star-knob-${Math.round(p.lobes)}l-${round(p.tipDiameterMm, 0)}d.stl`,
});

/* ----------------------------------------------------------- knurled knob */

export const knurledKnob: AnyDesign = defineDesign({
  id: "knurled-knob",
  name: "Knurled knob",
  family: "fixings",
  eyebrow: "Straight knurl",
  blurb: "A cylindrical knob with a straight-knurled grip band.",
  lede: "Straight knurling is a ring of narrow axial ridges, so it is a prism and prints cleanly. Set the knob diameter, how many ridges you want and how deep they cut, and the grip is cut all the way through the height.",
  chips: [
    { label: "Ridges", value: "8 – 72" },
    { label: "Knob Ø", value: "10 – 140 mm" },
    { label: "Depth", value: "0.2 – 3 mm" },
  ],
  notes: [
    "The ridge tips sit on the entered diameter and the roots are one depth inside it. The root land is the root circumference divided by the ridge count, minus the ridge width, so the ridges stay evenly spaced as the count changes.",
    "Sharp V ridges are hard on the hand and on the printer. A small flat on each ridge, 0.3–0.6 mm wide, gives a grip that is both comfortable and printable.",
  ],
  header: "Knurled Knob Designer - units: mm",
  fields: [
    { key: "diameter", label: "Knob diameter", kind: "length", section: "Knob", default: "30", min: 10, max: 140 },
    { key: "knurls", label: "Ridges", kind: "count", section: "Knurl", default: "24", min: 8, max: 72 },
    { key: "depth", label: "Knurl depth", kind: "length", section: "Knurl", default: "0.8", min: 0.2, max: 3 },
    { key: "ridgeWidth", label: "Ridge width", kind: "length", section: "Knurl", default: "1", min: 0.3, max: 4 },
    { key: "height", label: "Height", kind: "length", section: "Knob", default: "18", min: 4, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Knob", default: "6", min: 1, max: 40 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    knurls: rawCount(raw, "knurls"),
    depthMm: rawLength(raw, "depth"),
    ridgeWidthMm: rawLength(raw, "ridgeWidth"),
    heightMm: rawLength(raw, "height"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Knob diameter", p.diameterMm, 10, 140);
    pushInteger(errors, "knurls", "Ridges", p.knurls, 8, 72);
    pushRange(errors, units, "depth", "Knurl depth", p.depthMm, 0.2, 3);
    pushRange(errors, units, "ridgeWidth", "Ridge width", p.ridgeWidthMm, 0.3, 4);
    pushRange(errors, units, "height", "Height", p.heightMm, 4, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const radius = p.diameterMm / 2;
    const rootRadius = radius - p.depthMm;
    const rootLand = (TWO_PI * rootRadius) / p.knurls - p.ridgeWidthMm;
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);
    checkWall(errors, units, "bore", "wall inside the knurl roots", rootRadius - p.boreMm / 2);
    if (rootLand <= 0.3) {
      errors.push({ field: "knurls", level: "error", message: "The ridges merge at the root — reduce the count or the ridge width." });
    }
    const halfPitch = Math.PI / Math.max(8, Math.round(p.knurls));
    const tipHalf = p.ridgeWidthMm / (2 * radius);
    const rootHalf = Math.max(0, rootLand) / (2 * rootRadius);
    if (tipHalf + rootHalf >= halfPitch - 0.0008) {
      errors.push({ field: "knurls", level: "error", message: "The ridge and root lands fill the pitch at this diameter; narrow the ridge or use fewer ridges." });
    }
    if (p.depthMm > radius * 0.25) pushWarning(warnings, "depth", "A deep knurl cuts most of the way through the wall.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Knob Ø", value: measure(p.diameterMm, units), source: "input" },
        { label: "Ridges", value: String(Math.round(p.knurls)), source: "input" },
        { label: "Root Ø", value: measure(rootRadius * 2, units), source: "calc" },
        { label: "Knurl depth", value: measure(p.depthMm, units), source: "input" },
        { label: "Root land", value: measure(Math.max(0, rootLand), units), source: "calc" },
        { label: "Height", value: measure(p.heightMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.knurls)} ridges · ${measure(p.diameterMm, units)}`,
        `KK${round(p.diameterMm, 0)}-${Math.round(p.knurls)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Knob Ø", value: measure(p.diameterMm, units) },
          { label: "Root Ø", value: measure(rootRadius * 2, units) },
          { label: "Height", value: measure(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const rootRadius = radius - p.depthMm;
    const rootLand = Math.max(0.2, (TWO_PI * rootRadius) / p.knurls - p.ridgeWidthMm);
    const outline = toothedRing({
      count: p.knurls,
      rootRadiusMm: rootRadius,
      tipRadiusMm: radius,
      tipLandMm: p.ridgeWidthMm,
      rootLandMm: rootLand,
      flank: "straight",
      stepsPerFlank: 3,
    });
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.heightMm,
    });
  },
  fileName: (p) => `knurled-knob-${round(p.diameterMm, 0)}d-${Math.round(p.knurls)}k.stl`,
});

/* -------------------------------------------------------- open-end wrench */

export const openEndWrench: AnyDesign = defineDesign({
  id: "open-end-wrench",
  name: "Open-end wrench",
  family: "fixings",
  eyebrow: "Two flats",
  blurb: "A one-piece spanner with a square jaw and a rounded handle.",
  lede: "The jaw is two parallel flats cut into a round head, with a semicircular back so the corners cannot start a crack. Enter the opening, how deep the jaw bites and the handle length; the profile is a single closed outline with no separate head to glue on.",
  chips: [
    { label: "Jaw", value: "4 – 40 mm" },
    { label: "Length", value: "60 – 180 mm" },
    { label: "Thickness", value: "3 – 20 mm" },
  ],
  notes: [
    "The mouth is a slot of the entered width, cut to the jaw depth and closed by a half-round. The head is a full circle around it, so the two prongs are joined by solid material behind the slot rather than by a thin web.",
    "Print the wrench flat with the jaw in the bed plane, and use at least four perimeters. A printed open-end wrench is for light assembly work — the jaw will spread before a steel one would round off.",
  ],
  header: "Open End Wrench Designer - units: mm",
  fields: [
    { key: "length", label: "Overall length", kind: "length", section: "Wrench", default: "120", min: 60, max: 180 },
    { key: "headDiameter", label: "Head diameter", kind: "length", section: "Wrench", default: "34", min: 12, max: 80 },
    { key: "jawWidth", label: "Jaw opening", kind: "length", section: "Jaw", default: "14", min: 4, max: 40 },
    { key: "jawDepth", label: "Jaw depth", kind: "length", section: "Jaw", default: "18", min: 4, max: 50 },
    { key: "handleWidth", label: "Handle width", kind: "length", section: "Wrench", default: "16", min: 6, max: 40 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Wrench", default: "8", min: 3, max: 20 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    headDiameterMm: rawLength(raw, "headDiameter"),
    jawWidthMm: rawLength(raw, "jawWidth"),
    jawDepthMm: rawLength(raw, "jawDepth"),
    handleWidthMm: rawLength(raw, "handleWidth"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 60, 180);
    pushRange(errors, units, "headDiameter", "Head diameter", p.headDiameterMm, 12, 80);
    pushRange(errors, units, "jawWidth", "Jaw opening", p.jawWidthMm, 4, 40);
    pushRange(errors, units, "jawDepth", "Jaw depth", p.jawDepthMm, 4, 50);
    pushRange(errors, units, "handleWidth", "Handle width", p.handleWidthMm, 6, 40);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const headRadius = p.headDiameterMm / 2;
    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);
    if (p.jawWidthMm >= p.headDiameterMm * 0.9) {
      errors.push({ field: "jawWidth", level: "error", message: "The jaw opening leaves no prong on either side." });
    }
    if (p.jawDepthMm >= headRadius * 1.6) {
      errors.push({ field: "jawDepth", level: "error", message: "The jaw cuts past the back of the head." });
    }
    if (p.handleWidthMm >= p.headDiameterMm * 0.9) {
      errors.push({ field: "handleWidth", level: "error", message: "The handle is as wide as the head — narrow it so the transition is visible." });
    }
    if (p.lengthMm < p.headDiameterMm * 1.4) {
      errors.push({ field: "length", level: "error", message: "The handle is shorter than the head." });
    }
    if (p.jawDepthMm < p.jawWidthMm * 0.6) pushWarning(warnings, "jawDepth", "A shallow jaw slips off a tight nut.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Jaw opening", value: measure(p.jawWidthMm, units), source: "input" },
        { label: "Jaw depth", value: measure(p.jawDepthMm, units), source: "input" },
        { label: "Head Ø", value: measure(p.headDiameterMm, units), source: "input" },
        { label: "Prong width", value: measure((p.headDiameterMm - p.jawWidthMm) / 2, units), source: "calc" },
        { label: "Overall length", value: measure(p.lengthMm, units), source: "input" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.jawWidthMm, units)} jaw · ${measure(p.lengthMm, units)} long`,
        `OW${round(p.jawWidthMm, 1)}-${round(p.lengthMm, 0)}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Jaw", value: measure(p.jawWidthMm, units) },
          { label: "Head Ø", value: measure(p.headDiameterMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = openEndWrenchOutline({
      lengthMm: p.lengthMm,
      headDiameterMm: p.headDiameterMm,
      jawWidthMm: p.jawWidthMm,
      jawDepthMm: p.jawDepthMm,
      handleWidthMm: p.handleWidthMm,
    });
    return buildPrism({ rings: [outline, outline], thicknessMm: p.thicknessMm });
  },
  fileName: (p) => `open-end-wrench-${round(p.jawWidthMm, 1)}mm.stl`,
});

/* --------------------------------------------------------------- box end */

export const boxWrench: AnyDesign = defineDesign({
  id: "box-wrench",
  name: "Box-end wrench",
  family: "fixings",
  eyebrow: "Ring spanner",
  blurb: "A closed socket ring on a handle — it cannot slip off the nut.",
  lede: "The ring surrounds the fastener completely, so the load is spread over every corner instead of two. Choose a six- or twelve-point opening and the ring is cut to the exact across-flats size you enter.",
  chips: [
    { label: "Opening", value: "6 – 36 mm AF" },
    { label: "Points", value: "6 or 12" },
    { label: "Length", value: "70 – 180 mm" },
  ],
  notes: [
    "Across-flats sets the apothem of the opening, so its circumradius is AF/2 / cos(π/n). A twelve-point ring lets you re-engage every 30°, which matters where the handle cannot swing far.",
    "The ring has to be deep enough to take the nut's full height, but a printed ring is strongest when its wall is at least 3 mm. If the fastener is tight, print the ring in PETG rather than PLA.",
  ],
  header: "Box End Wrench Designer - units: mm",
  fields: [
    { key: "length", label: "Overall length", kind: "length", section: "Wrench", default: "140", min: 70, max: 180 },
    { key: "headDiameter", label: "Head diameter", kind: "length", section: "Wrench", default: "36", min: 14, max: 90 },
    { key: "opening", label: "Across flats", kind: "length", section: "Ring", default: "16", min: 4, max: 36 },
    { key: "points", label: "Points", kind: "select", section: "Ring", default: "12", options: [
      { value: "6", label: "6 point" },
      { value: "12", label: "12 point" },
    ] },
    { key: "handleWidth", label: "Handle width", kind: "length", section: "Wrench", default: "16", min: 6, max: 40 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Wrench", default: "8", min: 3, max: 20 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    headDiameterMm: rawLength(raw, "headDiameter"),
    openingMm: rawLength(raw, "opening"),
    points: rawCount(raw, "points"),
    handleWidthMm: rawLength(raw, "handleWidth"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 70, 180);
    pushRange(errors, units, "headDiameter", "Head diameter", p.headDiameterMm, 14, 90);
    pushRange(errors, units, "opening", "Across flats", p.openingMm, 4, 36);
    pushInteger(errors, "points", "Points", p.points, 6, 12);
    pushRange(errors, units, "handleWidth", "Handle width", p.handleWidthMm, 6, 40);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const headRadius = p.headDiameterMm / 2;
    const circumRadius = p.openingMm / 2 / Math.cos(Math.PI / p.points);
    checkSize(errors, units, "length", p.lengthMm, p.thicknessMm);
    if (headRadius - circumRadius < 2.5) {
      errors.push({ field: "headDiameter", level: "error", message: "The ring wall is under 2.5 mm — enlarge the head or use a smaller opening." });
    }
    if (p.points !== 6 && p.points !== 12) {
      errors.push({ field: "points", level: "error", message: "Use a six- or twelve-point opening." });
    }
    if (p.lengthMm < p.headDiameterMm * 1.4) errors.push({ field: "length", level: "error", message: "The handle is shorter than the head." });
    if (p.openingMm > 30) pushWarning(warnings, "opening", "Above 30 mm the printed ring needs a lot of torque to survive.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Across flats", value: measure(p.openingMm, units), source: "input" },
        { label: "Points", value: String(Math.round(p.points)), source: "calc" },
        { label: "Across corners", value: measure(circumRadius * 2, units), source: "calc" },
        { label: "Head Ø", value: measure(p.headDiameterMm, units), source: "input" },
        { label: "Ring wall", value: measure(Math.max(0, headRadius - circumRadius), units), source: "calc" },
        { label: "Overall length", value: measure(p.lengthMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.openingMm, units)} AF · ${Math.round(p.points)} point`,
        `BW${round(p.openingMm, 1)}-${Math.round(p.points)}`,
        p.lengthMm,
        p.thicknessMm,
        [
          { label: "Opening", value: measure(p.openingMm, units) },
          { label: "Head Ø", value: measure(p.headDiameterMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const parts = boxWrenchParts({
      lengthMm: p.lengthMm,
      headDiameterMm: p.headDiameterMm,
      headBoreMm: p.openingMm,
      handleWidthMm: p.handleWidthMm,
      points: p.points,
    });
    return buildPrism({
      rings: [parts.outline, parts.outline],
      holes: [parts.hole],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `box-wrench-${round(p.openingMm, 1)}af-${Math.round(p.points)}pt.stl`,
});

/* ------------------------------------------------------------ chain link */

export const chainLink: AnyDesign = defineDesign({
  id: "chain-link",
  name: "Chain link plate",
  family: "fixings",
  eyebrow: "Dog-bone",
  blurb: "A two-hole link plate for a roller-chain pitch.",
  lede: "Two pin holes on the chain pitch, joined by a stadium outline that keeps a constant wall around both. Enter the pitch, the pin diameter and the plate width for a link that matches a measured chain.",
  chips: [
    { label: "Pitch", value: "4 – 40 mm" },
    { label: "Plate width", value: "6 – 40 mm" },
    { label: "Pins", value: "1 – 12 mm" },
  ],
  notes: [
    "The outline is two equal end arcs joined by their common external tangents, so the plate is a true stadium and the wall is constant. Pin holes are centred on the pitch points; the wall at each hole is half the plate width minus the pin radius.",
    "Print link plates in the flat orientation with the pin axis vertical. The plate is a tension part, so orient the layers along its length — never across the two holes.",
  ],
  header: "Chain Link Plate Designer - units: mm",
  fields: [
    { key: "pitch", label: "Chain pitch", kind: "length", section: "Link", default: "12.7", min: 4, max: 40 },
    { key: "pinDiameter", label: "Pin hole", kind: "length", section: "Link", default: "4", min: 1, max: 12 },
    { key: "plateWidth", label: "Plate width", kind: "length", section: "Link", default: "16", min: 6, max: 40 },
    { key: "thickness", label: "Plate thickness", kind: "length", section: "Link", default: "2.4", min: 1, max: 8 },
  ],
  parse: (raw) => ({
    pitchMm: rawLength(raw, "pitch"),
    pinMm: rawLength(raw, "pinDiameter"),
    plateWidthMm: rawLength(raw, "plateWidth"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "pitch", "Chain pitch", p.pitchMm, 4, 40);
    pushRange(errors, units, "pinDiameter", "Pin hole", p.pinMm, 1, 12);
    pushRange(errors, units, "plateWidth", "Plate width", p.plateWidthMm, 6, 40);
    pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, 1, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const endRadius = p.plateWidthMm / 2;
    const wall = endRadius - p.pinMm / 2;
    const overallLength = p.pitchMm + p.plateWidthMm;
    checkSize(errors, units, "plateWidth", overallLength, p.thicknessMm);
    checkWall(errors, units, "pinDiameter", "wall around each pin", wall);
    if (p.pinMm >= p.plateWidthMm) {
      errors.push({ field: "pinDiameter", level: "error", message: "The pin holes meet in the middle of the plate." });
    }
    if (p.pitchMm <= p.pinMm + 1.2) {
      errors.push({ field: "pitch", level: "error", message: "The pin holes nearly meet; increase the pitch or reduce the pin hole." });
    }
    if (p.plateWidthMm > p.pitchMm + p.plateWidthMm * 0.9) pushWarning(warnings, "plateWidth", "The plate is very wide for its pitch.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Pitch", value: measure(p.pitchMm, units), source: "input" },
        { label: "Pin hole", value: measure(p.pinMm, units), source: "input" },
        { label: "Plate width", value: measure(p.plateWidthMm, units), source: "input" },
        { label: "Overall length", value: measure(overallLength, units), source: "calc" },
        { label: "Wall at pin", value: measure(Math.max(0, wall), units), source: "calc" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.pitchMm, units)} pitch · ${measure(p.plateWidthMm, units)} wide`,
        `CL${round(p.pitchMm, 1)}-${round(p.plateWidthMm, 0)}`,
        overallLength,
        p.thicknessMm,
        [
          { label: "Pitch", value: measure(p.pitchMm, units) },
          { label: "Plate width", value: measure(p.plateWidthMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.plateWidthMm / 2;
    const half = p.pitchMm / 2;
    const outline: Point2D[] = [];
    outline.push(...arcPoints(half, 0, radius, -Math.PI / 2, Math.PI / 2, 24));
    outline.push(...arcPoints(-half, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, 24));
    const holes = [
      circleOutline(p.pinMm / 2, 48).map((point) => ({ x: point.x + half, y: point.y })),
      circleOutline(p.pinMm / 2, 48).map((point) => ({ x: point.x - half, y: point.y })),
    ];
    return buildPrism({
      rings: [outline, outline],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `chain-link-${round(p.pitchMm, 2)}p.stl`,
});

/* ------------------------------------------------------------- saw blade */

export const sawBlade: AnyDesign = defineDesign({
  id: "saw-blade",
  name: "Saw blade",
  family: "fixings",
  eyebrow: "Hook and clearance",
  blurb: "A slitting blade with hook teeth and a real arbor hole.",
  lede: "Teeth are cut with a hooked leading face and a straight clearance back, then an arbor hole is bored through the plate. Set the diameter, tooth count, tooth depth and hook angle; the gullet geometry follows from them.",
  chips: [
    { label: "Teeth", value: "6 – 80" },
    { label: "Blade Ø", value: "40 – 180 mm" },
    { label: "Hook", value: "0 – 30°" },
  ],
  notes: [
    "Each tooth rises from the root circle on a straight hook face, runs across a small tip land, then falls back to the next root on a straight clearance face. The hook angle is measured forward from radial; a larger hook cuts faster but leaves a weaker tooth.",
    "This is a slitting blade for soft materials, not a woodworking saw. Run it slowly, take light cuts and never remove the guard from the machine it goes on.",
  ],
  header: "Saw Blade Designer - units: mm",
  fields: [
    { key: "diameter", label: "Blade diameter", kind: "length", section: "Blade", default: "100", min: 40, max: 180 },
    { key: "teeth", label: "Teeth", kind: "count", section: "Blade", default: "24", min: 6, max: 80 },
    { key: "toothDepth", label: "Tooth depth", kind: "length", section: "Tooth", default: "6", min: 1, max: 20 },
    { key: "hookAngle", label: "Hook angle", kind: "number", section: "Tooth", default: "12", min: 0, max: 30 },
    { key: "tipLand", label: "Tip land", kind: "length", section: "Tooth", default: "1.2", min: 0.2, max: 5 },
    { key: "arbor", label: "Arbor hole", kind: "length", section: "Blade", default: "10", min: 2, max: 40 },
    { key: "thickness", label: "Plate thickness", kind: "length", section: "Blade", default: "1.6", min: 0.8, max: 6 },
    { key: "slots", label: "Expansion slots", kind: "count", section: "Slots", default: "3", min: 0, max: 8 },
    { key: "slotLength", label: "Slot length", kind: "length", section: "Slots", default: "14", min: 4, max: 40 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slots", default: "3", min: 1.5, max: 8 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    teeth: rawCount(raw, "teeth"),
    toothDepthMm: rawLength(raw, "toothDepth"),
    hookAngleDeg: rawNumber(raw, "hookAngle"),
    tipLandMm: rawLength(raw, "tipLand"),
    arborMm: rawLength(raw, "arbor"),
    thicknessMm: rawLength(raw, "thickness"),
    slots: rawCount(raw, "slots"),
    slotLengthMm: rawLength(raw, "slotLength"),
    slotWidthMm: rawLength(raw, "slotWidth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Blade diameter", p.diameterMm, 40, 180);
    pushInteger(errors, "teeth", "Teeth", p.teeth, 6, 80);
    pushRange(errors, units, "toothDepth", "Tooth depth", p.toothDepthMm, 1, 20);
    pushRange(errors, units, "hookAngle", "Hook angle", p.hookAngleDeg, 0, 30, false);
    pushRange(errors, units, "tipLand", "Tip land", p.tipLandMm, 0.2, 5);
    pushRange(errors, units, "arbor", "Arbor hole", p.arborMm, 2, 40);
    pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, 0.8, 6);
    pushInteger(errors, "slots", "Expansion slots", p.slots, 0, 8);
    pushRange(errors, units, "slotLength", "Slot length", p.slotLengthMm, 4, 40);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 1.5, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const radius = p.diameterMm / 2;
    const root = radius - p.toothDepthMm;
    const slots = Math.max(0, Math.round(p.slots));
    const slotRadius = (p.arborMm / 2 + root) / 2;
    const slotHalf = (p.slotLengthMm + p.slotWidthMm) / 2;
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);
    checkWall(errors, units, "arbor", "plate around the arbor", root - p.arborMm / 2);
    if (slots > 0) {
      if (slotRadius - slotHalf < p.arborMm / 2 + 2) errors.push({ field: "slotLength", level: "error", message: "The expansion slots run into the arbor hole." });
      if (slotRadius + slotHalf > root - 2) errors.push({ field: "slotLength", level: "error", message: "The expansion slots reach the gullets." });
      const chord = 2 * slotRadius * Math.sin(Math.PI / slots);
      if (slots > 1 && chord < p.slotWidthMm + 2) errors.push({ field: "slots", level: "error", message: "The expansion slots run into each other." });
    }
    if (p.toothDepthMm >= radius - p.arborMm / 2 - 2) {
      errors.push({ field: "toothDepth", level: "error", message: "The gullets reach the arbor hole." });
    }
    if (p.thicknessMm < 1.2) pushWarning(warnings, "thickness", "A blade under 1.2 mm thick will flutter in a cut.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Blade Ø", value: measure(p.diameterMm, units), source: "input" },
        { label: "Teeth", value: String(Math.round(p.teeth)), source: "input" },
        { label: "Tooth depth", value: measure(p.toothDepthMm, units), source: "input" },
        { label: "Root Ø", value: measure(Math.max(0, root * 2), units), source: "calc" },
        { label: "Hook", value: deg(p.hookAngleDeg), source: "input" },
        { label: "Arbor", value: measure(p.arborMm, units), source: "input" },
        { label: "Slots", value: slots > 0 ? `${slots} × ${measure(p.slotLengthMm, units)}` : "none", source: "input" },
        { label: "Plate", value: measure(p.thicknessMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.teeth)} teeth · ${measure(p.diameterMm, units)}`,
        `SB${round(p.diameterMm, 0)}-${Math.round(p.teeth)}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Blade Ø", value: measure(p.diameterMm, units) },
          { label: "Root Ø", value: measure(Math.max(0, root * 2), units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = sawBladeOutline({
      teeth: p.teeth,
      outerRadiusMm: p.diameterMm / 2,
      toothDepthMm: p.toothDepthMm,
      hookAngleDeg: p.hookAngleDeg,
      tipLandMm: p.tipLandMm,
    });
    const holes = boreHoles(p.arborMm);
    const slots = Math.max(0, Math.round(p.slots));
    const root = p.diameterMm / 2 - p.toothDepthMm;
    const slotRadius = (p.arborMm / 2 + root) / 2;
    for (let i = 0; i < slots; i += 1) {
      const angle = (Math.PI * 2 * i) / slots;
      holes.push(
        obround(
          slotRadius * Math.cos(angle),
          slotRadius * Math.sin(angle),
          p.slotLengthMm,
          p.slotWidthMm,
          angle,
        ),
      );
    }
    return buildPrism({
      rings: [outline, outline],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `saw-blade-${round(p.diameterMm, 0)}d-${Math.round(p.teeth)}t.stl`,
});

/* -------------------------------------------------------------- handwheel */

export const handwheel: AnyDesign = defineDesign({
  id: "handwheel",
  name: "Handwheel",
  family: "fixings",
  eyebrow: "Rim and spokes",
  blurb: "A spoked wheel with real openings between the spokes.",
  lede: "A rim, a hub and a set of radial spokes, with the gaps cut right through. Set the rim width, spoke width and count and the cut-outs follow; each opening is an annular sector, so the spokes are evenly loaded.",
  chips: [
    { label: "Spokes", value: "3 – 10" },
    { label: "Wheel Ø", value: "40 – 180 mm" },
    { label: "Rim", value: "3 – 30 mm" },
  ],
  notes: [
    "The openings are separate through-holes between the hub and the rim, which is why the wheel is one connected shell rather than a set of glued spokes. Each gap is bounded by two circular arcs and two radial spoke sides.",
    "A printed handwheel is strongest when it is printed flat: the layers then run in the plane of the wheel and the spokes are loaded along their length rather than across the layer bonds.",
  ],
  header: "Handwheel Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Wheel diameter", kind: "length", section: "Wheel", default: "100", min: 40, max: 180 },
    { key: "hubDiameter", label: "Hub diameter", kind: "length", section: "Hub", default: "30", min: 8, max: 100 },
    { key: "bore", label: "Bore", kind: "length", section: "Hub", default: "10", min: 1, max: 60 },
    { key: "rimWidth", label: "Rim width", kind: "length", section: "Rim", default: "10", min: 3, max: 30 },
    { key: "spokeWidth", label: "Spoke width", kind: "length", section: "Rim", default: "8", min: 3, max: 30 },
    { key: "spokes", label: "Spokes", kind: "count", section: "Rim", default: "4", min: 3, max: 10 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Wheel", default: "12", min: 3, max: 40 },
  ],
  parse: (raw) => ({
    outerDiameterMm: rawLength(raw, "outerDiameter"),
    hubDiameterMm: rawLength(raw, "hubDiameter"),
    boreMm: rawLength(raw, "bore"),
    rimWidthMm: rawLength(raw, "rimWidth"),
    spokeWidthMm: rawLength(raw, "spokeWidth"),
    spokes: rawCount(raw, "spokes"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Wheel diameter", p.outerDiameterMm, 40, 180);
    pushRange(errors, units, "hubDiameter", "Hub diameter", p.hubDiameterMm, 8, 100);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 60);
    pushRange(errors, units, "rimWidth", "Rim width", p.rimWidthMm, 3, 30);
    pushRange(errors, units, "spokeWidth", "Spoke width", p.spokeWidthMm, 3, 30);
    pushInteger(errors, "spokes", "Spokes", p.spokes, 3, 10);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const radius = p.outerDiameterMm / 2;
    const hubRadius = p.hubDiameterMm / 2;
    checkSize(errors, units, "outerDiameter", p.outerDiameterMm, p.thicknessMm);
    checkWall(errors, units, "bore", "hub around the bore", hubRadius - p.boreMm / 2);
    if (radius - p.rimWidthMm <= hubRadius + 1) {
      errors.push({ field: "rimWidth", level: "error", message: "The rim reaches the hub — there is no room for spokes." });
    }
    const halfAngle = p.spokeWidthMm / 2 / Math.max(0.1, hubRadius);
    if (Math.PI / p.spokes - halfAngle < 0.02) {
      errors.push({ field: "spokes", level: "error", message: "The spokes fill the space between the hub and rim." });
    }
    if (p.spokeWidthMm > (radius - p.rimWidthMm) * 1.4) pushWarning(warnings, "spokeWidth", "The spokes are wide relative to the openings.");
    if (errors.length > 0) return emptyResult(errors, warnings);

    const parts = handwheelParts({
      outerDiameterMm: p.outerDiameterMm,
      hubDiameterMm: p.hubDiameterMm,
      boreMm: p.boreMm,
      rimWidthMm: p.rimWidthMm,
      spokeWidthMm: p.spokeWidthMm,
      spokes: p.spokes,
    });

    return {
      errors,
      warnings,
      readout: [
        { label: "Wheel Ø", value: measure(p.outerDiameterMm, units), source: "input" },
        { label: "Hub Ø", value: measure(p.hubDiameterMm, units), source: "input" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Rim width", value: measure(p.rimWidthMm, units), source: "input" },
        { label: "Spokes", value: String(Math.round(p.spokes)), source: "input" },
        { label: "Gap area", value: `${round(parts.gapAreaMm2 / 100, 2)} cm²`, source: "calc" },
        { label: "Rim inner Ø", value: measure((radius - p.rimWidthMm) * 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${Math.round(p.spokes)} spokes · ${measure(p.outerDiameterMm, units)}`,
        `HW${round(p.outerDiameterMm, 0)}-${Math.round(p.spokes)}`,
        p.outerDiameterMm,
        p.thicknessMm,
        [
          { label: "Wheel Ø", value: measure(p.outerDiameterMm, units) },
          { label: "Rim width", value: measure(p.rimWidthMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const parts = handwheelParts({
      outerDiameterMm: p.outerDiameterMm,
      hubDiameterMm: p.hubDiameterMm,
      boreMm: p.boreMm,
      rimWidthMm: p.rimWidthMm,
      spokeWidthMm: p.spokeWidthMm,
      spokes: p.spokes,
    });
    return buildPrism({
      rings: [parts.outline, parts.outline],
      holes: parts.holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `handwheel-${round(p.outerDiameterMm, 0)}d-${Math.round(p.spokes)}s.stl`,
});

/* ----------------------------------------------------------------- flange */

export const flange: AnyDesign = defineDesign({
  id: "flange",
  name: "Bolt flange",
  family: "fixings",
  eyebrow: "Bolt circle",
  blurb: "A bored disc with an evenly spaced bolt circle.",
  lede: "Set the outer diameter, the bore and the bolt circle, and the holes are placed at exact angular spacing around it. The readout gives the edge and web walls, so you can see whether the pattern leaves enough material before you print.",
  chips: [
    { label: "Bolts", value: "2 – 12" },
    { label: "Outer Ø", value: "30 – 180 mm" },
    { label: "Bolt circle", value: "10 – 170 mm" },
  ],
  notes: [
    "Bolt holes are on the entered pitch circle at 360°/n spacing, starting on +X. The wall checks are the radial distance from each hole to the outside and to the bore — the same two numbers that decide whether a gasket will crush the flange or crack it.",
    "For a real pipe flange, the bolt circle and hole size come from the standard, not from taste. Measure the mating flange across the bolt holes and copy those numbers exactly.",
  ],
  header: "Bolt Flange Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outer diameter", kind: "length", section: "Flange", default: "80", min: 30, max: 180 },
    { key: "bore", label: "Bore", kind: "length", section: "Flange", default: "30", min: 2, max: 120 },
    { key: "boltCircle", label: "Bolt circle", kind: "length", section: "Bolts", default: "60", min: 10, max: 170 },
    { key: "boltHole", label: "Bolt hole", kind: "length", section: "Bolts", default: "8", min: 2, max: 20 },
    { key: "bolts", label: "Bolts", kind: "count", section: "Bolts", default: "6", min: 2, max: 12 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Flange", default: "8", min: 2, max: 40 },
  ],
  parse: (raw) => ({
    outerDiameterMm: rawLength(raw, "outerDiameter"),
    boreMm: rawLength(raw, "bore"),
    boltCircleMm: rawLength(raw, "boltCircle"),
    boltHoleMm: rawLength(raw, "boltHole"),
    bolts: rawCount(raw, "bolts"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outer diameter", p.outerDiameterMm, 30, 180);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 120);
    pushRange(errors, units, "boltCircle", "Bolt circle", p.boltCircleMm, 10, 170);
    pushRange(errors, units, "boltHole", "Bolt hole", p.boltHoleMm, 2, 20);
    pushInteger(errors, "bolts", "Bolts", p.bolts, 2, 12);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const radius = p.outerDiameterMm / 2;
    const boltRadius = p.boltCircleMm / 2;
    const boreRadius = p.boreMm / 2;
    const edgeWall = radius - boltRadius - p.boltHoleMm / 2;
    const webWall = boltRadius - p.boltHoleMm / 2 - boreRadius;
    checkSize(errors, units, "outerDiameter", p.outerDiameterMm, p.thicknessMm);
    checkWall(errors, units, "boltCircle", "edge outside the bolt holes", edgeWall);
    checkWall(errors, units, "boltHole", "web between the bore and the bolts", webWall);
    if (p.bolts > 8) pushWarning(warnings, "bolts", "Nine or more bolts leave thin material between adjacent holes.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Outer Ø", value: measure(p.outerDiameterMm, units), source: "input" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Bolt circle", value: measure(p.boltCircleMm, units), source: "input" },
        { label: "Bolts", value: String(Math.round(p.bolts)), source: "input" },
        { label: "Bolt hole", value: measure(p.boltHoleMm, units), source: "input" },
        { label: "Edge wall", value: measure(Math.max(0, edgeWall), units), source: "calc" },
        { label: "Web wall", value: measure(Math.max(0, webWall), units), source: "calc" },
        { label: "Bolt spacing", value: measure((TWO_PI * boltRadius) / p.bolts, units), source: "calc" },
      ],
      preview: previewOf(
        `${Math.round(p.bolts)} × ${measure(p.boltHoleMm, units)} on ${measure(p.boltCircleMm, units)}`,
        `FL${round(p.outerDiameterMm, 0)}-${Math.round(p.bolts)}`,
        p.outerDiameterMm,
        p.thicknessMm,
        [
          { label: "Outer Ø", value: measure(p.outerDiameterMm, units) },
          { label: "Bolt circle", value: measure(p.boltCircleMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const boltRadius = p.boltCircleMm / 2;
    const holes = boreHoles(p.boreMm);
    for (let i = 0; i < p.bolts; i += 1) {
      const angle = (TWO_PI * i) / p.bolts;
      const cx = boltRadius * Math.cos(angle);
      const cy = boltRadius * Math.sin(angle);
      holes.push(
        circleOutline(p.boltHoleMm / 2, 40).map((point) => ({ x: point.x + cx, y: point.y + cy })),
      );
    }
    const outline = circle(p.outerDiameterMm / 2);
    return buildPrism({
      rings: [outline, outline],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `flange-${round(p.outerDiameterMm, 0)}d-${Math.round(p.bolts)}b.stl`,
});

/* --------------------------------------------------------- mounting plate */

export const mountingPlate: AnyDesign = defineDesign({
  id: "mounting-plate",
  name: "Mounting plate",
  family: "fixings",
  eyebrow: "Rounded corners",
  blurb: "A rounded plate with four corner holes and a matching inset.",
  lede: "A rectangular plate with radiused corners and a bolt hole near each one. Length, width, corner radius and hole inset are all live; the designer checks that every hole clears the rounded corner by a printable wall.",
  chips: [
    { label: "Plate", value: "20 – 180 mm" },
    { label: "Holes", value: "4 corner" },
    { label: "Corner radius", value: "0 – 30 mm" },
  ],
  notes: [
    "Holes sit at ±(length/2 − inset), ±(width/2 − inset). The corner arcs are tangent to both edges, so a hole near a corner can break out through the arc even when it looks clear on the straight edges — the validator measures the real distance to the finished outline.",
    "Counterbores and slots are a machining feature rather than a print feature, so this plate keeps plain through-holes. Print it flat; if the part carries a load, add ribs on the underside instead of thickening the whole plate.",
  ],
  header: "Mounting Plate Designer - units: mm",
  fields: [
    { key: "length", label: "Length", kind: "length", section: "Plate", default: "100", min: 20, max: 180 },
    { key: "width", label: "Width", kind: "length", section: "Plate", default: "60", min: 20, max: 180 },
    { key: "cornerRadius", label: "Corner radius", kind: "length", section: "Plate", default: "8", min: 0, max: 30 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Plate", default: "5", min: 2, max: 30 },
    { key: "holeDiameter", label: "Hole diameter", kind: "length", section: "Holes", default: "5", min: 1, max: 20 },
    { key: "inset", label: "Hole inset", kind: "length", section: "Holes", default: "12", min: 2, max: 80 },
  ],
  parse: (raw) => ({
    lengthMm: rawLength(raw, "length"),
    widthMm: rawLength(raw, "width"),
    cornerRadiusMm: rawLength(raw, "cornerRadius"),
    thicknessMm: rawLength(raw, "thickness"),
    holeMm: rawLength(raw, "holeDiameter"),
    insetMm: rawLength(raw, "inset"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "length", "Length", p.lengthMm, 20, 180);
    pushRange(errors, units, "width", "Width", p.widthMm, 20, 180);
    pushRange(errors, units, "cornerRadius", "Corner radius", p.cornerRadiusMm, 0, 30);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 30);
    pushRange(errors, units, "holeDiameter", "Hole diameter", p.holeMm, 1, 20);
    pushRange(errors, units, "inset", "Hole inset", p.insetMm, 2, 80);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", Math.max(p.lengthMm, p.widthMm), p.thicknessMm);
    if (p.cornerRadiusMm > Math.min(p.lengthMm, p.widthMm) / 2 - 0.2) {
      errors.push({ field: "cornerRadius", level: "error", message: "The corner radius is larger than half the short side." });
    }
    if (p.insetMm <= p.holeMm / 2) {
      errors.push({ field: "inset", level: "error", message: "The holes are cut by the plate edge." });
    }

    const outline = roundedRect(p.lengthMm, p.widthMm, p.cornerRadiusMm, 8);
    const centres = [
      { x: p.lengthMm / 2 - p.insetMm, y: p.widthMm / 2 - p.insetMm },
      { x: -(p.lengthMm / 2 - p.insetMm), y: p.widthMm / 2 - p.insetMm },
      { x: -(p.lengthMm / 2 - p.insetMm), y: -(p.widthMm / 2 - p.insetMm) },
      { x: p.lengthMm / 2 - p.insetMm, y: -(p.widthMm / 2 - p.insetMm) },
    ];
    for (const centre of centres) {
      const clearance = distanceToRing(centre, outline) - p.holeMm / 2;
      if (clearance < 1.6 - 1e-9) {
        errors.push({
          field: "inset",
          level: "error",
          message: `A corner hole leaves ${measure(Math.max(0, clearance), units)} to the edge — increase the inset or reduce the hole.`,
        });
        break;
      }
    }
    const spacingX = p.lengthMm - 2 * p.insetMm;
    const spacingY = p.widthMm - 2 * p.insetMm;
    if (spacingX <= p.holeMm + 1 || spacingY <= p.holeMm + 1) {
      errors.push({ field: "inset", level: "error", message: "The corner holes run into each other; reduce the inset or the hole." });
    }
    if (p.insetMm > Math.min(p.lengthMm, p.widthMm) * 0.35) pushWarning(warnings, "inset", "The holes are far inboard; the plate may rock on its bolts.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Length", value: measure(p.lengthMm, units), source: "input" },
        { label: "Width", value: measure(p.widthMm, units), source: "input" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
        { label: "Corner radius", value: measure(p.cornerRadiusMm, units), source: "input" },
        { label: "Hole Ø", value: measure(p.holeMm, units), source: "input" },
        { label: "Hole inset", value: measure(p.insetMm, units), source: "input" },
        { label: "Spacing X", value: measure(spacingX, units), source: "calc" },
        { label: "Spacing Y", value: measure(spacingY, units), source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.lengthMm, units)} × ${measure(p.widthMm, units)} plate`,
        `MP${round(p.lengthMm, 0)}X${round(p.widthMm, 0)}`,
        Math.max(p.lengthMm, p.widthMm),
        p.thicknessMm,
        [
          { label: "Length", value: measure(p.lengthMm, units) },
          { label: "Width", value: measure(p.widthMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = roundedRect(p.lengthMm, p.widthMm, p.cornerRadiusMm, 8);
    const holes: Point2D[][] = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx * (p.lengthMm / 2 - p.insetMm);
        const cy = sy * (p.widthMm / 2 - p.insetMm);
        holes.push(
          circleOutline(p.holeMm / 2, 40).map((point) => ({ x: point.x + cx, y: point.y + cy })),
        );
      }
    }
    return buildPrism({
      rings: [outline, outline],
      holes,
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `mounting-plate-${round(p.lengthMm, 0)}x${round(p.widthMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- hex nut */

export const hexNut: AnyDesign = defineDesign({
  id: "hex-nut",
  name: "Hex nut",
  family: "fixings",
  eyebrow: "Across flats",
  blurb: "A plain hex nut sized by its across-flats dimension.",
  lede: "Enter the across-flats size — the number stamped on the spanner — and the hexagon is built from it, with a round bore through the middle. Thickness and bore are independent, so it can be a standard nut or a tall coupling nut.",
  chips: [
    { label: "Across flats", value: "4 – 80 mm" },
    { label: "Thickness", value: "2 – 60 mm" },
    { label: "Bore", value: "2 – 60 mm" },
  ],
  notes: [
    "A regular hexagon with across-flats AF has circumradius AF/√3, because the apothem is AF/2. The outline is generated at that exact radius, so the flats sit at the entered distance rather than being approximated by a circle.",
    "The bore is a clearance hole for the thread, not a modelled thread. For a printed nut, make the bore 0.3 mm larger than the bolt's major diameter and use a slightly coarser layer height so the flats do not sag.",
  ],
  header: "Hex Nut Designer - units: mm",
  fields: [
    { key: "acrossFlats", label: "Across flats", kind: "length", section: "Nut", default: "17", min: 4, max: 80 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Nut", default: "8", min: 2, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Nut", default: "10.2", min: 2, max: 60 },
    { key: "chamfer", label: "Face chamfer", kind: "length", section: "Nut", default: "0.8", min: 0, max: 4 },
  ],
  parse: (raw) => ({
    acrossFlatsMm: rawLength(raw, "acrossFlats"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "acrossFlats", "Across flats", p.acrossFlatsMm, 4, 80);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 60);
    pushRange(errors, units, "chamfer", "Face chamfer", p.chamferMm, 0, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const circumRadius = p.acrossFlatsMm / Math.sqrt(3);
    checkSize(errors, units, "acrossFlats", p.acrossFlatsMm, p.thicknessMm);
    checkWall(errors, units, "bore", "wall at the flats", p.acrossFlatsMm / 2 - p.boreMm / 2);
    if (p.chamferMm * 2 >= p.thicknessMm) errors.push({ field: "chamfer", level: "error", message: "The two face chamfers meet in the middle." });
    if (p.chamferMm >= p.acrossFlatsMm / 2) errors.push({ field: "chamfer", level: "error", message: "The chamfer reaches the bore." });
    if (p.thicknessMm < p.acrossFlatsMm * 0.4) pushWarning(warnings, "thickness", "A nut much thinner than its width strips easily.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Across flats", value: measure(p.acrossFlatsMm, units), source: "input" },
        { label: "Across corners", value: measure(circumRadius * 2, units), source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Wall at flat", value: measure(Math.max(0, p.acrossFlatsMm / 2 - p.boreMm / 2), units), source: "calc" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
        { label: "Face chamfer", value: measure(p.chamferMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.acrossFlatsMm, units)} AF hex`,
        `HN${round(p.acrossFlatsMm, 1)}-${round(p.boreMm, 1)}`,
        p.acrossFlatsMm,
        p.thicknessMm,
        [
          { label: "Across flats", value: measure(p.acrossFlatsMm, units) },
          { label: "Bore", value: measure(p.boreMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = regularPolygon(6, p.acrossFlatsMm / Math.sqrt(3), 0);
    const { rings, fractions } = chamferRings(outline, p.thicknessMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: boreHoles(p.boreMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `hex-nut-${round(p.acrossFlatsMm, 1)}af.stl`,
});

/* ---------------------------------------------------------------- washer */

export const washer: AnyDesign = defineDesign({
  id: "washer",
  name: "Washer",
  family: "fixings",
  eyebrow: "Load spreader",
  blurb: "A flat annulus sized by its outside and inside diameters.",
  lede: "A plain washer is the simplest part in the library and the one most often printed slightly wrong. Set the outside and inside diameters and the thickness, and the annulus is exact — no faceting on either edge.",
  chips: [
    { label: "Outer Ø", value: "5 – 180 mm" },
    { label: "Inner Ø", value: "2 – 120 mm" },
    { label: "Thickness", value: "0.5 – 20 mm" },
  ],
  notes: [
    "Both circles are true annulus walls: the bore is a second ring with reversed winding, so the hole is exactly the entered diameter and the flat faces stay flat. That makes the washer a good test print for hole shrinkage on a new machine.",
    "Measure the printed bore before you print a batch. An FDM hole typically comes out 0.1–0.2 mm under size, so a washer that should clear a bolt is often drawn 0.2 mm larger.",
  ],
  header: "Washer Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outer diameter", kind: "length", section: "Washer", default: "20", min: 5, max: 180 },
    { key: "innerDiameter", label: "Inner diameter", kind: "length", section: "Washer", default: "8.4", min: 2, max: 120 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Washer", default: "1.6", min: 0.5, max: 20 },
    { key: "chamfer", label: "Edge break", kind: "length", section: "Washer", default: "0.2", min: 0, max: 2 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    innerMm: rawLength(raw, "innerDiameter"),
    thicknessMm: rawLength(raw, "thickness"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outer diameter", p.outerMm, 5, 180);
    pushRange(errors, units, "innerDiameter", "Inner diameter", p.innerMm, 2, 120);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 0.5, 20);
    pushRange(errors, units, "chamfer", "Edge break", p.chamferMm, 0, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "outerDiameter", p.outerMm, p.thicknessMm);
    checkWall(errors, units, "innerDiameter", "washer face", (p.outerMm - p.innerMm) / 2);
    if (p.chamferMm * 2 >= p.thicknessMm) errors.push({ field: "chamfer", level: "error", message: "The two edge breaks meet in the middle." });
    if (p.thicknessMm < 0.8) pushWarning(warnings, "thickness", "Under 0.8 mm the washer curls as it cools.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Outer Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Inner Ø", value: measure(p.innerMm, units), source: "input" },
        { label: "Face width", value: measure((p.outerMm - p.innerMm) / 2, units), source: "calc" },
        { label: "Thickness", value: measure(p.thicknessMm, units), source: "input" },
        { label: "Bearing area", value: `${round((Math.PI / 4) * (p.outerMm ** 2 - p.innerMm ** 2) / 100, 2)} cm²`, source: "calc" },
        { label: "Edge break", value: measure(p.chamferMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.outerMm, units)} × ${measure(p.innerMm, units)}`,
        `WA${round(p.outerMm, 0)}-${round(p.innerMm, 1)}`,
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
    const outline = circle(p.outerMm / 2);
    const { rings, fractions } = chamferRings(outline, p.thicknessMm, p.chamferMm);
    return buildPrism({
      rings,
      ringFractions: fractions,
      holes: boreHoles(p.innerMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `washer-${round(p.outerMm, 1)}-${round(p.innerMm, 1)}.stl`,
});

export const prismParts: AnyDesign[] = [
  wingNut,
  starKnob,
  knurledKnob,
  openEndWrench,
  boxWrench,
  chainLink,
  sawBlade,
  handwheel,
  flange,
  mountingPlate,
  hexNut,
  washer,
];
