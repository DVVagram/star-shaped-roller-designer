import { describe, expect, it } from "vitest";

import { DESIGNS } from "./index";

/**
 * The catalogue must not promise a real-world behaviour that no test, standard
 * or measurement backs. These phrases all imply verified function, fit, safety
 * or standard compliance, so they are rejected in user-facing design copy.
 */
const BANNED = [
  /ready to slice/i,
  /actually engages/i,
  /will seal/i,
  /will hold/i,
  /moves air/i,
  /food[- ]safe/i,
  /standard fit/i,
  /true [a-z ]*fit/i,
  /guaranteed/i,
];

describe("design copy claims", () => {
  it("does not promise unverified function, fit, safety or standards", () => {
    for (const design of DESIGNS) {
      const texts = [
        design.name,
        design.eyebrow,
        design.blurb,
        design.lede,
        design.use,
        ...design.chips.map((chip) => `${chip.label} ${chip.value}`),
        ...design.notes,
        design.notesTitle,
        design.contract.standard,
        design.contract.mating,
        design.contract.fitAllowance,
        ...design.contract.limitations,
      ];
      for (const text of texts) {
        for (const pattern of BANNED) {
          expect(text, `${design.id}: "${text}" matches ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });

  it("says what the part is not, as well as what it is", () => {
    for (const design of DESIGNS) {
      const limits = design.contract.limitations.join(" ").toLowerCase();
      expect(limits.length, design.id).toBeGreaterThan(80);
      expect(
        /not |no |unverified|not verified|excluded|without /.test(limits),
        `${design.id} limitations never state a negative`,
      ).toBe(true);
    }
  });
});
