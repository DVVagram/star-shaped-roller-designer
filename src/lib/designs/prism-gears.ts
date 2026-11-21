/** Gears, timing pulleys and indexing mechanisms. */

import { buildPrism } from "@/lib/kit/prism";
import {
  BUILD_VOLUME_MM,
  MIN_WALL_MM,
  TWO_PI,
  boreOutline,
  formatMeasure,
  formatNumber,
  type LengthUnit,
  type Point2D,
} from "@/lib/kit/units";

import {
  genevaOutline,
  internalGearCavity,
  involuteGearGeometry,
  involuteGearOutline,
  rackGeometry,
  rackOutline,
  ratchetOutline,
  toothedRing,
} from "./geometry";
import {
  defineDesign,
  previewOf,
  pushInteger,
  pushRange,
  pushWarning,
  rawCount,
  rawLength,
  rawNumber,
  rawOption,
  type AnyDesign,
  type DesignIssue,
  type DesignResult,
} from "./types";

const measure = (value: number, units: LengthUnit) => formatMeasure(value, units);
const round = (value: number, decimals = 2) => formatNumber(value, decimals);

function checkSize(
  errors: DesignIssue[],
  units: LengthUnit,
  field: string,
  diameterMm: number,
  heightMm: number,
): boolean {
  let ok = true;
  if (diameterMm > BUILD_VOLUME_MM.x + 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `${measure(diameterMm, units)} across does not fit the 180 mm bed.`,
    });
    ok = false;
  }
  if (heightMm > BUILD_VOLUME_MM.z + 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `${measure(heightMm, units)} tall does not fit the 180 mm build height.`,
    });
    ok = false;
  }
  return ok;
}

function checkWall(
  errors: DesignIssue[],
  units: LengthUnit,
  field: string,
  label: string,
  wallMm: number,
): boolean {
  if (wallMm < MIN_WALL_MM - 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `Only ${measure(Math.max(0, wallMm), units)} of ${label}; keep at least ${measure(
        MIN_WALL_MM,
        units,
      )}.`,
    });
    return false;
  }
  return true;
}

function boreHoles(boreMm: number) {
  return [boreOutline({ boreMm, boreShape: "round" })];
}

/* ------------------------------------------------------------------ spur */

export const spurGear: AnyDesign = defineDesign({
  id: "spur-gear",
  name: "Spur gear",
  family: "drives",
  eyebrow: "True involute",
  blurb: "A parallel-shaft gear with real involute flanks and a set centre distance.",
  lede: "Module and tooth count set the pitch diameter; the flanks are the involute of the base circle, not a stylised triangle. Addendum, dedendum and backlash are editable, so the gear can be matched to a measured mate.",
  chips: [
    { label: "Teeth", value: "6 – 120" },
    { label: "Module", value: "0.5 – 6 mm" },
    { label: "Pressure angle", value: "14.5 – 25°" },
  ],
  notes: [
    "Tooth thickness at the pitch circle is πm/2 minus the backlash. At any radius r the half tooth angle is ψp + inv(α) − inv(αr), where inv is tan α − α, so the flank is generated rather than drawn. Below the base circle the involute does not exist, so the flank runs radially down to the root — the usual full-depth simplification.",
    "Two gears mesh when they share a module and pressure angle. Their centre distance is (m/2)(N₁ + N₂); add a little backlash for a printed pair, because a printed tooth is wider than its drawing after the first layer squashes out.",
  ],
  header: "Spur Gear Designer - units: mm",
  fields: [
    { key: "teeth", label: "Teeth", kind: "count", section: "Gear", default: "18", min: 6, max: 120 },
    { key: "module", label: "Module", kind: "length", section: "Gear", default: "2", min: 0.5, max: 6, hint: "Pitch diameter per tooth: PD = module × teeth." },
    { key: "pressureAngle", label: "Pressure angle", kind: "number", section: "Gear", default: "20", min: 14.5, max: 25, hint: "Degrees. 20° is the modern standard." },
    { key: "faceWidth", label: "Face width", kind: "length", section: "Gear", default: "8", min: 2, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Gear", default: "8", min: 0.8, max: 120 },
    { key: "addendum", label: "Addendum", kind: "length", section: "Tooth", default: "2", min: 0.2, max: 8 },
    { key: "dedendum", label: "Dedendum", kind: "length", section: "Tooth", default: "2.5", min: 0.2, max: 10 },
    { key: "backlash", label: "Backlash", kind: "length", section: "Tooth", default: "0.15", min: 0, max: 2, hint: "Total tooth thinning at the pitch circle." },
  ],
  parse: (raw) => ({
    teeth: rawCount(raw, "teeth"),
    moduleMm: rawLength(raw, "module"),
    pressureAngleDeg: rawNumber(raw, "pressureAngle"),
    faceWidthMm: rawLength(raw, "faceWidth"),
    boreMm: rawLength(raw, "bore"),
    addendumMm: rawLength(raw, "addendum"),
    dedendumMm: rawLength(raw, "dedendum"),
    backlashMm: rawLength(raw, "backlash"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "teeth", "Teeth", p.teeth, 6, 120);
    pushRange(errors, units, "module", "Module", p.moduleMm, 0.5, 6);
    pushRange(errors, units, "pressureAngle", "Pressure angle", p.pressureAngleDeg, 14.5, 25, false);
    pushRange(errors, units, "faceWidth", "Face width", p.faceWidthMm, 2, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 0.8, 120);
    pushRange(errors, units, "addendum", "Addendum", p.addendumMm, 0.2, 8);
    pushRange(errors, units, "dedendum", "Dedendum", p.dedendumMm, 0.2, 10);
    pushRange(errors, units, "backlash", "Backlash", p.backlashMm, 0, 2);

    if (errors.length > 0) {
      return emptyResult(errors, warnings);
    }

    const g = involuteGearGeometry(p);
    checkSize(errors, units, "module", g.tipRadiusMm * 2, p.faceWidthMm);
    checkWall(errors, units, "bore", "rim inside the root circle", g.rootRadiusMm - p.boreMm / 2);
    if (g.tipRadiusMm <= g.rootRadiusMm) {
      errors.push({ field: "dedendum", level: "error", message: "The dedendum reaches past the tooth tips." });
    }
    if (g.pointed) {
      warnings.push({
        field: "addendum",
        level: "warning",
        message: `The flanks meet at ${measure(g.pointedRadiusMm * 2, units)} — the tooth tips are pointed.`,
      });
    }
    if (p.faceWidthMm < 3) {
      pushWarning(warnings, "faceWidth", "Under 3 mm wide the teeth are weak in bending.");
    }

    return {
      errors,
      warnings,
      readout: [
        { label: "Teeth", value: String(g.teeth), source: "input" },
        { label: "Module", value: measure(g.moduleMm, units), source: "input" },
        { label: "Pitch Ø", value: measure(g.pitchDiameterMm, units), source: "calc" },
        { label: "Tip Ø", value: measure(g.tipRadiusMm * 2, units), source: "calc" },
        { label: "Root Ø", value: measure(g.rootRadiusMm * 2, units), source: "calc" },
        { label: "Base Ø", value: measure(g.baseRadiusMm * 2, units), source: "calc" },
        { label: "Circular pitch", value: measure(g.circularPitchMm, units), source: "calc" },
        { label: "Tooth thickness", value: measure(g.toothThicknessAtPitchMm, units), source: "calc" },
        { label: "Whole depth", value: measure(g.wholeDepthMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${g.teeth} teeth · module ${round(g.moduleMm, 2)}`,
        `SG${g.teeth}-${round(g.moduleMm, 1)}`,
        g.tipRadiusMm * 2,
        p.faceWidthMm,
        [
          { label: "Pitch Ø", value: measure(g.pitchDiameterMm, units) },
          { label: "Tip Ø", value: measure(g.tipRadiusMm * 2, units) },
          { label: "Face", value: measure(p.faceWidthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = involuteGearOutline(p);
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.faceWidthMm,
    });
  },
  fileName: (p) => `spur-gear-m${round(p.moduleMm, 2)}-${Math.round(p.teeth)}t.stl`,
});

/* -------------------------------------------------------------- internal */

export const internalGear: AnyDesign = defineDesign({
  id: "internal-gear",
  name: "Internal ring gear",
  family: "drives",
  eyebrow: "Teeth inward",
  blurb: "A ring gear whose involute cavity meshes with an external pinion.",
  lede: "An internal gear is a rim with the teeth cut on the inside. The cavity is generated from the same involute as an external tooth, so the ring engages a standard pinion of the same module and pressure angle — and the rim stays outside the cavity floor.",
  chips: [
    { label: "Teeth", value: "16 – 120" },
    { label: "Module", value: "0.5 – 5 mm" },
    { label: "Rim", value: "2 – 30 mm" },
  ],
  notes: [
    "The empty space is what meshes, so its half-width at radius r is ψp + inv(α) − inv(αr). That narrows as the radius grows, which is why an internal tooth is wide at its inward tip and narrow at the rim-side root. The rim is a plain circle outside the cavity floor, so the ring has one continuous outer wall.",
    "Internal pairs run in the same direction and need a smaller centre distance than the equivalent external pair: it is (m/2)(N_ring − N_pinion). Print a small test pair first — the clearance is less forgiving than on an external set.",
  ],
  header: "Internal Ring Gear Designer - units: mm",
  fields: [
    { key: "teeth", label: "Teeth", kind: "count", section: "Ring", default: "40", min: 16, max: 120 },
    { key: "module", label: "Module", kind: "length", section: "Ring", default: "1.5", min: 0.5, max: 5 },
    { key: "pressureAngle", label: "Pressure angle", kind: "number", section: "Ring", default: "20", min: 14.5, max: 25 },
    { key: "rimWidth", label: "Rim width", kind: "length", section: "Ring", default: "6", min: 2, max: 30, hint: "Radial wall outside the cavity floor." },
    { key: "faceWidth", label: "Face width", kind: "length", section: "Ring", default: "8", min: 2, max: 40 },
    { key: "addendum", label: "Addendum (inward)", kind: "length", section: "Tooth", default: "1.5", min: 0.2, max: 6 },
    { key: "dedendum", label: "Dedendum (outward)", kind: "length", section: "Tooth", default: "1.875", min: 0.2, max: 8 },
    { key: "backlash", label: "Backlash", kind: "length", section: "Tooth", default: "0.15", min: 0, max: 2 },
  ],
  parse: (raw) => ({
    teeth: rawCount(raw, "teeth"),
    moduleMm: rawLength(raw, "module"),
    pressureAngleDeg: rawNumber(raw, "pressureAngle"),
    rimWidthMm: rawLength(raw, "rimWidth"),
    faceWidthMm: rawLength(raw, "faceWidth"),
    addendumMm: rawLength(raw, "addendum"),
    dedendumMm: rawLength(raw, "dedendum"),
    backlashMm: rawLength(raw, "backlash"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "teeth", "Teeth", p.teeth, 16, 120);
    pushRange(errors, units, "module", "Module", p.moduleMm, 0.5, 5);
    pushRange(errors, units, "pressureAngle", "Pressure angle", p.pressureAngleDeg, 14.5, 25, false);
    pushRange(errors, units, "rimWidth", "Rim width", p.rimWidthMm, 2, 30);
    pushRange(errors, units, "faceWidth", "Face width", p.faceWidthMm, 2, 40);
    pushRange(errors, units, "addendum", "Addendum", p.addendumMm, 0.2, 6);
    pushRange(errors, units, "dedendum", "Dedendum", p.dedendumMm, 0.2, 8);
    pushRange(errors, units, "backlash", "Backlash", p.backlashMm, 0, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const g = involuteGearGeometry(p);
    const cavityFloor = g.pitchRadiusMm + p.dedendumMm;
    const outer = cavityFloor + p.rimWidthMm;
    checkSize(errors, units, "module", outer * 2, p.faceWidthMm);
    if (outer - cavityFloor < MIN_WALL_MM) {
      errors.push({ field: "rimWidth", level: "error", message: "The rim is thinner than a printable wall." });
    }
    if (p.addendumMm >= g.pitchRadiusMm * 0.6) {
      errors.push({ field: "addendum", level: "error", message: "The inward addendum reaches the axis." });
    }
    // The cavity is an involute, so it only exists outside the base circle and
    // its tooth thins as the radius grows. Beyond either limit the outline
    // crosses itself and the ring will not close.
    const alpha = (p.pressureAngleDeg * Math.PI) / 180;
    const baseRadius = g.pitchRadiusMm * Math.cos(alpha);
    const inv = (a: number) => Math.tan(a) - a;
    const halfAngleAt = (radius: number) =>
      Math.PI / (2 * g.teeth) +
      inv(alpha) -
      inv(Math.acos(Math.min(1, baseRadius / Math.max(radius, baseRadius + 1e-6)))) -
      p.backlashMm / (2 * Math.max(radius, 1e-6));
    const cavityTip = g.pitchRadiusMm - p.addendumMm;
    if (cavityTip <= baseRadius + 0.02) {
      errors.push({ field: "addendum", level: "error", message: "This addendum cuts inside the involute base circle; shorten it or use a larger module." });
    } else if (halfAngleAt(cavityTip) < 0.004) {
      errors.push({ field: "addendum", level: "error", message: "The backlash or addendum leaves no tooth at the cavity tip." });
    }
    if (halfAngleAt(cavityFloor) < 0.004) {
      errors.push({ field: "dedendum", level: "error", message: "The cavity floor closes the teeth; reduce the dedendum, backlash or module." });
    }
    if (p.rimWidthMm < 3) pushWarning(warnings, "rimWidth", "A thin ring distorts when it comes off the bed.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Teeth", value: String(g.teeth), source: "input" },
        { label: "Pitch Ø", value: measure(g.pitchDiameterMm, units), source: "calc" },
        { label: "Cavity tip Ø", value: measure((g.pitchRadiusMm - p.addendumMm) * 2, units), source: "calc" },
        { label: "Cavity floor Ø", value: measure(cavityFloor * 2, units), source: "calc" },
        { label: "Outside Ø", value: measure(outer * 2, units), source: "calc" },
        { label: "Rim width", value: measure(p.rimWidthMm, units), source: "input" },
        { label: "Circular pitch", value: measure(g.circularPitchMm, units), source: "calc" },
        { label: "Tooth depth", value: measure(p.addendumMm + p.dedendumMm, units), source: "calc" },
      ],
      preview: previewOf(
        `${g.teeth} internal teeth · module ${round(g.moduleMm, 2)}`,
        `IG${g.teeth}-${round(g.moduleMm, 1)}`,
        outer * 2,
        p.faceWidthMm,
        [
          { label: "Outside Ø", value: measure(outer * 2, units) },
          { label: "Pitch Ø", value: measure(g.pitchDiameterMm, units) },
          { label: "Rim", value: measure(p.rimWidthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const rimRadius = involuteGearGeometry(p).pitchRadiusMm + p.dedendumMm + p.rimWidthMm;
    const outline = circle(rimRadius);
    const cavity = internalGearCavity(p);
    return buildPrism({
      rings: [outline, outline],
      holes: [cavity],
      thicknessMm: p.faceWidthMm,
    });
  },
  fileName: (p) => `internal-gear-m${round(p.moduleMm, 2)}-${Math.round(p.teeth)}t.stl`,
});

/* ---------------------------------------------------------------- helical */

export const helicalGear: AnyDesign = defineDesign({
  id: "helical-gear",
  name: "Helical gear",
  family: "drives",
  eyebrow: "Twisted teeth",
  blurb: "An involute gear whose teeth follow a helix across the face.",
  lede: "The same involute section is rotated slice by slice, so each flank is a true helicoid. Enter the helix angle and the designer works out the twist and the lead; a small axial contact ratio is reported so you can see how smooth the mesh will be.",
  chips: [
    { label: "Teeth", value: "8 – 80" },
    { label: "Helix", value: "5 – 40°" },
    { label: "Module", value: "0.5 – 5 mm" },
  ],
  notes: [
    "A helix angle β advances the tooth by faceWidth · tan β across the face. Divided by the pitch radius that is the total twist in radians; the designer stacks enough rotated sections that no band twists more than 1.5°, which is what keeps the flank smooth instead of a stair.",
    "Helical gears are quieter because the contact rolls across the face instead of engaging all at once. They also push a thrust load along the shaft, so a printed pair needs a shoulder or a bearing that can take it.",
  ],
  header: "Helical Gear Designer - units: mm",
  fields: [
    { key: "teeth", label: "Teeth", kind: "count", section: "Gear", default: "18", min: 8, max: 80 },
    { key: "module", label: "Module", kind: "length", section: "Gear", default: "2", min: 0.5, max: 5 },
    { key: "pressureAngle", label: "Pressure angle", kind: "number", section: "Gear", default: "20", min: 14.5, max: 25 },
    { key: "helixAngle", label: "Helix angle", kind: "number", section: "Gear", default: "20", min: 5, max: 40 },
    { key: "faceWidth", label: "Face width", kind: "length", section: "Gear", default: "10", min: 2, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Gear", default: "8", min: 0.8, max: 120 },
    { key: "addendum", label: "Addendum", kind: "length", section: "Tooth", default: "2", min: 0.2, max: 8 },
    { key: "dedendum", label: "Dedendum", kind: "length", section: "Tooth", default: "2.5", min: 0.2, max: 10 },
    { key: "backlash", label: "Backlash", kind: "length", section: "Tooth", default: "0.15", min: 0, max: 2 },
  ],
  parse: (raw) => ({
    teeth: rawCount(raw, "teeth"),
    moduleMm: rawLength(raw, "module"),
    pressureAngleDeg: rawNumber(raw, "pressureAngle"),
    helixAngleDeg: rawNumber(raw, "helixAngle"),
    faceWidthMm: rawLength(raw, "faceWidth"),
    boreMm: rawLength(raw, "bore"),
    addendumMm: rawLength(raw, "addendum"),
    dedendumMm: rawLength(raw, "dedendum"),
    backlashMm: rawLength(raw, "backlash"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "teeth", "Teeth", p.teeth, 8, 80);
    pushRange(errors, units, "module", "Module", p.moduleMm, 0.5, 5);
    pushRange(errors, units, "pressureAngle", "Pressure angle", p.pressureAngleDeg, 14.5, 25, false);
    pushRange(errors, units, "helixAngle", "Helix angle", p.helixAngleDeg, 5, 40, false);
    pushRange(errors, units, "faceWidth", "Face width", p.faceWidthMm, 2, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 0.8, 120);
    pushRange(errors, units, "addendum", "Addendum", p.addendumMm, 0.2, 8);
    pushRange(errors, units, "dedendum", "Dedendum", p.dedendumMm, 0.2, 10);
    pushRange(errors, units, "backlash", "Backlash", p.backlashMm, 0, 2);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const g = involuteGearGeometry(p);
    const beta = (p.helixAngleDeg * Math.PI) / 180;
    const twist = (p.faceWidthMm * Math.tan(beta)) / g.pitchRadiusMm;
    const lead = (TWO_PI * g.pitchRadiusMm) / Math.tan(beta);
    const axialPitch = g.circularPitchMm / Math.tan(beta);
    const contactRatio = (p.faceWidthMm * Math.tan(beta)) / g.circularPitchMm;
    checkSize(errors, units, "module", g.tipRadiusMm * 2, p.faceWidthMm);
    checkWall(errors, units, "bore", "rim inside the root circle", g.rootRadiusMm - p.boreMm / 2);
    if (twist > Math.PI) {
      errors.push({
        field: "helixAngle",
        level: "error",
        message: "That helix turns the tooth more than half a revolution across the face — reduce the angle or the face width.",
      });
    }
    if (contactRatio < 1) {
      pushWarning(warnings, "faceWidth", `Axial contact ratio ${round(contactRatio, 2)} — widen the face for a smooth mesh.`);
    }

    return {
      errors,
      warnings,
      readout: [
        { label: "Teeth", value: String(g.teeth), source: "input" },
        { label: "Pitch Ø", value: measure(g.pitchDiameterMm, units), source: "calc" },
        { label: "Tip Ø", value: measure(g.tipRadiusMm * 2, units), source: "calc" },
        { label: "Helix", value: `${round(p.helixAngleDeg, 1)}°`, source: "input" },
        { label: "Total twist", value: `${round((twist * 180) / Math.PI, 1)}°`, source: "calc" },
        { label: "Lead", value: measure(lead, units), source: "calc" },
        { label: "Axial pitch", value: measure(axialPitch, units), source: "calc" },
        { label: "Axial contact", value: round(contactRatio, 2), source: "calc" },
      ],
      preview: previewOf(
        `${g.teeth} teeth · ${round(p.helixAngleDeg, 0)}° helix`,
        `HG${g.teeth}-${round(p.helixAngleDeg, 0)}`,
        g.tipRadiusMm * 2,
        p.faceWidthMm,
        [
          { label: "Pitch Ø", value: measure(g.pitchDiameterMm, units) },
          { label: "Twist", value: `${round((twist * 180) / Math.PI, 1)}°` },
          { label: "Face", value: measure(p.faceWidthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = involuteGearOutline(p);
    const g = involuteGearGeometry(p);
    const beta = (p.helixAngleDeg * Math.PI) / 180;
    const twist = (p.faceWidthMm * Math.tan(beta)) / g.pitchRadiusMm;
    const slices = Math.max(3, Math.min(48, Math.ceil(twist / ((1.5 * Math.PI) / 180)) + 1));
    const rings: Point2D[][] = [];
    for (let k = 0; k < slices; k += 1) {
      const angle = (twist * k) / (slices - 1);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      rings.push(outline.map((point) => ({ x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos })));
    }
    return buildPrism({
      rings,
      holes: boreHoles(p.boreMm),
      thicknessMm: p.faceWidthMm,
    });
  },
  fileName: (p) => `helical-gear-m${round(p.moduleMm, 2)}-${Math.round(p.teeth)}t-${Math.round(p.helixAngleDeg)}h.stl`,
});

/* ------------------------------------------------------------------- rack */

export const rack: AnyDesign = defineDesign({
  id: "rack",
  name: "Gear rack",
  family: "drives",
  eyebrow: "Straight toothed bar",
  blurb: "The straight rack that meshes with a spur gear of the same module.",
  lede: "A rack's flanks are straight lines at the pressure angle, which makes it the exact linear case of the involute system. Set the module, tooth count and bar height and the tooth spacing follows; the readout reports the travel per pinion revolution.",
  chips: [
    { label: "Teeth", value: "4 – 40" },
    { label: "Module", value: "0.5 – 5 mm" },
    { label: "Bar", value: "3 – 40 mm" },
  ],
  notes: [
    "The rack pitch is πm and each tooth is centred on a half-pitch, with straight flanks at the pressure angle. At the pitch line the tooth is πm/2 wide minus backlash; it narrows by tan α per millimetre of addendum and widens by the same per millimetre of dedendum.",
    "A rack converts rotation into travel: one pinion turn moves it by πmN. Mount it with the tooth line parallel to the motion — a rack that is skew to its guide binds on one flank.",
  ],
  header: "Gear Rack Designer - units: mm",
  fields: [
    { key: "teeth", label: "Teeth", kind: "count", section: "Rack", default: "12", min: 4, max: 40 },
    { key: "module", label: "Module", kind: "length", section: "Rack", default: "2", min: 0.5, max: 5 },
    { key: "pressureAngle", label: "Pressure angle", kind: "number", section: "Rack", default: "20", min: 14.5, max: 25 },
    { key: "backlash", label: "Backlash", kind: "length", section: "Rack", default: "0.15", min: 0, max: 2 },
    { key: "baseHeight", label: "Bar under the roots", kind: "length", section: "Rack", default: "10", min: 3, max: 40 },
    { key: "width", label: "Face width", kind: "length", section: "Rack", default: "10", min: 2, max: 40 },
  ],
  parse: (raw) => ({
    teeth: rawCount(raw, "teeth"),
    moduleMm: rawLength(raw, "module"),
    pressureAngleDeg: rawNumber(raw, "pressureAngle"),
    backlashMm: rawLength(raw, "backlash"),
    baseHeightMm: rawLength(raw, "baseHeight"),
    widthMm: rawLength(raw, "width"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "teeth", "Teeth", p.teeth, 4, 40);
    pushRange(errors, units, "module", "Module", p.moduleMm, 0.5, 5);
    pushRange(errors, units, "pressureAngle", "Pressure angle", p.pressureAngleDeg, 14.5, 25, false);
    pushRange(errors, units, "backlash", "Backlash", p.backlashMm, 0, 2);
    pushRange(errors, units, "baseHeight", "Bar height", p.baseHeightMm, 3, 40);
    pushRange(errors, units, "width", "Face width", p.widthMm, 2, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const g = rackGeometry(p);
    checkSize(errors, units, "teeth", g.lengthMm, p.widthMm);
    if (g.tipHalfThicknessMm <= 0) {
      errors.push({ field: "module", level: "error", message: "The pressure-angle flanks meet before the tooth tip — reduce the module or backlash." });
    }
    if (g.rootHalfThicknessMm * 2 >= g.pitchMm) {
      errors.push({ field: "backlash", level: "error", message: "The teeth overlap at the root line." });
    }
    if (g.lengthMm > BUILD_VOLUME_MM.x) {
      errors.push({ field: "teeth", level: "error", message: "The rack is longer than the 180 mm bed." });
    }
    if (p.baseHeightMm < g.toothHeightMm) pushWarning(warnings, "baseHeight", "The bar is thinner than the tooth depth.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Teeth", value: String(Math.round(p.teeth)), source: "input" },
        { label: "Pitch", value: measure(g.pitchMm, units), source: "calc" },
        { label: "Length", value: measure(g.lengthMm, units), source: "calc" },
        { label: "Tooth height", value: measure(g.toothHeightMm, units), source: "calc" },
        { label: "Tip thickness", value: measure(g.tipHalfThicknessMm * 2, units), source: "calc" },
        { label: "Bar height", value: measure(g.totalHeightMm, units), source: "calc" },
        { label: "Face width", value: measure(p.widthMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.teeth)} teeth · ${round(g.pitchMm, 2)} mm pitch`,
        `RK${Math.round(p.teeth)}-${round(p.moduleMm, 1)}`,
        Math.max(g.lengthMm, p.widthMm),
        p.widthMm,
        [
          { label: "Length", value: measure(g.lengthMm, units) },
          { label: "Pitch", value: measure(g.pitchMm, units) },
          { label: "Height", value: measure(g.totalHeightMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = rackOutline(p);
    return buildPrism({ rings: [outline, outline], thicknessMm: p.widthMm });
  },
  fileName: (p) => `rack-m${round(p.moduleMm, 2)}-${Math.round(p.teeth)}t.stl`,
});

/* --------------------------------------------------------- timing pulley */

export const timingPulley: AnyDesign = defineDesign({
  id: "timing-pulley",
  name: "Timing pulley",
  family: "drives",
  eyebrow: "Toothed belt",
  blurb: "A toothed pulley whose pitch diameter follows the belt pitch.",
  lede: "Teeth and belt pitch set the pitch diameter; the trapezoidal teeth are cut to the depth, tip width and groove width you enter. Match those three numbers to your belt's cross-section and the belt drops into the grooves without bottoming out.",
  chips: [
    { label: "Teeth", value: "10 – 72" },
    { label: "Belt pitch", value: "2 – 10 mm" },
    { label: "Tooth depth", value: "0.4 – 6 mm" },
  ],
  notes: [
    "The pitch circle is pN/π, the circle the belt's tensile cords sit on. The teeth reach depth/2 outward and the root sits depth/2 inward, so the pitch line runs through the middle of the tooth and the belt wraps it without slipping a tooth.",
    "A printed pulley needs a little more backlash than a moulded one. If the belt climbs the flanks, reduce the tooth width by 0.1 mm before you change the diameter.",
  ],
  header: "Timing Pulley Designer - units: mm",
  fields: [
    { key: "teeth", label: "Teeth", kind: "count", section: "Pulley", default: "20", min: 10, max: 72 },
    { key: "pitch", label: "Belt pitch", kind: "length", section: "Pulley", default: "5", min: 2, max: 10, hint: "Centre-to-centre spacing of the belt teeth." },
    { key: "depth", label: "Tooth depth", kind: "length", section: "Pulley", default: "1.6", min: 0.4, max: 6 },
    { key: "toothWidth", label: "Tooth width", kind: "length", section: "Pulley", default: "2.6", min: 0.5, max: 8 },
    { key: "grooveWidth", label: "Groove width", kind: "length", section: "Pulley", default: "2", min: 0.5, max: 8 },
    { key: "faceWidth", label: "Face width", kind: "length", section: "Pulley", default: "12", min: 3, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Pulley", default: "5", min: 1, max: 60 },
  ],
  parse: (raw) => ({
    teeth: rawCount(raw, "teeth"),
    pitchMm: rawLength(raw, "pitch"),
    depthMm: rawLength(raw, "depth"),
    toothWidthMm: rawLength(raw, "toothWidth"),
    grooveWidthMm: rawLength(raw, "grooveWidth"),
    faceWidthMm: rawLength(raw, "faceWidth"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "teeth", "Teeth", p.teeth, 10, 72);
    pushRange(errors, units, "pitch", "Belt pitch", p.pitchMm, 2, 10);
    pushRange(errors, units, "depth", "Tooth depth", p.depthMm, 0.4, 6);
    pushRange(errors, units, "toothWidth", "Tooth width", p.toothWidthMm, 0.5, 8);
    pushRange(errors, units, "grooveWidth", "Groove width", p.grooveWidthMm, 0.5, 8);
    pushRange(errors, units, "faceWidth", "Face width", p.faceWidthMm, 3, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 60);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const pitchRadius = (p.teeth * p.pitchMm) / TWO_PI;
    const tipRadius = pitchRadius + p.depthMm / 2;
    const rootRadius = pitchRadius - p.depthMm / 2;
    const half = Math.PI / p.teeth;
    const tipHalf = p.toothWidthMm / (2 * tipRadius);
    const rootHalf = p.grooveWidthMm / (2 * rootRadius);
    const flankSpan = half - tipHalf - rootHalf;
    checkSize(errors, units, "pitch", tipRadius * 2, p.faceWidthMm);
    checkWall(errors, units, "bore", "rim inside the root circle", rootRadius - p.boreMm / 2);
    if (flankSpan <= 0.004) {
      errors.push({ field: "teeth", level: "error", message: "The teeth and grooves fill the pitch — reduce a width or the tooth count." });
    }
    if (p.depthMm > pitchRadius * 0.8) {
      errors.push({ field: "depth", level: "error", message: "The tooth depth eats past the axis." });
    }
    if (flankSpan * pitchRadius < 0.5) pushWarning(warnings, "toothWidth", "The flanks are very short; the belt will climb them.");

    const arcPitch = TWO_PI * pitchRadius;

    return {
      errors,
      warnings,
      readout: [
        { label: "Teeth", value: String(Math.round(p.teeth)), source: "input" },
        { label: "Pitch Ø", value: measure(pitchRadius * 2, units), source: "calc" },
        { label: "Tip Ø", value: measure(tipRadius * 2, units), source: "calc" },
        { label: "Root Ø", value: measure(rootRadius * 2, units), source: "calc" },
        { label: "Tooth depth", value: measure(p.depthMm, units), source: "input" },
        { label: "Arc pitch", value: measure(arcPitch / p.teeth, units), source: "calc" },
        { label: "Flank", value: measure(Math.max(0, flankSpan) * pitchRadius, units), source: "calc" },
      ],
      preview: previewOf(
        `${Math.round(p.teeth)} teeth · ${round(p.pitchMm, 2)} mm pitch`,
        `TP${Math.round(p.teeth)}-${round(p.pitchMm, 1)}`,
        tipRadius * 2,
        p.faceWidthMm,
        [
          { label: "Pitch Ø", value: measure(pitchRadius * 2, units) },
          { label: "Tip Ø", value: measure(tipRadius * 2, units) },
          { label: "Face", value: measure(p.faceWidthMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const pitchRadius = (p.teeth * p.pitchMm) / TWO_PI;
    const outline = toothedRing({
      count: p.teeth,
      rootRadiusMm: pitchRadius - p.depthMm / 2,
      tipRadiusMm: pitchRadius + p.depthMm / 2,
      tipLandMm: p.toothWidthMm,
      rootLandMm: p.grooveWidthMm,
      flank: "straight",
    });
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.faceWidthMm,
    });
  },
  fileName: (p) => `timing-pulley-${Math.round(p.teeth)}t-${round(p.pitchMm, 1)}p.stl`,
});

/* --------------------------------------------------------------- ratchet */

export const ratchetWheel: AnyDesign = defineDesign({
  id: "ratchet-wheel",
  name: "Ratchet wheel",
  family: "drives",
  eyebrow: "One-way",
  blurb: "Asymmetric teeth that take drive one way and slip the other.",
  lede: "A ratchet converts a swinging pawl into one-way rotation. The driving face is raked by a few degrees so the pawl seats cleanly and the back face runs long and shallow; enter both diameters and the tooth land, and the wheel is cut with that exact asymmetry.",
  chips: [
    { label: "Teeth", value: "6 – 60" },
    { label: "Face rake", value: "0 – 30°" },
    { label: "Tip Ø", value: "20 – 180 mm" },
  ],
  notes: [
    "Each tooth starts at the root circle with a short, nearly radial driving face, runs across a flat tip land, then falls back to the root on a long straight back. The rake angle is measured away from radial: more rake lets the pawl self-release, less rake holds a heavier load.",
    "A ratchet needs a pawl that stays engaged. Print the pawl with a spring arm or add a torsion spring, and keep the tip land at least 1 mm wide so the point does not peen over.",
  ],
  header: "Ratchet Wheel Designer - units: mm",
  fields: [
    { key: "teeth", label: "Teeth", kind: "count", section: "Wheel", default: "12", min: 6, max: 60 },
    { key: "outerDiameter", label: "Tip diameter", kind: "length", section: "Wheel", default: "60", min: 20, max: 180 },
    { key: "rootDiameter", label: "Root diameter", kind: "length", section: "Wheel", default: "48", min: 10, max: 170 },
    { key: "faceAngle", label: "Face rake", kind: "number", section: "Tooth", default: "8", min: 0, max: 30 },
    { key: "tipLand", label: "Tip land", kind: "length", section: "Tooth", default: "1.5", min: 0, max: 8 },
    { key: "rootLand", label: "Root land", kind: "length", section: "Tooth", default: "2", min: 0, max: 8 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Wheel", default: "8", min: 2, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Wheel", default: "8", min: 0.8, max: 120 },
  ],
  parse: (raw) => ({
    teeth: rawCount(raw, "teeth"),
    outerDiameterMm: rawLength(raw, "outerDiameter"),
    rootDiameterMm: rawLength(raw, "rootDiameter"),
    faceAngleDeg: rawNumber(raw, "faceAngle"),
    tipLandMm: rawLength(raw, "tipLand"),
    rootLandMm: rawLength(raw, "rootLand"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "teeth", "Teeth", p.teeth, 6, 60);
    pushRange(errors, units, "outerDiameter", "Tip diameter", p.outerDiameterMm, 20, 180);
    pushRange(errors, units, "rootDiameter", "Root diameter", p.rootDiameterMm, 10, 170);
    pushRange(errors, units, "faceAngle", "Face rake", p.faceAngleDeg, 0, 30, false);
    pushRange(errors, units, "tipLand", "Tip land", p.tipLandMm, 0, 8);
    pushRange(errors, units, "rootLand", "Root land", p.rootLandMm, 0, 8);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 0.8, 120);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const tipRadius = p.outerDiameterMm / 2;
    const rootRadius = p.rootDiameterMm / 2;
    checkSize(errors, units, "outerDiameter", p.outerDiameterMm, p.thicknessMm);
    checkWall(errors, units, "bore", "rim inside the root circle", rootRadius - p.boreMm / 2);
    if (tipRadius <= rootRadius + 1) {
      errors.push({ field: "rootDiameter", level: "error", message: "The tooth height is under 1 mm." });
    }
    const pitch = TWO_PI / p.teeth;
    const tipHalf = p.tipLandMm / (2 * Math.max(0.1, tipRadius));
    const rootHalf = p.rootLandMm / (2 * Math.max(0.1, rootRadius));
    if (pitch / 2 <= rootHalf + (p.faceAngleDeg * Math.PI) / 180 + tipHalf) {
      errors.push({ field: "teeth", level: "error", message: "The back face runs past the next tooth — reduce the rake or the lands." });
    }
    if (tipHalf * tipRadius < 0.8) pushWarning(warnings, "tipLand", "A tip land under 1 mm peens over in use.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Teeth", value: String(Math.round(p.teeth)), source: "input" },
        { label: "Pitch angle", value: `${round(360 / p.teeth, 2)}°`, source: "calc" },
        { label: "Tip Ø", value: measure(p.outerDiameterMm, units), source: "input" },
        { label: "Root Ø", value: measure(p.rootDiameterMm, units), source: "input" },
        { label: "Tooth height", value: measure(tipRadius - rootRadius, units), source: "calc" },
        { label: "Face rake", value: `${round(p.faceAngleDeg, 1)}°`, source: "input" },
        { label: "Tip land", value: measure(p.tipLandMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.teeth)} teeth · one-way`,
        `RW${Math.round(p.teeth)}-${round(tipRadius * 2, 0)}`,
        p.outerDiameterMm,
        p.thicknessMm,
        [
          { label: "Tip Ø", value: measure(p.outerDiameterMm, units) },
          { label: "Root Ø", value: measure(p.rootDiameterMm, units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = ratchetOutline({
      teeth: p.teeth,
      rootRadiusMm: p.rootDiameterMm / 2,
      tipRadiusMm: p.outerDiameterMm / 2,
      faceAngleDeg: p.faceAngleDeg,
      tipLandMm: p.tipLandMm,
      rootLandMm: p.rootLandMm,
    });
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `ratchet-${Math.round(p.teeth)}t-${round(p.outerDiameterMm, 0)}d.stl`,
});

/* ---------------------------------------------------------------- Geneva */

export const genevaWheel: AnyDesign = defineDesign({
  id: "geneva-wheel",
  name: "Geneva wheel",
  family: "drives",
  eyebrow: "Intermittent",
  blurb: "A star wheel that turns one step per driver revolution.",
  lede: "Radial slots with parallel sides and a radiused end, cut through the rim. The driver's pin enters a slot at the tangent point and pushes the wheel through one pitch, then leaves it locked between steps.",
  chips: [
    { label: "Slots", value: "3 – 12" },
    { label: "Wheel Ø", value: "20 – 180 mm" },
    { label: "Slot depth", value: "4 – 90 mm" },
  ],
  notes: [
    "The slot sides are parallel at ±slotWidth/2 and the end is a semicircle of the same radius, so the pin enters on a straight wall and bottoms on a round seat. The rim between slots is a plain arc — the locking disc on the driver does the dwell.",
    "The driver pin circle must equal the wheel's slot-centre radius for the motion to be smooth. Indexing angle per step is 360°/slots, and the wheel only moves while the pin is inside a slot.",
  ],
  header: "Geneva Wheel Designer - units: mm",
  fields: [
    { key: "slots", label: "Slots", kind: "count", section: "Wheel", default: "4", min: 3, max: 12 },
    { key: "outerDiameter", label: "Wheel diameter", kind: "length", section: "Wheel", default: "60", min: 20, max: 180 },
    { key: "slotDepth", label: "Slot depth", kind: "length", section: "Slot", default: "18", min: 4, max: 90 },
    { key: "slotWidth", label: "Slot width", kind: "length", section: "Slot", default: "6", min: 2, max: 24 },
    { key: "thickness", label: "Thickness", kind: "length", section: "Wheel", default: "6", min: 2, max: 30 },
    { key: "bore", label: "Bore", kind: "length", section: "Wheel", default: "8", min: 1, max: 40 },
  ],
  parse: (raw) => ({
    slots: rawCount(raw, "slots"),
    outerDiameterMm: rawLength(raw, "outerDiameter"),
    slotDepthMm: rawLength(raw, "slotDepth"),
    slotWidthMm: rawLength(raw, "slotWidth"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "slots", "Slots", p.slots, 3, 12);
    pushRange(errors, units, "outerDiameter", "Wheel diameter", p.outerDiameterMm, 20, 180);
    pushRange(errors, units, "slotDepth", "Slot depth", p.slotDepthMm, 4, 90);
    pushRange(errors, units, "slotWidth", "Slot width", p.slotWidthMm, 2, 24);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 30);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const radius = p.outerDiameterMm / 2;
    const bottom = radius - p.slotDepthMm;
    const hubWall = bottom - p.boreMm / 2;
    checkSize(errors, units, "outerDiameter", p.outerDiameterMm, p.thicknessMm);
    if (p.slotWidthMm >= bottom * 1.6) {
      errors.push({ field: "slotWidth", level: "error", message: "The slot is wider than the hub left at its end." });
    }
    checkWall(errors, units, "bore", "hub outside the bore", hubWall);
    if (p.slotDepthMm > radius - p.slotWidthMm / 2 - 0.5) {
      errors.push({ field: "slotDepth", level: "error", message: "The slot breaks through the centre." });
    }
    const stepAngle = 360 / p.slots;
    if (stepAngle < 20) pushWarning(warnings, "slots", "More than eighteen slots leaves very thin rim segments.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Slots", value: String(Math.round(p.slots)), source: "input" },
        { label: "Step angle", value: `${round(stepAngle, 2)}°`, source: "calc" },
        { label: "Wheel Ø", value: measure(p.outerDiameterMm, units), source: "input" },
        { label: "Slot depth", value: measure(p.slotDepthMm, units), source: "input" },
        { label: "Slot bottom Ø", value: measure(Math.max(0, bottom * 2), units), source: "calc" },
        { label: "Slot width", value: measure(p.slotWidthMm, units), source: "input" },
        { label: "Hub wall", value: measure(Math.max(0, hubWall), units), source: "calc" },
      ],
      preview: previewOf(
        `${Math.round(p.slots)} slots · ${round(stepAngle, 1)}° per step`,
        `GW${Math.round(p.slots)}-${round(p.outerDiameterMm, 0)}`,
        p.outerDiameterMm,
        p.thicknessMm,
        [
          { label: "Wheel Ø", value: measure(p.outerDiameterMm, units) },
          { label: "Slot floor Ø", value: measure(Math.max(0, bottom * 2), units) },
          { label: "Thickness", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = genevaOutline({
      slots: p.slots,
      outerRadiusMm: p.outerDiameterMm / 2,
      slotDepthMm: p.slotDepthMm,
      slotWidthMm: p.slotWidthMm,
    });
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `geneva-${Math.round(p.slots)}slot-${round(p.outerDiameterMm, 0)}d.stl`,
});

/* -------------------------------------------------------------------- cam */

const CAM_LAWS = [
  { value: "harmonic", label: "Harmonic" },
  { value: "cycloidal", label: "Cycloidal" },
];

function camLift(u: number, law: string): number {
  if (law === "cycloidal") return u - Math.sin(TWO_PI * u) / TWO_PI;
  return 0.5 * (1 - Math.cos(Math.PI * u));
}

function camRadius(
  theta: number,
  base: number,
  lift: number,
  rise: number,
  dwell: number,
  ret: number,
  law: string,
): number {
  const t = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
  const riseRad = (rise * Math.PI) / 180;
  const dwellRad = (dwell * Math.PI) / 180;
  const retRad = (ret * Math.PI) / 180;
  if (t < riseRad) return base + lift * camLift(t / riseRad, law);
  if (t < riseRad + dwellRad) return base + lift;
  if (t < riseRad + dwellRad + retRad) {
    const u = (t - riseRad - dwellRad) / retRad;
    return base + lift * (1 - camLift(u, law));
  }
  return base;
}

export const discCam: AnyDesign = defineDesign({
  id: "disc-cam",
  name: "Disc cam",
  family: "drives",
  eyebrow: "Rise, dwell, return",
  blurb: "A radial-follower cam with a real motion law, not a stretched circle.",
  lede: "Set the base circle, the lift and how many degrees the rise, dwell and return take. The profile is evaluated from the harmonic or cycloidal motion law at every degree, so the follower's acceleration is as designed instead of an artefact of the drawing.",
  chips: [
    { label: "Lift", value: "0.5 – 60 mm" },
    { label: "Base Ø", value: "10 – 160 mm" },
    { label: "Laws", value: "harmonic / cycloidal" },
  ],
  notes: [
    "Harmonic motion has a cosine acceleration and a gentle start; cycloidal motion has zero acceleration at both ends and the lowest peak velocity for a given lift. Both are evaluated exactly, so the cam's radius at any angle is the law's value — not an interpolation between key points.",
    "A radial flat-faced follower needs the cam to stay convex where it touches. A roller follower is more forgiving: make the roller at least a third of the lift and keep the pressure angle under 30°.",
  ],
  header: "Disc Cam Designer - units: mm",
  fields: [
    { key: "baseDiameter", label: "Base diameter", kind: "length", section: "Cam", default: "40", min: 10, max: 160 },
    { key: "lift", label: "Lift", kind: "length", section: "Cam", default: "10", min: 0.5, max: 60 },
    { key: "riseAngle", label: "Rise angle", kind: "number", section: "Timing", default: "120", min: 10, max: 300 },
    { key: "dwellAngle", label: "Dwell angle", kind: "number", section: "Timing", default: "60", min: 0, max: 300 },
    { key: "returnAngle", label: "Return angle", kind: "number", section: "Timing", default: "120", min: 10, max: 300 },
    { key: "law", label: "Motion law", kind: "select", section: "Timing", default: "harmonic", options: CAM_LAWS },
    { key: "thickness", label: "Thickness", kind: "length", section: "Cam", default: "12", min: 2, max: 40 },
    { key: "bore", label: "Bore", kind: "length", section: "Cam", default: "8", min: 1, max: 40 },
  ],
  parse: (raw) => ({
    baseDiameterMm: rawLength(raw, "baseDiameter"),
    liftMm: rawLength(raw, "lift"),
    riseAngleDeg: rawNumber(raw, "riseAngle"),
    dwellAngleDeg: rawNumber(raw, "dwellAngle"),
    returnAngleDeg: rawNumber(raw, "returnAngle"),
    law: rawOption(raw, "law", "harmonic"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "baseDiameter", "Base diameter", p.baseDiameterMm, 10, 160);
    pushRange(errors, units, "lift", "Lift", p.liftMm, 0.5, 60);
    pushRange(errors, units, "riseAngle", "Rise angle", p.riseAngleDeg, 10, 300, false);
    pushRange(errors, units, "dwellAngle", "Dwell angle", p.dwellAngleDeg, 0, 300, false);
    pushRange(errors, units, "returnAngle", "Return angle", p.returnAngleDeg, 10, 300, false);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 40);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const base = p.baseDiameterMm / 2;
    const maxRadius = base + p.liftMm;
    checkSize(errors, units, "baseDiameter", maxRadius * 2, p.thicknessMm);
    checkWall(errors, units, "bore", "body outside the bore", base - p.boreMm / 2);
    const used = p.riseAngleDeg + p.dwellAngleDeg + p.returnAngleDeg;
    if (used > 355) {
      errors.push({
        field: "returnAngle",
        level: "error",
        message: `Rise, dwell and return add up to ${round(used, 1)}° — leave at least 5° of closing dwell.`,
      });
    }
    if (p.liftMm > base * 1.2) pushWarning(warnings, "lift", "A lift larger than the base circle makes a very pointed cam.");

    const closingDwell = 360 - used;

    return {
      errors,
      warnings,
      readout: [
        { label: "Base Ø", value: measure(base * 2, units), source: "input" },
        { label: "Max Ø", value: measure(maxRadius * 2, units), source: "calc" },
        { label: "Lift", value: measure(p.liftMm, units), source: "input" },
        { label: "Rise", value: `${round(p.riseAngleDeg, 1)}°`, source: "input" },
        { label: "Dwell", value: `${round(p.dwellAngleDeg, 1)}°`, source: "input" },
        { label: "Return", value: `${round(p.returnAngleDeg, 1)}°`, source: "input" },
        { label: "Closing dwell", value: `${round(closingDwell, 1)}°`, source: "calc" },
        { label: "Motion law", value: p.law === "cycloidal" ? "Cycloidal" : "Harmonic", source: "input" },
      ],
      preview: previewOf(
        `${round(p.liftMm, 1)} mm lift · ${p.law}`,
        `CAM${round(maxRadius * 2, 0)}-${round(p.liftMm, 0)}`,
        maxRadius * 2,
        p.thicknessMm,
        [
          { label: "Base Ø", value: measure(base * 2, units) },
          { label: "Max Ø", value: measure(maxRadius * 2, units) },
          { label: "Lift", value: measure(p.liftMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const base = p.baseDiameterMm / 2;
    const points: Point2D[] = [];
    const samples = 720;
    for (let i = 0; i < samples; i += 1) {
      const theta = (TWO_PI * i) / samples;
      const radius = camRadius(
        theta,
        base,
        p.liftMm,
        p.riseAngleDeg,
        p.dwellAngleDeg,
        p.returnAngleDeg,
        p.law,
      );
      points.push({ x: radius * Math.cos(theta), y: radius * Math.sin(theta) });
    }
    return buildPrism({
      rings: [points, points],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `disc-cam-${round(p.baseDiameterMm, 0)}b-${round(p.liftMm, 1)}lift.stl`,
});

/* ------------------------------------------------------------- eccentric */

export const eccentricWheel: AnyDesign = defineDesign({
  id: "eccentric-wheel",
  name: "Eccentric wheel",
  family: "drives",
  eyebrow: "Offset bore",
  blurb: "A disc with its shaft hole off centre — one turn, one stroke.",
  lede: "The distance between the outer circle and the bore is the throw. Mount the wheel on a shaft and the outside traces a circle of radius equal to the eccentricity, which is the simplest way to turn rotation into a short reciprocating stroke.",
  chips: [
    { label: "Throw", value: "2 × offset" },
    { label: "Outer Ø", value: "16 – 180 mm" },
    { label: "Offset", value: "0 – 60 mm" },
  ],
  notes: [
    "The bore is translated by the eccentricity; both circles keep their own radius, so the narrowest wall is outerRadius − offset − boreRadius and that is the number the validator checks. The stroke is exactly twice the offset.",
    "Balance matters above a few hundred rpm: the offset mass wants to shake the shaft. Either keep the speed low or add a counterweight opposite the throw.",
  ],
  header: "Eccentric Wheel Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outer diameter", kind: "length", section: "Disc", default: "50", min: 16, max: 180 },
    { key: "bore", label: "Bore", kind: "length", section: "Disc", default: "10", min: 1, max: 80 },
    { key: "offset", label: "Bore offset", kind: "length", section: "Disc", default: "6", min: 0, max: 60, hint: "Stroke = twice this." },
    { key: "thickness", label: "Thickness", kind: "length", section: "Disc", default: "10", min: 2, max: 40 },
  ],
  parse: (raw) => ({
    outerDiameterMm: rawLength(raw, "outerDiameter"),
    boreMm: rawLength(raw, "bore"),
    offsetMm: rawLength(raw, "offset"),
    thicknessMm: rawLength(raw, "thickness"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outer diameter", p.outerDiameterMm, 16, 180);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 80);
    pushRange(errors, units, "offset", "Bore offset", p.offsetMm, 0, 60);
    pushRange(errors, units, "thickness", "Thickness", p.thicknessMm, 2, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outer = p.outerDiameterMm / 2;
    const minWall = outer - p.offsetMm - p.boreMm / 2;
    checkSize(errors, units, "outerDiameter", p.outerDiameterMm, p.thicknessMm);
    checkWall(errors, units, "offset", "wall at the narrow side", minWall);
    if (p.offsetMm > outer * 0.7) pushWarning(warnings, "offset", "Most of the disc is on one side of the shaft — it will vibrate.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Outer Ø", value: measure(p.outerDiameterMm, units), source: "input" },
        { label: "Bore Ø", value: measure(p.boreMm, units), source: "input" },
        { label: "Offset", value: measure(p.offsetMm, units), source: "input" },
        { label: "Stroke", value: measure(p.offsetMm * 2, units), source: "calc" },
        { label: "Min wall", value: measure(Math.max(0, minWall), units), source: "calc" },
        { label: "Swept Ø", value: measure((outer + p.offsetMm) * 2, units), source: "calc" },
      ],
      preview: previewOf(
        `${measure(p.offsetMm, units)} offset · ${measure(p.offsetMm * 2, units)} stroke`,
        `EW${round(p.outerDiameterMm, 0)}-${round(p.offsetMm, 1)}`,
        p.outerDiameterMm,
        p.thicknessMm,
        [
          { label: "Outer Ø", value: measure(p.outerDiameterMm, units) },
          { label: "Bore Ø", value: measure(p.boreMm, units) },
          { label: "Offset", value: measure(p.offsetMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const outline = circle(p.outerDiameterMm / 2);
    const bore = boreOutline({ boreMm: p.boreMm, boreShape: "round" }).map((point) => ({
      x: point.x + p.offsetMm,
      y: point.y,
    }));
    return buildPrism({
      rings: [outline, outline],
      holes: [bore],
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `eccentric-${round(p.outerDiameterMm, 0)}d-${round(p.offsetMm, 1)}e.stl`,
});

/* ---------------------------------------------------------------- splines */

export const splinedHub: AnyDesign = defineDesign({
  id: "splined-hub",
  name: "Splined hub",
  family: "drives",
  eyebrow: "Torque without slip",
  blurb: "A straight-sided spline that drives a mating sleeve by its flanks.",
  lede: "Parallel-sided splines carry more torque than a key on the same shaft diameter and index the part positively. Enter the major and minor diameters, the spline count and the tooth width; the spaces are laid out from the real root circumference.",
  chips: [
    { label: "Splines", value: "4 – 20" },
    { label: "Major Ø", value: "8 – 170 mm" },
    { label: "Bore", value: "1 – 100 mm" },
  ],
  notes: [
    "Each spline is a radial tooth with straight flanks: it runs from the minor diameter out to the major diameter, and its tip land is the spline width. The tooth space at the root is the root circumference divided by the spline count, minus that width.",
    "Straight splines are the printable choice because there is no undercut to sag. Leave 0.15 mm per flank of clearance and make the sleeve a little longer than the hub so the load is shared across the full face.",
  ],
  header: "Splined Hub Designer - units: mm",
  fields: [
    { key: "splines", label: "Splines", kind: "count", section: "Spline", default: "6", min: 4, max: 20 },
    { key: "majorDiameter", label: "Major diameter", kind: "length", section: "Spline", default: "30", min: 8, max: 170 },
    { key: "minorDiameter", label: "Minor diameter", kind: "length", section: "Spline", default: "24", min: 5, max: 160 },
    { key: "splineWidth", label: "Spline width", kind: "length", section: "Spline", default: "5", min: 0.8, max: 20 },
    { key: "thickness", label: "Length", kind: "length", section: "Hub", default: "14", min: 3, max: 60 },
    { key: "bore", label: "Bore", kind: "length", section: "Hub", default: "10", min: 1, max: 100 },
  ],
  parse: (raw) => ({
    splines: rawCount(raw, "splines"),
    majorDiameterMm: rawLength(raw, "majorDiameter"),
    minorDiameterMm: rawLength(raw, "minorDiameter"),
    splineWidthMm: rawLength(raw, "splineWidth"),
    thicknessMm: rawLength(raw, "thickness"),
    boreMm: rawLength(raw, "bore"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushInteger(errors, "splines", "Splines", p.splines, 4, 20);
    pushRange(errors, units, "majorDiameter", "Major diameter", p.majorDiameterMm, 8, 170);
    pushRange(errors, units, "minorDiameter", "Minor diameter", p.minorDiameterMm, 5, 160);
    pushRange(errors, units, "splineWidth", "Spline width", p.splineWidthMm, 0.8, 20);
    pushRange(errors, units, "thickness", "Length", p.thicknessMm, 3, 60);
    pushRange(errors, units, "bore", "Bore", p.boreMm, 1, 100);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const major = p.majorDiameterMm / 2;
    const minor = p.minorDiameterMm / 2;
    checkSize(errors, units, "majorDiameter", p.majorDiameterMm, p.thicknessMm);
    checkWall(errors, units, "bore", "hub outside the bore", minor - p.boreMm / 2);
    if (major - minor < 1) {
      errors.push({ field: "majorDiameter", level: "error", message: "The spline is under 1 mm deep." });
    }
    const rootSpace = (TWO_PI * minor) / p.splines;
    const rootLand = rootSpace - p.splineWidthMm;
    if (rootLand <= 0.6) {
      errors.push({ field: "splineWidth", level: "error", message: "The splines touch at the minor diameter — narrow them or use fewer." });
    }
    if (rootLand < 2) pushWarning(warnings, "splineWidth", "The spaces between splines are narrow; the mating part will be fragile.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Splines", value: String(Math.round(p.splines)), source: "input" },
        { label: "Major Ø", value: measure(p.majorDiameterMm, units), source: "input" },
        { label: "Minor Ø", value: measure(p.minorDiameterMm, units), source: "input" },
        { label: "Spline height", value: measure(major - minor, units), source: "calc" },
        { label: "Spline width", value: measure(p.splineWidthMm, units), source: "input" },
        { label: "Root space", value: measure(Math.max(0, rootLand), units), source: "calc" },
        { label: "Bore", value: measure(p.boreMm, units), source: "input" },
      ],
      preview: previewOf(
        `${Math.round(p.splines)} splines · ${measure(p.majorDiameterMm, units)} major`,
        `SH${Math.round(p.splines)}-${round(p.majorDiameterMm, 0)}`,
        p.majorDiameterMm,
        p.thicknessMm,
        [
          { label: "Major Ø", value: measure(p.majorDiameterMm, units) },
          { label: "Minor Ø", value: measure(p.minorDiameterMm, units) },
          { label: "Length", value: measure(p.thicknessMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const minor = p.minorDiameterMm / 2;
    const rootSpace = (TWO_PI * minor) / p.splines;
    const outline = toothedRing({
      count: p.splines,
      rootRadiusMm: minor,
      tipRadiusMm: p.majorDiameterMm / 2,
      tipLandMm: p.splineWidthMm,
      rootLandMm: Math.max(0.2, rootSpace - p.splineWidthMm),
      flank: "straight",
    });
    return buildPrism({
      rings: [outline, outline],
      holes: boreHoles(p.boreMm),
      thicknessMm: p.thicknessMm,
    });
  },
  fileName: (p) => `splined-hub-${Math.round(p.splines)}s-${round(p.majorDiameterMm, 0)}d.stl`,
});

/* ----------------------------------------------------------------- shared */

function circle(radius: number): Point2D[] {
  const segments = Math.max(48, Math.min(320, Math.ceil(TWO_PI * radius * 4)));
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (TWO_PI * i) / segments;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

export const prismGears: AnyDesign[] = [
  spurGear,
  internalGear,
  helicalGear,
  rack,
  timingPulley,
  ratchetWheel,
  genevaWheel,
  discCam,
  eccentricWheel,
  splinedHub,
];

function emptyResult(errors: DesignIssue[], warnings: DesignIssue[]): DesignResult {
  return {
    errors,
    warnings,
    readout: [],
    preview: previewOf("Waiting for valid input", "—", 40, 10, [
      { label: "Width", value: "—" },
      { label: "Height", value: "—" },
      { label: "Depth", value: "—" },
    ]),
  };
}
