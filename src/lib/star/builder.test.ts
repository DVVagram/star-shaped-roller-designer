import { describe, expect, it } from "vitest";

import { applyPresetValues, DEFAULT_BUILDER_STATE, setUnits } from "./builder";

describe("star builder presets", () => {
  it("keeps the active display unit when applying preset values", () => {
    const inches = setUnits(DEFAULT_BUILDER_STATE, "in");
    const applied = applyPresetValues(inches, inches.values);
    expect(applied.units).toBe("in");
    expect(applied.values.outerDiameter).toBe(inches.values.outerDiameter);
  });
});
