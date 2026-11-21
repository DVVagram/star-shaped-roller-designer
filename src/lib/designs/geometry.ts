/**
 * Mechanical outline maths: involute gears, toothed rings, ratchets, Geneva
 * wheels, saw blades, wrenches and handwheels.
 *
 * These generators are analytic where the real part is analytic — an involute
 * flank is sampled from the involute equation, a ration is built from its face
 * angle, a Geneva slot from its parallel sides. Nothing here is eyeballed from a
 * reference picture.
 */

import { TWO_PI } from "@/lib/kit/units";
import type { Point2D } from "@/lib/kit/units";
import {
  arcPoints,
  circleOutline,
  dedupe,
  dropCollinear,
  polar,
} from "@/lib/kit/outlines";

/* ------------------------------------------------------------ involute gear */

export interface InvoluteGearInput {
  teeth: number;
  moduleMm: number;
  pressureAngleDeg: number;
  /** Addendum, normally one module. */
  addendumMm: number;
  /** Dedendum, normally 1.25 modules. */
  dedendumMm: number;
  /** Total tooth thinning, measured along the pitch circle. */
  backlashMm: number;
}

export interface InvoluteGearGeometry {
  teeth: number;
  moduleMm: number;
  pitchRadiusMm: number;
  pitchDiameterMm: number;
  baseRadiusMm: number;
  tipRadiusMm: number;
  rootRadiusMm: number;
  wholeDepthMm: number;
  circularPitchMm: number;
  toothThicknessAtPitchMm: number;
  /** True when the flanks meet below the requested addendum. */
  pointed: boolean;
  /** Radius at which the flanks meet, when pointed. */
  pointedRadiusMm: number;
}

function involuteAngle(radius: number, baseRadius: number): number {
  if (radius <= baseRadius) return 0;
  const alpha = Math.acos(Math.min(1, baseRadius / radius));
  return Math.tan(alpha) - alpha;
}

export function involuteGearGeometry(input: InvoluteGearInput): InvoluteGearGeometry {
  const teeth = Math.max(4, Math.round(input.teeth));
  const module = Math.max(0.1, input.moduleMm);
  const alpha = (Math.max(10, Math.min(30, input.pressureAngleDeg)) * Math.PI) / 180;
  const pitchRadius = (module * teeth) / 2;
  const baseRadius = pitchRadius * Math.cos(alpha);
  const requestedTip = pitchRadius + Math.max(0, input.addendumMm);
  const rootRadius = Math.max(0.1, pitchRadius - Math.max(0, input.dedendumMm));
  const thickness = Math.max(0, (Math.PI * module) / 2 - Math.max(0, input.backlashMm));
  const psiPitch = thickness / (2 * pitchRadius);
  const invAlpha = Math.tan(alpha) - alpha;

  const psiAt = (radius: number) =>
    psiPitch + invAlpha - involuteAngle(radius, baseRadius);

  const psiTip = psiAt(requestedTip);
  let tipRadius = requestedTip;
  let pointed = false;
  let pointedRadius = 0;
  if (psiTip <= 1e-6) {
    pointed = true;
    let low = pitchRadius;
    let high = requestedTip;
    for (let i = 0; i < 60; i += 1) {
      const mid = (low + high) / 2;
      if (psiAt(mid) > 0) low = mid;
      else high = mid;
    }
    pointedRadius = (low + high) / 2;
    tipRadius = pointedRadius;
  }

  return {
    teeth,
    moduleMm: module,
    pitchRadiusMm: pitchRadius,
    pitchDiameterMm: pitchRadius * 2,
    baseRadiusMm: baseRadius,
    tipRadiusMm: tipRadius,
    rootRadiusMm: rootRadius,
    wholeDepthMm: tipRadius - rootRadius,
    circularPitchMm: Math.PI * module,
    toothThicknessAtPitchMm: thickness,
    pointed,
    pointedRadiusMm: pointedRadius,
  };
}

/**
 * The external tooth outline, counter-clockwise, starting at the first root.
 *
 * The flanks are the real involute of the base circle. Where the root radius
 * falls inside the base circle the involute cannot reach, so the flank continues
 * radially from the base circle down to the root — the same simplification a
 * full-depth cutter leaves, and it keeps the profile closed for small gears.
 */
export function involuteGearOutline(input: InvoluteGearInput): Point2D[] {
  const g = involuteGearGeometry(input);
  const pitch = TWO_PI / g.teeth;
  const alpha = (Math.max(10, Math.min(30, input.pressureAngleDeg)) * Math.PI) / 180;
  const invAlpha = Math.tan(alpha) - alpha;
  const psiPitch = g.toothThicknessAtPitchMm / (2 * g.pitchRadiusMm);
  const psiAt = (radius: number) =>
    psiPitch + invAlpha - involuteAngle(radius, g.baseRadiusMm);

  const startRadius = Math.max(g.rootRadiusMm, g.baseRadiusMm);
  const psiStart = psiAt(startRadius);
  const psiTip = Math.max(0, psiAt(g.tipRadiusMm));
  if (pitch / 2 - psiStart <= 1e-5) {
    throw new Error("The teeth overlap at the root circle — reduce the addendum or the module.");
  }

  const flankSteps = 14;
  const rootSteps = Math.max(2, Math.ceil((pitch - 2 * psiStart) * 6));
  const tipSteps = Math.max(1, Math.ceil((2 * psiTip) * 8));

  const points: Point2D[] = [];
  const halfPitch = pitch / 2;

  for (let i = 0; i < g.teeth; i += 1) {
    const centre = i * pitch;
    const tooth = centre + halfPitch;

    // Root land between the previous tooth and this one.
    points.push(
      ...arcPoints(
        0,
        0,
        g.rootRadiusMm,
        centre - halfPitch + psiStart,
        tooth - psiStart,
        rootSteps,
      ),
    );
    if (g.rootRadiusMm < g.baseRadiusMm - 1e-9) {
      points.push(polar(g.baseRadiusMm, tooth - psiStart));
    }

    // Rising flank: root (or base) → tip, on the tooth's leading side.
    for (let k = 0; k <= flankSteps; k += 1) {
      const radius = startRadius + ((g.tipRadiusMm - startRadius) * k) / flankSteps;
      points.push(polar(radius, tooth - psiAt(radius)));
    }

    // Tip land. A pointed tooth has no land at all.
    if (psiTip > 1e-6) {
      points.push(
        ...arcPoints(0, 0, g.tipRadiusMm, tooth - psiTip, tooth + psiTip, tipSteps),
      );
    }

    // Falling flank: tip → root.
    for (let k = flankSteps; k >= 0; k -= 1) {
      const radius = startRadius + ((g.tipRadiusMm - startRadius) * k) / flankSteps;
      points.push(polar(radius, tooth + psiAt(radius)));
    }
    if (g.rootRadiusMm < g.baseRadiusMm - 1e-9) {
      points.push(polar(g.baseRadiusMm, tooth + psiStart));
    }
  }

  return dropCollinear(points);
}

/**
 * The toothed cavity of an internal (ring) gear, counter-clockwise.
 *
 * The cavity is the shape an external tooth sweeps, so the space half-width at
 * radius r is `psiPitch + inv(alpha) - inv(alpha_r)`, which narrows as r grows.
 * The material of the ring is outside this loop: the teeth point inward, and the
 * ring's root circle is the outer edge of the cavity.
 */
export function internalGearCavity(input: InvoluteGearInput): Point2D[] {
  const g = involuteGearGeometry(input);
  const pitch = TWO_PI / g.teeth;
  const alpha = (Math.max(10, Math.min(30, input.pressureAngleDeg)) * Math.PI) / 180;
  const invAlpha = Math.tan(alpha) - alpha;
  const psiPitch = g.toothThicknessAtPitchMm / (2 * g.pitchRadiusMm);
  const phiAt = (radius: number) =>
    psiPitch + invAlpha - involuteAngle(Math.max(radius, g.baseRadiusMm), g.baseRadiusMm);

  // The material tip is inward of the pitch circle by the addendum; the cavity
  // floor is outward of it by the dedendum.
  const tipRadius = Math.max(0.2, g.pitchRadiusMm - Math.max(0, input.addendumMm));
  const floorRadius = g.pitchRadiusMm + Math.max(0, input.dedendumMm);
  const psiMaterial = pitch / 2 - phiAt(tipRadius);
  if (psiMaterial <= 1e-5) {
    throw new Error("The internal teeth overlap — reduce the dedendum or add teeth.");
  }

  const flankSteps = 16;
  const steps = Math.max(2, Math.ceil(psiMaterial * 12));
  const floorSteps = Math.max(2, Math.ceil(phiAt(floorRadius) * 12));
  const points: Point2D[] = [];
  const halfPitch = pitch / 2;

  for (let i = 0; i < g.teeth; i += 1) {
    const centre = i * pitch;
    const space = centre + halfPitch;

    // Material tooth tip, facing the axis.
    points.push(...arcPoints(0, 0, tipRadius, centre - psiMaterial, centre + psiMaterial, steps));

    // Cavity flank outward from the material tip to the cavity floor.
    const start = Math.max(tipRadius, g.baseRadiusMm);
    for (let k = 0; k <= flankSteps; k += 1) {
      const radius = start + ((floorRadius - start) * k) / flankSteps;
      points.push(polar(radius, space - phiAt(radius)));
    }

    // Cavity floor across the space.
    points.push(
      ...arcPoints(
        0,
        0,
        floorRadius,
        space - phiAt(floorRadius),
        space + phiAt(floorRadius),
        floorSteps,
      ),
    );

    // Cavity flank back inward, ending on the next tooth's tip arc.
    for (let k = flankSteps; k >= 0; k -= 1) {
      const radius = start + ((floorRadius - start) * k) / flankSteps;
      points.push(polar(radius, space + phiAt(radius)));
    }
  }

  return dropCollinear(points);
}

/* -------------------------------------------------------------- toothed ring */

export interface ToothedRingInput {
  count: number;
  rootRadiusMm: number;
  tipRadiusMm: number;
  /** Flat land at the tip, measured as an arc. */
  tipLandMm: number;
  /** Flat land at the root, measured as an arc. */
  rootLandMm: number;
  /** Shifts the tip land towards the falling flank, in radians. */
  tipShiftRad?: number;
  /** Flank easing: straight is a trapezoid, smooth is an S-curve. */
  flank?: "straight" | "smooth";
  phaseRad?: number;
  stepsPerFlank?: number;
}

export function toothedRing(input: ToothedRingInput): Point2D[] {
  const count = Math.max(3, Math.round(input.count));
  const pitch = TWO_PI / count;
  const half = pitch / 2;
  const rootRadius = Math.max(0.1, input.rootRadiusMm);
  const tipRadius = Math.max(rootRadius + 0.05, input.tipRadiusMm);
  const tipHalf = Math.max(0, input.tipLandMm) / (2 * tipRadius);
  const rootHalf = Math.max(0, input.rootLandMm) / (2 * rootRadius);
  const shift = input.tipShiftRad ?? 0;
  const rising = half - tipHalf - rootHalf + shift;
  const falling = half - tipHalf - rootHalf - shift;
  if (!(rising > 1e-4) || !(falling > 1e-4)) {
    throw new Error("The tip and root lands fill the pitch — reduce them or the count.");
  }
  const flank = input.flank ?? "straight";
  const ease = (u: number) => (flank === "smooth" ? u * u * (3 - 2 * u) : u);
  const flankSteps = Math.max(2, Math.round(input.stepsPerFlank ?? 8));
  const phase = input.phaseRad ?? 0;
  const points: Point2D[] = [];

  for (let i = 0; i < count; i += 1) {
    const centre = phase + i * pitch;
    points.push(...arcPoints(0, 0, rootRadius, centre - rootHalf, centre + rootHalf, 4));

    for (let k = 1; k <= flankSteps; k += 1) {
      const u = ease(k / flankSteps);
      points.push(polar(rootRadius + (tipRadius - rootRadius) * u, centre + rootHalf + rising * (k / flankSteps)));
    }

    if (tipHalf > 1e-9) {
      points.push(
        ...arcPoints(
          0,
          0,
          tipRadius,
          centre + half - tipHalf + shift,
          centre + half + tipHalf + shift,
          Math.max(2, Math.ceil(tipHalf * 10)),
        ),
      );
    }

    for (let k = flankSteps - 1; k >= 0; k -= 1) {
      const u = ease(k / flankSteps);
      points.push(
        polar(
          rootRadius + (tipRadius - rootRadius) * u,
          centre + half + tipHalf + shift + falling * ((flankSteps - k) / flankSteps),
        ),
      );
    }
  }

  return dropCollinear(points);
}

/* ----------------------------------------------------------------- ratchet */

export interface RatchetInput {
  teeth: number;
  rootRadiusMm: number;
  tipRadiusMm: number;
  /** Rake of the driving face away from radial, in degrees. */
  faceAngleDeg: number;
  tipLandMm: number;
  rootLandMm: number;
}

export function ratchetOutline(input: RatchetInput): Point2D[] {
  const teeth = Math.max(3, Math.round(input.teeth));
  const pitch = TWO_PI / teeth;
  const rootRadius = Math.max(0.1, input.rootRadiusMm);
  const tipRadius = Math.max(rootRadius + 0.1, input.tipRadiusMm);
  const face = (Math.max(0, Math.min(45, input.faceAngleDeg)) * Math.PI) / 180;
  const tipHalf = Math.max(0, input.tipLandMm) / (2 * tipRadius);
  const rootHalf = Math.max(0, input.rootLandMm) / (2 * rootRadius);
  const points: Point2D[] = [];

  for (let i = 0; i < teeth; i += 1) {
    const centre = i * pitch;
    points.push(...arcPoints(0, 0, rootRadius, centre - rootHalf, centre + rootHalf, 4));
    // Driving face: nearly radial, raked forward by the face angle.
    points.push(polar(tipRadius, centre + rootHalf + face));
    // Tip land.
    points.push(
      ...arcPoints(
        0,
        0,
        tipRadius,
        centre + rootHalf + face,
        centre + rootHalf + face + 2 * tipHalf,
        Math.max(2, Math.ceil(tipHalf * 12)),
      ),
    );
    // Back face: a straight line down to the root at the end of the pitch.
    points.push(polar(rootRadius, centre + pitch - rootHalf));
  }

  return dropCollinear(points);
}

/* ------------------------------------------------------------------ Geneva */

export interface GenevaInput {
  slots: number;
  outerRadiusMm: number;
  /** Depth of the slot, measured radially from the rim. */
  slotDepthMm: number;
  slotWidthMm: number;
}

/**
 * A Geneva star wheel: radial slots with parallel sides and a semicircular end.
 * The slots open through the rim, so they are part of the outer outline rather
 * than holes.
 */
export function genevaOutline(input: GenevaInput): Point2D[] {
  const slots = Math.max(3, Math.round(input.slots));
  const radius = Math.max(2, input.outerRadiusMm);
  const halfWidth = Math.max(0.2, input.slotWidthMm / 2);
  const depth = Math.max(0.5, Math.min(input.slotDepthMm, radius - halfWidth - 0.2));
  const bottom = radius - depth;
  const arcCentre = bottom + halfWidth;
  const rimHalfAngle = Math.asin(Math.min(1, halfWidth / radius));
  const pitch = TWO_PI / slots;
  const endSteps = 12;
  const points: Point2D[] = [];
  const rimX = Math.sqrt(Math.max(0, radius * radius - halfWidth * halfWidth));

  for (let i = 0; i < slots; i += 1) {
    const centre = i * pitch;
    const next = centre + pitch;
    const rimSteps = Math.max(3, Math.ceil(((pitch - 2 * rimHalfAngle) * radius) / 0.8));
    points.push(
      ...arcPoints(
        0,
        0,
        radius,
        centre + rimHalfAngle,
        next - rimHalfAngle,
        rimSteps,
      ),
    );

    // The slot is built in its own frame (+X along the slot) and then rotated
    // onto the rim, so its parallel sides stay square to its centre line.
    const cos = Math.cos(next);
    const sin = Math.sin(next);
    const place = (x: number, y: number) => ({
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    });

    points.push(place(rimX, -halfWidth));
    for (let k = 1; k <= endSteps; k += 1) {
      const angle = -Math.PI / 2 - (Math.PI * k) / endSteps;
      points.push(
        place(arcCentre + halfWidth * Math.cos(angle), halfWidth * Math.sin(angle)),
      );
    }
    points.push(place(rimX, halfWidth));
  }

  return dropCollinear(points);
}

/* --------------------------------------------------------------- saw blade */

export interface SawBladeInput {
  teeth: number;
  outerRadiusMm: number;
  toothDepthMm: number;
  hookAngleDeg: number;
  tipLandMm: number;
}

export function sawBladeOutline(input: SawBladeInput): Point2D[] {
  const teeth = Math.max(6, Math.round(input.teeth));
  const pitch = TWO_PI / teeth;
  const outer = Math.max(5, input.outerRadiusMm);
  const root = Math.max(1, outer - Math.max(0.5, input.toothDepthMm));
  const hook = (Math.max(-10, Math.min(30, input.hookAngleDeg)) * Math.PI) / 180;
  const tipHalf = Math.max(0, input.tipLandMm) / (2 * outer);
  const points: Point2D[] = [];

  for (let i = 0; i < teeth; i += 1) {
    const centre = i * pitch;
    points.push(polar(root, centre));
    // Hook face rising forward from the root.
    points.push(polar(outer, centre + hook));
    points.push(
      ...arcPoints(0, 0, outer, centre + hook, centre + hook + 2 * tipHalf, 3),
    );
    // Straight clearance back to the next root.
    points.push(polar(root, centre + pitch));
  }

  return dropCollinear(points);
}

/* --------------------------------------------------------------- wrenches */

export interface OpenEndWrenchInput {
  lengthMm: number;
  headDiameterMm: number;
  jawWidthMm: number;
  jawDepthMm: number;
  handleWidthMm: number;
}

export function openEndWrenchOutline(input: OpenEndWrenchInput): Point2D[] {
  const headRadius = Math.max(1, input.headDiameterMm / 2);
  const halfJaw = Math.max(0.5, input.jawWidthMm / 2);
  if (halfJaw >= headRadius * 0.95) throw new Error("The jaw opening is wider than the head.");
  const length = Math.max(headRadius * 1.4, input.lengthMm);
  const halfHandle = Math.max(1, Math.min(input.handleWidthMm / 2, headRadius * 0.9));
  const depth = Math.max(0.5, Math.min(input.jawDepthMm, headRadius * 1.6));
  const jawBack = headRadius - depth;
  const mouthAngle = Math.asin(halfJaw / headRadius);
  const handleAngle = Math.asin(halfHandle / headRadius);
  const handleEnd = headRadius - length;
  const tipRadius = halfHandle;
  const tipCentre = handleEnd + tipRadius;
  const attachX = -Math.sqrt(Math.max(0, headRadius * headRadius - halfHandle * halfHandle));

  const points: Point2D[] = [];
  // Outside of the head, from the upper jaw mouth counter-clockwise to the handle.
  points.push(...arcPoints(0, 0, headRadius, mouthAngle, Math.PI - handleAngle, 40));
  points.push({ x: attachX, y: halfHandle });
  points.push({ x: tipCentre, y: halfHandle });
  points.push(...arcPoints(tipCentre, 0, tipRadius, Math.PI / 2, (3 * Math.PI) / 2, 14));
  points.push({ x: attachX, y: -halfHandle });
  points.push(...arcPoints(0, 0, headRadius, Math.PI + handleAngle, TWO_PI - mouthAngle, 40));
  points.push({ x: jawBack, y: -halfJaw });
  // Slot end: a semicircle that bulges towards the handle.
  points.push(...arcPoints(jawBack, 0, halfJaw, -Math.PI / 2, -1.5 * Math.PI, 14));
  points.push({ x: jawBack, y: halfJaw });

  return dropCollinear(points);
}

export interface BoxWrenchInput {
  lengthMm: number;
  headDiameterMm: number;
  headBoreMm: number;
  handleWidthMm: number;
  /** Points of the socket opening; 6 or 12 are the usual choices. */
  points: number;
}

export function boxWrenchParts(input: BoxWrenchInput): {
  outline: Point2D[];
  hole: Point2D[];
} {
  const headRadius = Math.max(2, input.headDiameterMm / 2);
  const halfHandle = Math.max(1, Math.min(input.handleWidthMm / 2, headRadius * 0.9));
  const length = Math.max(headRadius * 1.4, input.lengthMm);
  const handleEnd = headRadius - length;
  const tipRadius = halfHandle;
  const tipCentre = handleEnd + tipRadius;
  const attachX = -Math.sqrt(Math.max(0, headRadius * headRadius - halfHandle * halfHandle));
  const handleAngle = Math.asin(halfHandle / headRadius);

  const outline: Point2D[] = [];
  outline.push({ x: attachX, y: halfHandle });
  outline.push({ x: tipCentre, y: halfHandle });
  outline.push(...arcPoints(tipCentre, 0, tipRadius, Math.PI / 2, (3 * Math.PI) / 2, 14));
  outline.push({ x: attachX, y: -halfHandle });
  outline.push(...arcPoints(0, 0, headRadius, Math.PI + handleAngle, 3 * Math.PI - handleAngle, 64));

  const sides = Math.max(6, Math.round(input.points));
  const apothem = Math.max(0.5, input.headBoreMm / 2);
  const circumRadius = apothem / Math.cos(Math.PI / sides);

  const polygon: Point2D[] = [];
  for (let i = 0; i < sides; i += 1) {
    polygon.push(polar(circumRadius, (TWO_PI * i) / sides));
  }

  return { outline: dropCollinear(outline), hole: polygon };
}

/* -------------------------------------------------------------- handwheel */

export interface HandwheelParts {
  outline: Point2D[];
  holes: Point2D[][];
  gapAreaMm2: number;
}

export function handwheelParts(input: {
  outerDiameterMm: number;
  hubDiameterMm: number;
  boreMm: number;
  rimWidthMm: number;
  spokeWidthMm: number;
  spokes: number;
}): HandwheelParts {
  const radius = Math.max(3, input.outerDiameterMm / 2);
  const hubRadius = Math.max(1, input.hubDiameterMm / 2);
  const rimWidth = Math.max(0.8, Math.min(input.rimWidthMm, radius - hubRadius - 1));
  const inner = radius - rimWidth;
  if (inner <= hubRadius + 0.5) throw new Error("The rim and hub meet — thin the rim.");
  const boreRadius = Math.max(0.3, input.boreMm / 2);
  if (boreRadius > hubRadius - 0.8) throw new Error("The bore leaves no hub wall.");
  const spokes = Math.max(3, Math.round(input.spokes));
  const halfAngle = Math.max(0.02, input.spokeWidthMm / 2 / hubRadius);
  const pitch = TWO_PI / spokes;
  if (pitch / 2 <= halfAngle + 0.01) {
    throw new Error("The spokes fill the hub — reduce their width or count.");
  }

  const outline = circleOutline(radius, Math.max(96, Math.ceil(radius * 6)));
  const holes: Point2D[][] = [circleOutline(boreRadius, 64)];

  for (let i = 0; i < spokes; i += 1) {
    const start = i * pitch + halfAngle;
    const end = (i + 1) * pitch - halfAngle;
    const gap: Point2D[] = [];
    gap.push(
      ...arcPoints(
        0,
        0,
        hubRadius,
        start,
        end,
        Math.max(4, Math.ceil((end - start) * hubRadius)),
      ),
      polar(hubRadius, end),
    );
    gap.push(
      ...arcPoints(
        0,
        0,
        inner,
        end,
        start,
        Math.max(4, Math.ceil((end - start) * inner)),
      ),
      polar(inner, start),
    );
    holes.push(gap);
  }

  const gapArea =
    (pitch - 2 * halfAngle) * (inner * inner - hubRadius * hubRadius) * 0.5;

  return { outline, holes, gapAreaMm2: Math.abs(gapArea) };
}

/* ------------------------------------------------------------------- rack */

export interface RackInput {
  teeth: number;
  moduleMm: number;
  pressureAngleDeg: number;
  backlashMm: number;
  /** Bar height under the root line. */
  baseHeightMm: number;
}

export interface RackGeometry {
  pitchMm: number;
  lengthMm: number;
  toothHeightMm: number;
  addendumMm: number;
  dedendumMm: number;
  baseHeightMm: number;
  totalHeightMm: number;
  tipHalfThicknessMm: number;
  rootHalfThicknessMm: number;
}

export function rackGeometry(input: RackInput): RackGeometry {
  const teeth = Math.max(2, Math.round(input.teeth));
  const module = Math.max(0.2, input.moduleMm);
  const alpha = (Math.max(10, Math.min(30, input.pressureAngleDeg)) * Math.PI) / 180;
  const pitch = Math.PI * module;
  const addendum = module;
  const dedendum = 1.25 * module;
  const halfPitchThickness = (pitch / 2 - Math.max(0, input.backlashMm)) / 2;
  const tipHalf = Math.max(0, halfPitchThickness - addendum * Math.tan(alpha));
  const rootHalf = halfPitchThickness + dedendum * Math.tan(alpha);
  return {
    pitchMm: pitch,
    lengthMm: teeth * pitch,
    toothHeightMm: addendum + dedendum,
    addendumMm: addendum,
    dedendumMm: dedendum,
    baseHeightMm: Math.max(1, input.baseHeightMm),
    totalHeightMm: Math.max(1, input.baseHeightMm) + addendum + dedendum,
    tipHalfThicknessMm: tipHalf,
    rootHalfThicknessMm: rootHalf,
  };
}

export function rackOutline(input: RackInput): Point2D[] {
  const g = rackGeometry(input);
  if (g.rootHalfThicknessMm * 2 >= g.pitchMm) {
    throw new Error("The teeth overlap at the root line — reduce the module or backlash.");
  }
  const rootY = g.baseHeightMm;
  const tipY = g.baseHeightMm + g.toothHeightMm;

  const top: Point2D[] = [];
  top.push({ x: 0, y: rootY });
  for (let i = 0; i < Math.round(input.teeth); i += 1) {
    const centre = (i + 0.5) * g.pitchMm;
    // Root land to the start of the rising flank, measured on the root line.
    top.push({ x: centre - g.rootHalfThicknessMm, y: rootY });
    // The rack flank is straight at the pressure angle, from root line to tip.
    top.push({ x: centre - g.tipHalfThicknessMm, y: tipY });
    // Tip land.
    top.push({ x: centre + g.tipHalfThicknessMm, y: tipY });
    // Falling flank.
    top.push({ x: centre + g.rootHalfThicknessMm, y: rootY });
  }
  top.push({ x: g.lengthMm, y: rootY });

  const points: Point2D[] = [
    { x: 0, y: 0 },
    { x: g.lengthMm, y: 0 },
    ...top.slice().reverse(),
  ];
  return dropCollinear(dedupe(points));
}
