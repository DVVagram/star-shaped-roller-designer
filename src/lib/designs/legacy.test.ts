import { describe, expect, it } from "vitest";

import { DEFAULT_BUILDER_STATE } from "@/lib/star/builder";
import { fanDefaultValues } from "@/lib/fan";
import { propellerDefaultValues } from "@/lib/propeller";
import { sprocketDefaultValues } from "@/lib/sprocket";

import { renderRecordDrawingSvg } from "./drawing";
import { designById } from "./index";
import {
  fanEnteredValues,
  LEGACY_CONTRACTS,
  legacyRecord,
  propellerEnteredValues,
  sprocketEnteredValues,
  starEnteredValues,
} from "./legacy";
import { renderRecordSpecification } from "./spec";

const mesh = designById("centering-cone")!.build({
  values: designById("centering-cone")!.defaults,
  units: "mm",
});

describe("legacy designer records", () => {
  it("gives the original four the same capability statement", () => {
    for (const [id, contract] of Object.entries(LEGACY_CONTRACTS)) {
      expect(contract.capability).toBe("fit");
      expect(contract.intendedUse.length).toBeGreaterThan(20);
      expect(contract.limitations.length).toBeGreaterThanOrEqual(2);
      expect(contract.notChecked.join(" ")).toContain("Minimum wall thickness");
      expect(id.length).toBeGreaterThan(2);
    }
    expect(LEGACY_CONTRACTS.star.limitations.join(" ")).toContain("rated drive wheel");
    expect(LEGACY_CONTRACTS.sprocket.limitations.join(" ")).toContain("Chain engagement");
  });

  it("lists every entered value for each legacy form", () => {
    const star = starEnteredValues(DEFAULT_BUILDER_STATE);
    const sprocket = sprocketEnteredValues(sprocketDefaultValues(), "mm", {
      toothProfile: "standard",
      boreShape: "round",
      hubEnabled: false,
    });
    const fan = fanEnteredValues(fanDefaultValues(), "mm", "round");
    const propeller = propellerEnteredValues(propellerDefaultValues(), "mm", "round");

    for (const inputs of [star, sprocket, fan, propeller]) {
      expect(inputs.length).toBeGreaterThanOrEqual(12);
      for (const input of inputs) {
        expect(input.label.length).toBeGreaterThan(2);
        expect(input.value.trim().length).toBeGreaterThan(0);
        expect(input.value).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
    expect(star.map((i) => i.label)).toContain("Wheel diameter");
    expect(sprocket.map((i) => i.label)).toContain("Chain pitch");
    expect(fan.map((i) => i.label)).toContain("Blade angle");
    expect(propeller.map((i) => i.label)).toContain("Pitch");
    expect(propeller.map((i) => i.label)).toContain("Blade sweep");
  });

  it("records the raw typed strings, including inch entries", () => {
    const star = starEnteredValues({
      ...DEFAULT_BUILDER_STATE,
      units: "in",
      values: {
        ...DEFAULT_BUILDER_STATE.values,
        outerDiameter: "3.25",
        thickness: "0.5",
        bore: "0.375",
      },
    });
    expect(star.find((i) => i.label === "Wheel diameter")?.value).toBe("3.25 in");
    expect(star.find((i) => i.label === "Thickness")?.value).toBe("0.5 in");
    expect(star.find((i) => i.label === "Centre hole")?.value).toBe("0.375 in");

    const sprocket = sprocketEnteredValues(
      { ...sprocketDefaultValues(), pitch: "0.5", roller: "0.3125" },
      "in",
      { toothProfile: "standard", boreShape: "hex", hubEnabled: true },
    );
    expect(sprocket.find((i) => i.label === "Chain pitch")?.value).toBe("0.5 in");
    expect(sprocket.find((i) => i.label === "Roller diameter")?.value).toBe("0.3125 in");
    expect(sprocket.find((i) => i.label === "Hole shape")?.value).toBe("Hex");

    const fan = fanEnteredValues(
      { ...fanDefaultValues(), tipDiameter: "6", bladeAngle: "34.5" },
      "in",
      "doubleFlat",
    );
    expect(fan.find((i) => i.label === "Tip diameter")?.value).toBe("6 in");
    expect(fan.find((i) => i.label === "Blade angle")?.value).toBe("34.5°");
    expect(fan.find((i) => i.label === "Hole shape")?.value).toBe("Double flat");

    const propeller = propellerEnteredValues(
      { ...propellerDefaultValues(), pitch: "5.5" },
      "in",
      "round",
    );
    expect(propeller.find((i) => i.label === "Pitch")?.value).toBe("5.5 in");

    const record = legacyRecord(
      "star",
      "Star roller",
      star,
      [{ label: "Spikes", value: "20", source: "input" }],
      [],
      mesh,
    );
    const spec = renderRecordSpecification(record, {
      generatedAt: new Date("2026-11-21T00:00:00Z"),
    });
    expect(spec).toContain("- Wheel diameter: 3.25 in");
    expect(spec).toContain("- Thickness: 0.5 in");
    expect(spec).toContain("- Centre hole: 0.375 in");
    expect(spec).not.toContain("- Wheel diameter: 82.55 mm");
  });

  it("writes a specification and a dimension sheet from a legacy mesh", () => {
    const record = legacyRecord(
      "star",
      "Star roller",
      starEnteredValues(DEFAULT_BUILDER_STATE),
      [
        { label: "Spikes", value: "24", source: "input" },
        { label: "Volume", value: "12.4 cm³", source: "calc" },
      ],
      ["Spike land is narrow."],
      mesh,
    );
    const spec = renderRecordSpecification(record, {
      generatedAt: new Date("2026-11-21T00:00:00Z"),
    });

    expect(spec).toContain("Design ID: star");
    expect(spec).toContain("Fit prototype");
    expect(spec).toContain("Wheel diameter");
    expect(spec).toContain("Spikes: 24");
    expect(spec).toContain("Spike land is narrow.");
    expect(spec).toContain("MESH CHECKS PERFORMED");
    expect(spec).not.toMatch(/build volume|printer|slicer|print bed/i);
    expect(spec).toContain("STL is unitless");
    expect(spec).not.toMatch(/NaN|Infinity/);

    const svg = renderRecordDrawingSvg({
      id: record.id,
      name: record.name,
      contract: record.contract,
      mesh,
    });
    expect(svg).toContain("Star roller — measurement sheet");
    expect(svg).toContain("Capability: Fit prototype");
    expect(svg).toContain("Not a tolerance drawing");
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});
