/** Turned batch 3: four household forms turned from closed profiles. */

import { segmentsForRadius } from "@/lib/kit/outlines";
import { buildRevolution } from "@/lib/kit/revolve";
import type { LengthUnit, Point2D } from "@/lib/kit/units";

import { checkSize, checkWall, emptyResult, measure, round } from "./helpers";
import {
  defineDesign,
  previewOf,
  pushRange,
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

/* --------------------------------------------------------------- incense holder */

export const incenseHolder: AnyDesign = defineDesign({
  id: "incense-holder",
  name: "Incense holder",
  family: "vessels",
  eyebrow: "Stick stand",
  blurb: "A weighted base with a tapered socket that holds one incense stick.",
  lede: "A holder turned as a disc with a conical socket: the stick is a push fit at the top and wedges as it goes down, so one holder takes a range of stick diameters. The base is wide and low, which keeps a burning stick from tipping.",
  use: "Standing a single incense stick upright on a shelf, a counter or an altar.",
  notesTitle: "How the socket grips the stick",
  chips: [
    { label: "Base Ø", value: "30 – 100 mm" },
    { label: "Height", value: "8 – 30 mm" },
    { label: "Socket", value: "4 – 24 mm" },
  ],
  notes: [
    "The socket is a cone rather than a straight hole, so the stick wedges somewhere along it instead of dropping through. Its depth is kept below the holder height, which leaves a solid floor under the stick and stops ash falling through.",
    "Print it in a heat-resistant filament and put a metal or ceramic dish underneath: a printed holder is fine for the stick but not for a hot ash fall. A wider base is worth more than a taller socket for stability.",
  ],
  header: "Incense Holder Designer - units: mm",
  fields: [
    { key: "base", label: "Base diameter", kind: "length", section: "Holder", default: "60", min: 30, max: 100 },
    { key: "height", label: "Base height", kind: "length", section: "Holder", default: "16", min: 8, max: 30 },
    { key: "stick", label: "Stick diameter", kind: "length", section: "Socket", default: "3", min: 2, max: 8 },
    { key: "depth", label: "Socket depth", kind: "length", section: "Socket", default: "12", min: 4, max: 24 },
  ],
  parse: (raw) => ({
    baseMm: rawLength(raw, "base"),
    heightMm: rawLength(raw, "height"),
    stickMm: rawLength(raw, "stick"),
    depthMm: rawLength(raw, "depth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "base", "Base diameter", p.baseMm, 30, 100);
    pushRange(errors, units, "height", "Base height", p.heightMm, 8, 30);
    pushRange(errors, units, "stick", "Stick diameter", p.stickMm, 2, 8);
    pushRange(errors, units, "depth", "Socket depth", p.depthMm, 4, 24);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "base", p.baseMm, p.heightMm);

    if (p.depthMm >= p.heightMm - 1.5) errors.push({ field: "depth", level: "error", message: "The socket reaches the base; make it shallower or raise the holder." });
    if (p.stickMm + 3 > p.baseMm / 2) errors.push({ field: "stick", level: "error", message: "The socket is too wide for the base." });
    if (p.baseMm < p.heightMm * 3) warnings.push({ field: "base", level: "warning", message: "A base under three times the height tips easily." });

    const socketTop = p.stickMm / 2 + 1.5;
    const socketBottom = p.stickMm / 4 + 0.4;
    return {
      errors,
      warnings,
      readout: [
        { label: "Base Ø", value: U(p.baseMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Socket Ø", value: U(socketTop * 2, units), source: "calc" },
        { label: "Socket depth", value: U(p.depthMm, units), source: "input" },
        { label: "Floor", value: U(p.heightMm - p.depthMm, units), source: "calc" },
        { label: "Socket taper", value: U(socketTop - socketBottom, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.baseMm, units)} base · ${U(p.depthMm, units)} socket`,
        `IH${R(p.baseMm, 0)}-${R(p.heightMm, 0)}`,
        p.baseMm,
        p.heightMm,
        [
          { label: "Base", value: U(p.baseMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Socket", value: U(p.depthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const baseR = p.baseMm / 2;
    const socketTop = p.stickMm / 2 + 1.5;
    const socketBottom = p.stickMm / 4 + 0.4;
    return spin(
      [
        { x: 0, y: 0 },
        { x: baseR, y: 0 },
        { x: baseR, y: p.heightMm },
        { x: socketTop, y: p.heightMm },
        { x: socketBottom, y: p.heightMm - p.depthMm },
        { x: 0, y: p.heightMm - p.depthMm },
      ],
      baseR,
    );
  },
  fileName: (p) => `incense-holder-${R(p.baseMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- plant saucer */

export const plantSaucer: AnyDesign = defineDesign({
  id: "plant-saucer",
  name: "Plant saucer",
  family: "vessels",
  eyebrow: "Drip dish",
  blurb: "A shallow dish with a raised rim that catches pot drainage.",
  lede: "A plant saucer with a real floor and a raised rim, so a pot can drain without the water running off the shelf. The floor thickness and the rim wall are separate, which lets the saucer carry a heavy pot without becoming a solid puck.",
  use: "Standing a houseplant pot on a shelf or a windowsill without water marking the surface.",
  notesTitle: "How the rim holds the water",
  chips: [
    { label: "Saucer Ø", value: "60 – 180 mm" },
    { label: "Height", value: "5 – 30 mm" },
    { label: "Wall", value: "2 – 6 mm" },
  ],
  notes: [
    "The inside floor sits one floor-thickness above the base and the rim rises to the full height, so the dish holds a real volume. The rim is a straight wall with no undercut, which means the saucer prints without support and cleans easily.",
    "Print it in PETG if it will sit in sunlight; PLA creeps under a heavy pot on a warm windowsill. A saucer that is too shallow for the pot's drainage rate is worse than none, so size the height for the pot, not the shelf.",
  ],
  header: "Plant Saucer Designer - units: mm",
  fields: [
    { key: "diameter", label: "Saucer diameter", kind: "length", section: "Saucer", default: "140", min: 60, max: 180 },
    { key: "height", label: "Rim height", kind: "length", section: "Saucer", default: "14", min: 5, max: 30 },
    { key: "wall", label: "Rim wall", kind: "length", section: "Saucer", default: "3", min: 2, max: 6 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Saucer", default: "2.5", min: 1.5, max: 6 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Saucer diameter", p.diameterMm, 60, 180);
    pushRange(errors, units, "height", "Rim height", p.heightMm, 5, 30);
    pushRange(errors, units, "wall", "Rim wall", p.wallMm, 2, 6);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 1.5, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);

    checkWall(errors, units, "wall", "saucer rim", p.wallMm);
    if (p.floorMm >= p.heightMm - 1) errors.push({ field: "floor", level: "error", message: "The floor is as tall as the rim; there is no dish." });
    if (p.wallMm >= p.diameterMm / 2 - 2) errors.push({ field: "wall", level: "error", message: "The rim wall closes the saucer." });
    const capacity = Math.PI * (p.diameterMm / 2 - p.wallMm) ** 2 * (p.heightMm - p.floorMm);
    if (capacity / 1000 < 20) warnings.push({ field: "height", level: "warning", message: "The saucer holds under 20 ml, which a large pot will overflow." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Saucer Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Rim height", value: U(p.heightMm, units), source: "input" },
        { label: "Floor", value: U(p.floorMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Inner Ø", value: U(p.diameterMm - 2 * p.wallMm, units), source: "calc" },
        { label: "Capacity", value: `${R(capacity / 1000, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} saucer · ${R(capacity / 1000, 0)} ml`,
        `PS${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Saucer", value: U(p.diameterMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Capacity", value: `${R(capacity / 1000, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const radius = p.diameterMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: radius, y: 0 },
        { x: radius, y: p.heightMm },
        { x: radius - p.wallMm, y: p.heightMm },
        { x: radius - p.wallMm, y: p.floorMm },
        { x: 0, y: p.floorMm },
      ],
      radius,
    );
  },
  fileName: (p) => `plant-saucer-${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- tea light cup */

export const teaLightCup: AnyDesign = defineDesign({
  id: "tea-light-cup",
  name: "Tea light cup",
  family: "vessels",
  eyebrow: "Candle recess",
  blurb: "A cup with a round recess that seats a standard tea light.",
  lede: "A tea light holder with a shallow recess instead of a plain dish: the aluminium cup drops into the recess and the rim of the holder protects the flame from a draught. The recess diameter and the floor thickness are both live, so it fits a range of candles.",
  use: "Holding a tea light on a table, a bath edge or a windowsill without the metal cup marking it.",
  notesTitle: "How the recess seats the candle",
  chips: [
    { label: "Cup Ø", value: "40 – 100 mm" },
    { label: "Recess", value: "20 – 60 mm" },
    { label: "Height", value: "10 – 40 mm" },
  ],
  notes: [
    "The recess is a blind bore from the top, with a flat floor that supports the whole tea light cup. The wall between the recess and the outside is reported, and the floor is kept thin enough that the candle sits down inside the holder rather than on top of it.",
    "Print it in a metal-filled or heat-resistant filament if the candle burns all the way down; a plain PLA cup softens under a hot aluminium case. Never leave a burning candle unattended, and keep the holder on a heat-proof surface.",
  ],
  header: "Tea Light Cup Designer - units: mm",
  fields: [
    { key: "cup", label: "Cup diameter", kind: "length", section: "Cup", default: "60", min: 40, max: 100 },
    { key: "height", label: "Cup height", kind: "length", section: "Cup", default: "22", min: 10, max: 40 },
    { key: "recess", label: "Recess diameter", kind: "length", section: "Recess", default: "40", min: 20, max: 60 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Recess", default: "3", min: 2, max: 6 },
  ],
  parse: (raw) => ({
    cupMm: rawLength(raw, "cup"),
    heightMm: rawLength(raw, "height"),
    recessMm: rawLength(raw, "recess"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cup", "Cup diameter", p.cupMm, 40, 100);
    pushRange(errors, units, "height", "Cup height", p.heightMm, 10, 40);
    pushRange(errors, units, "recess", "Recess diameter", p.recessMm, 20, 60);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 2, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "cup", p.cupMm, p.heightMm);

    checkWall(errors, units, "recess", "recess wall", (p.cupMm - p.recessMm) / 2);
    if (p.floorMm >= p.heightMm - 2) errors.push({ field: "floor", level: "error", message: "The floor is as tall as the cup; there is no recess." });
    if (p.recessMm < 38) warnings.push({ field: "recess", level: "warning", message: "A recess under 38 mm will not take a standard tea light." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cup Ø", value: U(p.cupMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Recess Ø", value: U(p.recessMm, units), source: "input" },
        { label: "Floor", value: U(p.floorMm, units), source: "input" },
        { label: "Wall", value: U((p.cupMm - p.recessMm) / 2, units), source: "calc" },
        { label: "Recess depth", value: U(p.heightMm - p.floorMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.recessMm, units)} recess · ${U(p.heightMm, units)} high`,
        `TL${R(p.cupMm, 0)}-${R(p.recessMm, 0)}`,
        p.cupMm,
        p.heightMm,
        [
          { label: "Cup", value: U(p.cupMm, units) },
          { label: "Recess", value: U(p.recessMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cupR = p.cupMm / 2;
    const recessR = p.recessMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: cupR, y: 0 },
        { x: cupR, y: p.heightMm },
        { x: recessR, y: p.heightMm },
        { x: recessR, y: p.floorMm },
        { x: 0, y: p.floorMm },
      ],
      cupR,
    );
  },
  fileName: (p) => `tea-light-cup-${R(p.cupMm, 0)}-${R(p.recessMm, 0)}.stl`,
});

/* --------------------------------------------------------------- centering cone */

export const centeringCone: AnyDesign = defineDesign({
  id: "centering-cone",
  name: "Centering cone",
  family: "drives",
  eyebrow: "Taper guide",
  blurb: "A bored cone that centres a hole or a shaft on a bolt circle.",
  lede: "A centering cone with a straight bore and a tapered outside: the small end enters a hole and the taper pulls the part into line as it is pressed home. The taper is reported from the same two diameters and length that build the cone.",
  use: "Centring a drill, a bearing or a pulley on a hole before the real fixing is tightened.",
  notesTitle: "How the taper centres the part",
  chips: [
    { label: "Large Ø", value: "20 – 100 mm" },
    { label: "Small Ø", value: "6 – 50 mm" },
    { label: "Bore", value: "3 – 30 mm" },
  ],
  notes: [
    "The bore is a through-hole, so a bolt or a shaft can pass through the cone while the outside taper does the centring. The wall at the small end is checked, which is the limit on how much the cone can be tapered before it becomes a thin shell.",
    "Print it with the axis vertical and the small end up; the taper then prints without support. A centring cone is a guide, not a load-bearing wedge, so tighten the real fixing before the cone takes any force.",
  ],
  header: "Centering Cone Designer - units: mm",
  fields: [
    { key: "large", label: "Large diameter", kind: "length", section: "Cone", default: "50", min: 20, max: 100 },
    { key: "small", label: "Small diameter", kind: "length", section: "Cone", default: "14", min: 6, max: 50 },
    { key: "length", label: "Cone length", kind: "length", section: "Cone", default: "50", min: 20, max: 100 },
    { key: "bore", label: "Bore", kind: "length", section: "Cone", default: "8", min: 3, max: 30 },
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
    pushRange(errors, units, "large", "Large diameter", p.largeMm, 20, 100);
    pushRange(errors, units, "small", "Small diameter", p.smallMm, 6, 50);
    pushRange(errors, units, "length", "Cone length", p.lengthMm, 20, 100);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "large", p.largeMm, p.lengthMm);

    if (p.largeMm <= p.smallMm + 2) errors.push({ field: "large", level: "error", message: "The cone does not taper; enlarge the large end." });
    if (p.smallMm <= p.boreMm + 3) errors.push({ field: "bore", level: "error", message: "The bore leaves under 1.5 mm of wall at the small end." });
    const angle = (Math.atan2((p.largeMm - p.smallMm) / 2, p.lengthMm) * 180) / Math.PI;
    if (angle > 30) warnings.push({ field: "length", level: "warning", message: "A taper over 30 degrees is a countersink, not a centring guide." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Large Ø", value: U(p.largeMm, units), source: "input" },
        { label: "Small Ø", value: U(p.smallMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Taper", value: `${R(angle, 1)}°`, source: "calc" },
        { label: "Small wall", value: U((p.smallMm - p.boreMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.smallMm, units)} to ${U(p.largeMm, units)} cone`,
        `CN${R(p.smallMm, 0)}-${R(p.largeMm, 0)}`,
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
        { x: largeR, y: p.lengthMm },
        { x: boreR, y: p.lengthMm },
      ],
      largeR,
    );
  },
  fileName: (p) => `centering-cone-${R(p.smallMm, 0)}-${R(p.largeMm, 0)}.stl`,
});

export const revolveHome: AnyDesign[] = [
  incenseHolder,
  plantSaucer,
  teaLightCup,
  centeringCone,
];
