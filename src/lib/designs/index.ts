/** Every designer added on this branch, in catalog order. */

import { motionDesigns } from "./motion-designs";
import { prismGears } from "./prism-gears";
import { prismParts } from "./prism-parts";
import { revolveMechanical } from "./revolve-mechanical";
import { revolveVessels } from "./revolve-vessels";
import type { AnyDesign, DesignFamily } from "./types";

export const DESIGNS: AnyDesign[] = [
  ...prismGears,
  ...prismParts,
  ...revolveVessels,
  ...revolveMechanical,
  ...motionDesigns,
];

export const DESIGN_BY_ID = new Map<string, AnyDesign>(
  DESIGNS.map((design) => [design.id, design]),
);

export function designById(id: string): AnyDesign | undefined {
  return DESIGN_BY_ID.get(id);
}

export function designsInFamily(family: DesignFamily): AnyDesign[] {
  return DESIGNS.filter((design) => design.family === family);
}

export { motionDesigns, prismGears, prismParts, revolveMechanical, revolveVessels };
