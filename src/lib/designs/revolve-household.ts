/** Second library, part 4: turned household and desk parts. */

import { buildRevolution, ProfileBuilder } from "@/lib/kit/revolve";
import { segmentsForRadius } from "@/lib/kit/outlines";
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

function revolve(profile: Point2D[], maxRadius: number) {
  return buildRevolution({
    profile,
    segments: Math.min(256, Math.max(48, segmentsForRadius(maxRadius))),
  });
}

/* -------------------------------------------------------------- candlestick */

export const candlestick: AnyDesign = defineDesign({
  id: "candlestick",
  name: "Candlestick",
  family: "vessels",
  eyebrow: "Turned profile",
  blurb: "A weighted candlestick with a real candle socket.",
  lede: "A wide foot, a slim stem and a socket bored to the candle diameter, turned as one solid of revolution.",
  chips: [
    { label: "Height", value: "40 – 170 mm" },
    { label: "Socket", value: "10 – 60 mm" },
    { label: "Base", value: "20 – 140 mm" },
  ],
  notes: [
    "The foot, stem and socket are one closed profile, so the part is a single solid with a flat base and a socket at the top. The socket floor is left solid: a candle sits on it rather than dropping through.",
    "A tall candlestick is unstable unless the base is wide. Keep the base diameter at least a third of the height, and weight the foot with a steel washer if it will be knocked.",
  ],
  header: "Candlestick Designer - units: mm",
  fields: [
    { key: "height", label: "Overall height", kind: "length", section: "Stick", default: "90", min: 40, max: 170 },
    { key: "base", label: "Base diameter", kind: "length", section: "Stick", default: "60", min: 20, max: 140 },
    { key: "stem", label: "Stem diameter", kind: "length", section: "Stick", default: "10", min: 3, max: 30 },
    { key: "socket", label: "Socket diameter", kind: "length", section: "Socket", default: "24", min: 10, max: 60 },
    { key: "socketDepth", label: "Socket depth", kind: "length", section: "Socket", default: "14", min: 3, max: 60 },
    { key: "wall", label: "Socket wall", kind: "length", section: "Socket", default: "3", min: 1, max: 8 },
  ],
  parse: (raw) => ({
    heightMm: rawLength(raw, "height"),
    baseMm: rawLength(raw, "base"),
    stemMm: rawLength(raw, "stem"),
    socketMm: rawLength(raw, "socket"),
    depthMm: rawLength(raw, "socketDepth"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "height", "Overall height", p.heightMm, 40, 170);
    pushRange(errors, units, "base", "Base diameter", p.baseMm, 20, 140);
    pushRange(errors, units, "stem", "Stem diameter", p.stemMm, 3, 30);
    pushRange(errors, units, "socket", "Socket diameter", p.socketMm, 10, 60);
    pushRange(errors, units, "socketDepth", "Socket depth", p.depthMm, 3, 60);
    pushRange(errors, units, "wall", "Socket wall", p.wallMm, 1, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "base", p.baseMm, p.heightMm);
    checkWall(errors, units, "wall", "socket wall", p.wallMm);
    if (p.depthMm >= p.heightMm * 0.6) errors.push({ field: "socketDepth", level: "error", message: "The socket reaches most of the way down the stick." });
    if (p.socketMm / 2 + p.wallMm >= p.baseMm / 2 - 2) errors.push({ field: "socket", level: "error", message: "The socket is as wide as the base." });
    if (p.baseMm < p.heightMm / 3) warnings.push({ field: "base", level: "warning", message: "A base under a third of the height tips easily." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Base Ø", value: U(p.baseMm, units), source: "input" },
        { label: "Stem Ø", value: U(p.stemMm, units), source: "input" },
        { label: "Socket Ø", value: U(p.socketMm, units), source: "input" },
        { label: "Socket depth", value: U(p.depthMm, units), source: "input" },
        { label: "Foot ratio", value: `${R(p.heightMm / p.baseMm, 1)} : 1`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.heightMm, units)} tall · ${U(p.baseMm, units)} base`,
        `CS${R(p.heightMm, 0)}-${R(p.baseMm, 0)}`,
        p.baseMm,
        p.heightMm,
        [
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Base", value: U(p.baseMm, units) },
          { label: "Socket", value: U(p.socketMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const baseR = p.baseMm / 2;
    const stemR = p.stemMm / 2;
    const socketR = p.socketMm / 2;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: baseR, y: 0 });
    builder.line({ x: baseR, y: Math.min(4, p.heightMm * 0.06) });
    builder.line({ x: Math.max(stemR + 2, baseR * 0.3), y: Math.min(12, p.heightMm * 0.16) });
    const stemTop = Math.max(p.depthMm + 10, p.heightMm - p.depthMm - 12);
    builder.line({ x: stemR, y: stemTop });
    builder.line({ x: socketR + p.wallMm, y: Math.min(p.heightMm - p.depthMm - 2, stemTop + 4) });
    builder.line({ x: socketR + p.wallMm, y: p.heightMm });
    builder.line({ x: socketR, y: p.heightMm });
    builder.line({ x: socketR, y: p.heightMm - p.depthMm });
    builder.line({ x: 0, y: p.heightMm - p.depthMm });
    return revolve(builder.build(), baseR);
  },
  fileName: (p) => `candlestick-${R(p.heightMm, 0)}-${R(p.baseMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- egg cup */

export const eggCup: AnyDesign = defineDesign({
  id: "egg-cup",
  name: "Egg cup",
  family: "vessels",
  eyebrow: "Breakfast",
  blurb: "A footed cup with a rounded egg seat.",
  lede: "A flared foot and a cup sized to a hen's egg, with a floor thick enough that the egg does not touch the table.",
  chips: [
    { label: "Cup Ø", value: "30 – 70 mm" },
    { label: "Height", value: "25 – 100 mm" },
    { label: "Wall", value: "1.5 – 6 mm" },
  ],
  notes: [
    "The cup is a straight taper with a flat floor, and the foot is a cone under it. Both are part of one closed profile, so the cup is hollow and the foot is solid in a single turn.",
    "A 44 mm cup suits a medium egg; a large egg wants about 48 mm. Print it in food-safe filament if it will touch the egg, or line it with a paper case.",
  ],
  header: "Egg Cup Designer - units: mm",
  fields: [
    { key: "cup", label: "Cup diameter", kind: "length", section: "Cup", default: "46", min: 30, max: 70 },
    { key: "height", label: "Overall height", kind: "length", section: "Cup", default: "45", min: 25, max: 100 },
    { key: "foot", label: "Foot diameter", kind: "length", section: "Foot", default: "36", min: 15, max: 70 },
    { key: "depth", label: "Cup depth", kind: "length", section: "Cup", default: "28", min: 8, max: 70 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Cup", default: "3", min: 1.5, max: 6 },
  ],
  parse: (raw) => ({
    cupMm: rawLength(raw, "cup"),
    heightMm: rawLength(raw, "height"),
    footMm: rawLength(raw, "foot"),
    depthMm: rawLength(raw, "depth"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cup", "Cup diameter", p.cupMm, 30, 70);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 25, 100);
    pushRange(errors, units, "foot", "Foot diameter", p.footMm, 15, 70);
    pushRange(errors, units, "depth", "Cup depth", p.depthMm, 8, 70);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "cup", p.cupMm, p.heightMm);
    const floor = p.heightMm - p.depthMm;
    checkWall(errors, units, "wall", "cup floor", floor);
    if (p.footMm > p.cupMm) errors.push({ field: "foot", level: "error", message: "The foot is wider than the cup." });
    if (floor < p.wallMm) errors.push({ field: "depth", level: "error", message: "The cup is deeper than it is tall." });
    if (p.depthMm < p.cupMm * 0.45) warnings.push({ field: "depth", level: "warning", message: "A shallow cup lets the egg roll out." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cup Ø", value: U(p.cupMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Foot Ø", value: U(p.footMm, units), source: "input" },
        { label: "Cup depth", value: U(p.depthMm, units), source: "input" },
        { label: "Floor", value: U(floor, units), source: "calc" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.cupMm, units)} cup · ${U(p.heightMm, units)} tall`,
        `EC${R(p.cupMm, 0)}-${R(p.heightMm, 0)}`,
        p.cupMm,
        p.heightMm,
        [
          { label: "Cup", value: U(p.cupMm, units) },
          { label: "Depth", value: U(p.depthMm, units) },
          { label: "Foot", value: U(p.footMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cupR = p.cupMm / 2;
    const footR = p.footMm / 2;
    const floor = p.heightMm - p.depthMm;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: footR, y: 0 });
    builder.line({ x: footR, y: Math.max(1, floor * 0.3) });
    builder.line({ x: cupR, y: floor });
    builder.line({ x: cupR, y: p.heightMm });
    builder.line({ x: cupR - p.wallMm, y: p.heightMm });
    builder.line({ x: cupR - p.wallMm, y: floor });
    builder.line({ x: 0, y: floor });
    return revolve(builder.build(), cupR);
  },
  fileName: (p) => `egg-cup-${R(p.cupMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------ honey dipper */

export const honeyDipper: AnyDesign = defineDesign({
  id: "honey-dipper",
  name: "Honey dipper",
  family: "vessels",
  eyebrow: "Grooved head",
  blurb: "A grooved dipper head on a straight handle.",
  lede: "A grooved head that holds honey between its ridges, on a handle long enough to reach the bottom of a jar.",
  chips: [
    { label: "Head Ø", value: "10 – 40 mm" },
    { label: "Length", value: "60 – 170 mm" },
    { label: "Grooves", value: "2 – 10" },
  ],
  notes: [
    "The head radius follows a raised cosine in the axial direction, so each groove is a smooth valley rather than a square notch. Groove depth and count are independent of the head length.",
    "A dipper printed with the handle vertical has its grooves across the layers and will trap honey in the seams. Print it horizontally if your printer can bridge the head.",
  ],
  header: "Honey Dipper Designer - units: mm",
  fields: [
    { key: "head", label: "Head diameter", kind: "length", section: "Head", default: "24", min: 10, max: 40 },
    { key: "headLength", label: "Head length", kind: "length", section: "Head", default: "34", min: 10, max: 70 },
    { key: "handle", label: "Handle diameter", kind: "length", section: "Handle", default: "8", min: 3, max: 20 },
    { key: "length", label: "Overall length", kind: "length", section: "Handle", default: "110", min: 60, max: 170 },
    { key: "grooves", label: "Grooves", kind: "count", section: "Head", default: "5", min: 2, max: 10 },
    { key: "grooveDepth", label: "Groove depth", kind: "length", section: "Head", default: "2.5", min: 0.5, max: 8 },
  ],
  parse: (raw) => ({
    headMm: rawLength(raw, "head"),
    headLengthMm: rawLength(raw, "headLength"),
    handleMm: rawLength(raw, "handle"),
    lengthMm: rawLength(raw, "length"),
    grooves: rawCount(raw, "grooves"),
    grooveMm: rawLength(raw, "grooveDepth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "head", "Head diameter", p.headMm, 10, 40);
    pushRange(errors, units, "headLength", "Head length", p.headLengthMm, 10, 70);
    pushRange(errors, units, "handle", "Handle diameter", p.handleMm, 3, 20);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 60, 170);
    pushInteger(errors, "grooves", "Grooves", p.grooves, 2, 10);
    pushRange(errors, units, "grooveDepth", "Groove depth", p.grooveMm, 0.5, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "length", p.headMm, p.lengthMm);
    if (p.headLengthMm >= p.lengthMm - 5) errors.push({ field: "headLength", level: "error", message: "The head leaves no handle." });
    if (p.headMm / 2 - p.grooveMm <= p.handleMm / 2) errors.push({ field: "grooveDepth", level: "error", message: "The grooves cut into the handle." });
    if (p.headMm / 2 - p.grooveMm < 2) errors.push({ field: "head", level: "error", message: "The head core is too thin after grooving." });
    if (p.grooves > p.headLengthMm / 4) warnings.push({ field: "grooves", level: "warning", message: "This many grooves leaves almost no flat between them." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Head length", value: U(p.headLengthMm, units), source: "input" },
        { label: "Grooves", value: String(Math.round(p.grooves)), source: "input" },
        { label: "Groove pitch", value: U(p.headLengthMm / Math.max(1, p.grooves), units), source: "calc" },
        { label: "Handle Ø", value: U(p.handleMm, units), source: "input" },
        { label: "Overall length", value: U(p.lengthMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.grooves)} grooves · ${U(p.lengthMm, units)} long`,
        `HD${R(p.headMm, 0)}-${Math.round(p.grooves)}`,
        p.headMm,
        p.lengthMm,
        [
          { label: "Head", value: U(p.headMm, units) },
          { label: "Grooves", value: String(Math.round(p.grooves)) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const headR = p.headMm / 2;
    const handleR = p.handleMm / 2;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    const steps = 120;
    for (let i = 1; i <= steps; i += 1) {
      const z = (p.headLengthMm * i) / steps;
      const groove = 0.5 * (1 - Math.cos((2 * Math.PI * p.grooves * z) / p.headLengthMm));
      builder.point({ x: Math.max(0.4, headR - p.grooveMm * groove), y: z });
    }
    builder.line({ x: handleR, y: p.headLengthMm + 2 });
    builder.line({ x: handleR, y: p.lengthMm - 4 });
    builder.line({ x: handleR * 0.7, y: p.lengthMm - 1.5 });
    builder.line({ x: 0, y: p.lengthMm });
    return revolve(builder.build(), Math.max(headR, handleR));
  },
  fileName: (p) => `honey-dipper-${R(p.headMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------ spinning top */

export const spinningTop: AnyDesign = defineDesign({
  id: "spinning-top",
  name: "Spinning top",
  family: "motion",
  eyebrow: "Cone and stem",
  blurb: "A wide disc on a cone point with a finger stem.",
  lede: "A disc for mass at the rim, a cone down to a point and a short stem to spin — one turned profile with the centre of mass low.",
  chips: [
    { label: "Disc Ø", value: "20 – 90 mm" },
    { label: "Height", value: "20 – 90 mm" },
    { label: "Point", value: "4 – 30 mm" },
  ],
  notes: [
    "The cone, disc and stem are one profile. The point is a true cone from the rim of the disc to the axis, so the top spins on a single contact point rather than a flat face.",
    "A top spins best when its mass is in the disc and its point is hard. Print it in the strongest filament you have and sand the point smooth.",
  ],
  header: "Spinning Top Designer - units: mm",
  fields: [
    { key: "disc", label: "Disc diameter", kind: "length", section: "Top", default: "50", min: 20, max: 90 },
    { key: "discThickness", label: "Disc thickness", kind: "length", section: "Top", default: "10", min: 2, max: 30 },
    { key: "point", label: "Point length", kind: "length", section: "Top", default: "14", min: 4, max: 30 },
    { key: "stem", label: "Stem diameter", kind: "length", section: "Top", default: "8", min: 2, max: 20 },
    { key: "stemLength", label: "Stem length", kind: "length", section: "Top", default: "16", min: 3, max: 40 },
  ],
  parse: (raw) => ({
    discMm: rawLength(raw, "disc"),
    thicknessMm: rawLength(raw, "discThickness"),
    pointMm: rawLength(raw, "point"),
    stemMm: rawLength(raw, "stem"),
    stemLengthMm: rawLength(raw, "stemLength"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "disc", "Disc diameter", p.discMm, 20, 90);
    pushRange(errors, units, "discThickness", "Disc thickness", p.thicknessMm, 2, 30);
    pushRange(errors, units, "point", "Point length", p.pointMm, 4, 30);
    pushRange(errors, units, "stem", "Stem diameter", p.stemMm, 2, 20);
    pushRange(errors, units, "stemLength", "Stem length", p.stemLengthMm, 3, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = p.pointMm + p.thicknessMm + p.stemLengthMm;
    checkSize(errors, units, "disc", p.discMm, total);
    if (p.stemMm >= p.discMm / 2) errors.push({ field: "stem", level: "error", message: "The stem is as wide as the disc." });
    if (p.pointMm > p.discMm) warnings.push({ field: "point", level: "warning", message: "A point longer than the disc makes a wobbly top." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.discMm, units), source: "input" },
        { label: "Disc thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Point", value: U(p.pointMm, units), source: "input" },
        { label: "Overall height", value: U(total, units), source: "calc" },
        { label: "Stem", value: `${U(p.stemMm, units)} × ${U(p.stemLengthMm, units)}`, source: "input" },
        { label: "Point half-angle", value: `${R((Math.atan2(p.discMm / 2, p.pointMm) * 180) / Math.PI, 1)}°`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.discMm, units)} disc · ${U(total, units)} tall`,
        `ST${R(p.discMm, 0)}-${R(total, 0)}`,
        p.discMm,
        total,
        [
          { label: "Disc", value: U(p.discMm, units) },
          { label: "Height", value: U(total, units) },
          { label: "Point", value: U(p.pointMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const discR = p.discMm / 2;
    const stemR = p.stemMm / 2;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: discR, y: p.pointMm });
    builder.line({ x: discR, y: p.pointMm + p.thicknessMm });
    builder.line({ x: stemR, y: p.pointMm + p.thicknessMm + 1 });
    builder.line({ x: stemR, y: p.pointMm + p.thicknessMm + p.stemLengthMm });
    builder.line({ x: 0, y: p.pointMm + p.thicknessMm + p.stemLengthMm });
    return revolve(builder.build(), discR);
  },
  fileName: (p) => `spinning-top-${R(p.discMm, 0)}-${R(p.pointMm, 0)}.stl`,
});

/* ----------------------------------------------------------- bottle stopper */

export const bottleStopper: AnyDesign = defineDesign({
  id: "bottle-stopper",
  name: "Bottle stopper",
  family: "vessels",
  eyebrow: "Tapered plug",
  blurb: "A tapered plug under a round knob.",
  lede: "A tapered plug sized to a bottle neck, with a knob wide enough to pull and a shoulder that stops it dropping in.",
  chips: [
    { label: "Plug Ø", value: "8 – 40 mm" },
    { label: "Knob Ø", value: "12 – 60 mm" },
    { label: "Taper", value: "1 – 10 mm" },
  ],
  notes: [
    "The plug is a cone from the small end to the large end, so it wedges into the neck instead of relying on a straight fit. The shoulder above it is wider than the neck and the knob is wider again.",
    "Print a stopper in TPU if you want a seal, or in PLA with a cork gasket if the bottle is going to be stored on its side. A rigid printed plug leaks unless the neck is very round.",
  ],
  header: "Bottle Stopper Designer - units: mm",
  fields: [
    { key: "plug", label: "Plug diameter", kind: "length", section: "Plug", default: "22", min: 8, max: 40 },
    { key: "plugLength", label: "Plug length", kind: "length", section: "Plug", default: "20", min: 5, max: 60 },
    { key: "taper", label: "Taper", kind: "length", section: "Plug", default: "3", min: 1, max: 10 },
    { key: "knob", label: "Knob diameter", kind: "length", section: "Knob", default: "30", min: 12, max: 60 },
    { key: "knobHeight", label: "Knob height", kind: "length", section: "Knob", default: "12", min: 3, max: 40 },
  ],
  parse: (raw) => ({
    plugMm: rawLength(raw, "plug"),
    plugLengthMm: rawLength(raw, "plugLength"),
    taperMm: rawLength(raw, "taper"),
    knobMm: rawLength(raw, "knob"),
    knobHeightMm: rawLength(raw, "knobHeight"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "plug", "Plug diameter", p.plugMm, 8, 40);
    pushRange(errors, units, "plugLength", "Plug length", p.plugLengthMm, 5, 60);
    pushRange(errors, units, "taper", "Taper", p.taperMm, 1, 10);
    pushRange(errors, units, "knob", "Knob diameter", p.knobMm, 12, 60);
    pushRange(errors, units, "knobHeight", "Knob height", p.knobHeightMm, 3, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = p.plugLengthMm + p.knobHeightMm;
    checkSize(errors, units, "knob", Math.max(p.knobMm, p.plugMm), total);
    if (p.plugMm - p.taperMm <= 2) errors.push({ field: "taper", level: "error", message: "The taper closes the small end of the plug." });
    if (p.knobMm <= p.plugMm) errors.push({ field: "knob", level: "error", message: "The knob must be wider than the plug." });
    if (p.taperMm >= p.plugMm * 0.6) warnings.push({ field: "taper", level: "warning", message: "A taper this steep is hard to seat without forcing." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plug Ø", value: U(p.plugMm, units), source: "input" },
        { label: "Small end Ø", value: U(p.plugMm - p.taperMm, units), source: "calc" },
        { label: "Plug length", value: U(p.plugLengthMm, units), source: "input" },
        { label: "Taper", value: U(p.taperMm, units), source: "input" },
        { label: "Knob Ø", value: U(p.knobMm, units), source: "input" },
        { label: "Overall height", value: U(total, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.plugMm, units)} plug · ${U(p.knobMm, units)} knob`,
        `BS${R(p.plugMm, 0)}-${R(p.taperMm, 1)}`,
        p.knobMm,
        total,
        [
          { label: "Plug", value: U(p.plugMm, units) },
          { label: "Knob", value: U(p.knobMm, units) },
          { label: "Height", value: U(total, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const plugR = p.plugMm / 2;
    const smallR = plugR - p.taperMm / 2;
    const knobR = p.knobMm / 2;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: smallR, y: 0 });
    builder.line({ x: plugR, y: p.plugLengthMm });
    builder.line({ x: knobR, y: p.plugLengthMm + 2 });
    builder.line({ x: knobR, y: p.plugLengthMm + p.knobHeightMm - 2 });
    builder.line({ x: knobR * 0.7, y: p.plugLengthMm + p.knobHeightMm });
    builder.line({ x: 0, y: p.plugLengthMm + p.knobHeightMm });
    return revolve(builder.build(), knobR);
  },
  fileName: (p) => `bottle-stopper-${R(p.plugMm, 0)}-${R(p.knobMm, 0)}.stl`,
});

/* ------------------------------------------------------------- tapered plug */

export const taperedPlug: AnyDesign = defineDesign({
  id: "tapered-plug",
  name: "Tapered plug",
  family: "vessels",
  eyebrow: "Friction fit",
  blurb: "A flanged tapered plug for a round hole.",
  lede: "A plain tapered plug with a small flange at the wide end, for blanking a tube or centring a fixture in a hole.",
  chips: [
    { label: "Large Ø", value: "8 – 80 mm" },
    { label: "Small Ø", value: "4 – 70 mm" },
    { label: "Length", value: "4 – 80 mm" },
  ],
  notes: [
    "The plug is a truncated cone with a short flange, so it can be pressed in until the flange stops it. Both diameters are entered directly rather than as an angle, which is how a hole is actually measured.",
    "A printed taper holds by friction alone. If it has to stay in, drill a cross hole and pin it, or add a grub screw through the flange.",
  ],
  header: "Tapered Plug Designer - units: mm",
  fields: [
    { key: "large", label: "Large diameter", kind: "length", section: "Plug", default: "30", min: 8, max: 80 },
    { key: "small", label: "Small diameter", kind: "length", section: "Plug", default: "22", min: 4, max: 70 },
    { key: "length", label: "Plug length", kind: "length", section: "Plug", default: "25", min: 4, max: 80 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Flange", default: "36", min: 10, max: 100 },
    { key: "flangeThickness", label: "Flange thickness", kind: "length", section: "Flange", default: "4", min: 1, max: 16 },
  ],
  parse: (raw) => ({
    largeMm: rawLength(raw, "large"),
    smallMm: rawLength(raw, "small"),
    lengthMm: rawLength(raw, "length"),
    flangeMm: rawLength(raw, "flange"),
    flangeThicknessMm: rawLength(raw, "flangeThickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "large", "Large diameter", p.largeMm, 8, 80);
    pushRange(errors, units, "small", "Small diameter", p.smallMm, 4, 70);
    pushRange(errors, units, "length", "Plug length", p.lengthMm, 4, 80);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 10, 100);
    pushRange(errors, units, "flangeThickness", "Flange thickness", p.flangeThicknessMm, 1, 16);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "flange", p.flangeMm, p.lengthMm + p.flangeThicknessMm);
    if (p.largeMm <= p.smallMm) errors.push({ field: "large", level: "error", message: "The large end must be larger than the small end." });
    if (p.flangeMm <= p.largeMm) errors.push({ field: "flange", level: "error", message: "The flange is not wider than the plug." });
    const angle = (Math.atan2((p.largeMm - p.smallMm) / 2, p.lengthMm) * 180) / Math.PI;
    if (angle > 12) warnings.push({ field: "length", level: "warning", message: "A taper over 12° self-releases and will not hold." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Large Ø", value: U(p.largeMm, units), source: "input" },
        { label: "Small Ø", value: U(p.smallMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Taper angle", value: `${R(angle, 2)}°`, source: "calc" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Overall length", value: U(p.lengthMm + p.flangeThicknessMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.largeMm, units)} → ${U(p.smallMm, units)} taper`,
        `TP${R(p.largeMm, 0)}-${R(p.smallMm, 0)}`,
        p.flangeMm,
        p.lengthMm + p.flangeThicknessMm,
        [
          { label: "Large", value: U(p.largeMm, units) },
          { label: "Small", value: U(p.smallMm, units) },
          { label: "Taper", value: `${R(angle, 1)}°` },
        ],
      ),
    };
  },
  build: (p) => {
    const largeR = p.largeMm / 2;
    const smallR = p.smallMm / 2;
    const flangeR = p.flangeMm / 2;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: smallR, y: 0 });
    builder.line({ x: largeR, y: p.lengthMm });
    builder.line({ x: flangeR, y: p.lengthMm });
    builder.line({ x: flangeR, y: p.lengthMm + p.flangeThicknessMm });
    builder.line({ x: 0, y: p.lengthMm + p.flangeThicknessMm });
    return revolve(builder.build(), flangeR);
  },
  fileName: (p) => `tapered-plug-${R(p.largeMm, 0)}-${R(p.smallMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- pet bowl */

export const petBowl: AnyDesign = defineDesign({
  id: "pet-bowl",
  name: "Pet bowl",
  family: "vessels",
  eyebrow: "Flared bowl",
  blurb: "A flared bowl with a heavy foot and a wide rim.",
  lede: "A bowl with a flared wall and a flat foot, shallow enough for a pet and heavy enough not to slide across a floor.",
  chips: [
    { label: "Top Ø", value: "60 – 180 mm" },
    { label: "Height", value: "20 – 90 mm" },
    { label: "Wall", value: "1.5 – 8 mm" },
  ],
  notes: [
    "The outer wall is a sine flare from the foot to the rim and the inner wall is the same curve offset by the wall thickness, so the bowl thickens at the foot and thins at the rim. The base is a solid disc under the floor.",
    "A printed bowl slides on a hard floor. Print a ring of TPU under the foot, or glue a silicone O-ring into a groove — the foot recess in this profile can serve as that groove.",
  ],
  header: "Pet Bowl Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Bowl", default: "140", min: 60, max: 180 },
    { key: "height", label: "Height", kind: "length", section: "Bowl", default: "45", min: 20, max: 90 },
    { key: "foot", label: "Foot diameter", kind: "length", section: "Bowl", default: "80", min: 20, max: 140 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Bowl", default: "4", min: 1.5, max: 8 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Bowl", default: "6", min: 2, max: 20 },
    { key: "footRecess", label: "Foot recess", kind: "length", section: "Foot", default: "2", min: 0, max: 6 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    heightMm: rawLength(raw, "height"),
    footMm: rawLength(raw, "foot"),
    wallMm: rawLength(raw, "wall"),
    floorMm: rawLength(raw, "floor"),
    recessMm: rawLength(raw, "footRecess"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 60, 180);
    pushRange(errors, units, "height", "Height", p.heightMm, 20, 90);
    pushRange(errors, units, "foot", "Foot diameter", p.footMm, 20, 140);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 8);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 2, 20);
    pushRange(errors, units, "footRecess", "Foot recess", p.recessMm, 0, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "top", p.topMm, p.heightMm);
    checkWall(errors, units, "wall", "bowl floor", p.floorMm);
    if (p.footMm >= p.topMm) errors.push({ field: "foot", level: "error", message: "The foot is as wide as the rim." });
    if (p.recessMm >= p.floorMm - 1) errors.push({ field: "footRecess", level: "error", message: "The recess breaks through the floor." });
    if (p.heightMm > p.topMm * 0.6) warnings.push({ field: "height", level: "warning", message: "A bowl taller than 60 % of its diameter is tippy for a pet." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Foot Ø", value: U(p.footMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Capacity", value: `${R(bowlVolume(p) / 1000, 0)} ml`, source: "calc" },
        { label: "Floor", value: U(p.floorMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.topMm, units)} rim · ${R(bowlVolume(p) / 1000, 0)} ml`,
        `PB${R(p.topMm, 0)}-${R(p.heightMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Top", value: U(p.topMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Capacity", value: `${R(bowlVolume(p) / 1000, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const topR = p.topMm / 2;
    const footR = p.footMm / 2;
    const innerFootR = Math.max(1, footR - p.wallMm);
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: footR, y: 0 });
    builder.line({ x: footR, y: 1 });
    builder.line({ x: footR - 0.5, y: Math.max(1, p.recessMm) });
    builder.line({ x: footR, y: Math.max(2, p.recessMm + 1) });
    const steps = 40;
    for (let i = 1; i <= steps; i += 1) {
      const u = i / steps;
      builder.point({ x: footR + (topR - footR) * Math.sin((u * Math.PI) / 2), y: p.recessMm + u * (p.heightMm - p.recessMm) });
    }
    builder.line({ x: topR - p.wallMm, y: p.heightMm });
    for (let i = steps; i >= 1; i -= 1) {
      const u = i / steps;
      const outer = footR + (topR - footR) * Math.sin((u * Math.PI) / 2);
      builder.point({ x: Math.max(0.6, outer - p.wallMm), y: p.recessMm + u * (p.heightMm - p.recessMm) });
    }
    builder.line({ x: innerFootR, y: p.floorMm });
    builder.line({ x: 0, y: p.floorMm });
    return revolve(builder.build(), topR);
  },
  fileName: (p) => `pet-bowl-${R(p.topMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

function bowlVolume(p: {
  topMm: number;
  heightMm: number;
  footMm: number;
  wallMm: number;
  floorMm: number;
}): number {
  // Truncated cone from the inner floor to the inner rim.
  const innerTop = p.topMm / 2 - p.wallMm;
  const innerBottom = Math.max(0, p.footMm / 2 - p.wallMm);
  const h = Math.max(0.1, p.heightMm - p.floorMm);
  return (Math.PI * h * (innerTop ** 2 + innerTop * innerBottom + innerBottom ** 2)) / 3;
}

/* --------------------------------------------------------------- planter pot */

export const planterPot: AnyDesign = defineDesign({
  id: "planter-pot",
  name: "Planter pot",
  family: "vessels",
  eyebrow: "Drained pot",
  blurb: "A tapered pot with a real drainage hole.",
  lede: "A tapered pot whose floor is an annulus around a true drainage hole — the hole is part of the revolved profile, not a drill operation.",
  chips: [
    { label: "Top Ø", value: "40 – 180 mm" },
    { label: "Height", value: "30 – 170 mm" },
    { label: "Drain", value: "3 – 30 mm" },
  ],
  notes: [
    "The profile starts at the drain radius, runs out along the bottom face, up the tapered outside, across the rim, down the inside and back along the raised floor to the drain. That makes a bowl with a through-hole in its floor as one closed shell.",
    "A drainage hole needs a saucer, or the pot will mark the shelf. The floor is deliberately raised above the base so the pot stands on a rim rather than on the drain.",
  ],
  header: "Planter Pot Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Pot", default: "120", min: 40, max: 180 },
    { key: "bottom", label: "Base diameter", kind: "length", section: "Pot", default: "90", min: 20, max: 160 },
    { key: "height", label: "Height", kind: "length", section: "Pot", default: "100", min: 30, max: 170 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Pot", default: "3", min: 1.5, max: 8 },
    { key: "drain", label: "Drain diameter", kind: "length", section: "Drain", default: "8", min: 3, max: 30 },
    { key: "floor", label: "Floor height", kind: "length", section: "Pot", default: "8", min: 2, max: 30 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    bottomMm: rawLength(raw, "bottom"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    drainMm: rawLength(raw, "drain"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 40, 180);
    pushRange(errors, units, "bottom", "Base diameter", p.bottomMm, 20, 160);
    pushRange(errors, units, "height", "Height", p.heightMm, 30, 170);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 8);
    pushRange(errors, units, "drain", "Drain diameter", p.drainMm, 3, 30);
    pushRange(errors, units, "floor", "Floor height", p.floorMm, 2, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "top", p.topMm, p.heightMm);
    if (p.bottomMm >= p.topMm) errors.push({ field: "bottom", level: "error", message: "The base is as wide as the top; it will not stack." });
    if (p.floorMm >= p.heightMm * 0.5) errors.push({ field: "floor", level: "error", message: "The floor is more than half the pot." });
    checkWall(errors, units, "wall", "wall at the base", (p.bottomMm - p.drainMm) / 2);
    const innerBase = p.bottomMm / 2 - p.wallMm;
    if (innerBase - p.drainMm / 2 < 2) errors.push({ field: "drain", level: "error", message: "The drain leaves almost no floor around it." });
    if (p.wallMm < 2) warnings.push({ field: "wall", level: "warning", message: "Under 2 mm the pot will bow when it is filled." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Base Ø", value: U(p.bottomMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Drain", value: U(p.drainMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Soil volume", value: `${R(soilVolume(p) / 1000, 1)} L`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.topMm, units)} rim · ${R(soilVolume(p) / 1000, 1)} L`,
        `PP${R(p.topMm, 0)}-${R(p.heightMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Top", value: U(p.topMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Drain", value: U(p.drainMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const topR = p.topMm / 2;
    const bottomR = p.bottomMm / 2;
    const drainR = p.drainMm / 2;
    const innerTop = topR - p.wallMm;
    const innerBottom = bottomR - p.wallMm;
    const builder = new ProfileBuilder();
    builder.line({ x: drainR, y: 0 });
    builder.line({ x: bottomR, y: 0 });
    builder.line({ x: topR, y: p.heightMm });
    builder.line({ x: innerTop, y: p.heightMm });
    builder.line({ x: innerBottom, y: p.floorMm });
    builder.line({ x: drainR, y: p.floorMm });
    return revolve(builder.build(), topR);
  },
  fileName: (p) => `planter-${R(p.topMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

function soilVolume(p: { topMm: number; bottomMm: number; heightMm: number; wallMm: number; floorMm: number }): number {
  const top = p.topMm / 2 - p.wallMm;
  const bottom = Math.max(0, p.bottomMm / 2 - p.wallMm);
  const h = Math.max(0.1, p.heightMm - p.floorMm);
  return (Math.PI * h * (top ** 2 + top * bottom + bottom ** 2)) / 3;
}

/* --------------------------------------------------------------- wine glass */

export const wineGlass: AnyDesign = defineDesign({
  id: "wine-glass",
  name: "Wine glass",
  family: "vessels",
  eyebrow: "Stemmed bowl",
  blurb: "A thin-walled bowl on a solid stem and foot.",
  lede: "A rounded bowl, a slim solid stem and a flat foot, generated as one profile with a wall that thins towards the rim.",
  chips: [
    { label: "Bowl Ø", value: "40 – 100 mm" },
    { label: "Height", value: "90 – 170 mm" },
    { label: "Wall", value: "1 – 4 mm" },
  ],
  notes: [
    "The bowl is a sine flare from the stem to the rim and the inner surface is the same curve offset by the wall, so the glass thins naturally towards the lip. The stem is solid and the foot is a flat disc.",
    "A printed wine glass is a demonstration of the profile, not a vessel for hot liquid. Print it in clear PETG, and keep the wall above 1.2 mm or it will crack at the stem junction.",
  ],
  header: "Wine Glass Designer - units: mm",
  fields: [
    { key: "bowl", label: "Bowl diameter", kind: "length", section: "Bowl", default: "70", min: 40, max: 100 },
    { key: "bowlHeight", label: "Bowl height", kind: "length", section: "Bowl", default: "55", min: 20, max: 80 },
    { key: "stem", label: "Stem diameter", kind: "length", section: "Stem", default: "6", min: 3, max: 14 },
    { key: "stemHeight", label: "Stem height", kind: "length", section: "Stem", default: "45", min: 10, max: 90 },
    { key: "foot", label: "Foot diameter", kind: "length", section: "Foot", default: "65", min: 30, max: 120 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Bowl", default: "1.8", min: 1, max: 4 },
  ],
  parse: (raw) => ({
    bowlMm: rawLength(raw, "bowl"),
    bowlHeightMm: rawLength(raw, "bowlHeight"),
    stemMm: rawLength(raw, "stem"),
    stemHeightMm: rawLength(raw, "stemHeight"),
    footMm: rawLength(raw, "foot"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "bowl", "Bowl diameter", p.bowlMm, 40, 100);
    pushRange(errors, units, "bowlHeight", "Bowl height", p.bowlHeightMm, 20, 80);
    pushRange(errors, units, "stem", "Stem diameter", p.stemMm, 3, 14);
    pushRange(errors, units, "stemHeight", "Stem height", p.stemHeightMm, 10, 90);
    pushRange(errors, units, "foot", "Foot diameter", p.footMm, 30, 120);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = 4 + p.stemHeightMm + p.bowlHeightMm;
    checkSize(errors, units, "bowl", Math.max(p.bowlMm, p.footMm), total);
    if (p.stemMm <= p.wallMm * 2) errors.push({ field: "stem", level: "error", message: "The stem is too thin next to the bowl wall." });
    if (p.footMm < p.bowlMm * 0.7) warnings.push({ field: "foot", level: "warning", message: "A foot under 70 % of the bowl diameter tips easily." });
    checkWall(errors, units, "wall", "bowl wall", p.wallMm);

    return {
      errors,
      warnings,
      readout: [
        { label: "Bowl Ø", value: U(p.bowlMm, units), source: "input" },
        { label: "Bowl height", value: U(p.bowlHeightMm, units), source: "input" },
        { label: "Stem", value: `${U(p.stemMm, units)} × ${U(p.stemHeightMm, units)}`, source: "input" },
        { label: "Foot Ø", value: U(p.footMm, units), source: "input" },
        { label: "Overall height", value: U(total, units), source: "calc" },
        { label: "Capacity", value: `${R(glassVolume(p) / 1000, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.bowlMm, units)} bowl · ${U(total, units)} tall`,
        `WG${R(p.bowlMm, 0)}-${R(p.stemHeightMm, 0)}`,
        Math.max(p.bowlMm, p.footMm),
        total,
        [
          { label: "Bowl", value: U(p.bowlMm, units) },
          { label: "Height", value: U(total, units) },
          { label: "Capacity", value: `${R(glassVolume(p) / 1000, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const bowlR = p.bowlMm / 2;
    const stemR = p.stemMm / 2;
    const footR = p.footMm / 2;
    const stemTop = 4 + p.stemHeightMm;
    const rim = stemTop + p.bowlHeightMm;
    const outerAt = (u: number) => stemR + (bowlR - stemR) * Math.sin((u * Math.PI) / 2);
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: footR, y: 0 });
    builder.line({ x: footR, y: 2 });
    builder.line({ x: footR * 0.7, y: 4 });
    builder.line({ x: stemR, y: 6 });
    builder.line({ x: stemR, y: stemTop });
    const steps = 40;
    for (let i = 1; i <= steps; i += 1) {
      const u = i / steps;
      builder.point({ x: outerAt(u), y: stemTop + u * p.bowlHeightMm });
    }
    builder.line({ x: Math.max(stemR * 0.8, bowlR - p.wallMm), y: rim });
    for (let i = steps - 1; i >= 4; i -= 1) {
      const u = i / steps;
      builder.point({ x: Math.max(stemR * 0.7, outerAt(u) - p.wallMm), y: stemTop + u * p.bowlHeightMm });
    }
    builder.line({ x: 0, y: stemTop + 4 });
    return revolve(builder.build(), Math.max(bowlR, footR));
  },
  fileName: (p) => `wine-glass-${R(p.bowlMm, 0)}-${R(p.stemHeightMm, 0)}.stl`,
});

function glassVolume(p: { bowlMm: number; bowlHeightMm: number; wallMm: number; stemMm: number }): number {
  const r = (p.bowlMm / 2 - p.wallMm * 0.6);
  return (Math.PI * r * r * p.bowlHeightMm * 0.55);
}

/* ------------------------------------------------------------------ goblet */

export const goblet: AnyDesign = defineDesign({
  id: "goblet",
  name: "Goblet",
  family: "vessels",
  eyebrow: "Tapered cup",
  blurb: "A straight-tapered cup on a turned stem.",
  lede: "A cup with a straight taper, a thick lip and a stem that widens into a foot — the profile a lathe would cut from one block.",
  chips: [
    { label: "Cup Ø", value: "40 – 100 mm" },
    { label: "Height", value: "80 – 170 mm" },
    { label: "Wall", value: "2 – 6 mm" },
  ],
  notes: [
    "The cup is a truncated cone inside and out, with a floor thick enough to be turned flat. The stem is a separate straight section below it and the foot is a disc, all in one profile.",
    "Print the goblet upright with a brim: the foot needs a wide first layer, and a 2 mm wall is about as thin as a printed vessel stays watertight.",
  ],
  header: "Goblet Designer - units: mm",
  fields: [
    { key: "cup", label: "Cup diameter", kind: "length", section: "Cup", default: "65", min: 40, max: 100 },
    { key: "cupHeight", label: "Cup height", kind: "length", section: "Cup", default: "50", min: 20, max: 80 },
    { key: "stem", label: "Stem diameter", kind: "length", section: "Stem", default: "12", min: 5, max: 30 },
    { key: "stemHeight", label: "Stem height", kind: "length", section: "Stem", default: "35", min: 10, max: 80 },
    { key: "foot", label: "Foot diameter", kind: "length", section: "Foot", default: "55", min: 25, max: 100 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Cup", default: "3", min: 2, max: 6 },
  ],
  parse: (raw) => ({
    cupMm: rawLength(raw, "cup"),
    cupHeightMm: rawLength(raw, "cupHeight"),
    stemMm: rawLength(raw, "stem"),
    stemHeightMm: rawLength(raw, "stemHeight"),
    footMm: rawLength(raw, "foot"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cup", "Cup diameter", p.cupMm, 40, 100);
    pushRange(errors, units, "cupHeight", "Cup height", p.cupHeightMm, 20, 80);
    pushRange(errors, units, "stem", "Stem diameter", p.stemMm, 5, 30);
    pushRange(errors, units, "stemHeight", "Stem height", p.stemHeightMm, 10, 80);
    pushRange(errors, units, "foot", "Foot diameter", p.footMm, 25, 100);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 2, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = 4 + p.stemHeightMm + p.cupHeightMm;
    checkSize(errors, units, "cup", Math.max(p.cupMm, p.footMm), total);
    checkWall(errors, units, "wall", "cup wall", p.wallMm);
    if (p.stemMm >= p.cupMm) errors.push({ field: "stem", level: "error", message: "The stem is as wide as the cup." });
    if (p.footMm < p.cupMm * 0.7) warnings.push({ field: "foot", level: "warning", message: "A narrow foot makes the goblet unstable." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cup Ø", value: U(p.cupMm, units), source: "input" },
        { label: "Cup height", value: U(p.cupHeightMm, units), source: "input" },
        { label: "Stem", value: `${U(p.stemMm, units)} × ${U(p.stemHeightMm, units)}`, source: "input" },
        { label: "Foot Ø", value: U(p.footMm, units), source: "input" },
        { label: "Overall height", value: U(total, units), source: "calc" },
        { label: "Capacity", value: `${R(((Math.PI * (p.cupMm / 2 - p.wallMm) ** 2 * p.cupHeightMm) / 1000) * 0.9, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.cupMm, units)} cup · ${U(total, units)} tall`,
        `GB${R(p.cupMm, 0)}-${R(p.stemHeightMm, 0)}`,
        Math.max(p.cupMm, p.footMm),
        total,
        [
          { label: "Cup", value: U(p.cupMm, units) },
          { label: "Height", value: U(total, units) },
          { label: "Foot", value: U(p.footMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cupR = p.cupMm / 2;
    const stemR = p.stemMm / 2;
    const footR = p.footMm / 2;
    const stemTop = 4 + p.stemHeightMm;
    const top = stemTop + p.cupHeightMm;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: 0 });
    builder.line({ x: footR, y: 0 });
    builder.line({ x: footR, y: 2 });
    builder.line({ x: footR * 0.6, y: 4 });
    builder.line({ x: stemR, y: 8 });
    builder.line({ x: stemR, y: stemTop });
    builder.line({ x: cupR, y: stemTop + 6 });
    builder.line({ x: cupR, y: top });
    builder.line({ x: cupR - p.wallMm, y: top });
    builder.line({ x: cupR - p.wallMm, y: stemTop + p.wallMm + 2 });
    builder.line({ x: 0, y: stemTop + p.wallMm + 2 });
    return revolve(builder.build(), Math.max(cupR, footR));
  },
  fileName: (p) => `goblet-${R(p.cupMm, 0)}-${R(p.stemHeightMm, 0)}.stl`,
});

export const revolveHousehold: AnyDesign[] = [
  candlestick,
  eggCup,
  honeyDipper,
  spinningTop,
  bottleStopper,
  taperedPlug,
  petBowl,
  planterPot,
  wineGlass,
  goblet,
];
