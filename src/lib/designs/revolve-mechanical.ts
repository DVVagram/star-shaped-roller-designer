/** Pipes, pulleys, flywheels and turned mechanical parts. */

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
  pushInteger,
  pushRange,
  pushWarning,
  rawLength,
  rawNumber,
  type AnyDesign,
  type DesignIssue,
} from "./types";

function revolve(profile: Point2D[], maxRadius: number) {
  return buildRevolution({
    profile,
    segments: Math.min(256, Math.max(48, segmentsForRadius(maxRadius))),
  });
}

/* ---------------------------------------------------------- pipe reducer */

export const pipeReducer: AnyDesign = defineDesign({
  id: "pipe-reducer",
  name: "Pipe reducer",
  family: "vessels",
  eyebrow: "Two bores, one cone",
  blurb: "A concentric reducer from a large pipe to a small one.",
  lede: "A conical tube that steps between two pipe sizes. Both outside diameters and the wall are entered directly, so the bore at each end is exact and the transition is a straight cone rather than a stepped adaptor.",
  chips: [
    { label: "Large Ø", value: "20 – 180 mm" },
    { label: "Small Ø", value: "10 – 120 mm" },
    { label: "Length", value: "10 – 120 mm" },
  ],
  notes: [
    "The profile is a quadrilateral: out along the large end, up the outer cone, in across the small end and back down the inner cone. Both ends are flat annuli, so it butts squarely against a pipe face.",
    "For a printed reducer, slope the cone at no more than about 45° from the axis or the overhang needs support. If the size difference is large, make the reducer in two cones with a cylindrical collar between them.",
  ],
  header: "Pipe Reducer Designer - units: mm",
  fields: [
    { key: "largeDiameter", label: "Large diameter", kind: "length", section: "Reducer", default: "60", min: 20, max: 180 },
    { key: "smallDiameter", label: "Small diameter", kind: "length", section: "Reducer", default: "30", min: 10, max: 120 },
    { key: "length", label: "Length", kind: "length", section: "Reducer", default: "60", min: 10, max: 120 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Reducer", default: "3", min: 1, max: 10 },
  ],
  parse: (raw) => ({
    largeMm: rawLength(raw, "largeDiameter"),
    smallMm: rawLength(raw, "smallDiameter"),
    lengthMm: rawLength(raw, "length"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "largeDiameter", "Large diameter", p.largeMm, 20, 180);
    pushRange(errors, units, "smallDiameter", "Small diameter", p.smallMm, 10, 120);
    pushRange(errors, units, "length", "Length", p.lengthMm, 10, 120);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const largeR = p.largeMm / 2;
    const smallR = p.smallMm / 2;
    checkSize(errors, units, "largeDiameter", p.largeMm, p.lengthMm);
    checkWall(errors, units, "wall", "wall at the small end", smallR - p.wallMm);
    if (p.largeMm <= p.smallMm) errors.push({ field: "largeDiameter", level: "error", message: "The large end is not larger than the small end." });
    const slope = (Math.atan2(largeR - smallR, p.lengthMm) * 180) / Math.PI;
    if (slope > 45) pushWarning(warnings, "length", "The cone is steeper than 45°; the overhang will need support.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Large Ø", value: measure(p.largeMm, units), source: "input" },
        { label: "Small Ø", value: measure(p.smallMm, units), source: "input" },
        { label: "Large bore", value: measure(p.largeMm - 2 * p.wallMm, units), source: "calc" },
        { label: "Small bore", value: measure(p.smallMm - 2 * p.wallMm, units), source: "calc" },
        { label: "Length", value: measure(p.lengthMm, units), source: "input" },
        { label: "Cone slope", value: `${round(slope, 1)}°`, source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.largeMm, units)} → ${measure(p.smallMm, units)}`,
        `PR${round(p.largeMm, 0)}-${round(p.smallMm, 0)}`,
        p.largeMm,
        p.lengthMm,
        [
          { label: "Large Ø", value: measure(p.largeMm, units) },
          { label: "Small Ø", value: measure(p.smallMm, units) },
          { label: "Length", value: measure(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const largeR = p.largeMm / 2;
    const smallR = p.smallMm / 2;
    const profile: Point2D[] = [
      { x: largeR, y: 0 },
      { x: smallR, y: p.lengthMm },
      { x: smallR - p.wallMm, y: p.lengthMm },
      { x: largeR - p.wallMm, y: 0 },
    ];
    return revolve(profile, largeR);
  },
  fileName: (p) => `pipe-reducer-${round(p.largeMm, 0)}-${round(p.smallMm, 0)}.stl`,
});

/* -------------------------------------------------------------- pipe cap */

export const pipeCap: AnyDesign = defineDesign({
  id: "pipe-cap",
  name: "Pipe cap",
  family: "vessels",
  eyebrow: "Blind end",
  blurb: "A closed-end cap that slips over the outside of a pipe.",
  lede: "A cylindrical cap with one closed end and one open mouth. The inside diameter is the pipe's outside diameter; enter the pipe size, the wall and the depth, and the cap is a single closed shell with a solid top.",
  chips: [
    { label: "Pipe Ø", value: "10 – 160 mm" },
    { label: "Depth", value: "8 – 100 mm" },
    { label: "Wall", value: "1 – 8 mm" },
  ],
  notes: [
    "The cap's bore is the pipe diameter, and its outside is that bore plus two wall thicknesses. The top is a solid disc one wall thick, so the inside height is the depth minus the wall.",
    "A push-fit cap holds by friction alone. Print it with the mouth down, measure the pipe, and add 0.3 mm to the bore for an easy fit or subtract 0.1 mm for a seal that needs a tap to seat.",
  ],
  header: "Pipe Cap Designer - units: mm",
  fields: [
    { key: "pipeDiameter", label: "Pipe diameter", kind: "length", section: "Cap", default: "60", min: 10, max: 160 },
    { key: "depth", label: "Overall depth", kind: "length", section: "Cap", default: "40", min: 8, max: 100 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Cap", default: "3", min: 1, max: 8 },
  ],
  parse: (raw) => ({
    pipeMm: rawLength(raw, "pipeDiameter"),
    depthMm: rawLength(raw, "depth"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "pipeDiameter", "Pipe diameter", p.pipeMm, 10, 160);
    pushRange(errors, units, "depth", "Overall depth", p.depthMm, 8, 100);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerR = p.pipeMm / 2 + p.wallMm;
    checkSize(errors, units, "pipeDiameter", outerR * 2, p.depthMm);
    if (p.depthMm <= p.wallMm + 2) errors.push({ field: "depth", level: "error", message: "The cap is no deeper than its top." });
    if (p.wallMm < p.pipeMm * 0.03) pushWarning(warnings, "wall", "A wall under 3 % of the pipe diameter distorts when pushed on.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Pipe Ø", value: measure(p.pipeMm, units), source: "input" },
        { label: "Outside Ø", value: measure(outerR * 2, units), source: "calc" },
        { label: "Inside Ø", value: measure(p.pipeMm, units), source: "calc" },
        { label: "Overall depth", value: measure(p.depthMm, units), source: "input" },
        { label: "Inside depth", value: measure(p.depthMm - p.wallMm, units), source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${measure(p.pipeMm, units)} pipe · ${measure(p.depthMm, units)} deep`,
        `PC${round(p.pipeMm, 0)}-${round(p.depthMm, 0)}`,
        outerR * 2,
        p.depthMm,
        [
          { label: "Pipe Ø", value: measure(p.pipeMm, units) },
          { label: "Outside Ø", value: measure(outerR * 2, units) },
          { label: "Depth", value: measure(p.depthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.pipeMm / 2 + p.wallMm;
    const innerR = p.pipeMm / 2;
    const profile: Point2D[] = [
      { x: outerR, y: 0 },
      { x: outerR, y: p.depthMm },
      { x: 0, y: p.depthMm },
      { x: 0, y: p.depthMm - p.wallMm },
      { x: innerR, y: p.depthMm - p.wallMm },
      { x: innerR, y: 0 },
    ];
    return revolve(profile, outerR);
  },
  fileName: (p) => `pipe-cap-${round(p.pipeMm, 0)}d.stl`,
});

/* ------------------------------------------------------------ hose adapter */

export const hoseAdapter: AnyDesign = defineDesign({
  id: "hose-adapter",
  name: "Hose adapter",
  family: "vessels",
  eyebrow: "Barbed spigot",
  blurb: "A barbed spigot with a flange and a straight bore.",
  lede: "Evenly spaced barbs grip the inside of a flexible hose while the flange stops it from being pushed too far. Set the bore, the barb and tip diameters, and how many barbs fit along the length.",
  chips: [
    { label: "Barb Ø", value: "6 – 80 mm" },
    { label: "Barbs", value: "1 – 12" },
    { label: "Bore", value: "2 – 50 mm" },
  ],
  notes: [
    "Each barb is a ramp from the tip diameter up to the barb diameter and a square step back down, so the hose slides on over the ramp and resists being pulled off against the step. The bore stays a straight cylinder the whole way through.",
    "Barb diameters are measured over the crest. For a flexible hose, the crest should be about 1 mm larger than the hose bore, and the tip about 0.5 mm smaller so it starts easily.",
  ],
  header: "Hose Adapter Designer - units: mm",
  fields: [
    { key: "bore", label: "Bore", kind: "length", section: "Adapter", default: "12", min: 2, max: 50 },
    { key: "tipDiameter", label: "Tip diameter", kind: "length", section: "Barbs", default: "16", min: 6, max: 80 },
    { key: "barbDiameter", label: "Barb diameter", kind: "length", section: "Barbs", default: "19", min: 7, max: 90 },
    { key: "barbs", label: "Barbs", kind: "count", section: "Barbs", default: "5", min: 1, max: 12 },
    { key: "length", label: "Length", kind: "length", section: "Adapter", default: "50", min: 12, max: 120 },
    { key: "flangeDiameter", label: "Flange diameter", kind: "length", section: "Adapter", default: "26", min: 8, max: 120 },
    { key: "flangeThickness", label: "Flange thickness", kind: "length", section: "Adapter", default: "4", min: 1.5, max: 20 },
  ],
  parse: (raw) => ({
    boreMm: rawLength(raw, "bore"),
    tipMm: rawLength(raw, "tipDiameter"),
    barbMm: rawLength(raw, "barbDiameter"),
    barbs: rawNumber(raw, "barbs"),
    lengthMm: rawLength(raw, "length"),
    flangeMm: rawLength(raw, "flangeDiameter"),
    flangeThicknessMm: rawLength(raw, "flangeThickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 50);
    pushRange(errors, units, "tipDiameter", "Tip diameter", p.tipMm, 6, 80);
    pushRange(errors, units, "barbDiameter", "Barb diameter", p.barbMm, 7, 90);
    pushInteger(errors, "barbs", "Barbs", p.barbs, 1, 12);
    pushRange(errors, units, "length", "Length", p.lengthMm, 12, 120);
    pushRange(errors, units, "flangeDiameter", "Flange diameter", p.flangeMm, 8, 120);
    pushRange(errors, units, "flangeThickness", "Flange thickness", p.flangeThicknessMm, 1.5, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    checkSize(errors, units, "flangeDiameter", Math.max(p.flangeMm, p.barbMm), p.lengthMm);
    checkWall(errors, units, "bore", "wall at the barb tips", p.tipMm / 2 - p.boreMm / 2);
    if (p.barbMm <= p.tipMm) errors.push({ field: "barbDiameter", level: "error", message: "The barbs must stand proud of the tip diameter." });
    if (p.flangeMm <= p.barbMm) errors.push({ field: "flangeDiameter", level: "error", message: "The flange is not wider than the barbs." });
    if (p.flangeThicknessMm >= p.lengthMm * 0.6) errors.push({ field: "flangeThickness", level: "error", message: "The flange takes most of the adapter length." });
    if ((p.lengthMm - p.flangeThicknessMm) / p.barbs < 3) pushWarning(warnings, "barbs", "The barbs are packed tighter than 3 mm pitch.");

    const pitch = (p.lengthMm - p.flangeThicknessMm) / p.barbs;

    return {
      errors,
      warnings,
      readout: [
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Tip Ø", value: measure(p.tipMm, units), source: "input" },
        { label: "Barb Ø", value: measure(p.barbMm, units), source: "input" },
        { label: "Barbs", value: String(Math.round(p.barbs)), source: "input" },
        { label: "Barb pitch", value: measure(pitch, units), source: "calc" },
        { label: "Barb height", value: measure((p.barbMm - p.tipMm) / 2, units), source: "calc" },
        { label: "Flange Ø", value: measure(p.flangeMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.barbs)} barbs · ${measure(p.barbMm, units)} crest`,
        `HA${round(p.barbMm, 0)}-${round(p.boreMm, 0)}`,
        Math.max(p.flangeMm, p.barbMm),
        p.lengthMm,
        [
          { label: "Barb Ø", value: measure(p.barbMm, units) },
          { label: "Bore", value: measure(p.boreMm, units) },
          { label: "Length", value: measure(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const boreR = p.boreMm / 2;
    const tipR = p.tipMm / 2;
    const barbR = p.barbMm / 2;
    const flangeR = p.flangeMm / 2;
    const ft = p.flangeThicknessMm;
    const pitch = (p.lengthMm - ft) / p.barbs;
    const profile: Point2D[] = [
      { x: boreR, y: 0 },
      { x: flangeR, y: 0 },
      { x: flangeR, y: ft },
    ];
    for (let i = 0; i < p.barbs; i += 1) {
      const z0 = ft + i * pitch;
      profile.push({ x: tipR, y: z0 });
      profile.push({ x: barbR, y: z0 + pitch * 0.82 });
      profile.push({ x: tipR, y: z0 + pitch });
    }
    profile.push({ x: boreR, y: p.lengthMm });
    return revolve(profile, flangeR);
  },
  fileName: (p) => `hose-adapter-${round(p.barbMm, 0)}b-${round(p.boreMm, 0)}bore.stl`,
});

/* ------------------------------------------------------------ de Laval */

export const deLavalNozzle: AnyDesign = defineDesign({
  id: "de-laval-nozzle",
  name: "De Laval nozzle",
  family: "vessels",
  eyebrow: "Converge and diverge",
  blurb: "A converging–diverging nozzle with a measured throat and expansion ratio.",
  lede: "The bore converges from the inlet to a throat and then diverges to the exit, on a smooth cosine contour. Set the three diameters and the two lengths and the throat area, exit area and expansion ratio are reported exactly.",
  chips: [
    { label: "Throat Ø", value: "3 – 60 mm" },
    { label: "Expansion", value: "1 – 12 ×" },
    { label: "Length", value: "20 – 180 mm" },
  ],
  notes: [
    "Both halves are cosine blends: the converging side runs from the inlet to the throat and the diverging side from the throat to the exit, with zero slope at each junction. That keeps the throat a clean minimum instead of a crease.",
    "This is the classical de Laval contour, not an optimum Rao bell. It is the right shape for a steam or compressed-air demonstrator; for a rocket motor the divergent length and wall cooling matter far more than the profile here.",
  ],
  header: "De Laval Nozzle Designer - units: mm",
  fields: [
    { key: "inletDiameter", label: "Inlet diameter", kind: "length", section: "Nozzle", default: "50", min: 8, max: 160 },
    { key: "throatDiameter", label: "Throat diameter", kind: "length", section: "Nozzle", default: "20", min: 3, max: 60 },
    { key: "exitDiameter", label: "Exit diameter", kind: "length", section: "Nozzle", default: "60", min: 8, max: 180 },
    { key: "convergingLength", label: "Converging length", kind: "length", section: "Contour", default: "40", min: 8, max: 100 },
    { key: "divergingLength", label: "Diverging length", kind: "length", section: "Contour", default: "80", min: 8, max: 140 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Nozzle", default: "3", min: 1, max: 10 },
  ],
  parse: (raw) => ({
    inletMm: rawLength(raw, "inletDiameter"),
    throatMm: rawLength(raw, "throatDiameter"),
    exitMm: rawLength(raw, "exitDiameter"),
    convergingMm: rawLength(raw, "convergingLength"),
    divergingMm: rawLength(raw, "divergingLength"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "inletDiameter", "Inlet diameter", p.inletMm, 8, 160);
    pushRange(errors, units, "throatDiameter", "Throat diameter", p.throatMm, 3, 60);
    pushRange(errors, units, "exitDiameter", "Exit diameter", p.exitMm, 8, 180);
    pushRange(errors, units, "convergingLength", "Converging length", p.convergingMm, 8, 100);
    pushRange(errors, units, "divergingLength", "Diverging length", p.divergingMm, 8, 140);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = p.convergingMm + p.divergingMm;
    checkSize(errors, units, "exitDiameter", Math.max(p.inletMm, p.exitMm) + 2 * p.wallMm, total);
    checkWall(errors, units, "wall", "nozzle wall", p.wallMm);
    if (p.throatMm >= Math.min(p.inletMm, p.exitMm)) {
      errors.push({ field: "throatDiameter", level: "error", message: "The throat must be smaller than both ends." });
    }
    const expansion = (p.exitMm / p.throatMm) ** 2;
    if (expansion > 12) pushWarning(warnings, "exitDiameter", "An expansion ratio above 12 is hard to print and rarely useful with air.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Inlet Ø", value: measure(p.inletMm, units), source: "input" },
        { label: "Throat Ø", value: measure(p.throatMm, units), source: "input" },
        { label: "Exit Ø", value: measure(p.exitMm, units), source: "input" },
        { label: "Throat area", value: `${round((Math.PI / 4) * p.throatMm ** 2 / 100, 2)} cm²`, source: "calc" },
        { label: "Exit area", value: `${round((Math.PI / 4) * p.exitMm ** 2 / 100, 2)} cm²`, source: "calc" },
        { label: "Expansion", value: `${round(expansion, 2)} ×`, source: "calc" },
        { label: "Overall length", value: measure(total, units), source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.throatMm, units)} throat · ${round(expansion, 2)}×`,
        `DL${round(p.throatMm, 0)}-${round(p.exitMm, 0)}`,
        Math.max(p.inletMm, p.exitMm) + 2 * p.wallMm,
        total,
        [
          { label: "Throat Ø", value: measure(p.throatMm, units) },
          { label: "Exit Ø", value: measure(p.exitMm, units) },
          { label: "Expansion", value: `${round(expansion, 2)}×` },
        ],
      ),
    };
  },
  build: (p) => {
    const inletR = p.inletMm / 2;
    const throatR = p.throatMm / 2;
    const exitR = p.exitMm / 2;
    const innerAt = (z: number) => {
      if (z <= p.convergingMm) {
        const u = z / p.convergingMm;
        return throatR + (inletR - throatR) * 0.5 * (1 + Math.cos(Math.PI * u));
      }
      const u = (z - p.convergingMm) / p.divergingMm;
      return throatR + (exitR - throatR) * 0.5 * (1 - Math.cos(Math.PI * u));
    };
    const total = p.convergingMm + p.divergingMm;
    const builder = new ProfileBuilder();
    builder.line({ x: inletR, y: 0 });
    for (let i = 1; i <= 96; i += 1) {
      const z = (total * i) / 96;
      builder.point({ x: innerAt(z), y: z });
    }
    builder.line({ x: exitR + p.wallMm, y: total });
    for (let i = 96; i >= 0; i -= 1) {
      const z = (total * i) / 96;
      builder.point({ x: innerAt(z) + p.wallMm, y: z });
    }
    return revolve(builder.build(), Math.max(inletR, exitR) + p.wallMm);
  },
  fileName: (p) => `de-laval-${round(p.throatMm, 0)}t-${round(p.exitMm, 0)}e.stl`,
});

/* -------------------------------------------------------------- nose cone */

export const noseCone: AnyDesign = defineDesign({
  id: "nose-cone",
  name: "Nose cone",
  family: "vessels",
  eyebrow: "Tangent ogive",
  blurb: "A tangent-ogive nose with a shoulder and a socket.",
  lede: "A tangent ogive is the classic model-rocket nose: a circular arc swept around the axis, tangent to the body at the base. Enter the base, length and shoulder and the profile is generated from the ogive radius, with a socket bored into the shoulder.",
  chips: [
    { label: "Base Ø", value: "20 – 120 mm" },
    { label: "Length", value: "20 – 180 mm" },
    { label: "Fineness", value: "2 – 8 : 1" },
  ],
  notes: [
    "The ogive radius is `ρ = (R² + L²)/2R`, and the profile is `r(x) = √(ρ² − (L − x)²) + R − ρ`. At the base r = R and at the tip r = 0, so the arc meets the body tangentially instead of leaving a corner.",
    "The socket lets the nose slip over a body tube. Keep its wall at least three perimeters, and remember that a tangent ogive is stable only when the centre of pressure sits behind the centre of gravity — check that before launching anything.",
  ],
  header: "Nose Cone Designer - units: mm",
  fields: [
    { key: "baseDiameter", label: "Base diameter", kind: "length", section: "Nose", default: "60", min: 20, max: 120 },
    { key: "length", label: "Ogive length", kind: "length", section: "Nose", default: "100", min: 20, max: 160 },
    { key: "shoulderDiameter", label: "Shoulder diameter", kind: "length", section: "Shoulder", default: "40", min: 10, max: 110 },
    { key: "shoulderLength", label: "Shoulder length", kind: "length", section: "Shoulder", default: "12", min: 3, max: 60 },
    { key: "socketDepth", label: "Socket depth", kind: "length", section: "Shoulder", default: "25", min: 2, max: 100 },
    { key: "wall", label: "Socket wall", kind: "length", section: "Shoulder", default: "3", min: 1, max: 10 },
  ],
  parse: (raw) => ({
    baseMm: rawLength(raw, "baseDiameter"),
    lengthMm: rawLength(raw, "length"),
    shoulderMm: rawLength(raw, "shoulderDiameter"),
    shoulderLengthMm: rawLength(raw, "shoulderLength"),
    socketDepthMm: rawLength(raw, "socketDepth"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "baseDiameter", "Base diameter", p.baseMm, 20, 120);
    pushRange(errors, units, "length", "Ogive length", p.lengthMm, 20, 160);
    pushRange(errors, units, "shoulderDiameter", "Shoulder diameter", p.shoulderMm, 10, 110);
    pushRange(errors, units, "shoulderLength", "Shoulder length", p.shoulderLengthMm, 3, 60);
    pushRange(errors, units, "socketDepth", "Socket depth", p.socketDepthMm, 2, 100);
    pushRange(errors, units, "wall", "Socket wall", p.wallMm, 1, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = p.shoulderLengthMm + p.lengthMm;
    checkSize(errors, units, "baseDiameter", Math.max(p.baseMm, p.shoulderMm), total);
    checkWall(errors, units, "wall", "socket wall", p.shoulderMm / 2 - p.wallMm);
    if (p.socketDepthMm >= p.shoulderLengthMm + p.lengthMm * 0.8) {
      errors.push({ field: "socketDepth", level: "error", message: "The socket reaches into the ogive tip." });
    }
    const fineness = p.lengthMm / p.baseMm;
    if (fineness < 2) pushWarning(warnings, "length", "A fineness ratio under 2 is blunt and unstable.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Base Ø", value: measure(p.baseMm, units), source: "input" },
        { label: "Ogive length", value: measure(p.lengthMm, units), source: "input" },
        { label: "Overall length", value: measure(total, units), source: "calc" },
        { label: "Fineness", value: `${round(fineness, 2)} : 1`, source: "calc" },
        { label: "Shoulder Ø", value: measure(p.shoulderMm, units), source: "input" },
        { label: "Socket Ø", value: measure(Math.max(0, p.shoulderMm - 2 * p.wallMm), units), source: "calc" },
        { label: "Socket depth", value: measure(p.socketDepthMm, units), source: "input" },
      ],
      preview: previewOf(
        `${round(fineness, 1)}:1 ogive · ${measure(p.baseMm, units)} base`,
        `NC${round(p.baseMm, 0)}-${round(p.lengthMm, 0)}`,
        p.baseMm,
        total,
        [
          { label: "Base Ø", value: measure(p.baseMm, units) },
          { label: "Length", value: measure(total, units) },
          { label: "Socket", value: measure(Math.max(0, p.shoulderMm - 2 * p.wallMm), units) },
        ],
      ),
    };
  },
  build: (p) => {
    const baseR = p.baseMm / 2;
    const shoulderR = p.shoulderMm / 2;
    const socketR = Math.max(0.3, shoulderR - p.wallMm);
    const rho = (baseR * baseR + p.lengthMm * p.lengthMm) / (2 * baseR);
    // Tangent ogive, measured from the tip: r(0) = 0 at the tip and
    // r(length) = base radius where the arc meets the body tangentially.
    const ogiveAt = (fromTip: number) =>
      Math.sqrt(Math.max(0, rho * rho - (p.lengthMm - fromTip) ** 2)) + baseR - rho;
    const builder = new ProfileBuilder();
    builder.line({ x: 0, y: p.socketDepthMm });
    builder.line({ x: 0, y: p.shoulderLengthMm + p.lengthMm });
    for (let i = 0; i <= 72; i += 1) {
      const fromTip = (p.lengthMm * i) / 72;
      builder.point({
        x: Math.max(0, ogiveAt(fromTip)),
        y: p.shoulderLengthMm + p.lengthMm - fromTip,
      });
    }
    builder.line({ x: shoulderR, y: p.shoulderLengthMm });
    builder.line({ x: shoulderR, y: 0 });
    builder.line({ x: socketR, y: 0 });
    builder.line({ x: socketR, y: p.socketDepthMm });
    return revolve(builder.build(), baseR);
  },
  fileName: (p) => `nose-cone-${round(p.baseMm, 0)}d-${round(p.lengthMm, 0)}l.stl`,
});

/* ----------------------------------------------------------------- torus */

export const torus: AnyDesign = defineDesign({
  id: "torus",
  name: "Torus",
  family: "motion",
  eyebrow: "Ring",
  blurb: "A ring with a true circular cross-section.",
  lede: "A donut is the simplest swept solid: a circle revolved around an axis. Set the overall diameter and the tube diameter and the torus is generated with an exactly circular section — useful as a bumper, an O-ring groove former or a roller.",
  chips: [
    { label: "Overall Ø", value: "20 – 180 mm" },
    { label: "Tube Ø", value: "2 – 60 mm" },
    { label: "Volume", value: "2π²Rr²" },
  ],
  notes: [
    "The section circle is centred at R = (overall − tube)/2 and has radius r = tube/2. Its volume is 2π²Rr² and its surface area is 4π²Rr, so the readout can be checked against the drawing without a mesh measurement.",
    "A torus printed flat needs support under its inner overhang; printed on edge it needs none but the layer lines cross the ring. If it is a seal, print it flat and sand the inside face.",
  ],
  header: "Torus Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Overall diameter", kind: "length", section: "Torus", default: "80", min: 20, max: 180 },
    { key: "tubeDiameter", label: "Tube diameter", kind: "length", section: "Torus", default: "20", min: 2, max: 60 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    tubeMm: rawLength(raw, "tubeDiameter"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Overall diameter", p.outerMm, 20, 180);
    pushRange(errors, units, "tubeDiameter", "Tube diameter", p.tubeMm, 2, 60);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const tubeR = p.tubeMm / 2;
    const ringR = p.outerMm / 2 - tubeR;
    checkSize(errors, units, "outerDiameter", p.outerMm, p.tubeMm);
    if (ringR <= tubeR * 0.5) errors.push({ field: "tubeDiameter", level: "error", message: "The hole in the middle is too small — reduce the tube or enlarge the ring." });
    if (p.tubeMm > p.outerMm * 0.6) pushWarning(warnings, "tubeDiameter", "A very fat tube leaves almost no hole.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Overall Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Tube Ø", value: measure(p.tubeMm, units), source: "input" },
        { label: "Ring centre Ø", value: measure(ringR * 2, units), source: "calc" },
        { label: "Hole Ø", value: measure(Math.max(0, ringR * 2 - p.tubeMm), units), source: "calc" },
        { label: "Volume", value: `${round((2 * Math.PI ** 2 * ringR * tubeR ** 2) / 1000, 2)} cm³`, source: "calc" },
        { label: "Surface", value: `${round((4 * Math.PI ** 2 * ringR * tubeR) / 100, 1)} cm²`, source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.outerMm, units)} ring · ${measure(p.tubeMm, units)} tube`,
        `TO${round(p.outerMm, 0)}-${round(p.tubeMm, 0)}`,
        p.outerMm,
        p.tubeMm,
        [
          { label: "Overall Ø", value: measure(p.outerMm, units) },
          { label: "Tube Ø", value: measure(p.tubeMm, units) },
          { label: "Hole Ø", value: measure(Math.max(0, ringR * 2 - p.tubeMm), units) },
        ],
      ),
    };
  },
  build: (p) => {
    const tubeR = p.tubeMm / 2;
    const ringR = p.outerMm / 2 - tubeR;
    const builder = new ProfileBuilder();
    builder.arc(ringR, 0, tubeR, 0, Math.PI * 2, 56);
    return revolve(builder.build(), p.outerMm / 2);
  },
  fileName: (p) => `torus-${round(p.outerMm, 0)}-${round(p.tubeMm, 0)}.stl`,
});

/* --------------------------------------------------------- v-belt pulley */

export const vBeltPulley: AnyDesign = defineDesign({
  id: "v-belt-pulley",
  name: "V-belt pulley",
  family: "drives",
  eyebrow: "Wedge grip",
  blurb: "A single or multi-groove pulley cut for a V-belt.",
  lede: "The grooves are true V cuts at the belt's included angle, spaced on the entered pitch and sunk to the entered depth. That wedge is what gives a V-belt its grip, so the angle and depth matter more than the outside diameter.",
  chips: [
    { label: "Grooves", value: "1 – 4" },
    { label: "Outside Ø", value: "30 – 180 mm" },
    { label: "Belt angle", value: "30 – 45°" },
  ],
  notes: [
    "Each groove is a trapezoid: its top width is `2·depth·tan(angle/2)` and its flanks run straight to a blunt root. The outside diameter is across the land between grooves and the pitch diameter sits about half a groove depth below it.",
    "Print a pulley with the grooves vertical if you can, so the belt loads the layer lines along the flank instead of peeling them apart. A 0.2 mm clearance on the belt width keeps a printed pulley from grabbing.",
  ],
  header: "V-Belt Pulley Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outside diameter", kind: "length", section: "Pulley", default: "90", min: 30, max: 180 },
    { key: "grooves", label: "Grooves", kind: "count", section: "Groove", default: "1", min: 1, max: 4 },
    { key: "grooveDepth", label: "Groove depth", kind: "length", section: "Groove", default: "12", min: 2, max: 30 },
    { key: "grooveAngle", label: "Included angle", kind: "number", section: "Groove", default: "38", min: 30, max: 45 },
    { key: "groovePitch", label: "Groove pitch", kind: "length", section: "Groove", default: "16", min: 6, max: 60 },
    { key: "edgeMargin", label: "Edge margin", kind: "length", section: "Groove", default: "4", min: 1, max: 20 },
    { key: "bore", label: "Bore", kind: "length", section: "Pulley", default: "12", min: 1, max: 80 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    grooves: rawNumber(raw, "grooves"),
    depthMm: rawLength(raw, "grooveDepth"),
    angleDeg: rawNumber(raw, "grooveAngle"),
    pitchMm: rawLength(raw, "groovePitch"),
    marginMm: rawLength(raw, "edgeMargin"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outside diameter", p.outerMm, 30, 180);
    pushInteger(errors, "grooves", "Grooves", p.grooves, 1, 4);
    pushRange(errors, units, "grooveDepth", "Groove depth", p.depthMm, 2, 30);
    pushRange(errors, units, "grooveAngle", "Included angle", p.angleDeg, 30, 45, false);
    pushRange(errors, units, "groovePitch", "Groove pitch", p.pitchMm, 6, 60);
    pushRange(errors, units, "edgeMargin", "Edge margin", p.marginMm, 1, 20);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 80);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerR = p.outerMm / 2;
    const halfTop = p.depthMm * Math.tan((p.angleDeg * Math.PI) / 360);
    const width = p.grooves * p.pitchMm + 2 * p.marginMm;
    const rootR = outerR - p.depthMm;
    checkSize(errors, units, "outerDiameter", p.outerMm, width);
    checkWall(errors, units, "bore", "rim at the groove root", rootR - p.boreMm / 2);
    if (halfTop * 2 >= p.pitchMm) errors.push({ field: "groovePitch", level: "error", message: "Adjacent grooves overlap at the rim." });
    if (p.depthMm >= outerR * 0.7) errors.push({ field: "grooveDepth", level: "error", message: "The groove reaches past the axis." });
    if (width > 180) errors.push({ field: "grooves", level: "error", message: "The pulley is wider than the 180 mm bed." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Grooves", value: String(Math.round(p.grooves)), source: "input" },
        { label: "Groove root Ø", value: measure(rootR * 2, units), source: "calc" },
        { label: "Groove angle", value: `${round(p.angleDeg, 1)}°`, source: "input" },
        { label: "Groove top", value: measure(halfTop * 2, units), source: "calc" },
        { label: "Face width", value: measure(width, units), source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.grooves)} × ${round(p.angleDeg, 0)}° groove`,
        `VP${round(p.outerMm, 0)}-${Math.round(p.grooves)}`,
        p.outerMm,
        width,
        [
          { label: "Outside Ø", value: measure(p.outerMm, units) },
          { label: "Groove root Ø", value: measure(rootR * 2, units) },
          { label: "Face width", value: measure(width, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.outerMm / 2;
    const boreR = p.boreMm / 2;
    const halfTop = p.depthMm * Math.tan((p.angleDeg * Math.PI) / 360);
    const width = p.grooves * p.pitchMm + 2 * p.marginMm;
    const profile: Point2D[] = [
      { x: boreR, y: 0 },
      { x: outerR, y: 0 },
    ];
    for (let i = 0; i < p.grooves; i += 1) {
      const centre = p.marginMm + p.pitchMm * (i + 0.5);
      profile.push({ x: outerR, y: centre - halfTop });
      profile.push({ x: outerR - p.depthMm, y: centre });
      profile.push({ x: outerR, y: centre + halfTop });
    }
    profile.push({ x: outerR, y: width });
    profile.push({ x: boreR, y: width });
    return revolve(profile, outerR);
  },
  fileName: (p) => `v-belt-pulley-${round(p.outerMm, 0)}d-${Math.round(p.grooves)}g.stl`,
});

/* ------------------------------------------------------- round-belt pulley */

export const roundBeltPulley: AnyDesign = defineDesign({
  id: "round-belt-pulley",
  name: "Round-belt pulley",
  family: "drives",
  eyebrow: "U-groove",
  blurb: "A pulley with semicircular grooves for round belting.",
  lede: "A round belt sits in a semicircular groove, so the groove radius is the belt radius. Choose the belt diameter and the number of grooves; the groove depth and width both follow from that one number.",
  chips: [
    { label: "Belt Ø", value: "2 – 20 mm" },
    { label: "Grooves", value: "1 – 3" },
    { label: "Outside Ø", value: "20 – 180 mm" },
  ],
  notes: [
    "The groove is a true semicircle centred on the outside diameter, so it cuts exactly one belt radius into the rim. That gives the belt full contact around half its section instead of pinching it in a V.",
    "Round belting stretches, so a centre distance that can be adjusted is worth more than a precise groove. Print the pulley with a flat on the hub or a grub-screw boss if it has to transmit real torque.",
  ],
  header: "Round Belt Pulley Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outside diameter", kind: "length", section: "Pulley", default: "80", min: 20, max: 180 },
    { key: "beltDiameter", label: "Belt diameter", kind: "length", section: "Groove", default: "8", min: 2, max: 20 },
    { key: "grooves", label: "Grooves", kind: "count", section: "Groove", default: "1", min: 1, max: 3 },
    { key: "groovePitch", label: "Groove pitch", kind: "length", section: "Groove", default: "14", min: 5, max: 60 },
    { key: "edgeMargin", label: "Edge margin", kind: "length", section: "Groove", default: "4", min: 1, max: 20 },
    { key: "bore", label: "Bore", kind: "length", section: "Pulley", default: "10", min: 1, max: 80 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    beltMm: rawLength(raw, "beltDiameter"),
    grooves: rawNumber(raw, "grooves"),
    pitchMm: rawLength(raw, "groovePitch"),
    marginMm: rawLength(raw, "edgeMargin"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outside diameter", p.outerMm, 20, 180);
    pushRange(errors, units, "beltDiameter", "Belt diameter", p.beltMm, 2, 20);
    pushInteger(errors, "grooves", "Grooves", p.grooves, 1, 3);
    pushRange(errors, units, "groovePitch", "Groove pitch", p.pitchMm, 5, 60);
    pushRange(errors, units, "edgeMargin", "Edge margin", p.marginMm, 1, 20);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 80);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerR = p.outerMm / 2;
    const beltR = p.beltMm / 2;
    const rootR = outerR - beltR;
    const width = p.grooves * p.pitchMm + 2 * p.marginMm;
    checkSize(errors, units, "outerDiameter", p.outerMm, width);
    checkWall(errors, units, "bore", "rim under the groove", rootR - p.boreMm / 2);
    if (p.pitchMm < p.beltMm + 1) errors.push({ field: "groovePitch", level: "error", message: "The grooves touch — widen the pitch." });
    if (p.beltMm >= p.outerMm * 0.8) errors.push({ field: "beltDiameter", level: "error", message: "The belt is almost as wide as the pulley." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Belt Ø", value: measure(p.beltMm, units), source: "input" },
        { label: "Groove root Ø", value: measure(rootR * 2, units), source: "calc" },
        { label: "Grooves", value: String(Math.round(p.grooves)), source: "input" },
        { label: "Face width", value: measure(width, units), source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.grooves)} × ${measure(p.beltMm, units)} belt`,
        `RP${round(p.outerMm, 0)}-${round(p.beltMm, 0)}`,
        p.outerMm,
        width,
        [
          { label: "Outside Ø", value: measure(p.outerMm, units) },
          { label: "Belt Ø", value: measure(p.beltMm, units) },
          { label: "Face width", value: measure(width, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.outerMm / 2;
    const beltR = p.beltMm / 2;
    const boreR = p.boreMm / 2;
    const width = p.grooves * p.pitchMm + 2 * p.marginMm;
    const builder = new ProfileBuilder();
    builder.line({ x: boreR, y: 0 });
    builder.line({ x: outerR, y: 0 });
    for (let i = 0; i < p.grooves; i += 1) {
      const centre = p.marginMm + p.pitchMm * (i + 0.5);
      builder.line({ x: outerR, y: centre - beltR });
      builder.arc(outerR, centre, beltR, -Math.PI / 2, -1.5 * Math.PI, 20);
    }
    builder.line({ x: outerR, y: width });
    builder.line({ x: boreR, y: width });
    return revolve(builder.build(), outerR);
  },
  fileName: (p) => `round-belt-pulley-${round(p.outerMm, 0)}d-${round(p.beltMm, 0)}b.stl`,
});

/* ---------------------------------------------------------- stepped pulley */

export const steppedPulley: AnyDesign = defineDesign({
  id: "stepped-pulley",
  name: "Stepped pulley",
  family: "drives",
  eyebrow: "Speed selection",
  blurb: "A cone pulley with two to four diameters on one bore.",
  lede: "Stepped pulleys change speed by moving the belt from one sheave to the next. Each step has its own diameter and width, all on one through bore, so the part is a single turned solid rather than a stack of separate wheels.",
  chips: [
    { label: "Steps", value: "2 – 4" },
    { label: "Largest Ø", value: "20 – 180 mm" },
    { label: "Total width", value: "mm" },
  ],
  notes: [
    "The steps are stacked along the bore with flat shoulders between them. Diameters and widths are independent, so a cone pulley with equal width steps and a 1:2 speed range is a few fields away.",
    "A step pulley needs a belt that can be shifted while stopped. Check that the belt length stays the same across the steps — otherwise the tension changes every time you change speed.",
  ],
  header: "Stepped Pulley Designer - units: mm",
  fields: [
    { key: "steps", label: "Steps", kind: "select", section: "Pulley", default: "3", options: [
      { value: "2", label: "2 steps" },
      { value: "3", label: "3 steps" },
      { value: "4", label: "4 steps" },
    ] },
    { key: "diameter1", label: "Step 1 Ø", kind: "length", section: "Steps", default: "40", min: 10, max: 180 },
    { key: "width1", label: "Step 1 width", kind: "length", section: "Steps", default: "12", min: 3, max: 60 },
    { key: "diameter2", label: "Step 2 Ø", kind: "length", section: "Steps", default: "55", min: 10, max: 180 },
    { key: "width2", label: "Step 2 width", kind: "length", section: "Steps", default: "12", min: 3, max: 60 },
    { key: "diameter3", label: "Step 3 Ø", kind: "length", section: "Steps", default: "70", min: 10, max: 180, visible: (v) => Number(v.steps) >= 3 },
    { key: "width3", label: "Step 3 width", kind: "length", section: "Steps", default: "12", min: 3, max: 60, visible: (v) => Number(v.steps) >= 3 },
    { key: "diameter4", label: "Step 4 Ø", kind: "length", section: "Steps", default: "85", min: 10, max: 180, visible: (v) => Number(v.steps) >= 4 },
    { key: "width4", label: "Step 4 width", kind: "length", section: "Steps", default: "12", min: 3, max: 60, visible: (v) => Number(v.steps) >= 4 },
    { key: "bore", label: "Bore", kind: "length", section: "Pulley", default: "12", min: 1, max: 100 },
  ],
  parse: (raw) => ({
    steps: rawNumber(raw, "steps"),
    d1: rawLength(raw, "diameter1"),
    w1: rawLength(raw, "width1"),
    d2: rawLength(raw, "diameter2"),
    w2: rawLength(raw, "width2"),
    d3: rawLength(raw, "diameter3"),
    w3: rawLength(raw, "width3"),
    d4: rawLength(raw, "diameter4"),
    w4: rawLength(raw, "width4"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "steps", "Steps", p.steps, 2, 4);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 100);
    const count = Math.max(2, Math.min(4, Math.round(p.steps)));
    const dias = [p.d1, p.d2, p.d3, p.d4].slice(0, count);
    const widths = [p.w1, p.w2, p.w3, p.w4].slice(0, count);
    dias.forEach((d, i) => pushRange(errors, units, `diameter${i + 1}`, `Step ${i + 1} diameter`, d, 10, 180));
    widths.forEach((w, i) => pushRange(errors, units, `width${i + 1}`, `Step ${i + 1} width`, w, 3, 60));
    if (errors.length > 0) return emptyResult(errors, warnings);

    const total = widths.reduce((sum, w) => sum + w, 0);
    const maxD = Math.max(...dias);
    checkSize(errors, units, "diameter1", maxD, total);
    dias.forEach((d, i) => checkWall(errors, units, "bore", `wall at step ${i + 1}`, d / 2 - p.boreMm / 2));
    if (dias.some((d) => d <= p.boreMm)) errors.push({ field: "bore", level: "error", message: "The bore is wider than a step." });
    if (dias[0] < p.boreMm + 4) pushWarning(warnings, "diameter1", "The smallest step leaves a thin hub.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Steps", value: String(count), source: "input" },
        { label: "Total width", value: measure(total, units), source: "calc" },
        { label: "Largest Ø", value: measure(maxD, units), source: "calc" },
        { label: "Smallest Ø", value: measure(Math.min(...dias), units), source: "calc" },
        { label: "Speed range", value: `${round(maxD / Math.min(...dias), 2)} : 1`, source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
      ],
      preview: previewOf(
        `${count} steps · ${round(maxD / Math.min(...dias), 2)}:1`,
        `ST${count}-${round(maxD, 0)}`,
        maxD,
        total,
        [
          { label: "Largest Ø", value: measure(maxD, units) },
          { label: "Total width", value: measure(total, units) },
          { label: "Bore", value: measure(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const count = Math.max(2, Math.min(4, Math.round(p.steps)));
    const dias = [p.d1, p.d2, p.d3, p.d4].slice(0, count);
    const widths = [p.w1, p.w2, p.w3, p.w4].slice(0, count);
    const boreR = p.boreMm / 2;
    const profile: Point2D[] = [
      { x: boreR, y: 0 },
      { x: dias[0] / 2, y: 0 },
    ];
    let z = 0;
    for (let i = 0; i < count; i += 1) {
      z += widths[i];
      profile.push({ x: dias[i] / 2, y: z });
      if (i < count - 1) profile.push({ x: dias[i + 1] / 2, y: z });
    }
    profile.push({ x: boreR, y: z });
    return revolve(profile, Math.max(...dias) / 2);
  },
  fileName: (p) => `stepped-pulley-${Math.round(p.steps)}step.stl`,
});

/* --------------------------------------------------------------- flywheel */

export const flywheel: AnyDesign = defineDesign({
  id: "flywheel",
  name: "Flywheel",
  family: "drives",
  eyebrow: "Rim, web, hub",
  blurb: "A rim-weighted wheel with a thin web and a wide hub.",
  lede: "Mass at the rim is what stores energy, so the flywheel is a thick rim, a thin web and a hub wide enough to key onto a shaft. All four sections are independent, and the profile is a single closed section revolved about the bore.",
  chips: [
    { label: "Rim Ø", value: "40 – 180 mm" },
    { label: "Rim width", value: "4 – 60 mm" },
    { label: "Web", value: "1 – 20 mm" },
  ],
  notes: [
    "The cross-section walks from the bore out through the hub, along the web, down into the rim and back around the other side. That makes the web and rim one continuous shell with no joint, and the bore runs straight through the hub.",
    "Energy rises with the square of the diameter but only linearly with mass, so a larger rim beats a heavier web. Balance the part before running it fast: a printed flywheel is never symmetric enough to spin hard without vibration.",
  ],
  header: "Flywheel Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Rim diameter", kind: "length", section: "Rim", default: "120", min: 40, max: 180 },
    { key: "rimWidth", label: "Rim radial width", kind: "length", section: "Rim", default: "14", min: 4, max: 60 },
    { key: "width", label: "Rim axial width", kind: "length", section: "Rim", default: "20", min: 5, max: 60 },
    { key: "webThickness", label: "Web thickness", kind: "length", section: "Web", default: "5", min: 1, max: 20 },
    { key: "hubDiameter", label: "Hub diameter", kind: "length", section: "Hub", default: "30", min: 8, max: 120 },
    { key: "hubWidth", label: "Hub width", kind: "length", section: "Hub", default: "18", min: 4, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Hub", default: "12", min: 1, max: 80 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    rimWidthMm: rawLength(raw, "rimWidth"),
    widthMm: rawLength(raw, "width"),
    webMm: rawLength(raw, "webThickness"),
    hubMm: rawLength(raw, "hubDiameter"),
    hubWidthMm: rawLength(raw, "hubWidth"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Rim diameter", p.outerMm, 40, 180);
    pushRange(errors, units, "rimWidth", "Rim radial width", p.rimWidthMm, 4, 60);
    pushRange(errors, units, "width", "Rim axial width", p.widthMm, 5, 60);
    pushRange(errors, units, "webThickness", "Web thickness", p.webMm, 1, 20);
    pushRange(errors, units, "hubDiameter", "Hub diameter", p.hubMm, 8, 120);
    pushRange(errors, units, "hubWidth", "Hub width", p.hubWidthMm, 4, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 80);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outerR = p.outerMm / 2;
    const innerR = outerR - p.rimWidthMm;
    checkSize(errors, units, "outerDiameter", p.outerMm, Math.max(p.widthMm, p.hubWidthMm));
    checkWall(errors, units, "bore", "hub wall", p.hubMm / 2 - p.boreMm / 2);
    if (innerR <= p.hubMm / 2 + 2) errors.push({ field: "rimWidth", level: "error", message: "The rim reaches the hub — narrow the rim or the hub." });
    if (p.webMm >= p.widthMm) errors.push({ field: "webThickness", level: "error", message: "The web is as thick as the rim." });
    if (p.hubWidthMm > p.widthMm) errors.push({ field: "hubWidth", level: "error", message: "The hub is wider than the rim; keep it inside the part." });
    if (p.webMm < 3) pushWarning(warnings, "webThickness", "A web under 3 mm is fragile at the hub fillet.");

    const rimArea = Math.PI * (outerR ** 2 - innerR ** 2);
    const webArea = Math.PI * (innerR ** 2 - (p.hubMm / 2) ** 2);
    const estimate =
      (rimArea * p.widthMm + webArea * p.webMm) / 1000 - Math.PI * (p.boreMm / 2) ** 2 * p.hubWidthMm / 1000;

    return {
      errors,
      warnings,
      readout: [
        { label: "Rim Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Rim width", value: measure(p.rimWidthMm, units), source: "input" },
        { label: "Axial width", value: measure(p.widthMm, units), source: "input" },
        { label: "Web", value: measure(p.webMm, units), source: "input" },
        { label: "Hub Ø", value: measure(p.hubMm, units), source: "input" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
        { label: "Mass estimate", value: `${round(estimate * 1.24, 0)} g PLA`, source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.outerMm, units)} rim · ${measure(p.widthMm, units)} wide`,
        `FW${round(p.outerMm, 0)}-${round(p.widthMm, 0)}`,
        p.outerMm,
        Math.max(p.widthMm, p.hubWidthMm),
        [
          { label: "Rim Ø", value: measure(p.outerMm, units) },
          { label: "Hub Ø", value: measure(p.hubMm, units) },
          { label: "Bore", value: measure(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.outerMm / 2;
    const innerR = outerR - p.rimWidthMm;
    const hubR = p.hubMm / 2;
    const boreR = p.boreMm / 2;
    const w = p.widthMm;
    const hubW = p.hubWidthMm;
    const web = p.webMm;
    const zHub0 = (w - hubW) / 2;
    const zHub1 = (w + hubW) / 2;
    const zWeb0 = (w - web) / 2;
    const zWeb1 = (w + web) / 2;
    const profile: Point2D[] = [
      { x: boreR, y: zHub0 },
      { x: hubR, y: zHub0 },
      { x: hubR, y: zWeb0 },
      { x: innerR, y: zWeb0 },
      { x: innerR, y: 0 },
      { x: outerR, y: 0 },
      { x: outerR, y: w },
      { x: innerR, y: w },
      { x: innerR, y: zWeb1 },
      { x: hubR, y: zWeb1 },
      { x: hubR, y: zHub1 },
      { x: boreR, y: zHub1 },
    ];
    return revolve(profile, outerR);
  },
  fileName: (p) => `flywheel-${round(p.outerMm, 0)}d-${round(p.widthMm, 0)}w.stl`,
});

/* ------------------------------------------------------ hemisphere shell */

export const hemisphereShell: AnyDesign = defineDesign({
  id: "hemisphere-shell",
  name: "Hemisphere shell",
  family: "vessels",
  eyebrow: "Half sphere",
  blurb: "A hollow dome with a true hemispherical wall.",
  lede: "A half sphere with a constant wall, open at the equator. Set the outside diameter and wall and the dome is generated from the sphere, so it is round in every section rather than a stack of rings.",
  chips: [
    { label: "Outer Ø", value: "20 – 180 mm" },
    { label: "Wall", value: "1 – 20 mm" },
    { label: "Height", value: "outer radius" },
  ],
  notes: [
    "The outer surface is a quarter circle from the equator to the pole, revolved about the axis; the inner surface is the same arc at radius R − wall. The flat rim between them closes the shell, and the pole is a single vertex rather than a ring of tiny facets.",
    "A dome printed open-side down needs support for the whole inner surface. Printed as a cap on a support column, the outer surface stays clean; either way, keep the wall thick enough that the top layers do not pill.",
  ],
  header: "Hemisphere Shell Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outer diameter", kind: "length", section: "Dome", default: "100", min: 20, max: 180 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Dome", default: "3", min: 1, max: 20 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outer diameter", p.outerMm, 20, 180);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const R = p.outerMm / 2;
    checkSize(errors, units, "outerDiameter", p.outerMm, R);
    checkWall(errors, units, "wall", "shell thickness", R - p.wallMm);
    if (p.wallMm >= R * 0.6) errors.push({ field: "wall", level: "error", message: "The wall fills most of the dome; reduce it or enlarge the diameter." });
    if (p.wallMm < 1.5) pushWarning(warnings, "wall", "Under 1.5 mm the dome will sag at the pole.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Outer Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Height", value: measure(R, units), source: "calc" },
        { label: "Inner Ø", value: measure((R - p.wallMm) * 2, units), source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
        { label: "Shell volume", value: `${round((2 / 3) * Math.PI * (R ** 3 - (R - p.wallMm) ** 3) / 1000, 2)} cm³`, source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.outerMm, units)} dome · ${measure(p.wallMm, units)} wall`,
        `HS${round(p.outerMm, 0)}-${round(p.wallMm, 1)}`,
        p.outerMm,
        R,
        [
          { label: "Outer Ø", value: measure(p.outerMm, units) },
          { label: "Height", value: measure(R, units) },
          { label: "Inner Ø", value: measure((R - p.wallMm) * 2, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const R = p.outerMm / 2;
    const inner = R - p.wallMm;
    const builder = new ProfileBuilder();
    builder.line({ x: R, y: 0 });
    builder.arc(0, 0, R, 0, Math.PI / 2, 40);
    builder.line({ x: 0, y: inner });
    builder.arc(0, 0, inner, Math.PI / 2, 0, 40);
    return revolve(builder.build(), R);
  },
  fileName: (p) => `hemisphere-${round(p.outerMm, 0)}d-${round(p.wallMm, 1)}w.stl`,
});

export const revolveMechanical: AnyDesign[] = [
  pipeReducer,
  pipeCap,
  hoseAdapter,
  deLavalNozzle,
  noseCone,
  torus,
  vBeltPulley,
  roundBeltPulley,
  steppedPulley,
  flywheel,
  hemisphereShell,
];
