/** Turned batch 2: cutters, pins, boots and cups turned from closed profiles. */

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

/* ---------------------------------------------------------- portafilter funnel */

export const portafilterFunnel: AnyDesign = defineDesign({
  id: "portafilter-funnel",
  name: "Portafilter funnel",
  family: "vessels",
  eyebrow: "Dosing ring",
  blurb: "A tapered ring that seats in a coffee basket and guides the grounds in.",
  lede: "A dosing funnel that sits inside a portafilter basket: the bottom ring is a push fit in the basket and the top flares out to catch the grounds. It is open at both ends, so the tamper can pass straight through.",
  use: "Filling an espresso basket without spilling grounds over the rim before tamping.",
  notesTitle: "How the ring seats in the basket",
  chips: [
    { label: "Basket Ø", value: "38 – 70 mm" },
    { label: "Top Ø", value: "50 – 100 mm" },
    { label: "Height", value: "8 – 40 mm" },
  ],
  notes: [
    "The bottom diameter matches the basket and the top is wider, with the wall held constant along the taper. Because the ring is open at both ends, the grounds fall through and the tamper is not obstructed.",
    "Make it in a tough material if it will touch the coffee, and smooth the inside with a light sand or a flame polish. Polymer is not food-contact rated, and a paper filter keeps the coffee off the plastic. A funnel that is a loose fit still works; one that is too tight will jam in the basket when coffee gets behind it.",
  ],
  header: "Portafilter Funnel Designer - units: mm",
  fields: [
    { key: "basket", label: "Basket diameter", kind: "length", section: "Funnel", default: "58", min: 38, max: 70 },
    { key: "top", label: "Top diameter", kind: "length", section: "Funnel", default: "70", min: 50, max: 100 },
    { key: "height", label: "Height", kind: "length", section: "Funnel", default: "20", min: 8, max: 40 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Funnel", default: "2", min: 1.5, max: 4 },
  ],
  parse: (raw) => ({
    basketMm: rawLength(raw, "basket"),
    topMm: rawLength(raw, "top"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "basket", "Basket diameter", p.basketMm, 38, 70);
    pushRange(errors, units, "top", "Top diameter", p.topMm, 50, 100);
    pushRange(errors, units, "height", "Height", p.heightMm, 8, 40);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "top", p.topMm, p.heightMm);

    checkWall(errors, units, "wall", "funnel wall", p.wallMm);
    if (p.topMm <= p.basketMm + 4) errors.push({ field: "top", level: "error", message: "The top does not flare beyond the basket." });
    if (p.wallMm * 2 >= p.basketMm - 2) errors.push({ field: "wall", level: "error", message: "The wall closes the funnel throat." });
    if (p.heightMm < p.topMm * 0.15) warnings.push({ field: "height", level: "warning", message: "A very shallow funnel spills grounds over the top." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Basket Ø", value: U(p.basketMm, units), source: "input" },
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Flare", value: U((p.topMm - p.basketMm) / 2, units), source: "calc" },
        { label: "Throat", value: U(p.basketMm - 2 * p.wallMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.basketMm, units)} basket · ${U(p.topMm, units)} top`,
        `PF${R(p.basketMm, 0)}-${R(p.topMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Basket", value: U(p.basketMm, units) },
          { label: "Top", value: U(p.topMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const basketR = p.basketMm / 2;
    const topR = p.topMm / 2;
    return spin(
      [
        { x: basketR, y: 0 },
        { x: topR, y: p.heightMm },
        { x: topR - p.wallMm, y: p.heightMm },
        { x: basketR - p.wallMm, y: 0 },
      ],
      topR,
    );
  },
  fileName: (p) => `portafilter-funnel-${R(p.basketMm, 0)}-${R(p.topMm, 0)}.stl`,
});

/* --------------------------------------------------------------- biscuit cutter */

export const biscuitCutter: AnyDesign = defineDesign({
  id: "biscuit-cutter",
  name: "Biscuit cutter",
  family: "vessels",
  eyebrow: "Cutting ring",
  blurb: "A ring with a bevelled cutting edge and a straight handle-height wall.",
  lede: "A biscuit cutter turned as a ring with a real bevel at the cutting edge: the outside tapers to a thin land, so the ring enters dough without dragging, and the wall above the bevel is straight for a comfortable grip.",
  use: "Cutting biscuits, scones or pastry rounds to a consistent diameter.",
  notesTitle: "How the cutting edge is formed",
  chips: [
    { label: "Diameter", value: "40 – 160 mm" },
    { label: "Height", value: "15 – 60 mm" },
    { label: "Bevel", value: "2 – 8 mm" },
  ],
  notes: [
    "The bevel is cut on the outside, so the thin land is at the bottom and the ring widens as it rises. The land width is the bevel less the wall, and the designer keeps it positive so the edge is a land rather than a knife point that folds over.",
    "Make it in a tough material and make the bevel upward; the cutting edge then comes off the surface cleanly. A cutter is not dishwasher safe, and a warm ring will deform, so wash it by hand and use a paper case between dough and plastic.",
  ],
  header: "Biscuit Cutter Designer - units: mm",
  fields: [
    { key: "diameter", label: "Cutter diameter", kind: "length", section: "Cutter", default: "70", min: 40, max: 160 },
    { key: "height", label: "Cutter height", kind: "length", section: "Cutter", default: "30", min: 15, max: 60 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Cutter", default: "1.5", min: 1, max: 3 },
    { key: "bevel", label: "Edge bevel", kind: "length", section: "Edge", default: "4", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    bevelMm: rawLength(raw, "bevel"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Cutter diameter", p.diameterMm, 40, 160);
    pushRange(errors, units, "height", "Cutter height", p.heightMm, 15, 60);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 3);
    pushRange(errors, units, "bevel", "Edge bevel", p.bevelMm, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);

    const radius = p.diameterMm / 2;
    if (p.bevelMm <= p.wallMm + 0.5) errors.push({ field: "bevel", level: "error", message: "The bevel is not wider than the wall, so the bottom closes to a point." });
    if (p.bevelMm >= radius - 2) errors.push({ field: "bevel", level: "error", message: "The bevel reaches the centre of the ring." });
    if (p.heightMm <= p.bevelMm + 3) errors.push({ field: "height", level: "error", message: "The ring is too short above the bevel to hold." });
    if (p.wallMm < 1.2) warnings.push({ field: "wall", level: "warning", message: "A wall under 1.2 mm folds when the cutter is pressed." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Diameter", value: U(p.diameterMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Bevel", value: U(p.bevelMm, units), source: "input" },
        { label: "Cutting land", value: U(p.bevelMm - p.wallMm, units), source: "calc" },
        { label: "Straight wall", value: U(p.heightMm - p.bevelMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} round · ${U(p.heightMm, units)} high`,
        `BC${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Diameter", value: U(p.diameterMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Bevel", value: U(p.bevelMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outerR = p.diameterMm / 2;
    const innerR = outerR - p.wallMm;
    return spin(
      [
        { x: innerR, y: 0 },
        { x: innerR, y: p.heightMm },
        { x: outerR, y: p.heightMm },
        { x: outerR, y: p.bevelMm },
        { x: outerR - p.bevelMm, y: 0 },
      ],
      outerR,
    );
  },
  fileName: (p) => `biscuit-cutter-${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* --------------------------------------------------------------- alignment pin */

export const alignmentPin: AnyDesign = defineDesign({
  id: "alignment-pin",
  name: "Alignment pin",
  family: "fixings",
  eyebrow: "Chamfered pin",
  blurb: "A straight pin with a lead-in chamfer at both ends.",
  lede: "A dowel-style alignment pin with a chamfer at each end: the chamfer starts the pin square in the hole and protects the edge from mushrooming. The shank is a plain cylinder, so the pin can be a slip or press fit depending on the hole you drill.",
  use: "Lining up two fixture plates or two halves of a mould that are taken apart often.",
  notesTitle: "Why both ends are chamfered",
  chips: [
    { label: "Diameter", value: "4 – 30 mm" },
    { label: "Length", value: "10 – 100 mm" },
    { label: "Chamfer", value: "0.5 – 3 mm" },
  ],
  notes: [
    "Both ends get the same chamfer, so the pin can go in either way round and neither end has a sharp rim to catch in a hole. The chamfer is limited to less than half the length, which guarantees a full-diameter shank between them.",
    "Make the pin on its side if you need the best dimensional accuracy, or upright with a wide base if the chamfer matters more. For a press fit, drill the hole 0.1 mm undersize and freeze the pin before pressing it.",
  ],
  header: "Alignment Pin Designer - units: mm",
  fields: [
    { key: "diameter", label: "Pin diameter", kind: "length", section: "Pin", default: "10", min: 4, max: 30 },
    { key: "length", label: "Pin length", kind: "length", section: "Pin", default: "40", min: 10, max: 100 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Pin", default: "1", min: 0.5, max: 3 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    lengthMm: rawLength(raw, "length"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Pin diameter", p.diameterMm, 4, 30);
    pushRange(errors, units, "length", "Pin length", p.lengthMm, 10, 100);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0.5, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.lengthMm);

    if (p.chamferMm * 2 >= p.lengthMm - 1) errors.push({ field: "chamfer", level: "error", message: "The two chamfers meet; shorten them or lengthen the pin." });
    if (p.chamferMm > p.diameterMm * 0.4) warnings.push({ field: "chamfer", level: "warning", message: "A chamfer over 40 percent of the diameter leaves a short shank." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Diameter", value: U(p.diameterMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
        { label: "Full shank", value: U(p.lengthMm - 2 * p.chamferMm, units), source: "calc" },
        { label: "Lead-in", value: `${R((Math.atan2(p.chamferMm, p.chamferMm) * 180) / Math.PI, 0)}°`, source: "calc" },
        { label: "Pin mass", value: `${R((Math.PI * (p.diameterMm / 2) ** 2 * p.lengthMm) / 1000, 2)} cm³`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} × ${U(p.lengthMm, units)} pin`,
        `AP${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}`,
        p.diameterMm,
        p.lengthMm,
        [
          { label: "Diameter", value: U(p.diameterMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
          { label: "Chamfer", value: U(p.chamferMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const c = p.chamferMm;
    return spin(
      [
        { x: 0, y: 0 },
        { x: radius - c, y: 0 },
        { x: radius, y: c },
        { x: radius, y: p.lengthMm - c },
        { x: radius - c, y: p.lengthMm },
        { x: 0, y: p.lengthMm },
      ],
      radius,
    );
  },
  fileName: (p) => `alignment-pin-${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* --------------------------------------------------------------------- taper pin */

export const taperPin: AnyDesign = defineDesign({
  id: "taper-pin",
  name: "Taper pin",
  family: "fixings",
  eyebrow: "Wedging pin",
  blurb: "A tapered pin that locks itself into a reamed hole in a hub.",
  lede: "A solid taper pin with a real included angle: the small end enters the reamed hole and the taper wedges as it is driven home. The taper angle is derived from the two diameters and the length, so the pin can be matched to a standard reamer.",
  use: "Locking a hub, a collar or a lever on a shaft through a reamed taper hole.",
  notesTitle: "How the taper is set",
  chips: [
    { label: "Small Ø", value: "2 – 20 mm" },
    { label: "Large Ø", value: "4 – 30 mm" },
    { label: "Length", value: "10 – 100 mm" },
  ],
  notes: [
    "The profile is a trapezoid, so the pin is a true frustum with no step at either end. The included angle is reported directly; a self-locking pin needs a shallow angle, so a large difference over a short pin is flagged as a wedge that will loosen.",
    "Make the pin along its axis for the best taper and ream the hole to match a test pin. A taper is best used with a little adhesive or a cross pin; driving it hard into metal will crush the material.",
  ],
  header: "Taper Pin Designer - units: mm",
  fields: [
    { key: "small", label: "Small diameter", kind: "length", section: "Pin", default: "6", min: 2, max: 20 },
    { key: "large", label: "Large diameter", kind: "length", section: "Pin", default: "10", min: 4, max: 30 },
    { key: "length", label: "Pin length", kind: "length", section: "Pin", default: "50", min: 10, max: 100 },
  ],
  parse: (raw) => ({
    smallMm: rawLength(raw, "small"),
    largeMm: rawLength(raw, "large"),
    lengthMm: rawLength(raw, "length"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "small", "Small diameter", p.smallMm, 2, 20);
    pushRange(errors, units, "large", "Large diameter", p.largeMm, 4, 30);
    pushRange(errors, units, "length", "Pin length", p.lengthMm, 10, 100);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "large", p.largeMm, p.lengthMm);

    if (p.largeMm <= p.smallMm + 0.5) errors.push({ field: "large", level: "error", message: "The pin is not tapered; the large end must exceed the small end." });
    const angle = (Math.atan2((p.largeMm - p.smallMm) / 2, p.lengthMm) * 180) / Math.PI;
    if (angle > 4) warnings.push({ field: "length", level: "warning", message: "An included taper this steep will not hold without a nut." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Small Ø", value: U(p.smallMm, units), source: "input" },
        { label: "Large Ø", value: U(p.largeMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Taper", value: `${R(angle, 2)}°`, source: "calc" },
        { label: "Taper ratio", value: `1:${R(p.lengthMm / Math.max(0.01, (p.largeMm - p.smallMm) / 2), 1)}`, source: "calc" },
        { label: "End step", value: U((p.largeMm - p.smallMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.smallMm, units)} to ${U(p.largeMm, units)} taper`,
        `TP${R(p.smallMm, 0)}-${R(p.largeMm, 0)}`,
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
  build: (p) =>
    spin(
      [
        { x: 0, y: 0 },
        { x: p.smallMm / 2, y: 0 },
        { x: p.largeMm / 2, y: p.lengthMm },
        { x: 0, y: p.lengthMm },
      ],
      p.largeMm / 2,
    ),
  fileName: (p) => `taper-pin-${R(p.smallMm, 0)}-${R(p.largeMm, 0)}.stl`,
});

/* ----------------------------------------------------------------------- eyelet */

export const eyelet: AnyDesign = defineDesign({
  id: "eyelet",
  name: "Eyelet",
  family: "fixings",
  eyebrow: "Lined hole",
  blurb: "A flanged tube that lines a hole and finishes both faces.",
  lede: "A hollow eyelet with a flange at each end: the tube passes through the material and both flanges clamp it, so the hole is lined and the raw edge is covered. The tube and flange are separate dimensions, which lets one eyelet suit a range of hole sizes.",
  use: "Lining a hole in canvas, leather, a banner or a thin panel so a cord cannot fray it.",
  notesTitle: "How the two flanges clamp",
  chips: [
    { label: "Tube Ø", value: "4 – 20 mm" },
    { label: "Bore", value: "2 – 14 mm" },
    { label: "Flange Ø", value: "6 – 24 mm" },
  ],
  notes: [
    "The tube is open through the middle, and the two flanges sit outside the material, so the eyelet is clamped rather than glued. The wall is checked at both the tube and the flange, and the flange must be wider than the tube by a real land.",
    "Make a strip of eyelets and press them with a warm soldering iron or a doming punch. An eyelet is a light-duty liner, not a replacement for a metal grommet in a load-bearing tarp.",
  ],
  header: "Eyelet Designer - units: mm",
  fields: [
    { key: "tube", label: "Tube diameter", kind: "length", section: "Eyelet", default: "6", min: 4, max: 20 },
    { key: "bore", label: "Bore", kind: "length", section: "Eyelet", default: "3.5", min: 2, max: 14 },
    { key: "length", label: "Overall length", kind: "length", section: "Eyelet", default: "6", min: 3, max: 20 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Eyelet", default: "10", min: 6, max: 24 },
    { key: "flangeT", label: "Flange thickness", kind: "length", section: "Eyelet", default: "1.2", min: 0.8, max: 3 },
  ],
  parse: (raw) => ({
    tubeMm: rawLength(raw, "tube"),
    boreMm: rawLength(raw, "bore"),
    lengthMm: rawLength(raw, "length"),
    flangeMm: rawLength(raw, "flange"),
    flangeTMm: rawLength(raw, "flangeT"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "tube", "Tube diameter", p.tubeMm, 4, 20);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 14);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 3, 20);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 6, 24);
    pushRange(errors, units, "flangeT", "Flange thickness", p.flangeTMm, 0.8, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.lengthMm);

    if (p.tubeMm <= p.boreMm + 1) errors.push({ field: "tube", level: "error", message: "The tube wall is under 0.5 mm; enlarge the tube or shrink the bore." });
    if (p.flangeMm <= p.tubeMm + 1) errors.push({ field: "flange", level: "error", message: "The flange does not overhang the tube." });
    if (p.lengthMm <= p.flangeTMm * 2) errors.push({ field: "length", level: "error", message: "The two flanges meet in the middle." });
    if (p.flangeTMm < 1) warnings.push({ field: "flangeT", level: "warning", message: "A flange under 1 mm tears when it is set." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Tube Ø", value: U(p.tubeMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Tube wall", value: U((p.tubeMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Flange land", value: U((p.flangeMm - p.tubeMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.flangeMm, units)} flange · ${U(p.boreMm, units)} bore`,
        `EY${R(p.flangeMm, 0)}-${R(p.boreMm, 1)}`,
        p.flangeMm,
        p.lengthMm,
        [
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const tubeR = p.tubeMm / 2;
    const boreR = p.boreMm / 2;
    const flangeR = p.flangeMm / 2;
    return spin(
      [
        { x: boreR, y: 0 },
        { x: flangeR, y: 0 },
        { x: flangeR, y: p.flangeTMm },
        { x: tubeR, y: p.flangeTMm },
        { x: tubeR, y: p.lengthMm - p.flangeTMm },
        { x: flangeR, y: p.lengthMm - p.flangeTMm },
        { x: flangeR, y: p.lengthMm },
        { x: boreR, y: p.lengthMm },
      ],
      flangeR,
    );
  },
  fileName: (p) => `eyelet-${R(p.flangeMm, 0)}-${R(p.lengthMm, 1)}.stl`,
});

/* ------------------------------------------------------------------------- rivet */

export const rivet: AnyDesign = defineDesign({
  id: "rivet",
  name: "Rivet",
  family: "fixings",
  eyebrow: "Solid rivet",
  blurb: "A solid rivet with a formed head and a shank sized to the grip.",
  lede: "A solid rivet turned as one profile: a flat head, a straight shank and a square-cut tail that can be peened or trimmed. The shank length is the grip plus the material needed to form the second head, which is reported separately.",
  use: "A permanent lap joint in leather, soft plastic or a light sheet where a screw would work loose.",
  notesTitle: "How the shank length is read",
  chips: [
    { label: "Shank", value: "3 – 20 mm" },
    { label: "Length", value: "6 – 40 mm" },
    { label: "Head", value: "6 – 30 mm" },
  ],
  notes: [
    "The head is a flat disc and the shank is a plain cylinder, so the rivet can be set with a hammer and a backing block. The overall length includes the head, and the tail length is what remains for forming the second head.",
    "Make the rivet on its side for strength across the shank. A rivet is best set warm and slowly; a cold hammer blow splits the material instead of spreading the tail.",
  ],
  header: "Rivet Designer - units: mm",
  fields: [
    { key: "shank", label: "Shank diameter", kind: "length", section: "Rivet", default: "6", min: 3, max: 20 },
    { key: "length", label: "Shank length", kind: "length", section: "Rivet", default: "16", min: 6, max: 40 },
    { key: "head", label: "Head diameter", kind: "length", section: "Head", default: "12", min: 6, max: 30 },
    { key: "headH", label: "Head height", kind: "length", section: "Head", default: "2.5", min: 1, max: 6 },
  ],
  parse: (raw) => ({
    shankMm: rawLength(raw, "shank"),
    lengthMm: rawLength(raw, "length"),
    headMm: rawLength(raw, "head"),
    headHMm: rawLength(raw, "headH"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "shank", "Shank diameter", p.shankMm, 3, 20);
    pushRange(errors, units, "length", "Shank length", p.lengthMm, 6, 40);
    pushRange(errors, units, "head", "Head diameter", p.headMm, 6, 30);
    pushRange(errors, units, "headH", "Head height", p.headHMm, 1, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    const total = p.lengthMm + p.headHMm;
    checkSize(errors, units, "head", p.headMm, total);

    if (p.headMm < p.shankMm + 2) errors.push({ field: "head", level: "error", message: "The head does not overhang the shank enough to pull against." });
    if (p.lengthMm < p.shankMm * 1.5) errors.push({ field: "length", level: "error", message: "The shank is too short to form a tail." });
    if (p.headHMm < p.shankMm * 0.25) warnings.push({ field: "headH", level: "warning", message: "A thin head will pull through a soft sheet." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Shank", value: U(p.shankMm, units), source: "input" },
        { label: "Shank length", value: U(p.lengthMm, units), source: "input" },
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Head height", value: U(p.headHMm, units), source: "input" },
        { label: "Overall", value: U(total, units), source: "calc" },
        { label: "Head land", value: U((p.headMm - p.shankMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.shankMm, units)} shank · ${U(total, units)} long`,
        `RV${R(p.shankMm, 0)}-${R(total, 1)}`,
        p.headMm,
        total,
        [
          { label: "Shank", value: U(p.shankMm, units) },
          { label: "Head", value: U(p.headMm, units) },
          { label: "Overall", value: U(total, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const shankR = p.shankMm / 2;
    const headR = p.headMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: shankR, y: 0 },
        { x: shankR, y: p.lengthMm },
        { x: headR, y: p.lengthMm },
        { x: headR, y: p.lengthMm + p.headHMm },
        { x: 0, y: p.lengthMm + p.headHMm },
      ],
      headR,
    );
  },
  fileName: (p) => `rivet-${R(p.shankMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- bellows boot */

export const bellowsBoot: AnyDesign = defineDesign({
  id: "bellows-boot",
  name: "Bellows boot",
  family: "motion",
  eyebrow: "Dust sleeve",
  blurb: "A corrugated sleeve that stretches over a sliding shaft.",
  lede: "A bellows boot built from a straight bore and a corrugated outside profile. The convolutions let the sleeve extend and compress without opening a gap, and the wall between the bore and the valleys is reported so the boot can be made thin enough to flex.",
  use: "Keeping dust and swarf off a sliding shaft, a lead screw or a shock absorber.",
  notesTitle: "How the convolutions are counted",
  chips: [
    { label: "Bore", value: "6 – 60 mm" },
    { label: "Length", value: "20 – 120 mm" },
    { label: "Wall", value: "1 – 4 mm" },
  ],
  notes: [
    "The outside follows a raised cosine, so each convolution meets the next with zero slope and the wall does not thin at a crease. The bore stays straight, which means the boot seals on a round shaft all the way along.",
    "Make it in a flexible material if it has to move; rigid a rigid material bellows crack at the second convolution. Make it with the axis vertical and thin walls, and leave the boot slightly compressed when it is fitted so it has travel in both directions.",
  ],
  header: "Bellows Boot Designer - units: mm",
  fields: [
    { key: "bore", label: "Shaft bore", kind: "length", section: "Boot", default: "20", min: 6, max: 60 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Boot", default: "2", min: 1, max: 4 },
    { key: "length", label: "Free length", kind: "length", section: "Boot", default: "60", min: 20, max: 120 },
    { key: "convolutions", label: "Convolutions", kind: "count", section: "Boot", default: "6", min: 3, max: 12 },
    { key: "depth", label: "Convolution depth", kind: "length", section: "Boot", default: "4", min: 2, max: 10 },
  ],
  parse: (raw) => ({
    boreMm: rawLength(raw, "bore"),
    wallMm: rawLength(raw, "wall"),
    lengthMm: rawLength(raw, "length"),
    convolutions: rawCount(raw, "convolutions"),
    depthMm: rawLength(raw, "depth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "bore", "Shaft bore", p.boreMm, 6, 60);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 4);
    pushRange(errors, units, "length", "Free length", p.lengthMm, 20, 120);
    pushInteger(errors, "convolutions", "Convolutions", p.convolutions, 3, 12);
    pushRange(errors, units, "depth", "Convolution depth", p.depthMm, 2, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    const base = p.boreMm / 2 + p.wallMm;
    checkSize(errors, units, "bore", (base + p.depthMm) * 2, p.lengthMm);

    checkWall(errors, units, "wall", "boot wall", p.wallMm);
    if (p.depthMm >= base * 0.8) errors.push({ field: "depth", level: "error", message: "The convolution depth is too large for the bore; the boot pinches itself." });
    const count = Math.max(3, Math.round(p.convolutions));
    if (p.lengthMm / count < 4) errors.push({ field: "convolutions", level: "error", message: "The convolutions are packed too tightly to make." });
    if (p.wallMm > 2.5) warnings.push({ field: "wall", level: "warning", message: "A wall over 2.5 mm makes a stiff boot that will not extend." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Shaft bore", value: U(p.boreMm, units), source: "input" },
        { label: "Outer Ø", value: U((base + p.depthMm) * 2, units), source: "calc" },
        { label: "Free length", value: U(p.lengthMm, units), source: "input" },
        { label: "Convolutions", value: String(count), source: "input" },
        { label: "Pitch", value: U(p.lengthMm / count, units), source: "calc" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${count} convolutions · ${U(p.lengthMm, units)} long`,
        `BB${R(p.boreMm, 0)}-${count}`,
        (base + p.depthMm) * 2,
        p.lengthMm,
        [
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Outer", value: U((base + p.depthMm) * 2, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const boreR = p.boreMm / 2;
    const base = boreR + p.wallMm;
    const count = Math.max(3, Math.round(p.convolutions));
    const samples = count * 12;
    const profile: Point2D[] = [
      { x: boreR, y: 0 },
      { x: base, y: 0 },
    ];
    for (let i = 1; i <= samples; i += 1) {
      const z = (p.lengthMm * i) / samples;
      const wave = 0.5 - 0.5 * Math.cos((Math.PI * 2 * count * z) / p.lengthMm);
      profile.push({ x: base + p.depthMm * wave, y: z });
    }
    profile.push({ x: boreR, y: p.lengthMm });
    return spin(profile, base + p.depthMm);
  },
  fileName: (p) => `bellows-boot-${R(p.boreMm, 0)}-${Math.round(p.convolutions)}.stl`,
});

/* ------------------------------------------------------------------ suction cup */

export const suctionCup: AnyDesign = defineDesign({
  id: "suction-cup",
  name: "Suction cup",
  family: "motion",
  eyebrow: "Vacuum cup",
  blurb: "A cup with a concave underside and a stem for a light hold.",
  lede: "A suction cup with a real concave underside: the rim touches the surface first and the centre is recessed, so pressing the cup pushes the air out and the rim seals. The stem is a separate diameter, so the cup can be held in a arm.",
  use: "Holding a small sign, a phone back or a light ornament to a clean glass or tile surface.",
  notesTitle: "How the concave face seals",
  chips: [
    { label: "Cup Ø", value: "20 – 90 mm" },
    { label: "Height", value: "5 – 30 mm" },
    { label: "Stem", value: "4 – 20 mm" },
  ],
  notes: [
    "The underside is sampled as a curve from the recessed centre to the rim, so the rim is the only part that touches at first. The stem is narrower than the cup, which lets it pass through a hole in a bracket.",
    "Make it in a flexible material or a soft material; rigid a rigid material makes a cup that will not conform to a slightly uneven surface. Clean both the cup and the glass, and wet the rim slightly before pressing it down.",
  ],
  header: "Suction Cup Designer - units: mm",
  fields: [
    { key: "cup", label: "Cup diameter", kind: "length", section: "Cup", default: "50", min: 20, max: 90 },
    { key: "height", label: "Cup height", kind: "length", section: "Cup", default: "12", min: 5, max: 30 },
    { key: "stem", label: "Stem diameter", kind: "length", section: "Stem", default: "8", min: 4, max: 20 },
    { key: "stemLength", label: "Stem length", kind: "length", section: "Stem", default: "15", min: 5, max: 40 },
  ],
  parse: (raw) => ({
    cupMm: rawLength(raw, "cup"),
    heightMm: rawLength(raw, "height"),
    stemMm: rawLength(raw, "stem"),
    stemLengthMm: rawLength(raw, "stemLength"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cup", "Cup diameter", p.cupMm, 20, 90);
    pushRange(errors, units, "height", "Cup height", p.heightMm, 5, 30);
    pushRange(errors, units, "stem", "Stem diameter", p.stemMm, 4, 20);
    pushRange(errors, units, "stemLength", "Stem length", p.stemLengthMm, 5, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);
    const total = p.heightMm + p.stemLengthMm;
    checkSize(errors, units, "cup", p.cupMm, total);

    const cupR = p.cupMm / 2;
    if (p.stemMm >= p.cupMm - 4) errors.push({ field: "stem", level: "error", message: "The stem is as wide as the cup; narrow it." });
    if (p.heightMm < 6) warnings.push({ field: "height", level: "warning", message: "A cup under 6 mm deep has very little volume to hold a vacuum." });
    if (cupR < 12) warnings.push({ field: "cup", level: "warning", message: "A cup under 24 mm holds very little load." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cup Ø", value: U(p.cupMm, units), source: "input" },
        { label: "Cup height", value: U(p.heightMm, units), source: "input" },
        { label: "Stem Ø", value: U(p.stemMm, units), source: "input" },
        { label: "Stem length", value: U(p.stemLengthMm, units), source: "input" },
        { label: "Overall", value: U(total, units), source: "calc" },
        { label: "Rim land", value: U((p.cupMm - p.stemMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.cupMm, units)} cup · ${U(total, units)} tall`,
        `SU${R(p.cupMm, 0)}-${R(p.heightMm, 0)}`,
        p.cupMm,
        total,
        [
          { label: "Cup", value: U(p.cupMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Stem", value: U(p.stemMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cupR = p.cupMm / 2;
    const stemR = p.stemMm / 2;
    const depth = p.heightMm * 0.6;
    const profile: Point2D[] = [{ x: 0, y: depth }];
    for (let i = 1; i <= 16; i += 1) {
      const t = i / 16;
      profile.push({ x: cupR * t, y: depth * (1 - t * t) });
    }
    profile.push(
      { x: cupR, y: p.heightMm },
      { x: stemR, y: p.heightMm },
      { x: stemR, y: p.heightMm + p.stemLengthMm },
      { x: 0, y: p.heightMm + p.stemLengthMm },
    );
    return spin(profile, cupR);
  },
  fileName: (p) => `suction-cup-${R(p.cupMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- bearing cap */

export const bearingCap: AnyDesign = defineDesign({
  id: "bearing-cap",
  name: "Bearing cap",
  family: "drives",
  eyebrow: "Housing cover",
  blurb: "A flanged cup that closes a bearing housing and keeps dirt out.",
  lede: "A bearing cap with a press-fit spigot, a flange that stops it going too deep and a blind top that shields the bearing. The spigot diameter is the housing bore and the wall is the material left between the spigot and the cavity.",
  use: "Closing the end of a bearing housing on a conveyor roller, a wheel hub or a gearbox.",
  notesTitle: "How the spigot fits the housing",
  chips: [
    { label: "Spigot Ø", value: "10 – 80 mm" },
    { label: "Flange Ø", value: "20 – 100 mm" },
    { label: "Height", value: "5 – 40 mm" },
  ],
  notes: [
    "The spigot is the housing bore and the flange is wider, so the cap seats at a fixed depth. The cavity inside the cap clears the shaft end, and the wall between the cavity and the spigot is checked so the cap does not collapse when it is pressed in.",
    "Make the cap with the flange down and the open side up; the cavity then needs no support. A cap is a dust shield, not a seal: add a smear of grease or an O-ring in the housing if the bearing has to keep water out.",
  ],
  header: "Bearing Cap Designer - units: mm",
  fields: [
    { key: "spigot", label: "Spigot diameter", kind: "length", section: "Cap", default: "30", min: 10, max: 80 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Cap", default: "50", min: 20, max: 100 },
    { key: "height", label: "Overall height", kind: "length", section: "Cap", default: "14", min: 5, max: 40 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Cap", default: "3", min: 2, max: 8 },
    { key: "top", label: "Top thickness", kind: "length", section: "Cap", default: "3", min: 2, max: 6 },
    { key: "flangeT", label: "Flange thickness", kind: "length", section: "Cap", default: "3", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    spigotMm: rawLength(raw, "spigot"),
    flangeMm: rawLength(raw, "flange"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    topMm: rawLength(raw, "top"),
    flangeTMm: rawLength(raw, "flangeT"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "spigot", "Spigot diameter", p.spigotMm, 10, 80);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 20, 100);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 5, 40);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 2, 8);
    pushRange(errors, units, "top", "Top thickness", p.topMm, 2, 6);
    pushRange(errors, units, "flangeT", "Flange thickness", p.flangeTMm, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.heightMm);

    const spigotR = p.spigotMm / 2;
    if (p.flangeMm < p.spigotMm + 6) errors.push({ field: "flange", level: "error", message: "The flange leaves under 3 mm of land over the spigot." });
    if (p.wallMm >= spigotR - 1) errors.push({ field: "wall", level: "error", message: "The wall closes the spigot bore." });
    if (p.heightMm <= p.topMm + p.flangeTMm) errors.push({ field: "height", level: "error", message: "The cap is shorter than its top and flange." });
    if (p.topMm < 2.5) warnings.push({ field: "top", level: "warning", message: "A top under 2.5 mm flexes when the cap is pressed in." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Spigot Ø", value: U(p.spigotMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Cavity Ø", value: U(p.spigotMm - 2 * p.wallMm, units), source: "calc" },
        { label: "Top", value: U(p.topMm, units), source: "input" },
        { label: "Flange land", value: U((p.flangeMm - p.spigotMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.spigotMm, units)} spigot · ${U(p.flangeMm, units)} flange`,
        `KC${R(p.spigotMm, 0)}-${R(p.flangeMm, 0)}`,
        p.flangeMm,
        p.heightMm,
        [
          { label: "Spigot", value: U(p.spigotMm, units) },
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const spigotR = p.spigotMm / 2;
    const flangeR = p.flangeMm / 2;
    const cavityR = spigotR - p.wallMm;
    return spin(
      [
        { x: spigotR, y: 0 },
        { x: spigotR, y: p.heightMm - p.flangeTMm },
        { x: flangeR, y: p.heightMm - p.flangeTMm },
        { x: flangeR, y: p.heightMm },
        { x: 0, y: p.heightMm },
        { x: 0, y: p.heightMm - p.topMm },
        { x: cavityR, y: p.heightMm - p.topMm },
        { x: cavityR, y: 0 },
      ],
      flangeR,
    );
  },
  fileName: (p) => `bearing-cap-${R(p.spigotMm, 0)}-${R(p.flangeMm, 0)}.stl`,
});

/* ------------------------------------------------------------------------- yo-yo */

export const yoYo: AnyDesign = defineDesign({
  id: "yo-yo",
  name: "Yo-yo",
  family: "motion",
  eyebrow: "String disc",
  blurb: "A grooved disc body with an axle bore and real rim mass.",
  lede: "A yo-yo body turned as one disc with a V groove around its middle and a bore for the axle. The rim is deliberately heavy and the groove is where the string sits, so the proportions are the play: wide rims sleep longer, deep grooves hold more string.",
  use: "A fixed-axle yo-yo for a string, a workshop toy or a physics demonstration.",
  notesTitle: "How the rim and groove are balanced",
  chips: [
    { label: "Diameter", value: "40 – 120 mm" },
    { label: "Width", value: "20 – 60 mm" },
    { label: "Groove", value: "4 – 20 mm" },
  ],
  notes: [
    "The groove is a V cut into the outer rim at mid-width, and the bore is a straight axle hole through the centre. The rim thickness below the groove is reported, because a groove that is too deep leaves a thin web that flexes at speed.",
    "Make it in two halves with the groove outward if your process cannot bridge the bore, then glue the halves on a metal axle. Balance it on a finger before the first throw; an unbalanced yo-yo wobbles badly and cracks at the axle.",
  ],
  header: "Yo-Yo Designer - units: mm",
  fields: [
    { key: "diameter", label: "Body diameter", kind: "length", section: "Body", default: "60", min: 40, max: 120 },
    { key: "width", label: "Body width", kind: "length", section: "Body", default: "36", min: 20, max: 60 },
    { key: "groove", label: "Groove width", kind: "length", section: "Groove", default: "8", min: 4, max: 20 },
    { key: "grooveDepth", label: "Groove depth", kind: "length", section: "Groove", default: "5", min: 2, max: 12 },
    { key: "bore", label: "Axle bore", kind: "length", section: "Axle", default: "6", min: 3, max: 12 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    widthMm: rawLength(raw, "width"),
    grooveMm: rawLength(raw, "groove"),
    grooveDepthMm: rawLength(raw, "grooveDepth"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Body diameter", p.diameterMm, 40, 120);
    pushRange(errors, units, "width", "Body width", p.widthMm, 20, 60);
    pushRange(errors, units, "groove", "Groove width", p.grooveMm, 4, 20);
    pushRange(errors, units, "grooveDepth", "Groove depth", p.grooveDepthMm, 2, 12);
    pushRange(errors, units, "bore", "Axle bore", p.boreMm, 3, 12);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.widthMm);

    const radius = p.diameterMm / 2;
    if (p.grooveDepthMm >= radius - p.boreMm / 2 - 2) errors.push({ field: "grooveDepth", level: "error", message: "The groove reaches the axle bore; make it shallower." });
    if (p.grooveMm >= p.widthMm - 6) errors.push({ field: "groove", level: "error", message: "The groove leaves no side cheek; narrow it." });
    if (p.grooveMm > p.widthMm * 0.5) warnings.push({ field: "groove", level: "warning", message: "Over half the width in the groove leaves very little rim." });
    const rim = radius - p.grooveDepthMm - p.boreMm / 2;

    return {
      errors,
      warnings,
      readout: [
        { label: "Body Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Groove", value: `${U(p.grooveMm, units)} × ${U(p.grooveDepthMm, units)}`, source: "input" },
        { label: "Axle bore", value: U(p.boreMm, units), source: "input" },
        { label: "Rim wall", value: U(rim, units), source: "calc" },
        { label: "Cheek", value: U((p.widthMm - p.grooveMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} body · ${U(p.widthMm, units)} wide`,
        `YY${R(p.diameterMm, 0)}-${R(p.widthMm, 0)}`,
        p.diameterMm,
        p.widthMm,
        [
          { label: "Body", value: U(p.diameterMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
          { label: "Groove", value: U(p.grooveMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    const mid = p.widthMm / 2;
    const halfGroove = p.grooveMm / 2;
    const boreR = p.boreMm / 2;
    return spin(
      [
        { x: boreR, y: 0 },
        { x: radius, y: 0 },
        { x: radius, y: mid - halfGroove },
        { x: radius - p.grooveDepthMm, y: mid },
        { x: radius, y: mid + halfGroove },
        { x: radius, y: p.widthMm },
        { x: boreR, y: p.widthMm },
      ],
      radius,
    );
  },
  fileName: (p) => `yo-yo-${R(p.diameterMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

export const revolveWorkshop: AnyDesign[] = [
  portafilterFunnel,
  biscuitCutter,
  alignmentPin,
  taperPin,
  eyelet,
  rivet,
  bellowsBoot,
  suctionCup,
  bearingCap,
  yoYo,
];
