/** Every designer added in this branch, in catalog order. */

import { motionDesigns } from "./motion-designs";
import { prismDiscs } from "./prism-discs";
import { prismGears } from "./prism-gears";
import { prismHardware } from "./prism-hardware";
import { prismParts } from "./prism-parts";
import { prismPlates } from "./prism-plates";
import { revolveHousehold } from "./revolve-household";
import { revolveMechanical } from "./revolve-mechanical";
import { revolveParts } from "./revolve-parts";
import { revolveVessels } from "./revolve-vessels";
import type { AnyDesign, DesignFamily } from "./types";

export const DESIGN_GROUPS: AnyDesign[][] = [
  prismGears,
  prismParts,
  prismHardware,
  prismPlates,
  prismDiscs,
  revolveVessels,
  revolveMechanical,
  revolveHousehold,
  revolveParts,
  motionDesigns,
];

export const DESIGNS: AnyDesign[] = DESIGN_GROUPS.flat();

export const DESIGN_BY_ID = new Map<string, AnyDesign>(
  DESIGNS.map((design) => [design.id, design]),
);

export function designById(id: string): AnyDesign | undefined {
  return DESIGN_BY_ID.get(id);
}

export function designsInFamily(family: DesignFamily): AnyDesign[] {
  return DESIGNS.filter((design) => design.family === family);
}

export {
  motionDesigns,
  prismDiscs,
  prismGears,
  prismHardware,
  prismParts,
  prismPlates,
  revolveHousehold,
  revolveMechanical,
  revolveParts,
  revolveVessels,
};
