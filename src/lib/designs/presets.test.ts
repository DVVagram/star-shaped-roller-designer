import { describe, expect, it } from "vitest";

import { DESIGNS, designById } from "./index";
import {
  buildDesignPresets,
  presetMatches,
  presetValuesForUnits,
} from "./presets";

describe("starting presets", () => {
  it("produces valid compact and oversize variants without changing non-length choices", () => {
    for (const id of ["centering-cone", "timing-pulley", "cup", "fan-mount"]) {
      const design = designById(id);
      expect(design).toBeDefined();
      const presets = buildDesignPresets(design!);
      expect(presets[0].id).toBe("standard");
      expect(presets.length).toBeGreaterThanOrEqual(2);
      for (const preset of presets) {
        const result = design!.derive({ values: preset.values, units: "mm" });
        expect(result.errors, `${id}: ${preset.label}`).toEqual([]);
        for (const field of design!.fields) {
          if (field.kind !== "length") {
            expect(preset.values[field.key]).toBe(design!.defaults[field.key]);
          }
        }
      }
    }
  });

  it("never emits an invalid preset across the library", () => {
    for (const design of DESIGNS) {
      const presets = buildDesignPresets(design);
      expect(presets[0].id).toBe("standard");
      if (design.lengthFields.length > 0) {
        expect(presets.length, `${design.id} should have a scaled preset`).toBeGreaterThan(
          1,
        );
      }
      for (const preset of presets) {
        const result = design.derive({ values: preset.values, units: "mm" });
        expect(result.errors, `${design.id}: ${preset.label}`).toEqual([]);
      }
    }
  });

  it("converts a millimetre preset into the active display unit", () => {
    const inches = presetValuesForUnits({ large: "50.8" }, ["large"], "in");
    expect(inches.large).toBe("2");
    expect(
      presetMatches(
        inches,
        {
          id: "standard",
          label: "Standard",
          description: "",
          values: { large: "50.8" },
        },
        ["large"],
        "in",
      ),
    ).toBe(true);
  });
});
