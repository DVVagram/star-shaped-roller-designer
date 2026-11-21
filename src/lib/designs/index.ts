/** Every designer added in this branch, in catalog order. */

import { motionDesigns } from "./motion-designs";
import { prismBatch3 } from "./prism-batch3";
import { textProducts } from "./text-products";
import { revolveFittings } from "./revolve-fittings";
import { revolveUtility } from "./revolve-utility";
import { revolveFasteners } from "./revolve-fasteners";
import { revolveHome } from "./revolve-home";
import { revolveWorkshop } from "./revolve-workshop";
import { workshopBrackets } from "./workshop-brackets";
import { workshopClamps } from "./workshop-clamps";
import { workshopMounts } from "./workshop-mounts";
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
  workshopBrackets,
  workshopClamps,
  workshopMounts,
  revolveFasteners,
  revolveWorkshop,
  revolveHome,
  revolveUtility,
  revolveFittings,
  prismBatch3,
  textProducts,
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
  prismBatch3,
  textProducts,
  revolveFittings,
  revolveUtility,
  revolveFasteners,
  revolveHome,
  revolveWorkshop,
  workshopBrackets,
  workshopClamps,
  workshopMounts,
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
