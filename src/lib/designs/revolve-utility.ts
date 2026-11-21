/** Turned batch 4: spacers, pins, caps, cups and small turned fittings. */

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

/* ---------------------------------------------------------------- round standoff */

export const roundStandoff: AnyDesign = defineDesign({
  id: "round-standoff",
  name: "Round standoff",
  family: "fixings",
  eyebrow: "Smooth spacer",
  blurb: "A plain round spacer with a clearance bore and chamfered ends.",
  lede: "A circular standoff that sets one panel a fixed distance off another. The bore is a straight clearance hole, not a thread, and both ends are chamfered so the spacer seats without a burr rolling under the screw head.",
  use: "Holding a board, a plate or a bracket a fixed distance off a panel or a wall.",
  notesTitle: "How the ends seat",
  chips: [
    { label: "Outside Ø", value: "6 – 40 mm" },
    { label: "Bore", value: "2 – 30 mm" },
    { label: "Length", value: "5 – 80 mm" },
  ],
  notes: [
    "Both ends carry a 45 degree chamfer rather than a square edge, which keeps the bearing face clear of the screw fillet and stops a raised burr from cocking the spacer. The chamfer is checked against the wall so it can never eat through the side.",
    "Face both ends parallel in one setup; a spacer that is a few hundredths short or long tilts whatever it carries. Fit the actual screw through the bore before the final tighten, because the clearance is nominal.",
  ],
  header: "Round Standoff Designer - units: mm",
  fields: [
    { key: "outside", label: "Outside diameter", kind: "length", section: "Standoff", default: "12", min: 6, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Standoff", default: "4", min: 2, max: 30 },
    { key: "length", label: "Length", kind: "length", section: "Standoff", default: "20", min: 5, max: 80 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Standoff", default: "0.8", min: 0.3, max: 3 },
  ],
  parse: (raw) => ({
    outsideMm: rawLength(raw, "outside"),
    boreMm: rawLength(raw, "bore"),
    lengthMm: rawLength(raw, "length"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outside", "Outside diameter", p.outsideMm, 6, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 30);
    pushRange(errors, units, "length", "Length", p.lengthMm, 5, 80);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0.3, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outside", p.outsideMm, p.lengthMm);

    const wall = (p.outsideMm - p.boreMm) / 2;
    checkWall(errors, units, "bore", "standoff wall", wall);
    if (p.chamferMm >= p.lengthMm / 2) errors.push({ field: "chamfer", level: "error", message: "The chamfers meet; shorten them." });
    if (p.chamferMm >= wall - 0.5) errors.push({ field: "chamfer", level: "error", message: "The chamfer reaches the bore." });
    if (wall < p.outsideMm * 0.12) warnings.push({ field: "bore", level: "warning", message: "A very thin wall distorts when the screw is tightened." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outsideMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Wall", value: U(wall, units), source: "calc" },
        { label: "Bearing face", value: U(wall - p.chamferMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.boreMm, units)} bore · ${U(p.lengthMm, units)} long`,
        `RS${R(p.outsideMm, 0)}-${R(p.lengthMm, 0)}`,
        p.outsideMm,
        p.lengthMm,
        [
          { label: "Outside", value: U(p.outsideMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outer = p.outsideMm / 2;
    const bore = p.boreMm / 2;
    const c = Math.min(p.chamferMm, p.lengthMm / 2 - 1e-4, outer - bore - 1e-4);
    return spin(
      [
        { x: bore, y: 0 },
        { x: outer - c, y: 0 },
        { x: outer, y: c },
        { x: outer, y: p.lengthMm - c },
        { x: outer - c, y: p.lengthMm },
        { x: bore, y: p.lengthMm },
      ],
      outer,
    );
  },
  fileName: (p) => `round-standoff-${R(p.outsideMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- locating pin */

export const locatingPin: AnyDesign = defineDesign({
  id: "locating-pin",
  name: "Locating pin",
  family: "fixings",
  eyebrow: "Headed pin",
  blurb: "A shouldered pin with a large head and a straight locating shank.",
  lede: "A locating pin with a wide head that stops it falling through a fixture plate and a straight shank that repeats a position. The head diameter and the shank length are independent, so the same designer covers a thumb pin or a long alignment pin.",
  use: "Repeating a fixture position, lining up two plates or holding a part while it is clamped.",
  notesTitle: "How the shoulder locates",
  chips: [
    { label: "Head Ø", value: "6 – 40 mm" },
    { label: "Shank Ø", value: "3 – 20 mm" },
    { label: "Length", value: "10 – 100 mm" },
  ],
  notes: [
    "The head is a flat disc that seats on the fixture face, and the shank is a plain cylinder below it. The step between them is a real shoulder rather than a taper, so the pin pulls down square when it is pressed into its hole.",
    "Turn the shank and the head from one setup so they stay concentric; a headed pin with a cocked shank binds in a close-fit hole. Measure the shank against the actual hole and leave the fit to a test piece.",
  ],
  header: "Locating Pin Designer - units: mm",
  fields: [
    { key: "head", label: "Head diameter", kind: "length", section: "Pin", default: "10", min: 6, max: 40 },
    { key: "headHeight", label: "Head height", kind: "length", section: "Pin", default: "4", min: 2, max: 12 },
    { key: "shank", label: "Shank diameter", kind: "length", section: "Shank", default: "6", min: 3, max: 20 },
    { key: "length", label: "Overall length", kind: "length", section: "Shank", default: "40", min: 10, max: 100 },
  ],
  parse: (raw) => ({
    headMm: rawLength(raw, "head"),
    headHeightMm: rawLength(raw, "headHeight"),
    shankMm: rawLength(raw, "shank"),
    lengthMm: rawLength(raw, "length"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "head", "Head diameter", p.headMm, 6, 40);
    pushRange(errors, units, "headHeight", "Head height", p.headHeightMm, 2, 12);
    pushRange(errors, units, "shank", "Shank diameter", p.shankMm, 3, 20);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 10, 100);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "head", p.headMm, p.lengthMm);

    if (p.headMm <= p.shankMm + 2) errors.push({ field: "head", level: "error", message: "The head is not wider than the shank." });
    if (p.headHeightMm >= p.lengthMm - 2) errors.push({ field: "headHeight", level: "error", message: "The head takes up the whole pin." });
    if (p.lengthMm < p.shankMm * 1.5) warnings.push({ field: "length", level: "warning", message: "A shank under 1.5 diameters long locates poorly." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Head height", value: U(p.headHeightMm, units), source: "input" },
        { label: "Shank Ø", value: U(p.shankMm, units), source: "input" },
        { label: "Shank length", value: U(p.lengthMm - p.headHeightMm, units), source: "calc" },
        { label: "Shoulder", value: U((p.headMm - p.shankMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.shankMm, units)} shank · ${U(p.lengthMm, units)} overall`,
        `LP${R(p.headMm, 0)}-${R(p.shankMm, 0)}`,
        p.headMm,
        p.lengthMm,
        [
          { label: "Head", value: U(p.headMm, units) },
          { label: "Shank", value: U(p.shankMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const head = p.headMm / 2;
    const shank = p.shankMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: head, y: 0 },
        { x: head, y: p.headHeightMm },
        { x: shank, y: p.headHeightMm },
        { x: shank, y: p.lengthMm },
        { x: 0, y: p.lengthMm },
      ],
      head,
    );
  },
  fileName: (p) => `locating-pin-${R(p.headMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------ countersink plug */

export const countersinkPlug: AnyDesign = defineDesign({
  id: "countersink-plug",
  name: "Countersink plug",
  family: "fixings",
  eyebrow: "Flush cap",
  blurb: "A tapered plug that fills a countersunk screw hole flush with the face.",
  lede: "A plug with a conical shoulder and a short neck, shaped to drop into a countersunk hole and sit flush with the surface. The cone height and the neck diameter are both live, so the plug can match a shallow or a deep countersink.",
  use: "Filling a countersunk screw hole flush in a panel, a jig or a piece of furniture.",
  notesTitle: "How the cone matches the seat",
  chips: [
    { label: "Head Ø", value: "8 – 40 mm" },
    { label: "Neck Ø", value: "5 – 30 mm" },
    { label: "Height", value: "4 – 20 mm" },
  ],
  notes: [
    "The cone runs from the neck diameter up to the head diameter over the cone height, which is the same triangle as a standard countersink. The neck below it fills the clearance hole so the plug cannot rock once it is pressed home.",
    "Form the cone in one pass and blue it against the actual hole; a cone that only touches at the rim will sit proud in the middle. Trim the neck to the panel thickness rather than guessing from the screw length.",
  ],
  header: "Countersink Plug Designer - units: mm",
  fields: [
    { key: "head", label: "Head diameter", kind: "length", section: "Plug", default: "16", min: 8, max: 40 },
    { key: "neck", label: "Neck diameter", kind: "length", section: "Plug", default: "10", min: 5, max: 30 },
    { key: "height", label: "Overall height", kind: "length", section: "Plug", default: "10", min: 4, max: 20 },
    { key: "cone", label: "Cone height", kind: "length", section: "Cone", default: "3", min: 1, max: 15 },
  ],
  parse: (raw) => ({
    headMm: rawLength(raw, "head"),
    neckMm: rawLength(raw, "neck"),
    heightMm: rawLength(raw, "height"),
    coneMm: rawLength(raw, "cone"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "head", "Head diameter", p.headMm, 8, 40);
    pushRange(errors, units, "neck", "Neck diameter", p.neckMm, 5, 30);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 4, 20);
    pushRange(errors, units, "cone", "Cone height", p.coneMm, 1, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "head", p.headMm, p.heightMm);

    if (p.headMm <= p.neckMm + 2) errors.push({ field: "head", level: "error", message: "The head does not overhang the neck." });
    if (p.coneMm >= p.heightMm - 0.8) errors.push({ field: "cone", level: "error", message: "The cone leaves no neck below it." });
    const angle = (Math.atan2((p.headMm - p.neckMm) / 2, p.coneMm) * 180) / Math.PI;
    if (angle > 60) warnings.push({ field: "cone", level: "warning", message: "A cone this steep matches few countersinks; check the seat angle." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Neck Ø", value: U(p.neckMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Cone height", value: U(p.coneMm, units), source: "input" },
        { label: "Seat angle", value: `${R(angle, 1)}°`, source: "calc" },
      ],
      preview: previewOf(
        `${R(angle, 0)}° seat · ${U(p.headMm, units)} head`,
        `CS${R(p.headMm, 0)}-${R(p.neckMm, 0)}`,
        p.headMm,
        p.heightMm,
        [
          { label: "Head", value: U(p.headMm, units) },
          { label: "Neck", value: U(p.neckMm, units) },
          { label: "Cone", value: U(p.coneMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const head = p.headMm / 2;
    const neck = p.neckMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: neck, y: 0 },
        { x: neck, y: p.heightMm - p.coneMm },
        { x: head, y: p.heightMm },
        { x: 0, y: p.heightMm },
      ],
      head,
    );
  },
  fileName: (p) => `countersink-plug-${R(p.headMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------- screw cap */

export const screwCap: AnyDesign = defineDesign({
  id: "screw-cap",
  name: "Screw cap",
  family: "fixings",
  eyebrow: "Cover disc",
  blurb: "A shallow cap with a recess that covers a screw head in a visible panel.",
  lede: "A cover cap with a flat top and a blind recess underneath. The recess clears the screw head and the floor above it hides the fixing, so the outside of the panel reads as a plain disc rather than a hardware store.",
  use: "Hiding a screw head on a visible panel, a cabinet back or a piece of flat-pack furniture.",
  notesTitle: "How the recess clears the head",
  chips: [
    { label: "Cap Ø", value: "10 – 60 mm" },
    { label: "Recess Ø", value: "6 – 50 mm" },
    { label: "Floor", value: "1.5 – 6 mm" },
  ],
  notes: [
    "The recess is a flat-bottomed bore, so the cap sits down over the head rather than balancing on it. The floor is kept as a separate number because a floor that is too thin shows the screw head as a bump on the outside face.",
    "Press the cap on while the adhesive is still soft and check it sits flat all round; a cap that is cocked shows a shadow line. Make a trial cap on the actual screw before producing a set.",
  ],
  header: "Screw Cap Designer - units: mm",
  fields: [
    { key: "cap", label: "Cap diameter", kind: "length", section: "Cap", default: "24", min: 10, max: 60 },
    { key: "height", label: "Cap height", kind: "length", section: "Cap", default: "10", min: 4, max: 25 },
    { key: "recess", label: "Recess diameter", kind: "length", section: "Recess", default: "18", min: 6, max: 50 },
    { key: "floor", label: "Top thickness", kind: "length", section: "Recess", default: "2.5", min: 1.5, max: 6 },
  ],
  parse: (raw) => ({
    capMm: rawLength(raw, "cap"),
    heightMm: rawLength(raw, "height"),
    recessMm: rawLength(raw, "recess"),
    floorMm: rawLength(raw, "floor"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cap", "Cap diameter", p.capMm, 10, 60);
    pushRange(errors, units, "height", "Cap height", p.heightMm, 4, 25);
    pushRange(errors, units, "recess", "Recess diameter", p.recessMm, 6, 50);
    pushRange(errors, units, "floor", "Top thickness", p.floorMm, 1.5, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "cap", p.capMm, p.heightMm);

    checkWall(errors, units, "recess", "cap rim", (p.capMm - p.recessMm) / 2);
    if (p.floorMm >= p.heightMm - 1) errors.push({ field: "floor", level: "error", message: "The floor fills the cap; there is no recess." });
    if (p.recessMm < p.capMm * 0.35) warnings.push({ field: "recess", level: "warning", message: "A small recess may not clear the screw head." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cap Ø", value: U(p.capMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Recess Ø", value: U(p.recessMm, units), source: "input" },
        { label: "Floor", value: U(p.floorMm, units), source: "input" },
        { label: "Recess depth", value: U(p.heightMm - p.floorMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.recessMm, units)} recess · ${U(p.heightMm, units)} high`,
        `SC${R(p.capMm, 0)}-${R(p.recessMm, 0)}`,
        p.capMm,
        p.heightMm,
        [
          { label: "Cap", value: U(p.capMm, units) },
          { label: "Recess", value: U(p.recessMm, units) },
          { label: "Floor", value: U(p.floorMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cap = p.capMm / 2;
    const recess = p.recessMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: cap, y: 0 },
        { x: cap, y: p.heightMm },
        { x: recess, y: p.heightMm },
        { x: recess, y: p.floorMm },
        { x: 0, y: p.floorMm },
      ],
      cap,
    );
  },
  fileName: (p) => `screw-cap-${R(p.capMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ acorn cap */

export const acornCap: AnyDesign = defineDesign({
  id: "acorn-cap",
  name: "Acorn cap",
  family: "fixings",
  eyebrow: "Dome cover",
  blurb: "A domed cover that hides an exposed stud or a bolt thread end.",
  lede: "A dome with a straight skirt and a blind pocket underneath, shaped to drop over a protruding thread and protect it. The dome is a real turned curve rather than a cone, which keeps the skirt from catching on a sleeve or a hand.",
  use: "Capping an exposed stud end on a gate, a machine guard or a piece of playground hardware.",
  notesTitle: "How the cap dome is turned",
  chips: [
    { label: "Dome Ø", value: "8 – 60 mm" },
    { label: "Height", value: "6 – 40 mm" },
    { label: "Recess", value: "4 – 40 mm" },
  ],
  notes: [
    "The outer profile runs from the skirt up through a shoulder and into a rounded top, while the pocket is a straight bore from below. Both are checked against the skirt thickness so the pocket cannot break through the dome.",
    "Turn the outside first and bore the pocket second, so the skirt stays concentric with the dome. Fit it over the actual thread; a cap that is a tight push fit can split when it is pressed onto a damaged thread.",
  ],
  header: "Acorn Cap Designer - units: mm",
  fields: [
    { key: "diameter", label: "Dome diameter", kind: "length", section: "Cap", default: "20", min: 8, max: 60 },
    { key: "height", label: "Overall height", kind: "length", section: "Cap", default: "16", min: 6, max: 40 },
    { key: "recess", label: "Recess diameter", kind: "length", section: "Recess", default: "12", min: 4, max: 40 },
    { key: "depth", label: "Recess depth", kind: "length", section: "Recess", default: "8", min: 2, max: 22 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    heightMm: rawLength(raw, "height"),
    recessMm: rawLength(raw, "recess"),
    depthMm: rawLength(raw, "depth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Dome diameter", p.diameterMm, 8, 60);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 6, 40);
    pushRange(errors, units, "recess", "Recess diameter", p.recessMm, 4, 40);
    pushRange(errors, units, "depth", "Recess depth", p.depthMm, 2, 22);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);

    checkWall(errors, units, "recess", "cap skirt", (p.diameterMm - p.recessMm) / 2);
    if (p.depthMm >= p.heightMm * 0.8) errors.push({ field: "depth", level: "error", message: "The pocket reaches the dome; make it shallower or taller." });
    if (p.depthMm > p.heightMm * 0.6) warnings.push({ field: "depth", level: "warning", message: "A deep pocket leaves a thin dome over the thread." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Dome Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Recess Ø", value: U(p.recessMm, units), source: "input" },
        { label: "Recess depth", value: U(p.depthMm, units), source: "input" },
        { label: "Skirt", value: U((p.diameterMm - p.recessMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} dome · ${U(p.depthMm, units)} pocket`,
        `AC${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Dome", value: U(p.diameterMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Pocket", value: U(p.depthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    const recess = p.recessMm / 2;
    const floor = p.heightMm - p.depthMm;
    return spin(
      [
        { x: recess, y: 0 },
        { x: r, y: 0 },
        { x: r, y: p.heightMm * 0.45 },
        { x: r * 0.8, y: p.heightMm * 0.85 },
        { x: 0, y: p.heightMm },
        { x: 0, y: floor },
        { x: recess, y: floor },
      ],
      r,
    );
  },
  fileName: (p) => `acorn-cap-${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* --------------------------------------------------------------------- dowel */

export const dowel: AnyDesign = defineDesign({
  id: "dowel",
  name: "Dowel",
  family: "fixings",
  eyebrow: "Plain pin",
  blurb: "A straight pin with chamfered ends that starts easily into a hole.",
  lede: "A plain cylindrical dowel with a chamfer at each end instead of a square edge. The chamfer leads the pin into a hole and takes the burr that would otherwise stop it, while the body stays a true cylinder for the length that carries shear.",
  use: "Transferring shear between two wooden parts, or aligning a joint before it is glued.",
  notesTitle: "How the lead-in works",
  chips: [
    { label: "Diameter", value: "3 – 40 mm" },
    { label: "Length", value: "10 – 200 mm" },
    { label: "Chamfer", value: "0.5 – 4 mm" },
  ],
  notes: [
    "Both ends are chamfered at 45 degrees, which gives a lead-in on either end and lets the dowel be fitted without checking which way round it is. The chamfer is limited by the pin radius and the length so it can never meet in the middle.",
    "Cut the dowel from stock and chamfer it in a jig so the ends stay square to the axis. Measure the hole with callipers and test-fit an offcut before drilling the real joint; a dowel that is a tight fit in one species can be loose in another.",
  ],
  header: "Dowel Designer - units: mm",
  fields: [
    { key: "diameter", label: "Diameter", kind: "length", section: "Dowel", default: "8", min: 3, max: 40 },
    { key: "length", label: "Length", kind: "length", section: "Dowel", default: "40", min: 10, max: 200 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Ends", default: "1", min: 0.5, max: 4 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    lengthMm: rawLength(raw, "length"),
    chamferMm: rawLength(raw, "chamfer"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Diameter", p.diameterMm, 3, 40);
    pushRange(errors, units, "length", "Length", p.lengthMm, 10, 200);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0.5, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.lengthMm);

    if (p.chamferMm >= p.diameterMm / 2) errors.push({ field: "chamfer", level: "error", message: "The chamfer closes the end of the dowel." });
    if (p.chamferMm >= p.lengthMm / 2) errors.push({ field: "chamfer", level: "error", message: "The two chamfers meet." });
    if (p.lengthMm < p.diameterMm) warnings.push({ field: "length", level: "warning", message: "A dowel shorter than its diameter grips very little." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Diameter", value: U(p.diameterMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
        { label: "Full diameter", value: U(p.lengthMm - 2 * p.chamferMm, units), source: "calc" },
        { label: "End Ø", value: U(p.diameterMm - 2 * p.chamferMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} × ${U(p.lengthMm, units)}`,
        `DW${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}`,
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
    const r = p.diameterMm / 2;
    const c = Math.min(p.chamferMm, r - 0.4, p.lengthMm / 2 - 0.4);
    return spin(
      [
        { x: 0, y: 0 },
        { x: r - c, y: 0 },
        { x: r, y: c },
        { x: r, y: p.lengthMm - c },
        { x: r - c, y: p.lengthMm },
        { x: 0, y: p.lengthMm },
      ],
      r,
    );
  },
  fileName: (p) => `dowel-${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* -------------------------------------------------------------- towel bar end */

export const towelBarEnd: AnyDesign = defineDesign({
  id: "towel-bar-end",
  name: "Towel bar end",
  family: "fixings",
  eyebrow: "Rail post",
  blurb: "A wall plate with a short post that carries the end of a towel rail.",
  lede: "A mounting plate with a raised post, made to hold the end of a round bar against a wall. The plate spreads the load and the post gives the bar a stand-off, so a towel clears the plaster instead of rubbing it.",
  use: "Anchoring the end of a towel rail, a curtain rod or a light display bar to a wall.",
  notesTitle: "How the post stands off",
  chips: [
    { label: "Plate Ø", value: "20 – 80 mm" },
    { label: "Post Ø", value: "8 – 40 mm" },
    { label: "Post length", value: "10 – 60 mm" },
  ],
  notes: [
    "The plate and the post are one turned profile, with a square step where the post leaves the plate. That step is the bearing face against the wall, so the post cannot lean once the screws are tight.",
    "Finish the wall face flat and the post square to it; a post that leans makes a straight rail look bent. Use fixings suited to the wall, and check the plate covers them before drilling.",
  ],
  header: "Towel Bar End Designer - units: mm",
  fields: [
    { key: "plate", label: "Plate diameter", kind: "length", section: "Plate", default: "40", min: 20, max: 80 },
    { key: "plateThickness", label: "Plate thickness", kind: "length", section: "Plate", default: "4", min: 2, max: 10 },
    { key: "post", label: "Post diameter", kind: "length", section: "Post", default: "16", min: 8, max: 40 },
    { key: "postLength", label: "Post length", kind: "length", section: "Post", default: "30", min: 10, max: 60 },
  ],
  parse: (raw) => ({
    plateMm: rawLength(raw, "plate"),
    plateThicknessMm: rawLength(raw, "plateThickness"),
    postMm: rawLength(raw, "post"),
    postLengthMm: rawLength(raw, "postLength"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "plate", "Plate diameter", p.plateMm, 20, 80);
    pushRange(errors, units, "plateThickness", "Plate thickness", p.plateThicknessMm, 2, 10);
    pushRange(errors, units, "post", "Post diameter", p.postMm, 8, 40);
    pushRange(errors, units, "postLength", "Post length", p.postLengthMm, 10, 60);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "plate", p.plateMm, p.plateThicknessMm + p.postLengthMm);

    if (p.postMm >= p.plateMm - 4) errors.push({ field: "post", level: "error", message: "The post is as wide as its plate." });
    if (p.plateMm < p.postMm * 1.8) warnings.push({ field: "plate", level: "warning", message: "A small plate concentrates the pull on the wall fixings." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plate Ø", value: U(p.plateMm, units), source: "input" },
        { label: "Plate", value: U(p.plateThicknessMm, units), source: "input" },
        { label: "Post Ø", value: U(p.postMm, units), source: "input" },
        { label: "Post length", value: U(p.postLengthMm, units), source: "input" },
        { label: "Overall", value: U(p.plateThicknessMm + p.postLengthMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.postMm, units)} post · ${U(p.postLengthMm, units)} stand-off`,
        `TB${R(p.plateMm, 0)}-${R(p.postLengthMm, 0)}`,
        p.plateMm,
        p.plateThicknessMm + p.postLengthMm,
        [
          { label: "Plate", value: U(p.plateMm, units) },
          { label: "Post", value: U(p.postMm, units) },
          { label: "Stand-off", value: U(p.postLengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const plate = p.plateMm / 2;
    const post = p.postMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: plate, y: 0 },
        { x: plate, y: p.plateThicknessMm },
        { x: post, y: p.plateThicknessMm },
        { x: post, y: p.plateThicknessMm + p.postLengthMm },
        { x: 0, y: p.plateThicknessMm + p.postLengthMm },
      ],
      plate,
    );
  },
  fileName: (p) => `towel-bar-end-${R(p.plateMm, 0)}-${R(p.postLengthMm, 0)}.stl`,
});

/* --------------------------------------------------------------- capstan drum */

export const capstanDrum: AnyDesign = defineDesign({
  id: "capstan-drum",
  name: "Capstan drum",
  family: "drives",
  eyebrow: "Rope drum",
  blurb: "A flanged drum that takes a rope or a cord on its plain barrel.",
  lede: "A capstan-shaped drum with a wide flange at the foot, a plain barrel and a flat top. The flange keeps the first turn of rope on the barrel and the barrel height sets the winding length available.",
  use: "Winding a cord, a rope or a light cable on a winch, a hoist or a garden line reel.",
  notesTitle: "How the flange keeps the line",
  chips: [
    { label: "Drum Ø", value: "20 – 120 mm" },
    { label: "Flange Ø", value: "30 – 160 mm" },
    { label: "Height", value: "20 – 120 mm" },
  ],
  notes: [
    "The flange is a full disc under the barrel, so the rope pays off the top and cannot walk down the barrel into the clearance. The barrel is a straight cylinder for its whole height, which keeps the winding diameter constant.",
    "Turn the flange and the barrel in one setup and break the flange edge; a sharp flange cuts a rope under load. Keep the first turn taped or whipped so it does not slip on a smooth barrel.",
  ],
  header: "Capstan Drum Designer - units: mm",
  fields: [
    { key: "drum", label: "Drum diameter", kind: "length", section: "Drum", default: "60", min: 20, max: 120 },
    { key: "height", label: "Drum height", kind: "length", section: "Drum", default: "50", min: 20, max: 120 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Flange", default: "80", min: 30, max: 160 },
    { key: "flangeThickness", label: "Flange thickness", kind: "length", section: "Flange", default: "6", min: 3, max: 15 },
  ],
  parse: (raw) => ({
    drumMm: rawLength(raw, "drum"),
    heightMm: rawLength(raw, "height"),
    flangeMm: rawLength(raw, "flange"),
    flangeThicknessMm: rawLength(raw, "flangeThickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "drum", "Drum diameter", p.drumMm, 20, 120);
    pushRange(errors, units, "height", "Drum height", p.heightMm, 20, 120);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 30, 160);
    pushRange(errors, units, "flangeThickness", "Flange thickness", p.flangeThicknessMm, 3, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.heightMm);

    if (p.flangeMm <= p.drumMm + 4) errors.push({ field: "flange", level: "error", message: "The flange does not stand proud of the drum." });
    if (p.flangeThicknessMm >= p.heightMm) errors.push({ field: "flangeThickness", level: "error", message: "The flange is as tall as the drum." });
    const capacity = Math.PI * (p.drumMm / 2) ** 2 * p.heightMm;
    if (p.flangeMm < p.drumMm * 1.15) warnings.push({ field: "flange", level: "warning", message: "A flange under 1.15 drum diameters lets the line climb out." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Drum Ø", value: U(p.drumMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Barrel length", value: U(p.heightMm - p.flangeThicknessMm, units), source: "calc" },
        { label: "Envelope", value: `${R(capacity / 1000, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.drumMm, units)} barrel · ${U(p.heightMm, units)} tall`,
        `CD${R(p.drumMm, 0)}-${R(p.heightMm, 0)}`,
        p.flangeMm,
        p.heightMm,
        [
          { label: "Drum", value: U(p.drumMm, units) },
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const drum = p.drumMm / 2;
    const flange = p.flangeMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: flange, y: 0 },
        { x: flange, y: p.flangeThicknessMm },
        { x: drum, y: p.flangeThicknessMm },
        { x: drum, y: p.heightMm },
        { x: 0, y: p.heightMm },
      ],
      flange,
    );
  },
  fileName: (p) => `capstan-drum-${R(p.drumMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* -------------------------------------------------------------- bobbin flange */

export const bobbinFlange: AnyDesign = defineDesign({
  id: "bobbin-flange",
  name: "Bobbin flange",
  family: "vessels",
  eyebrow: "Spool end",
  blurb: "A bored disc with a raised hub that forms one end of a spool.",
  lede: "A spool end made as one piece: a wide flange, a short hub and a through bore for the spindle. Two of these back to back, or one paired with a plain disc, make a bobbin that runs true on a shaft.",
  use: "Building a spool or a bobbin for thread, wire or cord on a spindle or an axle.",
  notesTitle: "How the hub centres the spool",
  chips: [
    { label: "Flange Ø", value: "20 – 120 mm" },
    { label: "Bore", value: "4 – 40 mm" },
    { label: "Hub Ø", value: "10 – 80 mm" },
  ],
  notes: [
    "The hub is a raised ring on one face, so two flanges can meet hub to hub with the winding barrel between them. The bore runs straight through both the flange and the hub, which keeps the spindle clearance continuous.",
    "Bore the hub and the flange in one pass so the two faces run square to the spindle. Check the bore against the actual axle; a spool that wobbles pays line off unevenly.",
  ],
  header: "Bobbin Flange Designer - units: mm",
  fields: [
    { key: "flange", label: "Flange diameter", kind: "length", section: "Flange", default: "50", min: 20, max: 120 },
    { key: "thickness", label: "Flange thickness", kind: "length", section: "Flange", default: "4", min: 2, max: 10 },
    { key: "bore", label: "Spindle bore", kind: "length", section: "Hub", default: "8", min: 4, max: 40 },
    { key: "hub", label: "Hub diameter", kind: "length", section: "Hub", default: "24", min: 10, max: 80 },
  ],
  parse: (raw) => ({
    flangeMm: rawLength(raw, "flange"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
    hubMm: rawLength(raw, "hub"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 20, 120);
    pushRange(errors, units, "thickness", "Flange thickness", p.thicknessMm, 2, 10);
    pushRange(errors, units, "bore", "Spindle bore", p.boreMm, 4, 40);
    pushRange(errors, units, "hub", "Hub diameter", p.hubMm, 10, 80);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.thicknessMm * 2);

    if (p.hubMm <= p.boreMm + 3) errors.push({ field: "hub", level: "error", message: "The hub wall is too thin around the bore." });
    if (p.hubMm >= p.flangeMm - 2) errors.push({ field: "hub", level: "error", message: "The hub is as wide as the flange." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Hub Ø", value: U(p.hubMm, units), source: "input" },
        { label: "Hub height", value: U(p.thicknessMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.flangeMm, units)} flange · ${U(p.boreMm, units)} bore`,
        `BF${R(p.flangeMm, 0)}-${R(p.hubMm, 0)}`,
        p.flangeMm,
        p.thicknessMm * 2,
        [
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Hub", value: U(p.hubMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const flange = p.flangeMm / 2;
    const hub = p.hubMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: flange, y: 0 },
        { x: flange, y: p.thicknessMm },
        { x: hub, y: p.thicknessMm },
        { x: hub, y: p.thicknessMm * 2 },
        { x: bore, y: p.thicknessMm * 2 },
      ],
      flange,
    );
  },
  fileName: (p) => `bobbin-flange-${R(p.flangeMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- tap handle */

export const tapHandle: AnyDesign = defineDesign({
  id: "tap-handle",
  name: "Tap handle",
  family: "vessels",
  eyebrow: "Tapered grip",
  blurb: "A tapered handle with a through bore that fits a tap or a lever.",
  lede: "A handle turned as a cone with a straight bore, so it can be pressed onto a shaft or tapped for a thread. The taper is set by the two end diameters rather than a single angle, which makes the grip read as one continuous form.",
  use: "Replacing or making a handle for a beer tap, a valve spindle or a small lever.",
  notesTitle: "How the grip tapers",
  chips: [
    { label: "Top Ø", value: "15 – 60 mm" },
    { label: "Base Ø", value: "20 – 70 mm" },
    { label: "Height", value: "40 – 160 mm" },
  ],
  notes: [
    "The outside runs from the base diameter at the bottom to the top diameter at the head, with a straight bore through the whole length. Because both diameters are entered, the taper angle is a result rather than an assumption.",
    "Bore the handle first and turn the outside on the same axis, or turn a spigot to hold it by. A handle with a bore that is not square to its face will sit crooked on the tap no matter how well the taper is finished.",
  ],
  header: "Tap Handle Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Handle", default: "28", min: 15, max: 60 },
    { key: "base", label: "Base diameter", kind: "length", section: "Handle", default: "34", min: 20, max: 70 },
    { key: "height", label: "Handle height", kind: "length", section: "Handle", default: "90", min: 40, max: 160 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "8", min: 4, max: 20 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    baseMm: rawLength(raw, "base"),
    heightMm: rawLength(raw, "height"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 15, 60);
    pushRange(errors, units, "base", "Base diameter", p.baseMm, 20, 70);
    pushRange(errors, units, "height", "Handle height", p.heightMm, 40, 160);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "base", Math.max(p.baseMm, p.topMm), p.heightMm);

    if (p.boreMm >= Math.min(p.topMm, p.baseMm) - 4) errors.push({ field: "bore", level: "error", message: "The bore leaves under 2 mm of wall." });
    const angle = (Math.atan2((p.baseMm - p.topMm) / 2, p.heightMm) * 180) / Math.PI;
    if (Math.abs(angle) > 12) warnings.push({ field: "height", level: "warning", message: "A taper over 12 degrees feels more like a cone than a grip." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Base Ø", value: U(p.baseMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Taper", value: `${R(angle, 1)}°`, source: "calc" },
        { label: "Grip length", value: U(p.heightMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.baseMm, units)} to ${U(p.topMm, units)} over ${U(p.heightMm, units)}`,
        `TH${R(p.baseMm, 0)}-${R(p.topMm, 0)}`,
        Math.max(p.baseMm, p.topMm),
        p.heightMm,
        [
          { label: "Base", value: U(p.baseMm, units) },
          { label: "Top", value: U(p.topMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const top = p.topMm / 2;
    const base = p.baseMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: base, y: 0 },
        { x: top, y: p.heightMm },
        { x: bore, y: p.heightMm },
      ],
      Math.max(top, base),
    );
  },
  fileName: (p) => `tap-handle-${R(p.baseMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------- tumbler */

export const tumbler: AnyDesign = defineDesign({
  id: "tumbler",
  name: "Tumbler",
  family: "vessels",
  eyebrow: "Tapered cup",
  blurb: "A straight-walled drinking cup with a slight taper and a real floor.",
  lede: "A tumbler with a tapered outside and a constant wall, so the cup stacks and releases from a mould without a draft problem. The top and bottom diameters are separate, which lets the cup read as a tumbler rather than a straight cylinder.",
  use: "Drinking water, juice or a hot drink at the table, with a capacity you set by size.",
  notesTitle: "How the wall stays constant",
  chips: [
    { label: "Top Ø", value: "50 – 120 mm" },
    { label: "Bottom Ø", value: "40 – 110 mm" },
    { label: "Height", value: "60 – 200 mm" },
  ],
  notes: [
    "The inside follows the outside down to the floor, so the wall is the same all the way round the taper. The floor is a separate thickness under the inside, which keeps the base solid enough to survive a knock.",
    "Finish the rim before the final polish; a rim that is left sharp will chip. Check the cup holds the volume you expect by filling a test piece on a scale, since the wall thickness changes the capacity.",
  ],
  header: "Tumbler Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Cup", default: "80", min: 50, max: 120 },
    { key: "bottom", label: "Bottom diameter", kind: "length", section: "Cup", default: "60", min: 40, max: 110 },
    { key: "height", label: "Height", kind: "length", section: "Cup", default: "110", min: 60, max: 200 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Wall", default: "3", min: 1.5, max: 6 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    bottomMm: rawLength(raw, "bottom"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 50, 120);
    pushRange(errors, units, "bottom", "Bottom diameter", p.bottomMm, 40, 110);
    pushRange(errors, units, "height", "Height", p.heightMm, 60, 200);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "top", p.topMm, p.heightMm);

    checkWall(errors, units, "wall", "cup wall", p.wallMm);
    if (p.wallMm >= p.bottomMm / 2 - 2) errors.push({ field: "wall", level: "error", message: "The wall closes the cup at the base." });
    if (p.bottomMm > p.topMm + 15) warnings.push({ field: "bottom", level: "warning", message: "A base wider than the rim makes an unstable cup." });

    const innerTop = p.topMm / 2 - p.wallMm;
    const innerBottom = p.bottomMm / 2 - p.wallMm;
    const capacity =
      (Math.PI * p.heightMm * (innerTop ** 2 + innerTop * innerBottom + innerBottom ** 2)) / 3 / 1000;
    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Bottom Ø", value: U(p.bottomMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Capacity", value: `${R(capacity, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.topMm, units)} rim · ${R(capacity, 0)} ml`,
        `TU${R(p.topMm, 0)}-${R(p.heightMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Rim", value: U(p.topMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Capacity", value: `${R(capacity, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const top = p.topMm / 2;
    const bottom = p.bottomMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: bottom, y: 0 },
        { x: top, y: p.heightMm },
        { x: top - p.wallMm, y: p.heightMm },
        { x: bottom - p.wallMm, y: p.wallMm },
        { x: 0, y: p.wallMm },
      ],
      top,
    );
  },
  fileName: (p) => `tumbler-${R(p.topMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- shot glass */

export const shotGlass: AnyDesign = defineDesign({
  id: "shot-glass",
  name: "Shot glass",
  family: "vessels",
  eyebrow: "Thick cup",
  blurb: "A small straight cup with a thick wall and a heavy base.",
  lede: "A short cylindrical cup with a wall thick enough to survive a bar top and a floor heavy enough to keep it upright. The inside is a straight bore, so the volume follows directly from the two diameters and the floor height.",
  use: "Serving a measured spirit, or making a small parts cup that will not tip over.",
  notesTitle: "How the base weight is set",
  chips: [
    { label: "Diameter", value: "30 – 70 mm" },
    { label: "Height", value: "30 – 90 mm" },
    { label: "Wall", value: "2 – 8 mm" },
  ],
  notes: [
    "The floor is thicker than the wall, which puts the mass at the bottom and makes the glass hard to knock over. The inside diameter is the outside minus twice the wall, so the capacity is an honest result rather than a guess.",
    "Keep the inside bore smooth and the rim rounded; a thick wall with a sharp inside corner traps residue. Measure a filled test piece if the volume matters, because the floor thickness is easy to get wrong.",
  ],
  header: "Shot Glass Designer - units: mm",
  fields: [
    { key: "diameter", label: "Outside diameter", kind: "length", section: "Glass", default: "50", min: 30, max: 70 },
    { key: "height", label: "Height", kind: "length", section: "Glass", default: "70", min: 30, max: 90 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Wall", default: "4", min: 2, max: 8 },
    { key: "floor", label: "Floor thickness", kind: "length", section: "Wall", default: "5", min: 2, max: 10 },
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
    pushRange(errors, units, "diameter", "Outside diameter", p.diameterMm, 30, 70);
    pushRange(errors, units, "height", "Height", p.heightMm, 30, 90);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 2, 8);
    pushRange(errors, units, "floor", "Floor thickness", p.floorMm, 2, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);

    if (p.wallMm >= p.diameterMm / 2 - 2) errors.push({ field: "wall", level: "error", message: "The wall closes the cup." });
    if (p.floorMm >= p.heightMm - 2) errors.push({ field: "floor", level: "error", message: "The floor leaves no cup above it." });
    const inner = p.diameterMm / 2 - p.wallMm;
    const capacity = Math.PI * inner ** 2 * (p.heightMm - p.floorMm) / 1000;
    if (capacity < 20) warnings.push({ field: "height", level: "warning", message: "Under 20 ml is a thimble, not a shot glass." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Floor", value: U(p.floorMm, units), source: "input" },
        { label: "Inside Ø", value: U((p.diameterMm - 2 * p.wallMm), units), source: "calc" },
        { label: "Capacity", value: `${R(capacity, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${R(capacity, 0)} ml · ${U(p.diameterMm, units)} across`,
        `SG${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Diameter", value: U(p.diameterMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
          { label: "Capacity", value: `${R(capacity, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const outer = p.diameterMm / 2;
    const inner = outer - p.wallMm;
    return spin(
      [
        { x: 0, y: 0 },
        { x: outer, y: 0 },
        { x: outer, y: p.heightMm },
        { x: inner, y: p.heightMm },
        { x: inner, y: p.floorMm },
        { x: 0, y: p.floorMm },
      ],
      outer,
    );
  },
  fileName: (p) => `shot-glass-${R(p.diameterMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* -------------------------------------------------------------- measuring cup */

export const measuringCup: AnyDesign = defineDesign({
  id: "measuring-cup",
  name: "Measuring cup",
  family: "vessels",
  eyebrow: "Stepped cup",
  blurb: "A straight cup with an internal step that marks a smaller dose.",
  lede: "A measuring cup with a ledge moulded inside the wall, so one cup holds a full measure above the step and a half measure below it. The step and the wall are independent, which keeps the ledge from becoming a thin lip.",
  use: "Dosing resin, oil, feed or paint where one cup has to serve two volumes.",
  notesTitle: "How the step divides the cup",
  chips: [
    { label: "Top Ø", value: "50 – 140 mm" },
    { label: "Height", value: "40 – 150 mm" },
    { label: "Step", value: "2 – 20 mm" },
  ],
  notes: [
    "The step is a horizontal ledge inside the wall at a chosen height, so the volume under it is a fraction of the whole. Its width is twice the wall, which keeps the ledge solid and gives it a face to mark.",
    "Finish the inside wall smooth and mark the step with a file or a paint pen rather than relying on the eye, then check the volume by weighing a filled cup of water. A cup with a rounded inside corner is hard to empty and harder to read.",
  ],
  header: "Measuring Cup Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Cup", default: "90", min: 50, max: 140 },
    { key: "height", label: "Height", kind: "length", section: "Cup", default: "80", min: 40, max: 150 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Wall", default: "3", min: 1.5, max: 6 },
    { key: "step", label: "Step height", kind: "length", section: "Step", default: "10", min: 2, max: 20 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    stepMm: rawLength(raw, "step"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 50, 140);
    pushRange(errors, units, "height", "Height", p.heightMm, 40, 150);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 6);
    pushRange(errors, units, "step", "Step height", p.stepMm, 2, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "top", p.topMm, p.heightMm);

    const inner = p.topMm / 2 - p.wallMm;
    if (inner - p.wallMm < 3) errors.push({ field: "wall", level: "error", message: "The step leaves no opening at the base." });
    if (p.stepMm <= p.wallMm + 1) errors.push({ field: "step", level: "error", message: "The step sits below the floor; raise it." });
    if (p.stepMm >= p.heightMm - 2) errors.push({ field: "step", level: "error", message: "The step reaches the rim." });

    const full = Math.PI * inner ** 2 * (p.heightMm - p.wallMm) / 1000;
    const lower = Math.PI * (inner - p.wallMm) ** 2 * (p.stepMm - p.wallMm) / 1000;
    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Step at", value: U(p.stepMm, units), source: "input" },
        { label: "Full volume", value: `${R(full, 0)} ml`, source: "calc" },
        { label: "Lower volume", value: `${R(lower, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${R(full, 0)} ml full · ${R(lower, 0)} ml under the step`,
        `MC${R(p.topMm, 0)}-${R(p.heightMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Top", value: U(p.topMm, units) },
          { label: "Step", value: U(p.stepMm, units) },
          { label: "Full", value: `${R(full, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const outer = p.topMm / 2;
    const inner = outer - p.wallMm;
    return spin(
      [
        { x: 0, y: 0 },
        { x: outer, y: 0 },
        { x: outer, y: p.heightMm },
        { x: inner, y: p.heightMm },
        { x: inner, y: p.stepMm },
        { x: inner - p.wallMm, y: p.stepMm },
        { x: inner - p.wallMm, y: p.wallMm },
        { x: 0, y: p.wallMm },
      ],
      outer,
    );
  },
  fileName: (p) => `measuring-cup-${R(p.topMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------- votive holder */

export const votiveHolder: AnyDesign = defineDesign({
  id: "votive-holder",
  name: "Votive holder",
  family: "vessels",
  eyebrow: "Flared cup",
  blurb: "A flared cup with a wide mouth that shields a small candle.",
  lede: "A votive holder with a narrow foot and a flared mouth, so the rim stands out far enough to shelter the flame from a draught. The wall stays constant around the flare and the floor is thick enough to keep the centre of mass low.",
  use: "Holding a votive candle on a shelf, a table or a bath edge away from a draught.",
  notesTitle: "How the flare shelters the flame",
  chips: [
    { label: "Base Ø", value: "30 – 100 mm" },
    { label: "Mouth Ø", value: "40 – 110 mm" },
    { label: "Height", value: "30 – 120 mm" },
  ],
  notes: [
    "The outside opens from the base diameter to the mouth diameter, and the inside follows it down to a flat floor. The flare is a straight cone, so the wall thickness stays constant and the holder releases from a mould.",
    "Use a heat-resistant material and put the holder on a non-flammable surface; a thin polymer wall can soften as the candle burns down. Never leave a burning candle unattended, and keep the wick trimmed so the flame does not reach the rim.",
  ],
  header: "Votive Holder Designer - units: mm",
  fields: [
    { key: "base", label: "Base diameter", kind: "length", section: "Holder", default: "50", min: 30, max: 100 },
    { key: "mouth", label: "Mouth diameter", kind: "length", section: "Holder", default: "60", min: 40, max: 110 },
    { key: "height", label: "Height", kind: "length", section: "Holder", default: "45", min: 30, max: 120 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Wall", default: "3", min: 1.5, max: 6 },
  ],
  parse: (raw) => ({
    baseMm: rawLength(raw, "base"),
    mouthMm: rawLength(raw, "mouth"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "base", "Base diameter", p.baseMm, 30, 100);
    pushRange(errors, units, "mouth", "Mouth diameter", p.mouthMm, 40, 110);
    pushRange(errors, units, "height", "Height", p.heightMm, 30, 120);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "mouth", p.mouthMm, p.heightMm);

    if (p.wallMm >= p.baseMm / 2 - 2) errors.push({ field: "wall", level: "error", message: "The wall closes the base." });
    if (p.mouthMm <= p.baseMm) warnings.push({ field: "mouth", level: "warning", message: "A mouth no wider than the base gives little shelter." });
    if (p.heightMm < p.mouthMm * 0.5) warnings.push({ field: "height", level: "warning", message: "A short holder lets the flame sit above the rim." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Base Ø", value: U(p.baseMm, units), source: "input" },
        { label: "Mouth Ø", value: U(p.mouthMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Floor", value: U(p.wallMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.baseMm, units)} base · ${U(p.mouthMm, units)} mouth`,
        `VH${R(p.baseMm, 0)}-${R(p.mouthMm, 0)}`,
        p.mouthMm,
        p.heightMm,
        [
          { label: "Base", value: U(p.baseMm, units) },
          { label: "Mouth", value: U(p.mouthMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const base = p.baseMm / 2;
    const mouth = p.mouthMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: base, y: 0 },
        { x: mouth, y: p.heightMm },
        { x: mouth - p.wallMm, y: p.heightMm },
        { x: base - p.wallMm, y: p.wallMm },
        { x: 0, y: p.wallMm },
      ],
      mouth,
    );
  },
  fileName: (p) => `votive-holder-${R(p.baseMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ bud vase */

export const budVase: AnyDesign = defineDesign({
  id: "bud-vase",
  name: "Bud vase",
  family: "vessels",
  eyebrow: "Slim vessel",
  blurb: "A narrow-necked vase with a belly that holds a single stem.",
  lede: "A bud vase turned from a closed profile: a small foot, a belly that carries the water and a narrow neck that holds the stem upright. The wall is a real thickness, so the vase holds a measurable volume rather than being a solid shape.",
  use: "Standing a single cut flower or a sprig on a table or a bedside shelf.",
  notesTitle: "How the neck holds the stem",
  chips: [
    { label: "Belly Ø", value: "20 – 90 mm" },
    { label: "Neck Ø", value: "8 – 40 mm" },
    { label: "Height", value: "60 – 220 mm" },
  ],
  notes: [
    "The profile runs from the foot out to the belly and back in to the neck, while the inside mirrors it at the wall thickness. A narrow neck stops a single stem from falling sideways and slows evaporation from the belly.",
    "Turn the outside first, then hollow through the neck with a small boring bar; a vase with a step inside is hard to clean. Check it holds water overnight before it goes near a table, because a pinhole in the wall only shows under load.",
  ],
  header: "Bud Vase Designer - units: mm",
  fields: [
    { key: "belly", label: "Belly diameter", kind: "length", section: "Body", default: "50", min: 20, max: 90 },
    { key: "height", label: "Height", kind: "length", section: "Body", default: "140", min: 60, max: 220 },
    { key: "neck", label: "Neck diameter", kind: "length", section: "Neck", default: "14", min: 8, max: 40 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Wall", default: "2.5", min: 1.2, max: 5 },
  ],
  parse: (raw) => ({
    bellyMm: rawLength(raw, "belly"),
    heightMm: rawLength(raw, "height"),
    neckMm: rawLength(raw, "neck"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "belly", "Belly diameter", p.bellyMm, 20, 90);
    pushRange(errors, units, "height", "Height", p.heightMm, 60, 220);
    pushRange(errors, units, "neck", "Neck diameter", p.neckMm, 8, 40);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.2, 5);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "belly", p.bellyMm, p.heightMm);

    const base = p.bellyMm * 0.55;
    if (p.bellyMm <= p.neckMm + 4) errors.push({ field: "belly", level: "error", message: "The belly is no wider than the neck." });
    if (p.wallMm * 2 >= p.neckMm - 1) errors.push({ field: "wall", level: "error", message: "The wall closes the neck." });
    if (base <= p.wallMm + 1) errors.push({ field: "wall", level: "error", message: "The wall leaves no foot." });
    if (p.heightMm < p.bellyMm) warnings.push({ field: "height", level: "warning", message: "A vase shorter than its belly looks like a bowl." });

    const innerBelly = p.bellyMm / 2 - p.wallMm;
    const capacity = Math.PI * innerBelly ** 2 * (p.heightMm * 0.5) / 1000;
    return {
      errors,
      warnings,
      readout: [
        { label: "Belly Ø", value: U(p.bellyMm, units), source: "input" },
        { label: "Neck Ø", value: U(p.neckMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Rough volume", value: `${R(capacity, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.bellyMm, units)} belly · ${U(p.neckMm, units)} neck`,
        `BV${R(p.bellyMm, 0)}-${R(p.heightMm, 0)}`,
        p.bellyMm,
        p.heightMm,
        [
          { label: "Belly", value: U(p.bellyMm, units) },
          { label: "Neck", value: U(p.neckMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const belly = p.bellyMm / 2;
    const neck = p.neckMm / 2;
    const base = p.bellyMm * 0.55 / 2;
    const t = p.wallMm;
    return spin(
      [
        { x: 0, y: 0 },
        { x: base, y: 0 },
        { x: belly, y: p.heightMm * 0.35 },
        { x: neck, y: p.heightMm },
        { x: neck - t, y: p.heightMm },
        { x: belly - t, y: p.heightMm * 0.4 },
        { x: base - t, y: t },
        { x: 0, y: t },
      ],
      belly,
    );
  },
  fileName: (p) => `bud-vase-${R(p.bellyMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------ decanter stopper */

export const decanterStopper: AnyDesign = defineDesign({
  id: "decanter-stopper",
  name: "Decanter stopper",
  family: "vessels",
  eyebrow: "Tapered plug",
  blurb: "A ground-taper plug with a turned knob that pulls out cleanly.",
  lede: "A stopper with a tapered plug below a turned knob, sized so the taper finds its own seat in a decanter neck. The plug runs from a small bottom diameter to a larger top diameter, and the knob is kept wider than the neck so it can be gripped.",
  use: "Closing a decanter, a bottle or a small jar with a stopper you can pull by hand.",
  notesTitle: "How the taper seals",
  chips: [
    { label: "Bottom Ø", value: "6 – 36 mm" },
    { label: "Top Ø", value: "8 – 40 mm" },
    { label: "Knob Ø", value: "10 – 50 mm" },
  ],
  notes: [
    "The plug is a shallow taper rather than a cylinder, so it wedges at the depth where the diameters match the neck. The knob sits above the plug with a rounded shoulder, which gives a finger hold without a sharp edge against the glass.",
    "Finish the taper by blueing it against the actual neck and lapping it in; a stopper that only touches at the top will rock and leak air. Keep the taper clean and free of grit, and never force a stopper into a cold decanter.",
  ],
  header: "Decanter Stopper Designer - units: mm",
  fields: [
    { key: "bottom", label: "Bottom diameter", kind: "length", section: "Plug", default: "12", min: 6, max: 36 },
    { key: "top", label: "Top diameter", kind: "length", section: "Plug", default: "18", min: 8, max: 40 },
    { key: "plugHeight", label: "Plug height", kind: "length", section: "Plug", default: "18", min: 6, max: 40 },
    { key: "knob", label: "Knob diameter", kind: "length", section: "Knob", default: "26", min: 10, max: 50 },
  ],
  parse: (raw) => ({
    bottomMm: rawLength(raw, "bottom"),
    topMm: rawLength(raw, "top"),
    plugHeightMm: rawLength(raw, "plugHeight"),
    knobMm: rawLength(raw, "knob"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "bottom", "Bottom diameter", p.bottomMm, 6, 36);
    pushRange(errors, units, "top", "Top diameter", p.topMm, 8, 40);
    pushRange(errors, units, "plugHeight", "Plug height", p.plugHeightMm, 6, 40);
    pushRange(errors, units, "knob", "Knob diameter", p.knobMm, 10, 50);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "knob", p.knobMm, p.plugHeightMm * 1.6);

    if (p.topMm <= p.bottomMm + 2) errors.push({ field: "top", level: "error", message: "The plug does not taper." });
    if (p.knobMm < p.topMm) errors.push({ field: "knob", level: "error", message: "The knob is narrower than the plug; it would drop in." });
    const angle = (Math.atan2((p.topMm - p.bottomMm) / 2, p.plugHeightMm) * 180) / Math.PI;
    if (angle > 12) warnings.push({ field: "plugHeight", level: "warning", message: "A taper over 12 degrees seats too abruptly to seal reliably." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Bottom Ø", value: U(p.bottomMm, units), source: "input" },
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Plug height", value: U(p.plugHeightMm, units), source: "input" },
        { label: "Knob Ø", value: U(p.knobMm, units), source: "input" },
        { label: "Taper", value: `${R(angle, 1)}°`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.bottomMm, units)} to ${U(p.topMm, units)} taper`,
        `DS${R(p.bottomMm, 0)}-${R(p.topMm, 0)}`,
        p.knobMm,
        p.plugHeightMm * 1.6,
        [
          { label: "Bottom", value: U(p.bottomMm, units) },
          { label: "Top", value: U(p.topMm, units) },
          { label: "Knob", value: U(p.knobMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const bottom = p.bottomMm / 2;
    const top = p.topMm / 2;
    const knob = p.knobMm / 2;
    const knobHeight = p.knobMm * 0.6;
    return spin(
      [
        { x: 0, y: 0 },
        { x: bottom, y: 0 },
        { x: top, y: p.plugHeightMm },
        { x: knob, y: p.plugHeightMm },
        { x: knob, y: p.plugHeightMm + knobHeight * 0.55 },
        { x: knob * 0.65, y: p.plugHeightMm + knobHeight },
        { x: 0, y: p.plugHeightMm + knobHeight },
      ],
      Math.max(knob, top),
    );
  },
  fileName: (p) => `decanter-stopper-${R(p.bottomMm, 0)}-${R(p.topMm, 0)}.stl`,
});

/* -------------------------------------------------------------------- coaster */

export const coaster: AnyDesign = defineDesign({
  id: "coaster",
  name: "Coaster",
  family: "vessels",
  eyebrow: "Rimmed disc",
  blurb: "A disc with a raised rim that keeps condensation off the table.",
  lede: "A coaster with a shallow well and a raised rim, turned from a single profile. The rim catches a spill instead of letting it run onto the table, and the well is wide enough for a mug or a tumbler to sit flat.",
  use: "Protecting a desk, a table or a shelf from the ring left by a cold drink.",
  notesTitle: "How the well holds a spill",
  chips: [
    { label: "Diameter", value: "50 – 140 mm" },
    { label: "Thickness", value: "3 – 12 mm" },
    { label: "Rim wall", value: "2 – 8 mm" },
  ],
  notes: [
    "The well is a flat floor one rim height below the rim, which gives the coaster a real catchment volume rather than a decorative groove. The rim wall is thick enough to survive being picked up by the edge.",
    "Finish the underside flat and the well smooth; a coaster that rocks will spill the very ring it is meant to catch. Cork or felt pads on the underside keep it from sliding and protect the furniture better than a hard rim.",
  ],
  header: "Coaster Designer - units: mm",
  fields: [
    { key: "diameter", label: "Diameter", kind: "length", section: "Coaster", default: "90", min: 50, max: 140 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Coaster", default: "6", min: 3, max: 12 },
    { key: "rim", label: "Rim height", kind: "length", section: "Rim", default: "3", min: 1, max: 8 },
    { key: "rimWall", label: "Rim wall", kind: "length", section: "Rim", default: "4", min: 2, max: 8 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    thicknessMm: rawLength(raw, "thickness"),
    rimMm: rawLength(raw, "rim"),
    rimWallMm: rawLength(raw, "rimWall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Diameter", p.diameterMm, 50, 140);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 3, 12);
    pushRange(errors, units, "rim", "Rim height", p.rimMm, 1, 8);
    pushRange(errors, units, "rimWall", "Rim wall", p.rimWallMm, 2, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.thicknessMm);

    if (p.rimMm >= p.thicknessMm - 1) errors.push({ field: "rim", level: "error", message: "The rim leaves no floor under it." });
    if (p.rimWallMm >= p.diameterMm / 2 - 2) errors.push({ field: "rimWall", level: "error", message: "The rim wall closes the coaster." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Diameter", value: U(p.diameterMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Rim height", value: U(p.rimMm, units), source: "input" },
        { label: "Rim wall", value: U(p.rimWallMm, units), source: "input" },
        { label: "Well Ø", value: U(p.diameterMm - 2 * p.rimWallMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} coaster · ${U(p.rimMm, units)} rim`,
        `CO${R(p.diameterMm, 0)}-${R(p.thicknessMm, 0)}`,
        p.diameterMm,
        p.thicknessMm,
        [
          { label: "Diameter", value: U(p.diameterMm, units) },
          { label: "Thickness", value: U(p.thicknessMm, units) },
          { label: "Rim", value: U(p.rimMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: r, y: 0 },
        { x: r, y: p.thicknessMm },
        { x: r - p.rimWallMm, y: p.thicknessMm },
        { x: r - p.rimWallMm, y: p.thicknessMm - p.rimMm },
        { x: 0, y: p.thicknessMm - p.rimMm },
      ],
      r,
    );
  },
  fileName: (p) => `coaster-${R(p.diameterMm, 0)}-${R(p.thicknessMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- napkin ring */

export const napkinRing: AnyDesign = defineDesign({
  id: "napkin-ring",
  name: "Napkin ring",
  family: "vessels",
  eyebrow: "Wide band",
  blurb: "A plain band with a wide face that holds a rolled napkin.",
  lede: "A napkin ring turned as a short tube with a generous wall, so the band stands up on the table and takes a rolled napkin without crushing it. The width and the wall are independent, which makes it easy to match a set of place settings.",
  use: "Holding a rolled cloth napkin at a table setting, or bundling cutlery for a picnic.",
  notesTitle: "How the band holds the roll",
  chips: [
    { label: "Outside Ø", value: "30 – 90 mm" },
    { label: "Band width", value: "10 – 50 mm" },
    { label: "Wall", value: "1.5 – 6 mm" },
  ],
  notes: [
    "The ring is a straight tube with a wall thick enough not to dent when it is dropped, and both rims are flat so it sits square on a table. The bore is a through-hole, so the napkin passes right through the band.",
    "Finish both rims flat and parallel, then break the inside edge so the cloth does not catch. Make a short test band first and roll the actual napkin through it; a ring that is too tight creases the linen.",
  ],
  header: "Napkin Ring Designer - units: mm",
  fields: [
    { key: "outer", label: "Outside diameter", kind: "length", section: "Ring", default: "50", min: 30, max: 90 },
    { key: "width", label: "Band width", kind: "length", section: "Ring", default: "20", min: 10, max: 50 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Ring", default: "3", min: 1.5, max: 6 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outer"),
    widthMm: rawLength(raw, "width"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outer", "Outside diameter", p.outerMm, 30, 90);
    pushRange(errors, units, "width", "Band width", p.widthMm, 10, 50);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1.5, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outer", p.outerMm, p.widthMm);

    checkWall(errors, units, "wall", "ring wall", p.wallMm);
    if (p.wallMm >= p.outerMm / 2 - 2) errors.push({ field: "wall", level: "error", message: "The wall closes the ring." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Inside Ø", value: U(p.outerMm - 2 * p.wallMm, units), source: "calc" },
        { label: "Band width", value: U(p.widthMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} band · ${U(p.widthMm, units)} wide`,
        `NR${R(p.outerMm, 0)}-${R(p.widthMm, 0)}`,
        p.outerMm,
        p.widthMm,
        [
          { label: "Outside", value: U(p.outerMm, units) },
          { label: "Inside", value: U(p.outerMm - 2 * p.wallMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outer = p.outerMm / 2;
    const bore = outer - p.wallMm;
    return spin(
      [
        { x: bore, y: 0 },
        { x: outer, y: 0 },
        { x: outer, y: p.widthMm },
        { x: bore, y: p.widthMm },
      ],
      outer,
    );
  },
  fileName: (p) => `napkin-ring-${R(p.outerMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* --------------------------------------------------------------- drawer knob */

export const drawerKnob: AnyDesign = defineDesign({
  id: "drawer-knob",
  name: "Drawer knob",
  family: "fixings",
  eyebrow: "Turned pull",
  blurb: "A round knob on a short stem with a blind bore for a screw.",
  lede: "A drawer knob turned as one piece: a wide grip, a narrow stem and a blind bore from the back for a fixing screw. The bore stops inside the knob, so the screw cannot show through the front face.",
  use: "Pulling a drawer, a cupboard door or a sliding panel that has no handle fitted.",
  notesTitle: "How the screw seats",
  chips: [
    { label: "Knob Ø", value: "15 – 60 mm" },
    { label: "Stem Ø", value: "6 – 30 mm" },
    { label: "Bore", value: "2 – 10 mm" },
  ],
  notes: [
    "The bore is blind and stops below the front face, leaving a solid dome where the hand grips. The stem is narrower than the knob, which gives fingers something to close around and keeps the knob clear of the drawer front.",
    "Drill the bore from the back before turning the stem, so the bore and the stem share an axis. Fit the actual screw and check the head sits below the back face; a screw that bottoms out splits the knob.",
  ],
  header: "Drawer Knob Designer - units: mm",
  fields: [
    { key: "knob", label: "Knob diameter", kind: "length", section: "Knob", default: "30", min: 15, max: 60 },
    { key: "height", label: "Overall height", kind: "length", section: "Knob", default: "28", min: 10, max: 50 },
    { key: "stem", label: "Stem diameter", kind: "length", section: "Stem", default: "14", min: 6, max: 30 },
    { key: "bore", label: "Screw bore", kind: "length", section: "Stem", default: "4", min: 2, max: 10 },
  ],
  parse: (raw) => ({
    knobMm: rawLength(raw, "knob"),
    heightMm: rawLength(raw, "height"),
    stemMm: rawLength(raw, "stem"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "knob", "Knob diameter", p.knobMm, 15, 60);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 10, 50);
    pushRange(errors, units, "stem", "Stem diameter", p.stemMm, 6, 30);
    pushRange(errors, units, "bore", "Screw bore", p.boreMm, 2, 10);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "knob", p.knobMm, p.heightMm);

    const stemHeight = p.heightMm * 0.45;
    if (p.stemMm >= p.knobMm - 3) errors.push({ field: "stem", level: "error", message: "The stem is as wide as the knob." });
    if (p.boreMm >= p.stemMm - 2) errors.push({ field: "bore", level: "error", message: "The screw bore leaves under 1 mm of stem wall." });
    if (stemHeight < p.boreMm * 1.2) warnings.push({ field: "height", level: "warning", message: "A short stem gives very little to grip." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Knob Ø", value: U(p.knobMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Stem Ø", value: U(p.stemMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Bore depth", value: U(p.heightMm * 0.25, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.knobMm, units)} knob · ${U(p.heightMm, units)} tall`,
        `DK${R(p.knobMm, 0)}-${R(p.heightMm, 0)}`,
        p.knobMm,
        p.heightMm,
        [
          { label: "Knob", value: U(p.knobMm, units) },
          { label: "Stem", value: U(p.stemMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const knob = p.knobMm / 2;
    const stem = p.stemMm / 2;
    const bore = p.boreMm / 2;
    const stemHeight = p.heightMm * 0.45;
    const depth = p.heightMm * 0.25;
    return spin(
      [
        { x: bore, y: 0 },
        { x: stem, y: 0 },
        { x: stem, y: stemHeight },
        { x: knob, y: stemHeight },
        { x: knob, y: p.heightMm },
        { x: 0, y: p.heightMm },
        { x: 0, y: depth },
        { x: bore, y: depth },
      ],
      knob,
    );
  },
  fileName: (p) => `drawer-knob-${R(p.knobMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ vial cap */

export const vialCap: AnyDesign = defineDesign({
  id: "vial-cap",
  name: "Vial cap",
  family: "vessels",
  eyebrow: "Skirted cap",
  blurb: "A shallow cap with a skirt that pushes over a vial neck.",
  lede: "A push-on cap with a flat top, a cylindrical skirt and a blind bore that clears the neck of a small vial. The skirt height and the opening diameter are both live, so the same cap fits a range of sample bottles.",
  use: "Covering a small vial, a bottle or a specimen tube that has no cap of its own.",
  notesTitle: "How the skirt grips the neck",
  chips: [
    { label: "Cap Ø", value: "8 – 40 mm" },
    { label: "Opening Ø", value: "6 – 34 mm" },
    { label: "Height", value: "5 – 25 mm" },
  ],
  notes: [
    "The bore is a straight push fit over the outside of the neck rather than a thread, so the cap relies on the skirt wall to hold it. The floor above the bore closes the vial without pressing on the rim.",
    "Check the opening against the actual neck and make a trial cap: a push fit that is too tight splits at the skirt, and one that is too loose falls off in a pocket. Do not treat this as a leak-tight or sterile closure.",
  ],
  header: "Vial Cap Designer - units: mm",
  fields: [
    { key: "diameter", label: "Cap diameter", kind: "length", section: "Cap", default: "20", min: 8, max: 40 },
    { key: "height", label: "Cap height", kind: "length", section: "Cap", default: "12", min: 5, max: 25 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Skirt", default: "1.5", min: 1, max: 5 },
    { key: "opening", label: "Opening diameter", kind: "length", section: "Skirt", default: "17", min: 6, max: 34 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    openingMm: rawLength(raw, "opening"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Cap diameter", p.diameterMm, 8, 40);
    pushRange(errors, units, "height", "Cap height", p.heightMm, 5, 25);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 5);
    pushRange(errors, units, "opening", "Opening diameter", p.openingMm, 6, 34);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);

    if (p.openingMm >= p.diameterMm - 2) errors.push({ field: "opening", level: "error", message: "The opening leaves no skirt." });
    if (p.wallMm >= p.heightMm - 1) errors.push({ field: "wall", level: "error", message: "The wall leaves no cap above the opening." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cap Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Opening Ø", value: U(p.openingMm, units), source: "input" },
        { label: "Skirt", value: U((p.diameterMm - p.openingMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.openingMm, units)} opening · ${U(p.heightMm, units)} high`,
        `VC${R(p.diameterMm, 0)}-${R(p.openingMm, 0)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Cap", value: U(p.diameterMm, units) },
          { label: "Opening", value: U(p.openingMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cap = p.diameterMm / 2;
    const opening = p.openingMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: cap, y: 0 },
        { x: cap, y: p.heightMm },
        { x: opening, y: p.heightMm },
        { x: opening, y: p.wallMm },
        { x: 0, y: p.wallMm },
      ],
      cap,
    );
  },
  fileName: (p) => `vial-cap-${R(p.diameterMm, 0)}-${R(p.openingMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- septum cap */

export const septumCap: AnyDesign = defineDesign({
  id: "septum-cap",
  name: "Septum cap",
  family: "vessels",
  eyebrow: "Ring cap",
  blurb: "A short ring cap with a centre opening for a pierceable septum.",
  lede: "A cap formed as a flanged ring: a wide top face, a short skirt and a centre opening that takes a disc of septum material. The bore runs right through, so a needle can pass without meeting the cap body.",
  use: "Holding a replaceable septum disc on a small sample bottle, or covering a pierced lid.",
  notesTitle: "How the ring holds the disc",
  chips: [
    { label: "Cap Ø", value: "8 – 40 mm" },
    { label: "Bore", value: "2 – 20 mm" },
    { label: "Height", value: "4 – 20 mm" },
  ],
  notes: [
    "The centre opening is a straight bore through the full height, and the skirt locates the cap on the bottle. A septum disc sits on the counterbore ledge formed by the ring, so it can be replaced without a tool.",
    "Keep the bore free of burrs: a rough edge will tear the septum as it is pressed in. This cap holds a disc by friction only; do not treat it as a pressure or sterile seal.",
  ],
  header: "Septum Cap Designer - units: mm",
  fields: [
    { key: "diameter", label: "Cap diameter", kind: "length", section: "Cap", default: "20", min: 8, max: 40 },
    { key: "height", label: "Cap height", kind: "length", section: "Cap", default: "8", min: 4, max: 20 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "10", min: 2, max: 20 },
    { key: "wall", label: "Ring wall", kind: "length", section: "Bore", default: "2", min: 1, max: 5 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    heightMm: rawLength(raw, "height"),
    boreMm: rawLength(raw, "bore"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Cap diameter", p.diameterMm, 8, 40);
    pushRange(errors, units, "height", "Cap height", p.heightMm, 4, 20);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 2, 20);
    pushRange(errors, units, "wall", "Ring wall", p.wallMm, 1, 5);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.heightMm);

    checkWall(errors, units, "wall", "ring wall", (p.diameterMm - p.boreMm) / 2);
    if (p.boreMm >= p.diameterMm - 2) errors.push({ field: "bore", level: "error", message: "The bore leaves no cap body." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cap Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Ring wall", value: U((p.diameterMm - p.boreMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.boreMm, units)} bore · ${U(p.heightMm, units)} high`,
        `SP${R(p.diameterMm, 0)}-${R(p.boreMm, 0)}`,
        p.diameterMm,
        p.heightMm,
        [
          { label: "Cap", value: U(p.diameterMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outer = p.diameterMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: outer, y: 0 },
        { x: outer, y: p.heightMm },
        { x: bore, y: p.heightMm },
      ],
      outer,
    );
  },
  fileName: (p) => `septum-cap-${R(p.diameterMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- sample cup */

export const sampleCup: AnyDesign = defineDesign({
  id: "sample-cup",
  name: "Sample cup",
  family: "vessels",
  eyebrow: "Small pot",
  blurb: "A small tapered cup for holding a sample, a part or a dose.",
  lede: "A tapered cup with a flat floor and a thin wall, sized for a bench sample rather than a drink. The top and bottom diameters are entered separately so the cup stacks without wedging and empties without a hidden ledge.",
  use: "Holding a small sample, a batch of screws or a measured dose on a workbench.",
  notesTitle: "How the taper releases",
  chips: [
    { label: "Top Ø", value: "15 – 60 mm" },
    { label: "Bottom Ø", value: "10 – 50 mm" },
    { label: "Height", value: "15 – 60 mm" },
  ],
  notes: [
    "The outside tapers from the bottom diameter to the top, and the inside follows it at the wall thickness, leaving a flat floor. The taper means a stack of cups nests without seizing, which matters when they are handled in a tray.",
    "Finish the floor flat and deburr the rim; a cup that rocks spills a sample. This is a parts and sample holder, not a food or laboratory container.",
  ],
  header: "Sample Cup Designer - units: mm",
  fields: [
    { key: "top", label: "Top diameter", kind: "length", section: "Cup", default: "30", min: 15, max: 60 },
    { key: "bottom", label: "Bottom diameter", kind: "length", section: "Cup", default: "22", min: 10, max: 50 },
    { key: "height", label: "Height", kind: "length", section: "Cup", default: "30", min: 15, max: 60 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Wall", default: "1.5", min: 1, max: 4 },
  ],
  parse: (raw) => ({
    topMm: rawLength(raw, "top"),
    bottomMm: rawLength(raw, "bottom"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "top", "Top diameter", p.topMm, 15, 60);
    pushRange(errors, units, "bottom", "Bottom diameter", p.bottomMm, 10, 50);
    pushRange(errors, units, "height", "Height", p.heightMm, 15, 60);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 4);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "top", p.topMm, p.heightMm);

    if (p.wallMm >= p.bottomMm / 2 - 1) errors.push({ field: "wall", level: "error", message: "The wall closes the cup at the base." });
    if (p.bottomMm > p.topMm) warnings.push({ field: "bottom", level: "warning", message: "A base wider than the rim will not stack." });

    const innerTop = p.topMm / 2 - p.wallMm;
    const innerBottom = p.bottomMm / 2 - p.wallMm;
    const capacity =
      (Math.PI * p.heightMm * (innerTop ** 2 + innerTop * innerBottom + innerBottom ** 2)) / 3 / 1000;
    return {
      errors,
      warnings,
      readout: [
        { label: "Top Ø", value: U(p.topMm, units), source: "input" },
        { label: "Bottom Ø", value: U(p.bottomMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(p.wallMm, units), source: "input" },
        { label: "Capacity", value: `${R(capacity, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.topMm, units)} rim · ${R(capacity, 0)} ml`,
        `SPC${R(p.topMm, 0)}-${R(p.heightMm, 0)}`,
        p.topMm,
        p.heightMm,
        [
          { label: "Top", value: U(p.topMm, units) },
          { label: "Bottom", value: U(p.bottomMm, units) },
          { label: "Capacity", value: `${R(capacity, 0)} ml` },
        ],
      ),
    };
  },
  build: (p) => {
    const top = p.topMm / 2;
    const bottom = p.bottomMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: bottom, y: 0 },
        { x: top, y: p.heightMm },
        { x: top - p.wallMm, y: p.heightMm },
        { x: bottom - p.wallMm, y: p.wallMm },
        { x: 0, y: p.wallMm },
      ],
      top,
    );
  },
  fileName: (p) => `sample-cup-${R(p.topMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* --------------------------------------------------------------- dowel spacer */

export const dowelSpacer: AnyDesign = defineDesign({
  id: "dowel-spacer",
  name: "Dowel spacer",
  family: "fixings",
  eyebrow: "Depth ring",
  blurb: "A chamfered ring that sets a dowel to a repeatable depth.",
  lede: "A ring that slides over a dowel and stops it at a set depth in a blind hole. Both faces are chamfered so the ring can be pushed against a surface without a burr digging in, and the bore is a clearance fit over the dowel.",
  use: "Setting dowels or pins to the same depth across a batch of joints or jigs.",
  notesTitle: "How the ring sets the depth",
  chips: [
    { label: "Outside Ø", value: "10 – 40 mm" },
    { label: "Bore", value: "4 – 30 mm" },
    { label: "Height", value: "4 – 30 mm" },
  ],
  notes: [
    "The ring is a short tube with chamfered ends, so its height is the depth stop and its bore is the sliding fit over the dowel. Chamfering both ends means the same ring works either way up.",
    "Check the bore against the actual dowel and keep the ring a light push fit; a ring that grips will pull the dowel back out of the hole. Face both ends parallel so the depth does not vary around the ring.",
  ],
  header: "Dowel Spacer Designer - units: mm",
  fields: [
    { key: "outer", label: "Outside diameter", kind: "length", section: "Ring", default: "20", min: 10, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Ring", default: "10", min: 4, max: 30 },
    { key: "height", label: "Height", kind: "length", section: "Ring", default: "12", min: 4, max: 30 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Ring", default: "0.6", min: 0.3, max: 2 },
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
    pushRange(errors, units, "outer", "Outside diameter", p.outerMm, 10, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 30);
    pushRange(errors, units, "height", "Height", p.heightMm, 4, 30);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0.3, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outer", p.outerMm, p.heightMm);

    const wall = (p.outerMm - p.boreMm) / 2;
    checkWall(errors, units, "bore", "ring wall", wall);
    if (p.chamferMm >= p.heightMm / 2) errors.push({ field: "chamfer", level: "error", message: "The chamfers meet." });
    if (p.chamferMm >= wall - 0.4) errors.push({ field: "chamfer", level: "error", message: "The chamfer reaches the bore." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Depth stop", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U(wall, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.boreMm, units)} bore · ${U(p.heightMm, units)} stop`,
        `DS${R(p.outerMm, 0)}-${R(p.heightMm, 0)}`,
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
    const outer = p.outerMm / 2;
    const bore = p.boreMm / 2;
    const c = Math.min(p.chamferMm, p.heightMm / 2 - 1e-4, outer - bore - 1e-4);
    return spin(
      [
        { x: bore, y: 0 },
        { x: outer - c, y: 0 },
        { x: outer, y: c },
        { x: outer, y: p.heightMm - c },
        { x: outer - c, y: p.heightMm },
        { x: bore, y: p.heightMm },
      ],
      outer,
    );
  },
  fileName: (p) => `dowel-spacer-${R(p.outerMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* --------------------------------------------------------------- flask weight */

export const flaskWeight: AnyDesign = defineDesign({
  id: "flask-weight",
  name: "Flask weight",
  family: "vessels",
  eyebrow: "Ballast ring",
  blurb: "A heavy bored ring that adds ballast low on a flask or a beaker.",
  lede: "A dense ring with a wide flat face and a straight bore, made to sit over the base of a flask or a jar and lower its centre of mass. The bore and the outside diameter are both entered, so it can clear a range of vessel bases.",
  use: "Weighting a flask, a jar or a mould so it cannot tip while it is being filled.",
  notesTitle: "How the ballast sits",
  chips: [
    { label: "Outside Ø", value: "40 – 140 mm" },
    { label: "Bore", value: "20 – 100 mm" },
    { label: "Height", value: "10 – 50 mm" },
  ],
  notes: [
    "The ring is a plain annulus with parallel faces, so it bears on the bench across its whole width instead of rocking on a rim. The bore clears the vessel, which lets the weight sit around the base rather than on top of it.",
    "Use a dense, stable material and check the ring sits flat before loading the vessel. A weight that is a loose fit can slide off a wet bench; a soft pad under the ring helps it stay put.",
  ],
  header: "Flask Weight Designer - units: mm",
  fields: [
    { key: "outer", label: "Outside diameter", kind: "length", section: "Weight", default: "80", min: 40, max: 140 },
    { key: "bore", label: "Bore", kind: "length", section: "Weight", default: "40", min: 20, max: 100 },
    { key: "height", label: "Height", kind: "length", section: "Weight", default: "20", min: 10, max: 50 },
    { key: "wall", label: "Minimum wall", kind: "length", section: "Weight", default: "6", min: 3, max: 15 },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outer"),
    boreMm: rawLength(raw, "bore"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outer", "Outside diameter", p.outerMm, 40, 140);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 20, 100);
    pushRange(errors, units, "height", "Height", p.heightMm, 10, 50);
    pushRange(errors, units, "wall", "Minimum wall", p.wallMm, 3, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outer", p.outerMm, p.heightMm);

    checkWall(errors, units, "bore", "ring wall", (p.outerMm - p.boreMm) / 2);
    if ((p.outerMm - p.boreMm) / 2 < p.wallMm) errors.push({ field: "wall", level: "error", message: "The requested wall is thicker than the ring." });

    const volume = Math.PI * ((p.outerMm / 2) ** 2 - (p.boreMm / 2) ** 2) * p.heightMm / 1000;
    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outerMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Wall", value: U((p.outerMm - p.boreMm) / 2, units), source: "calc" },
        { label: "Volume", value: `${R(volume, 0)} ml`, source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outerMm, units)} ring · ${R(volume, 0)} ml of material`,
        `FW${R(p.outerMm, 0)}-${R(p.boreMm, 0)}`,
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
    const outer = p.outerMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: outer, y: 0 },
        { x: outer, y: p.heightMm },
        { x: bore, y: p.heightMm },
      ],
      outer,
    );
  },
  fileName: (p) => `flask-weight-${R(p.outerMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

export const revolveUtility: AnyDesign[] = [
  roundStandoff,
  locatingPin,
  countersinkPlug,
  screwCap,
  acornCap,
  dowel,
  towelBarEnd,
  capstanDrum,
  bobbinFlange,
  tapHandle,
  tumbler,
  shotGlass,
  measuringCup,
  votiveHolder,
  budVase,
  decanterStopper,
  coaster,
  napkinRing,
  drawerKnob,
  vialCap,
  septumCap,
  sampleCup,
  dowelSpacer,
  flaskWeight,
];
