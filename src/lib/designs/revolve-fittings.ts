/** Turned batch 5: pins, rollers, sleeves, spring seats and drivers. */

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

/* ------------------------------------------------------------------ wrist pin */

export const wristPin: AnyDesign = defineDesign({
  id: "wrist-pin",
  name: "Wrist pin",
  family: "motion",
  eyebrow: "Hollow pin",
  blurb: "A hollow pin with chamfered ends that joins a rod to a piston.",
  lede: "A wrist pin turned as a tube with a chamfer at each end. The bore takes weight out of the pin without turning it into a thin shell, and the chamfers give a lead-in so the pin can be pressed through a rod eye without shaving metal.",
  use: "Joining a connecting rod to a piston or a lever in a model engine or a small mechanism.",
  notesTitle: "How the pin carries the load",
  chips: [
    { label: "Pin Ø", value: "6 – 40 mm" },
    { label: "Bore", value: "3 – 30 mm" },
    { label: "Length", value: "10 – 80 mm" },
  ],
  notes: [
    "The bore is concentric with the outside, which keeps the wall even all the way round and avoids the offset loading that a drilled-off-centre pin produces. Both ends are chamfered so the pin starts into its eye squarely.",
    "Ream the rod eye first and measure it, then make the pin to suit; a pin that is a few hundredths loose will knock. Keep the wall at least 1.5 mm at the chamfer, because that is where a hollow pin usually starts to yield.",
  ],
  header: "Wrist Pin Designer - units: mm",
  fields: [
    { key: "diameter", label: "Pin diameter", kind: "length", section: "Pin", default: "12", min: 6, max: 40 },
    { key: "length", label: "Length", kind: "length", section: "Pin", default: "40", min: 10, max: 80 },
    { key: "bore", label: "Bore", kind: "length", section: "Pin", default: "6", min: 3, max: 30 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Ends", default: "0.8", min: 0.5, max: 3 },
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
    pushRange(errors, units, "diameter", "Pin diameter", p.diameterMm, 6, 40);
    pushRange(errors, units, "length", "Length", p.lengthMm, 10, 80);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 30);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0.5, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.lengthMm);

    const wall = (p.diameterMm - p.boreMm) / 2;
    checkWall(errors, units, "bore", "pin wall", wall);
    if (p.chamferMm >= p.lengthMm / 2) errors.push({ field: "chamfer", level: "error", message: "The chamfers meet." });
    if (p.chamferMm >= wall - 0.4) errors.push({ field: "chamfer", level: "error", message: "The chamfer reaches the bore." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Pin Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Wall", value: U(wall, units), source: "calc" },
        { label: "End Ø", value: U(p.diameterMm - 2 * p.chamferMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} pin · ${U(p.boreMm, units)} bore`,
        `WP${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}`,
        p.diameterMm,
        p.lengthMm,
        [
          { label: "Pin", value: U(p.diameterMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    const bore = p.boreMm / 2;
    const c = Math.min(p.chamferMm, r - bore - 1e-4, p.lengthMm / 2 - 1e-4);
    return spin(
      [
        { x: bore, y: 0 },
        { x: r - c, y: 0 },
        { x: r, y: c },
        { x: r, y: p.lengthMm - c },
        { x: r - c, y: p.lengthMm },
        { x: bore, y: p.lengthMm },
      ],
      r,
    );
  },
  fileName: (p) => `wrist-pin-${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* -------------------------------------------------------------- crowned roller */

export const crownedRoller: AnyDesign = defineDesign({
  id: "crowned-roller",
  name: "Crowned roller",
  family: "drives",
  eyebrow: "Barrel roller",
  blurb: "A bored roller with a slight crown so it tracks a flat belt.",
  lede: "A roller with a shallow crown on its running face, which is what keeps a flat belt or a web centred on the roller. The crown is a real dimension rather than a guess, so a replacement roller can be matched to the machine it came from.",
  use: "Replacing a worn roller on a belt sander, a conveyor or a web-handling machine.",
  notesTitle: "How the crown centres the belt",
  chips: [
    { label: "Roller Ø", value: "10 – 80 mm" },
    { label: "Bore", value: "3 – 40 mm" },
    { label: "Length", value: "10 – 100 mm" },
  ],
  notes: [
    "The diameter rises from the ends to the middle by the crown amount, so a belt that drifts to one side climbs back towards the high point. The bore is concentric with the running face, which matters more than the crown for a roller that runs true.",
    "Turn the crown in one pass with the roller supported between centres and check the bore afterwards. A crown that is off-centre steers the belt worse than no crown at all, so measure the running face before fitting.",
  ],
  header: "Crowned Roller Designer - units: mm",
  fields: [
    { key: "diameter", label: "Roller diameter", kind: "length", section: "Roller", default: "30", min: 10, max: 80 },
    { key: "length", label: "Length", kind: "length", section: "Roller", default: "30", min: 10, max: 100 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "8", min: 3, max: 40 },
    { key: "crown", label: "Crown height", kind: "length", section: "Face", default: "0.3", min: 0.1, max: 2 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
    crownMm: rawLength(raw, "crown"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Roller diameter", p.diameterMm, 10, 80);
    pushRange(errors, units, "length", "Length", p.lengthMm, 10, 100);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 40);
    pushRange(errors, units, "crown", "Crown height", p.crownMm, 0.1, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.lengthMm);

    const wall = (p.diameterMm - p.boreMm) / 2;
    checkWall(errors, units, "bore", "roller wall", wall);
    if (p.crownMm >= wall - 0.5) errors.push({ field: "crown", level: "error", message: "The crown eats the roller wall." });
    if (p.crownMm > p.diameterMm * 0.03) warnings.push({ field: "crown", level: "warning", message: "A crown over 3 percent of the diameter steers too hard." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Roller Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Crown", value: U(p.crownMm, units), source: "input" },
        { label: "End Ø", value: U(p.diameterMm - 2 * p.crownMm, units), source: "calc" },
        { label: "Wall", value: U(wall, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} roller · ${U(p.crownMm, units)} crown`,
        `CR${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}`,
        p.diameterMm,
        p.lengthMm,
        [
          { label: "Roller", value: U(p.diameterMm, units) },
          { label: "Crown", value: U(p.crownMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: r - p.crownMm, y: 0 },
        { x: r, y: p.lengthMm / 2 },
        { x: r - p.crownMm, y: p.lengthMm },
        { x: bore, y: p.lengthMm },
      ],
      r,
    );
  },
  fileName: (p) => `crowned-roller-${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- idler wheel */

export const idlerWheel: AnyDesign = defineDesign({
  id: "idler-wheel",
  name: "Idler wheel",
  family: "drives",
  eyebrow: "Flanged wheel",
  blurb: "A bored wheel with flanges on both sides that guides a belt.",
  lede: "An idler wheel with a raised flange at each edge, so a belt or a cord cannot walk off the running face. The wheel runs on a plain bore, and the flanges are thin enough that the belt contacts the face rather than rubbing the shoulder.",
  use: "Guiding or tensioning a belt, a cord or a wire on a light machine or an automation frame.",
  notesTitle: "How the flanges guide the belt",
  chips: [
    { label: "Wheel Ø", value: "20 – 120 mm" },
    { label: "Flange Ø", value: "25 – 140 mm" },
    { label: "Width", value: "6 – 50 mm" },
  ],
  notes: [
    "The running face sits between two flanges, and the belt bears on the face while the flanges catch a wander. Because the flanges are part of the same turned profile, they run true to the bore without a separate assembly.",
    "Bore the wheel to the actual shaft or bearing and check the flange clearance before fitting; a flange that rubs the belt edge will fray it. Keep the running face smooth and parallel, since an idler that runs out will steer the belt.",
  ],
  header: "Idler Wheel Designer - units: mm",
  fields: [
    { key: "diameter", label: "Wheel diameter", kind: "length", section: "Wheel", default: "50", min: 20, max: 120 },
    { key: "width", label: "Width", kind: "length", section: "Wheel", default: "16", min: 6, max: 50 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "10", min: 4, max: 40 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Flange", default: "60", min: 25, max: 140 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    widthMm: rawLength(raw, "width"),
    boreMm: rawLength(raw, "bore"),
    flangeMm: rawLength(raw, "flange"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Wheel diameter", p.diameterMm, 20, 120);
    pushRange(errors, units, "width", "Width", p.widthMm, 6, 50);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 4, 40);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 25, 140);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.widthMm);

    if (p.flangeMm <= p.diameterMm + 4) errors.push({ field: "flange", level: "error", message: "The flanges do not stand proud of the face." });
    checkWall(errors, units, "bore", "wheel wall", (p.diameterMm - p.boreMm) / 2);
    if (p.widthMm < 5) errors.push({ field: "width", level: "error", message: "The wheel is too narrow for two flanges." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Wheel Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Running face", value: U(p.widthMm - 4, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} face · ${U(p.flangeMm, units)} flange`,
        `IW${R(p.diameterMm, 0)}-${R(p.widthMm, 0)}`,
        p.flangeMm,
        p.widthMm,
        [
          { label: "Wheel", value: U(p.diameterMm, units) },
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const face = p.diameterMm / 2;
    const flange = p.flangeMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: flange, y: 0 },
        { x: flange, y: 2 },
        { x: face, y: 2 },
        { x: face, y: p.widthMm - 2 },
        { x: flange, y: p.widthMm - 2 },
        { x: flange, y: p.widthMm },
        { x: bore, y: p.widthMm },
      ],
      flange,
    );
  },
  fileName: (p) => `idler-wheel-${R(p.diameterMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* --------------------------------------------------------------- guide roller */

export const guideRoller: AnyDesign = defineDesign({
  id: "guide-roller",
  name: "Guide roller",
  family: "drives",
  eyebrow: "Lipless roller",
  blurb: "A bored roller with a small lip at each end that keeps a web on track.",
  lede: "A guide roller whose lips are a separate dimension from the roller diameter, so a replacement can match the clearance the machine was built with. The bore runs straight through, and the lips are kept short so a web is guided rather than pinched.",
  use: "Keeping a wire, a cord or a narrow web inside its track on a guide or a tensioner.",
  notesTitle: "How the lip steers the web",
  chips: [
    { label: "Roller Ø", value: "10 – 80 mm" },
    { label: "Lip height", value: "1 – 6 mm" },
    { label: "Width", value: "8 – 60 mm" },
  ],
  notes: [
    "The lip adds to the roller radius only at the ends, leaving a long running face between them. A lip is a gentler guide than a full flange because it only touches the web if it drifts, so it does not crush an edge in normal running.",
    "Turn the running face and the lips in one setup, then bore from the same end so the lips run true to the shaft. A roller with one lip taller than the other will steer the web to one side.",
  ],
  header: "Guide Roller Designer - units: mm",
  fields: [
    { key: "diameter", label: "Roller diameter", kind: "length", section: "Roller", default: "30", min: 10, max: 80 },
    { key: "width", label: "Width", kind: "length", section: "Roller", default: "20", min: 8, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "8", min: 3, max: 30 },
    { key: "lip", label: "Lip height", kind: "length", section: "Lip", default: "3", min: 1, max: 6 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    widthMm: rawLength(raw, "width"),
    boreMm: rawLength(raw, "bore"),
    lipMm: rawLength(raw, "lip"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Roller diameter", p.diameterMm, 10, 80);
    pushRange(errors, units, "width", "Width", p.widthMm, 8, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 30);
    pushRange(errors, units, "lip", "Lip height", p.lipMm, 1, 6);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.widthMm);

    checkWall(errors, units, "bore", "roller wall", (p.diameterMm - p.boreMm) / 2);
    if (p.lipMm * 2 + 2 >= p.widthMm) errors.push({ field: "lip", level: "error", message: "The two lips leave no running face." });
    if (p.lipMm >= (p.diameterMm - p.boreMm) / 2) errors.push({ field: "lip", level: "error", message: "The lip reaches the bore." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Roller Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Lip Ø", value: U(p.diameterMm + 2 * p.lipMm, units), source: "calc" },
        { label: "Width", value: U(p.widthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Running face", value: U(p.widthMm - 2 * p.lipMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} face · ${U(p.lipMm, units)} lips`,
        `GR${R(p.diameterMm, 0)}-${R(p.widthMm, 0)}`,
        p.diameterMm + 2 * p.lipMm,
        p.widthMm,
        [
          { label: "Roller", value: U(p.diameterMm, units) },
          { label: "Lip", value: U(p.lipMm, units) },
          { label: "Width", value: U(p.widthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    const lipR = r + p.lipMm;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: lipR, y: 0 },
        { x: lipR, y: p.lipMm },
        { x: r, y: p.lipMm },
        { x: r, y: p.widthMm - p.lipMm },
        { x: lipR, y: p.widthMm - p.lipMm },
        { x: lipR, y: p.widthMm },
        { x: bore, y: p.widthMm },
      ],
      lipR,
    );
  },
  fileName: (p) => `guide-roller-${R(p.diameterMm, 0)}-${R(p.widthMm, 0)}.stl`,
});

/* -------------------------------------------------------------- plain bushing */

export const plainBushing: AnyDesign = defineDesign({
  id: "plain-bushing",
  name: "Plain bushing",
  family: "fixings",
  eyebrow: "Sleeve bearing",
  blurb: "A chamfered sleeve that takes a shaft in a plain bearing bore.",
  lede: "A plain sleeve with a straight bore and chamfered ends, made to sit in a housing and carry a rotating or sliding shaft. The wall is reported so the bushing can be sized against the housing rather than guessed from the bore alone.",
  use: "Repairing a worn bearing bore in a machine, a hinge or a wheel hub with a replaceable sleeve.",
  notesTitle: "How the sleeve fits the housing",
  chips: [
    { label: "Outside Ø", value: "6 – 60 mm" },
    { label: "Bore", value: "3 – 50 mm" },
    { label: "Length", value: "4 – 60 mm" },
  ],
  notes: [
    "The bore is a straight cylinder and both ends are chamfered, so the shaft starts without catching and the sleeve can be pressed into a housing without a burr rolling ahead of it. The wall is the difference between the outside and the bore, checked before the mesh is built.",
    "Measure the housing and the shaft, then choose the wall; a sleeve pressed into a rough bore will close up and grip the shaft. Ream the bore after pressing if the fit matters, and lubricate the shaft before assembly.",
  ],
  header: "Plain Bushing Designer - units: mm",
  fields: [
    { key: "outside", label: "Outside diameter", kind: "length", section: "Bushing", default: "16", min: 6, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Bushing", default: "8", min: 3, max: 50 },
    { key: "length", label: "Length", kind: "length", section: "Bushing", default: "20", min: 4, max: 60 },
    { key: "chamfer", label: "End chamfer", kind: "length", section: "Ends", default: "0.5", min: 0.3, max: 3 },
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
    pushRange(errors, units, "outside", "Outside diameter", p.outsideMm, 6, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 50);
    pushRange(errors, units, "length", "Length", p.lengthMm, 4, 60);
    pushRange(errors, units, "chamfer", "End chamfer", p.chamferMm, 0.3, 3);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outside", p.outsideMm, p.lengthMm);

    const wall = (p.outsideMm - p.boreMm) / 2;
    checkWall(errors, units, "bore", "bushing wall", wall);
    if (p.chamferMm >= p.lengthMm / 2) errors.push({ field: "chamfer", level: "error", message: "The chamfers meet." });
    if (p.chamferMm >= wall - 0.3) errors.push({ field: "chamfer", level: "error", message: "The chamfer reaches the bore." });
    if (p.lengthMm < p.boreMm * 1.5) warnings.push({ field: "length", level: "warning", message: "A bushing under 1.5 bore diameters long wears quickly." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outsideMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Wall", value: U(wall, units), source: "calc" },
        { label: "Chamfer", value: U(p.chamferMm, units), source: "input" },
      ],
      preview: previewOf(
        `${U(p.outsideMm, units)} sleeve · ${U(p.boreMm, units)} bore`,
        `PB${R(p.outsideMm, 0)}-${R(p.boreMm, 0)}`,
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
  fileName: (p) => `plain-bushing-${R(p.outsideMm, 0)}-${R(p.boreMm, 0)}.stl`,
});

/* ------------------------------------------------------------- flanged sleeve */

export const flangedSleeve: AnyDesign = defineDesign({
  id: "flanged-sleeve",
  name: "Flanged sleeve",
  family: "fixings",
  eyebrow: "Shouldered bush",
  blurb: "A sleeve with a wide flange that takes the thrust at the joint.",
  lede: "A flanged sleeve with a thin flange at one end, so the sleeve can be pressed into a housing and the flange stops it at the right depth. The flange also gives the joint a bearing face for thrust rather than letting the sleeve sink.",
  use: "Bushing a hole where the sleeve has to stop at a fixed depth and carry a thrust load.",
  notesTitle: "How the flange sets the depth",
  chips: [
    { label: "Sleeve Ø", value: "6 – 60 mm" },
    { label: "Flange Ø", value: "10 – 80 mm" },
    { label: "Length", value: "6 – 60 mm" },
  ],
  notes: [
    "The flange is a full disc at one end, so pressing the sleeve into its bore stops hard at the flange face instead of relying on a mark. The flange thickness of 3 mm is fixed because it is a handling feature, not a structural one on these sizes.",
    "Face the flange square to the bore and press on the flange with a flat drift, not on the bore edge. Check the flange sits flush after pressing; a sleeve that rocks in its housing will wear the bore oval.",
  ],
  header: "Flanged Sleeve Designer - units: mm",
  fields: [
    { key: "outside", label: "Sleeve diameter", kind: "length", section: "Sleeve", default: "16", min: 6, max: 60 },
    { key: "flange", label: "Flange diameter", kind: "length", section: "Flange", default: "24", min: 10, max: 80 },
    { key: "length", label: "Overall length", kind: "length", section: "Sleeve", default: "20", min: 6, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "8", min: 3, max: 50 },
  ],
  parse: (raw) => ({
    outsideMm: rawLength(raw, "outside"),
    flangeMm: rawLength(raw, "flange"),
    lengthMm: rawLength(raw, "length"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outside", "Sleeve diameter", p.outsideMm, 6, 60);
    pushRange(errors, units, "flange", "Flange diameter", p.flangeMm, 10, 80);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 6, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 50);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "flange", p.flangeMm, p.lengthMm);

    if (p.flangeMm <= p.outsideMm + 2) errors.push({ field: "flange", level: "error", message: "The flange does not stand proud of the sleeve." });
    checkWall(errors, units, "bore", "sleeve wall", (p.outsideMm - p.boreMm) / 2);
    if (p.lengthMm <= 4) errors.push({ field: "length", level: "error", message: "The sleeve is shorter than its flange." });
    if (p.outsideMm < p.boreMm + 4) warnings.push({ field: "outside", level: "warning", message: "A wall under 2 mm collapses when pressed." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Sleeve Ø", value: U(p.outsideMm, units), source: "input" },
        { label: "Flange Ø", value: U(p.flangeMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Sleeve length", value: U(p.lengthMm - 3, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.outsideMm, units)} sleeve · ${U(p.flangeMm, units)} flange`,
        `FS${R(p.outsideMm, 0)}-${R(p.lengthMm, 0)}`,
        p.flangeMm,
        p.lengthMm,
        [
          { label: "Sleeve", value: U(p.outsideMm, units) },
          { label: "Flange", value: U(p.flangeMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const sleeve = p.outsideMm / 2;
    const flange = p.flangeMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: flange, y: 0 },
        { x: flange, y: 3 },
        { x: sleeve, y: 3 },
        { x: sleeve, y: p.lengthMm },
        { x: bore, y: p.lengthMm },
      ],
      flange,
    );
  },
  fileName: (p) => `flanged-sleeve-${R(p.outsideMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ---------------------------------------------------------------- spacer stack */

export const spacerStack: AnyDesign = defineDesign({
  id: "spacer-stack",
  name: "Spacer stack",
  family: "fixings",
  eyebrow: "Stepped ring",
  blurb: "A bored spacer with two outside diameters, for a stepped gap.",
  lede: "A single spacer that covers two gap heights: a smaller diameter on the lower half and a larger shoulder on the upper half. It replaces a loose stack of washers, which is what usually ends up in a gap that changes along a shaft.",
  use: "Filling a stepped gap on a shaft or a bolt where a stack of washers would fall out of line.",
  notesTitle: "How the step shares the gap",
  chips: [
    { label: "Outside Ø", value: "10 – 60 mm" },
    { label: "Step Ø", value: "6 – 50 mm" },
    { label: "Length", value: "6 – 80 mm" },
  ],
  notes: [
    "The lower half is turned to the step diameter and the upper half to the full outside diameter, with a square shoulder between them. Both halves share one bore, so the spacer stays concentric when it is slid onto a shaft.",
    "Turn the bore first and the two diameters from the same setting, or the shoulder will sit at an angle. Check the shoulder against the actual gap; a step that is a little short lets the upper part take the load on its corner.",
  ],
  header: "Spacer Stack Designer - units: mm",
  fields: [
    { key: "outside", label: "Outside diameter", kind: "length", section: "Spacer", default: "24", min: 10, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Spacer", default: "8", min: 3, max: 40 },
    { key: "length", label: "Length", kind: "length", section: "Spacer", default: "24", min: 6, max: 80 },
    { key: "step", label: "Step diameter", kind: "length", section: "Step", default: "16", min: 6, max: 50 },
  ],
  parse: (raw) => ({
    outsideMm: rawLength(raw, "outside"),
    boreMm: rawLength(raw, "bore"),
    lengthMm: rawLength(raw, "length"),
    stepMm: rawLength(raw, "step"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outside", "Outside diameter", p.outsideMm, 10, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 3, 40);
    pushRange(errors, units, "length", "Length", p.lengthMm, 6, 80);
    pushRange(errors, units, "step", "Step diameter", p.stepMm, 6, 50);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "outside", p.outsideMm, p.lengthMm);

    if (p.stepMm <= p.boreMm + 2) errors.push({ field: "step", level: "error", message: "The step leaves under 1 mm of wall." });
    if (p.stepMm >= p.outsideMm - 1) errors.push({ field: "step", level: "error", message: "The step is as wide as the spacer." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: U(p.outsideMm, units), source: "input" },
        { label: "Step Ø", value: U(p.stepMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Step at", value: U(p.lengthMm / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.stepMm, units)} to ${U(p.outsideMm, units)} step`,
        `SS${R(p.outsideMm, 0)}-${R(p.lengthMm, 0)}`,
        p.outsideMm,
        p.lengthMm,
        [
          { label: "Outside", value: U(p.outsideMm, units) },
          { label: "Step", value: U(p.stepMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outer = p.outsideMm / 2;
    const step = p.stepMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: step, y: 0 },
        { x: step, y: p.lengthMm / 2 },
        { x: outer, y: p.lengthMm / 2 },
        { x: outer, y: p.lengthMm },
        { x: bore, y: p.lengthMm },
      ],
      outer,
    );
  },
  fileName: (p) => `spacer-stack-${R(p.outsideMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- spring seat */

export const springSeat: AnyDesign = defineDesign({
  id: "spring-seat",
  name: "Spring seat",
  family: "motion",
  eyebrow: "Spring cup",
  blurb: "A cup with a shallow pocket that centres the end of a spring.",
  lede: "A spring seat turned as a cup with a pocket that the last coil drops into. The pocket diameter sets the spring's location and the pocket depth keeps the coil from slipping sideways under load, without trapping the spring permanently.",
  use: "Seating the end of a compression spring in a latch, a plunger or a suspension mock-up.",
  notesTitle: "How the pocket centres the coil",
  chips: [
    { label: "Cup Ø", value: "20 – 100 mm" },
    { label: "Pocket Ø", value: "10 – 80 mm" },
    { label: "Height", value: "8 – 50 mm" },
  ],
  notes: [
    "The pocket is a blind bore from the top with a flat floor, so the spring bears on the floor rather than on the cup rim. The wall between the pocket and the outside is checked so the cup does not split when the spring is compressed.",
    "Check the pocket against the actual spring outside diameter and leave a little clearance for the coil to move. Keep the floor flat and square to the pocket, because a spring on a sloped seat bends sideways as it compresses.",
  ],
  header: "Spring Seat Designer - units: mm",
  fields: [
    { key: "cup", label: "Cup diameter", kind: "length", section: "Cup", default: "50", min: 20, max: 100 },
    { key: "height", label: "Cup height", kind: "length", section: "Cup", default: "16", min: 8, max: 50 },
    { key: "wall", label: "Floor thickness", kind: "length", section: "Pocket", default: "3", min: 1.5, max: 6 },
    { key: "pocket", label: "Pocket diameter", kind: "length", section: "Pocket", default: "36", min: 10, max: 80 },
  ],
  parse: (raw) => ({
    cupMm: rawLength(raw, "cup"),
    heightMm: rawLength(raw, "height"),
    wallMm: rawLength(raw, "wall"),
    pocketMm: rawLength(raw, "pocket"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cup", "Cup diameter", p.cupMm, 20, 100);
    pushRange(errors, units, "height", "Cup height", p.heightMm, 8, 50);
    pushRange(errors, units, "wall", "Floor thickness", p.wallMm, 1.5, 6);
    pushRange(errors, units, "pocket", "Pocket diameter", p.pocketMm, 10, 80);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "cup", p.cupMm, p.heightMm);

    if (p.pocketMm >= p.cupMm - 2) errors.push({ field: "pocket", level: "error", message: "The pocket leaves no cup wall." });
    if (p.wallMm >= p.heightMm - 1) errors.push({ field: "wall", level: "error", message: "The floor fills the cup." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cup Ø", value: U(p.cupMm, units), source: "input" },
        { label: "Pocket Ø", value: U(p.pocketMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Floor", value: U(p.wallMm, units), source: "input" },
        { label: "Pocket depth", value: U(p.heightMm - p.wallMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.pocketMm, units)} pocket · ${U(p.heightMm, units)} cup`,
        `ST${R(p.cupMm, 0)}-${R(p.pocketMm, 0)}`,
        p.cupMm,
        p.heightMm,
        [
          { label: "Cup", value: U(p.cupMm, units) },
          { label: "Pocket", value: U(p.pocketMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cup = p.cupMm / 2;
    const pocket = p.pocketMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: cup, y: 0 },
        { x: cup, y: p.heightMm },
        { x: pocket, y: p.heightMm },
        { x: pocket, y: p.wallMm },
        { x: 0, y: p.wallMm },
      ],
      cup,
    );
  },
  fileName: (p) => `spring-seat-${R(p.cupMm, 0)}-${R(p.pocketMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ spring cap */

export const springCap: AnyDesign = defineDesign({
  id: "spring-cap",
  name: "Spring cap",
  family: "motion",
  eyebrow: "Spigot cap",
  blurb: "A flat cap with a spigot that presses inside a spring or a tube.",
  lede: "A cap with a thin spigot below a wide head: the spigot locates inside a spring or a tube and the head closes the end and gives a flat bearing face. Spigot diameter and length are separate from the cap size, so it can be made to match the bore it has to enter.",
  use: "Closing the end of a spring, a tube or a small cylinder with a removable cap.",
  notesTitle: "How the spigot locates",
  chips: [
    { label: "Cap Ø", value: "15 – 80 mm" },
    { label: "Spigot Ø", value: "8 – 60 mm" },
    { label: "Spigot length", value: "3 – 30 mm" },
  ],
  notes: [
    "The spigot is a plain cylinder sized just under the bore it enters, and the head overhangs it so the cap stops at the end of the tube. Both features are turned in one setup, which keeps them concentric.",
    "Check the spigot against the real bore before fitting; a spigot that is too tight will split a thin tube, and one that is too loose falls out. Make the spigot a little long and trim it to suit rather than sizing it exactly first time.",
  ],
  header: "Spring Cap Designer - units: mm",
  fields: [
    { key: "cap", label: "Cap diameter", kind: "length", section: "Cap", default: "40", min: 15, max: 80 },
    { key: "height", label: "Cap thickness", kind: "length", section: "Cap", default: "8", min: 4, max: 30 },
    { key: "spigot", label: "Spigot diameter", kind: "length", section: "Spigot", default: "24", min: 8, max: 60 },
    { key: "spigotLength", label: "Spigot length", kind: "length", section: "Spigot", default: "10", min: 3, max: 30 },
  ],
  parse: (raw) => ({
    capMm: rawLength(raw, "cap"),
    heightMm: rawLength(raw, "height"),
    spigotMm: rawLength(raw, "spigot"),
    spigotLengthMm: rawLength(raw, "spigotLength"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "cap", "Cap diameter", p.capMm, 15, 80);
    pushRange(errors, units, "height", "Cap thickness", p.heightMm, 4, 30);
    pushRange(errors, units, "spigot", "Spigot diameter", p.spigotMm, 8, 60);
    pushRange(errors, units, "spigotLength", "Spigot length", p.spigotLengthMm, 3, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "cap", p.capMm, p.heightMm + p.spigotLengthMm);

    if (p.spigotMm >= p.capMm - 2) errors.push({ field: "spigot", level: "error", message: "The spigot leaves no overhanging head." });
    if (p.spigotLengthMm > p.heightMm * 3) warnings.push({ field: "spigotLength", level: "warning", message: "A long spigot is easy to snap off in a bore." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Cap Ø", value: U(p.capMm, units), source: "input" },
        { label: "Thickness", value: U(p.heightMm, units), source: "input" },
        { label: "Spigot Ø", value: U(p.spigotMm, units), source: "input" },
        { label: "Spigot length", value: U(p.spigotLengthMm, units), source: "input" },
        { label: "Overall", value: U(p.heightMm + p.spigotLengthMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.capMm, units)} head · ${U(p.spigotMm, units)} spigot`,
        `SPC${R(p.capMm, 0)}-${R(p.spigotMm, 0)}`,
        p.capMm,
        p.heightMm + p.spigotLengthMm,
        [
          { label: "Cap", value: U(p.capMm, units) },
          { label: "Spigot", value: U(p.spigotMm, units) },
          { label: "Length", value: U(p.heightMm + p.spigotLengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const cap = p.capMm / 2;
    const spigot = p.spigotMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: spigot, y: 0 },
        { x: spigot, y: p.spigotLengthMm },
        { x: cap, y: p.spigotLengthMm },
        { x: cap, y: p.spigotLengthMm + p.heightMm },
        { x: 0, y: p.spigotLengthMm + p.heightMm },
      ],
      cap,
    );
  },
  fileName: (p) => `spring-cap-${R(p.capMm, 0)}-${R(p.spigotMm, 0)}.stl`,
});

/* -------------------------------------------------------------------- plunger */

export const plunger: AnyDesign = defineDesign({
  id: "plunger",
  name: "Plunger",
  family: "motion",
  eyebrow: "Grooved rod",
  blurb: "A straight plunger with a single groove for an O-ring or a seal.",
  lede: "A plain plunger with one rectangular groove near its working end. The groove takes an O-ring or a felt seal, and the land on either side of it is long enough that the plunger does not cock in its bore when it is pushed off-centre.",
  use: "Making a sliding plunger or a piston rod for a pump, a syringe or a small damper.",
  notesTitle: "How the groove holds the seal",
  chips: [
    { label: "Plunger Ø", value: "10 – 60 mm" },
    { label: "Groove Ø", value: "8 – 50 mm" },
    { label: "Length", value: "20 – 120 mm" },
  ],
  notes: [
    "The groove is a square-section relief turned between two full-diameter lands, so a seal sits in it without being squeezed by the bore entry. The land at each end is part of the same cylinder, which keeps the plunger aligned.",
    "Turn the groove to the actual seal section and check the squeeze with a test fit; a groove that is too shallow lets the seal roll, and one that is too deep leaks. Break the lead-in edge so the seal is not cut as the plunger enters.",
  ],
  header: "Plunger Designer - units: mm",
  fields: [
    { key: "diameter", label: "Plunger diameter", kind: "length", section: "Plunger", default: "24", min: 10, max: 60 },
    { key: "length", label: "Length", kind: "length", section: "Plunger", default: "60", min: 20, max: 120 },
    { key: "groove", label: "Groove diameter", kind: "length", section: "Groove", default: "18", min: 8, max: 50 },
    { key: "grooveWidth", label: "Groove width", kind: "length", section: "Groove", default: "4", min: 1.5, max: 8 },
  ],
  parse: (raw) => ({
    diameterMm: rawLength(raw, "diameter"),
    lengthMm: rawLength(raw, "length"),
    grooveMm: rawLength(raw, "groove"),
    grooveWidthMm: rawLength(raw, "grooveWidth"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "diameter", "Plunger diameter", p.diameterMm, 10, 60);
    pushRange(errors, units, "length", "Length", p.lengthMm, 20, 120);
    pushRange(errors, units, "groove", "Groove diameter", p.grooveMm, 8, 50);
    pushRange(errors, units, "grooveWidth", "Groove width", p.grooveWidthMm, 1.5, 8);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "diameter", p.diameterMm, p.lengthMm);

    const start = p.lengthMm * 0.45;
    if (p.grooveMm >= p.diameterMm - 1) errors.push({ field: "groove", level: "error", message: "The groove does not cut into the plunger." });
    if (start + p.grooveWidthMm >= p.lengthMm - 2) errors.push({ field: "grooveWidth", level: "error", message: "The groove runs off the end." });
    if (p.grooveWidthMm > p.grooveMm * 0.6) warnings.push({ field: "grooveWidth", level: "warning", message: "A wide groove leaves little seal support." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Plunger Ø", value: U(p.diameterMm, units), source: "input" },
        { label: "Length", value: U(p.lengthMm, units), source: "input" },
        { label: "Groove Ø", value: U(p.grooveMm, units), source: "input" },
        { label: "Groove width", value: U(p.grooveWidthMm, units), source: "input" },
        { label: "Groove at", value: U(start, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.diameterMm, units)} rod · ${U(p.grooveWidthMm, units)} groove`,
        `PL${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}`,
        p.diameterMm,
        p.lengthMm,
        [
          { label: "Plunger", value: U(p.diameterMm, units) },
          { label: "Groove", value: U(p.grooveMm, units) },
          { label: "Length", value: U(p.lengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const r = p.diameterMm / 2;
    const groove = p.grooveMm / 2;
    const start = p.lengthMm * 0.45;
    return spin(
      [
        { x: 0, y: 0 },
        { x: r, y: 0 },
        { x: r, y: start },
        { x: groove, y: start },
        { x: groove, y: start + p.grooveWidthMm },
        { x: r, y: start + p.grooveWidthMm },
        { x: r, y: p.lengthMm },
        { x: 0, y: p.lengthMm },
      ],
      r,
    );
  },
  fileName: (p) => `plunger-${R(p.diameterMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ hinge pin */

export const hingePin: AnyDesign = defineDesign({
  id: "hinge-pin",
  name: "Hinge pin",
  family: "fixings",
  eyebrow: "Headed pin",
  blurb: "A headed pin with a plain shank that can be tapped out again.",
  lede: "A hinge pin with a small head at one end and a straight shank: the head stops the pin falling through the knuckle and gives a drift somewhere to push from when the hinge has to come apart. The shank is undivided so it can be reversed.",
  use: "Replacing a lost or bent pin in a cabinet hinge, a gate hinge or a removable pivot.",
  notesTitle: "How the head retains the pin",
  chips: [
    { label: "Head Ø", value: "8 – 40 mm" },
    { label: "Shank Ø", value: "4 – 30 mm" },
    { label: "Length", value: "20 – 120 mm" },
  ],
  notes: [
    "The head is a turned disc that overhangs the shank by a couple of millimetres, enough to catch on the knuckle without fouling the leaf. The shank runs straight to the far end so it can be drifted back out from the other side.",
    "Check the shank against the knuckle bore and chamfer the far end so it starts into the second knuckle. A pin that is a tight fit all the way is hard to remove later, so leave the fit to a test piece.",
  ],
  header: "Hinge Pin Designer - units: mm",
  fields: [
    { key: "head", label: "Head diameter", kind: "length", section: "Pin", default: "14", min: 8, max: 40 },
    { key: "headHeight", label: "Head height", kind: "length", section: "Pin", default: "4", min: 2, max: 10 },
    { key: "shank", label: "Shank diameter", kind: "length", section: "Shank", default: "8", min: 4, max: 30 },
    { key: "length", label: "Overall length", kind: "length", section: "Shank", default: "50", min: 20, max: 120 },
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
    pushRange(errors, units, "head", "Head diameter", p.headMm, 8, 40);
    pushRange(errors, units, "headHeight", "Head height", p.headHeightMm, 2, 10);
    pushRange(errors, units, "shank", "Shank diameter", p.shankMm, 4, 30);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 20, 120);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "head", p.headMm, p.lengthMm);

    if (p.headMm <= p.shankMm + 2) errors.push({ field: "head", level: "error", message: "The head does not overhang the shank." });
    if (p.headHeightMm >= p.lengthMm - 2) errors.push({ field: "headHeight", level: "error", message: "The head takes the whole pin." });
    if (p.lengthMm < p.shankMm * 2) warnings.push({ field: "length", level: "warning", message: "A very short hinge pin falls out easily." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Head height", value: U(p.headHeightMm, units), source: "input" },
        { label: "Shank Ø", value: U(p.shankMm, units), source: "input" },
        { label: "Overall length", value: U(p.lengthMm, units), source: "input" },
        { label: "Shank length", value: U(p.lengthMm - p.headHeightMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.shankMm, units)} shank · ${U(p.lengthMm, units)} long`,
        `HP${R(p.headMm, 0)}-${R(p.lengthMm, 0)}`,
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
  fileName: (p) => `hinge-pin-${R(p.shankMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------- bushing driver */

export const bushingDriver: AnyDesign = defineDesign({
  id: "bushing-driver",
  name: "Bushing driver",
  family: "fixings",
  eyebrow: "Press sleeve",
  blurb: "A bored driver with a shoulder that presses a bushing square.",
  lede: "A driver turned as a tube with a raised shoulder at the working end. The bore clears the shaft or the pilot, and the shoulder pushes on the bushing's outer ring so the pressing force never goes through the bearing surface.",
  use: "Pressing a bushing, a seal or a bearing race into a housing without loading its bore.",
  notesTitle: "How the shoulder presses",
  chips: [
    { label: "Body Ø", value: "20 – 100 mm" },
    { label: "Shoulder Ø", value: "24 – 120 mm" },
    { label: "Bore", value: "6 – 60 mm" },
  ],
  notes: [
    "The shoulder is a short, full-diameter land at the end of a smaller body, so the driver can be held in a chuck or by hand while the shoulder bears on the outer ring. The bore runs right through, which lets a shaft pass during the press.",
    "Face the shoulder square to the bore and keep the land narrow, because a wide shoulder can also touch the seal or the cage. Press on the outer ring only, and check the bushing starts square before applying force.",
  ],
  header: "Bushing Driver Designer - units: mm",
  fields: [
    { key: "body", label: "Body diameter", kind: "length", section: "Driver", default: "40", min: 20, max: 100 },
    { key: "length", label: "Overall length", kind: "length", section: "Driver", default: "120", min: 40, max: 200 },
    { key: "shoulder", label: "Shoulder diameter", kind: "length", section: "Shoulder", default: "50", min: 24, max: 120 },
    { key: "bore", label: "Bore", kind: "length", section: "Bore", default: "16", min: 6, max: 60 },
  ],
  parse: (raw) => ({
    bodyMm: rawLength(raw, "body"),
    lengthMm: rawLength(raw, "length"),
    shoulderMm: rawLength(raw, "shoulder"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "body", "Body diameter", p.bodyMm, 20, 100);
    pushRange(errors, units, "length", "Overall length", p.lengthMm, 40, 200);
    pushRange(errors, units, "shoulder", "Shoulder diameter", p.shoulderMm, 24, 120);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 6, 60);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "shoulder", p.shoulderMm, p.lengthMm);

    if (p.shoulderMm <= p.bodyMm + 2) errors.push({ field: "shoulder", level: "error", message: "The shoulder does not stand proud of the body." });
    if (p.boreMm >= p.bodyMm - 4) errors.push({ field: "bore", level: "error", message: "The bore leaves under 2 mm of body wall." });
    if (p.lengthMm < p.shoulderMm) warnings.push({ field: "length", level: "warning", message: "A driver shorter than its shoulder is hard to hold square." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Body Ø", value: U(p.bodyMm, units), source: "input" },
        { label: "Shoulder Ø", value: U(p.shoulderMm, units), source: "input" },
        { label: "Overall length", value: U(p.lengthMm, units), source: "input" },
        { label: "Bore", value: U(p.boreMm, units), source: "input" },
        { label: "Shoulder land", value: U(8, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.shoulderMm, units)} shoulder · ${U(p.lengthMm, units)} long`,
        `BD${R(p.bodyMm, 0)}-${R(p.shoulderMm, 0)}`,
        p.shoulderMm,
        p.lengthMm,
        [
          { label: "Body", value: U(p.bodyMm, units) },
          { label: "Shoulder", value: U(p.shoulderMm, units) },
          { label: "Bore", value: U(p.boreMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const body = p.bodyMm / 2;
    const shoulder = p.shoulderMm / 2;
    const bore = p.boreMm / 2;
    return spin(
      [
        { x: bore, y: 0 },
        { x: body, y: 0 },
        { x: body, y: p.lengthMm - 8 },
        { x: shoulder, y: p.lengthMm - 8 },
        { x: shoulder, y: p.lengthMm },
        { x: bore, y: p.lengthMm },
      ],
      shoulder,
    );
  },
  fileName: (p) => `bushing-driver-${R(p.bodyMm, 0)}-${R(p.lengthMm, 0)}.stl`,
});

/* ----------------------------------------------------------------- seal driver */

export const sealDriver: AnyDesign = defineDesign({
  id: "seal-driver",
  name: "Seal driver",
  family: "fixings",
  eyebrow: "Flat press",
  blurb: "A flat-faced driver on a turned handle for pressing a lip seal.",
  lede: "A seal driver with a broad flat face and a smaller handle, so a seal can be pressed in squarely without a hammer on the seal itself. The face diameter is kept inside the housing bore, which stops the driver from bottoming on the housing rim.",
  use: "Pressing a lip seal, a dust cap or a plug into a bore without distorting it.",
  notesTitle: "How the face presses the seal",
  chips: [
    { label: "Face Ø", value: "20 – 120 mm" },
    { label: "Face height", value: "6 – 40 mm" },
    { label: "Handle Ø", value: "10 – 50 mm" },
  ],
  notes: [
    "The face is a flat disc with a short cylindrical land, and the handle rises from its centre so force goes down the axis. Because the face is smaller than the housing bore, the driver cannot jam on the rim while the seal is still proud.",
    "Face the disc flat and square to the handle, then check it against the housing bore before use. Press slowly and watch the seal edge; a driver used at an angle shaves the seal lip and causes a leak.",
  ],
  header: "Seal Driver Designer - units: mm",
  fields: [
    { key: "face", label: "Face diameter", kind: "length", section: "Face", default: "60", min: 20, max: 120 },
    { key: "height", label: "Face height", kind: "length", section: "Face", default: "12", min: 6, max: 40 },
    { key: "handle", label: "Handle diameter", kind: "length", section: "Handle", default: "22", min: 10, max: 50 },
    { key: "handleLength", label: "Handle length", kind: "length", section: "Handle", default: "60", min: 20, max: 120 },
  ],
  parse: (raw) => ({
    faceMm: rawLength(raw, "face"),
    heightMm: rawLength(raw, "height"),
    handleMm: rawLength(raw, "handle"),
    handleLengthMm: rawLength(raw, "handleLength"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "face", "Face diameter", p.faceMm, 20, 120);
    pushRange(errors, units, "height", "Face height", p.heightMm, 6, 40);
    pushRange(errors, units, "handle", "Handle diameter", p.handleMm, 10, 50);
    pushRange(errors, units, "handleLength", "Handle length", p.handleLengthMm, 20, 120);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "face", p.faceMm, p.heightMm + p.handleLengthMm);

    if (p.handleMm >= p.faceMm - 2) errors.push({ field: "handle", level: "error", message: "The handle is as wide as the face." });
    if (p.handleLengthMm < p.handleMm) warnings.push({ field: "handleLength", level: "warning", message: "A very short handle makes the driver hard to keep square." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Face Ø", value: U(p.faceMm, units), source: "input" },
        { label: "Face height", value: U(p.heightMm, units), source: "input" },
        { label: "Handle Ø", value: U(p.handleMm, units), source: "input" },
        { label: "Handle length", value: U(p.handleLengthMm, units), source: "input" },
        { label: "Overall", value: U(p.heightMm + p.handleLengthMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.faceMm, units)} face · ${U(p.handleLengthMm, units)} handle`,
        `SD${R(p.faceMm, 0)}-${R(p.handleMm, 0)}`,
        p.faceMm,
        p.heightMm + p.handleLengthMm,
        [
          { label: "Face", value: U(p.faceMm, units) },
          { label: "Handle", value: U(p.handleMm, units) },
          { label: "Length", value: U(p.heightMm + p.handleLengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const face = p.faceMm / 2;
    const handle = p.handleMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: face, y: 0 },
        { x: face, y: p.heightMm },
        { x: handle, y: p.heightMm },
        { x: handle, y: p.heightMm + p.handleLengthMm },
        { x: 0, y: p.heightMm + p.handleLengthMm },
      ],
      face,
    );
  },
  fileName: (p) => `seal-driver-${R(p.faceMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ press disc */

export const pressDisc: AnyDesign = defineDesign({
  id: "press-disc",
  name: "Press disc",
  family: "fixings",
  eyebrow: "Stepped pad",
  blurb: "A flat disc with a locating spigot for pressing a bearing or a plug.",
  lede: "A press pad made as a wide disc with a short spigot on one face. The spigot enters the bore you are pressing into and keeps the pad centred, while the disc face spreads the force over the whole rim rather than one edge.",
  use: "Pressing a bearing, a plug or a disc into a bore while keeping the pad centred.",
  notesTitle: "How the spigot keeps it centred",
  chips: [
    { label: "Disc Ø", value: "20 – 140 mm" },
    { label: "Spigot Ø", value: "10 – 100 mm" },
    { label: "Spigot height", value: "2 – 30 mm" },
  ],
  notes: [
    "The spigot is a short cylinder on the pressing face, sized just under the bore it locates in. Because it enters the bore before the disc face touches the rim, the pad stays centred through the press.",
    "Turn the spigot and the disc face in one setup and check the spigot against the real bore. Keep the spigot short: a long spigot bottoms out before the disc face has pressed the part home.",
  ],
  header: "Press Disc Designer - units: mm",
  fields: [
    { key: "disc", label: "Disc diameter", kind: "length", section: "Disc", default: "60", min: 20, max: 140 },
    { key: "thickness", label: "Disc thickness", kind: "length", section: "Disc", default: "10", min: 4, max: 30 },
    { key: "spigot", label: "Spigot diameter", kind: "length", section: "Spigot", default: "40", min: 10, max: 100 },
    { key: "spigotHeight", label: "Spigot height", kind: "length", section: "Spigot", default: "8", min: 2, max: 30 },
  ],
  parse: (raw) => ({
    discMm: rawLength(raw, "disc"),
    thicknessMm: rawLength(raw, "thickness"),
    spigotMm: rawLength(raw, "spigot"),
    spigotHeightMm: rawLength(raw, "spigotHeight"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "disc", "Disc diameter", p.discMm, 20, 140);
    pushRange(errors, units, "thickness", "Disc thickness", p.thicknessMm, 4, 30);
    pushRange(errors, units, "spigot", "Spigot diameter", p.spigotMm, 10, 100);
    pushRange(errors, units, "spigotHeight", "Spigot height", p.spigotHeightMm, 2, 30);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "disc", p.discMm, p.thicknessMm + p.spigotHeightMm);

    if (p.spigotMm >= p.discMm - 2) errors.push({ field: "spigot", level: "error", message: "The spigot leaves no disc face." });
    if (p.spigotHeightMm > p.thicknessMm * 2) warnings.push({ field: "spigotHeight", level: "warning", message: "A long spigot reaches the part before the face does." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Disc Ø", value: U(p.discMm, units), source: "input" },
        { label: "Thickness", value: U(p.thicknessMm, units), source: "input" },
        { label: "Spigot Ø", value: U(p.spigotMm, units), source: "input" },
        { label: "Spigot height", value: U(p.spigotHeightMm, units), source: "input" },
        { label: "Bearing face", value: U((p.discMm - p.spigotMm) / 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.discMm, units)} disc · ${U(p.spigotMm, units)} spigot`,
        `PD${R(p.discMm, 0)}-${R(p.spigotMm, 0)}`,
        p.discMm,
        p.thicknessMm + p.spigotHeightMm,
        [
          { label: "Disc", value: U(p.discMm, units) },
          { label: "Spigot", value: U(p.spigotMm, units) },
          { label: "Thickness", value: U(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const disc = p.discMm / 2;
    const spigot = p.spigotMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: spigot, y: 0 },
        { x: spigot, y: p.spigotHeightMm },
        { x: disc, y: p.spigotHeightMm },
        { x: disc, y: p.spigotHeightMm + p.thicknessMm },
        { x: 0, y: p.spigotHeightMm + p.thicknessMm },
      ],
      disc,
    );
  },
  fileName: (p) => `press-disc-${R(p.discMm, 0)}-${R(p.thicknessMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ bench dog */

export const benchDog: AnyDesign = defineDesign({
  id: "bench-dog",
  name: "Bench dog",
  family: "fixings",
  eyebrow: "Bench stop",
  blurb: "A post with a collar that stops a bench dog falling through the top.",
  lede: "A bench dog turned as a plain post with a raised collar near the top. The collar bears on the bench surface and stops the dog dropping through its hole, while the post below grips the hole and the end above gives a work stop.",
  use: "Holding a board against a bench stop for planing, or as a low peg in a dog hole.",
  notesTitle: "How the collar sits on the bench",
  chips: [
    { label: "Post Ø", value: "8 – 30 mm" },
    { label: "Collar Ø", value: "12 – 50 mm" },
    { label: "Post length", value: "30 – 120 mm" },
  ],
  notes: [
    "The post runs from a chamfered foot up through the collar to a flat top, so the dog can be dropped into a hole and will stop at a repeatable height. The collar is a short full-diameter land rather than a separate ring, so it cannot work loose.",
    "Make the post a light push fit in the actual dog hole and sand a slight taper on the foot if it binds. Keep the top flat and square; a dog that leans pushes the work out of line as it is planed.",
  ],
  header: "Bench Dog Designer - units: mm",
  fields: [
    { key: "post", label: "Post diameter", kind: "length", section: "Dog", default: "16", min: 8, max: 30 },
    { key: "postLength", label: "Post length", kind: "length", section: "Dog", default: "60", min: 30, max: 120 },
    { key: "collar", label: "Collar diameter", kind: "length", section: "Collar", default: "24", min: 12, max: 50 },
    { key: "collarThickness", label: "Collar thickness", kind: "length", section: "Collar", default: "6", min: 3, max: 15 },
  ],
  parse: (raw) => ({
    postMm: rawLength(raw, "post"),
    postLengthMm: rawLength(raw, "postLength"),
    collarMm: rawLength(raw, "collar"),
    collarThicknessMm: rawLength(raw, "collarThickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "post", "Post diameter", p.postMm, 8, 30);
    pushRange(errors, units, "postLength", "Post length", p.postLengthMm, 30, 120);
    pushRange(errors, units, "collar", "Collar diameter", p.collarMm, 12, 50);
    pushRange(errors, units, "collarThickness", "Collar thickness", p.collarThicknessMm, 3, 15);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "collar", p.collarMm, p.postLengthMm);

    if (p.collarMm <= p.postMm + 2) errors.push({ field: "collar", level: "error", message: "The collar does not stand proud of the post." });
    if (p.collarThicknessMm >= p.postLengthMm) errors.push({ field: "collarThickness", level: "error", message: "The collar is as long as the post." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Post Ø", value: U(p.postMm, units), source: "input" },
        { label: "Post length", value: U(p.postLengthMm, units), source: "input" },
        { label: "Collar Ø", value: U(p.collarMm, units), source: "input" },
        { label: "Collar", value: U(p.collarThicknessMm, units), source: "input" },
        { label: "Above bench", value: U(p.collarThicknessMm + 10, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.postMm, units)} post · ${U(p.collarMm, units)} collar`,
        `BG${R(p.postMm, 0)}-${R(p.postLengthMm, 0)}`,
        p.collarMm,
        p.postLengthMm,
        [
          { label: "Post", value: U(p.postMm, units) },
          { label: "Collar", value: U(p.collarMm, units) },
          { label: "Length", value: U(p.postLengthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const post = p.postMm / 2;
    const collar = p.collarMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: post, y: 0 },
        { x: post, y: p.postLengthMm - p.collarThicknessMm },
        { x: collar, y: p.postLengthMm - p.collarThicknessMm },
        { x: collar, y: p.postLengthMm },
        { x: 0, y: p.postLengthMm },
      ],
      collar,
    );
  },
  fileName: (p) => `bench-dog-${R(p.postMm, 0)}-${R(p.postLengthMm, 0)}.stl`,
});

/* ------------------------------------------------------------------ hole plug */

export const holePlug: AnyDesign = defineDesign({
  id: "hole-plug",
  name: "Hole plug",
  family: "fixings",
  eyebrow: "Push plug",
  blurb: "A shouldered plug that closes a round hole with a flat head.",
  lede: "A push plug with a short spigot that enters a hole and a wider head that sits flat on the surface. The spigot and head meet at a square shoulder, so the plug stops at a repeatable depth instead of sinking through.",
  use: "Closing an unused round hole in a panel, a bracket or a piece of furniture.",
  notesTitle: "How the shoulder stops the plug",
  chips: [
    { label: "Head Ø", value: "10 – 60 mm" },
    { label: "Plug Ø", value: "8 – 50 mm" },
    { label: "Height", value: "4 – 20 mm" },
  ],
  notes: [
    "The spigot is a plain cylinder sized just under the hole, and the head overhangs it to bear on the panel face. Because the transition is a square shoulder rather than a taper, the plug sits at the same height every time it is pushed in.",
    "Check the spigot against the actual hole and make a trial plug in scrap; a spigot that is too tight splits, and one that is too loose works out. Keep the head face flat so it can be sanded flush if the panel is to be finished.",
  ],
  header: "Hole Plug Designer - units: mm",
  fields: [
    { key: "head", label: "Head diameter", kind: "length", section: "Plug", default: "24", min: 10, max: 60 },
    { key: "plug", label: "Plug diameter", kind: "length", section: "Plug", default: "18", min: 8, max: 50 },
    { key: "height", label: "Overall height", kind: "length", section: "Plug", default: "10", min: 4, max: 20 },
  ],
  parse: (raw) => ({
    headMm: rawLength(raw, "head"),
    plugMm: rawLength(raw, "plug"),
    heightMm: rawLength(raw, "height"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "head", "Head diameter", p.headMm, 10, 60);
    pushRange(errors, units, "plug", "Plug diameter", p.plugMm, 8, 50);
    pushRange(errors, units, "height", "Overall height", p.heightMm, 4, 20);
    if (errors.length > 0) return emptyResult(errors, warnings);
    checkSize(errors, units, "head", p.headMm, p.heightMm);

    if (p.plugMm >= p.headMm - 2) errors.push({ field: "plug", level: "error", message: "The head does not overhang the plug." });
    if (p.heightMm * 0.55 < 1.5) warnings.push({ field: "height", level: "warning", message: "The plug is too short to grip a panel." });

    return {
      errors,
      warnings,
      readout: [
        { label: "Head Ø", value: U(p.headMm, units), source: "input" },
        { label: "Plug Ø", value: U(p.plugMm, units), source: "input" },
        { label: "Height", value: U(p.heightMm, units), source: "input" },
        { label: "Head thickness", value: U(p.heightMm * 0.45, units), source: "calc" },
        { label: "Spigot length", value: U(p.heightMm * 0.55, units), source: "calc" },
      ],
      preview: previewOf(
        `${U(p.headMm, units)} head · ${U(p.plugMm, units)} spigot`,
        `HG${R(p.headMm, 0)}-${R(p.plugMm, 0)}`,
        p.headMm,
        p.heightMm,
        [
          { label: "Head", value: U(p.headMm, units) },
          { label: "Plug", value: U(p.plugMm, units) },
          { label: "Height", value: U(p.heightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const head = p.headMm / 2;
    const plug = p.plugMm / 2;
    return spin(
      [
        { x: 0, y: 0 },
        { x: plug, y: 0 },
        { x: plug, y: p.heightMm * 0.55 },
        { x: head, y: p.heightMm * 0.55 },
        { x: head, y: p.heightMm },
        { x: 0, y: p.heightMm },
      ],
      head,
    );
  },
  fileName: (p) => `hole-plug-${R(p.headMm, 0)}-${R(p.heightMm, 0)}.stl`,
});

export const revolveFittings: AnyDesign[] = [
  wristPin,
  crownedRoller,
  idlerWheel,
  guideRoller,
  plainBushing,
  flangedSleeve,
  spacerStack,
  springSeat,
  springCap,
  plunger,
  hingePin,
  bushingDriver,
  sealDriver,
  pressDisc,
  benchDog,
  holePlug,
];
