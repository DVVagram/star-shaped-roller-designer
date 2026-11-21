/**
 * Generates docs/DESIGN-AUDIT.md from the registry and its contracts.
 * Run with: npx vite-node scripts/design-audit.ts
 */

import fs from "node:fs";

import { CAPABILITIES } from "../src/lib/designs/contracts";
import { DESIGNS } from "../src/lib/designs";

const counts = new Map<string, number>();
for (const design of DESIGNS) {
  counts.set(design.contract.capability, (counts.get(design.contract.capability) ?? 0) + 1);
}

const lines = [
  "# Designer audit",
  "",
  "Generated from the registry, so it cannot drift from the catalogue. Capability",
  "labels describe verified scope, not fitness. See `docs/CAPABILITY.md` for the",
  "checks actually performed and the evidence matrix.",
  "",
  `Designers: **${DESIGNS.length}**`,
  "",
  ...Object.entries(CAPABILITIES).map(
    ([id, meta]) => `- **${meta.label}**: ${counts.get(id as keyof typeof CAPABILITIES) ?? 0}`,
  ),
  "",
  "| ID | Capability | Intended use | Standard implemented | Required mate | First limitation |",
  "| --- | --- | --- | --- | --- | --- |",
  ...DESIGNS.map((design) => {
    const c = design.contract;
    const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\n/g, " ");
    return `| \`${design.id}\` | ${CAPABILITIES[c.capability].short} | ${cell(c.intendedUse)} | ${cell(c.standard)} | ${cell(c.mating)} | ${cell(c.limitations[0] ?? "")} |`;
  }),
  "",
  "Every entry is a standalone editable geometry unless its required mate says otherwise.",
  "No entry is certified for fit, load, pressure, heat, food contact or standards compliance.",
  "",
];

fs.writeFileSync("docs/DESIGN-AUDIT.md", lines.join("\n"));
console.log(`docs/DESIGN-AUDIT.md: ${DESIGNS.length} designers`);
