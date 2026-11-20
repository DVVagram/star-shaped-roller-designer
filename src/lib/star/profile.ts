import {
  SPIKE_SHAPES,
  TWO_PI,
  StarGeometryError,
  polygonArea,
  spikeLayout,
  type Point2D,
  type SpikeLayout,
  type StarSpec,
} from "./geometry";

export interface ProfileSamples {
  flank: number;
  valley: number;
  tip: number;
}

/** How finely each part of one spike period is sampled. */
export function sampleCounts(spikeCount: number): ProfileSamples {
  if (spikeCount >= 64) return { flank: 6, valley: 3, tip: 2 };
  if (spikeCount >= 40) return { flank: 8, valley: 3, tip: 3 };
  if (spikeCount >= 24) return { flank: 10, valley: 4, tip: 3 };
  return { flank: 14, valley: 6, tip: 4 };
}

export interface ScheduleVertex {
  angle: number;
  /** 0 = valley radius, 1 = tip radius. Shared by both faces of the wheel. */
  t: number;
}

/**
 * The angular schedule of one complete turn.
 *
 * The schedule carries no radii, so the flat bottom face and the tapered top
 * face are evaluated from exactly the same vertices, in the same order. That is
 * what lets the side walls be stitched with matching indices and keeps the solid
 * watertight when the tips are tapered.
 *
 * Everything runs counter-clockwise. Each period starts at its valley centre;
 * the valley arc, the rising flank, the tip land and the falling flank are laid
 * out in order. The first point of every arc is left to the previous feature so
 * no vertex is repeated.
 */
export function starSchedule(
  spec: StarSpec,
  layout: SpikeLayout,
  samples: ProfileSamples,
): ScheduleVertex[] {
  const preset = SPIKE_SHAPES[spec.spikeShape] ?? SPIKE_SHAPES.rounded;
  const count = Math.max(3, Math.round(spec.spikeCount));
  const pitch = TWO_PI / count;
  const half = pitch / 2;

  const tipHalf = Math.min(layout.tipHalfAngleRad, half);
  const valleyHalf = Math.min(layout.valleyHalfAngleRad, half);
  const span = half - tipHalf - valleyHalf;
  if (!(span > 1e-6)) {
    throw new StarGeometryError(
      "The tip and valley lands fill the whole pitch — reduce them or the spike count.",
    );
  }

  const ease = (u: number): number =>
    preset.smooth ? u * u * (3 - 2 * u) : Math.pow(u, preset.flankExponent);

  const vertices: ScheduleVertex[] = [];

  for (let i = 0; i < count; i += 1) {
    const valleyCentre = i * pitch;

    // Valley land, starting after the point the previous flank already placed.
    if (valleyHalf > 0) {
      const steps = Math.max(1, samples.valley);
      for (let j = 1; j <= steps; j += 1) {
        vertices.push({
          angle: valleyCentre - valleyHalf + (2 * valleyHalf * j) / steps,
          t: 0,
        });
      }
    }

    // Rising flank: valley floor → tip land.
    for (let k = 1; k <= samples.flank; k += 1) {
      const u = k / samples.flank;
      vertices.push({ angle: valleyCentre + valleyHalf + u * span, t: ease(u) });
    }

    // Tip land, again skipping the point the rising flank just placed.
    if (tipHalf > 0) {
      const steps = Math.max(1, samples.tip);
      for (let m = 1; m <= steps; m += 1) {
        vertices.push({
          angle: valleyCentre + half - tipHalf + (2 * tipHalf * m) / steps,
          t: 1,
        });
      }
    }

    // Falling flank: tip land → valley floor.
    for (let k = samples.flank - 1; k >= 0; k -= 1) {
      const u = k / samples.flank;
      vertices.push({
        angle: valleyCentre + half + tipHalf + (1 - u) * span,
        t: ease(u),
      });
    }
  }

  return vertices;
}

export interface StarProfile {
  /** Bottom face outline, counter-clockwise, centred on the origin. */
  points: Point2D[];
  /** Top face outline — same vertices, tips tapered in. */
  topPoints: Point2D[];
  baseAreaMm2: number;
  topAreaMm2: number;
  samples: ProfileSamples;
  tipLandMm: number;
  valleyLandMm: number;
}

function place(angle: number, t: number, valleyRadius: number, tipRadius: number): Point2D {
  const radius = valleyRadius + (tipRadius - valleyRadius) * t;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

/**
 * Builds the closed star outline.
 *
 * `t` interpolates between the valley radius and the tip radius, so the tapered
 * top face is the same schedule with a smaller tip radius: the spikes narrow
 * towards that face while the core stays the same diameter.
 */
export function createStarProfile(spec: StarSpec): StarProfile {
  const tipRadius = spec.outerDiameterMm / 2;
  const valleyRadius = tipRadius - spec.spikeDepthMm;
  if (!(valleyRadius > 0.05) || !(tipRadius > valleyRadius + 1e-6)) {
    throw new StarGeometryError(
      "The spike depth must leave a core inside the wheel diameter.",
    );
  }

  const topTipRadius = tipRadius - Math.max(0, spec.taperMm);
  if (topTipRadius <= valleyRadius + 1e-6) {
    throw new StarGeometryError("The taper consumes the whole spike height.");
  }

  const layout = spikeLayout(spec, tipRadius, valleyRadius);
  if (layout.flankSpanRad <= 0) {
    throw new StarGeometryError(
      "The spikes are too crowded for these dimensions — reduce the spike count.",
    );
  }

  const samples = sampleCounts(spec.spikeCount);
  const schedule = starSchedule(spec, layout, samples);

  if (schedule.length < 6) {
    throw new StarGeometryError("Could not build a closed star profile.");
  }

  const points = schedule.map((vertex) =>
    place(vertex.angle, vertex.t, valleyRadius, tipRadius),
  );
  const topPoints = schedule.map((vertex) =>
    place(vertex.angle, vertex.t, valleyRadius, topTipRadius),
  );

  return {
    points,
    topPoints,
    baseAreaMm2: polygonArea(points),
    topAreaMm2: polygonArea(topPoints),
    samples,
    tipLandMm: layout.tipLandMm,
    valleyLandMm: layout.valleyLandMm,
  };
}
