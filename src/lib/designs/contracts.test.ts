import { describe, expect, it } from "vitest";

import { CAPABILITIES, contractFor, VALIDATION_CHECKS } from "./contracts";
import { DESIGNS } from "./index";

const REQUIRED_NOT_CHECKED = [
  "Triangle self-intersection",
  "Minimum wall thickness",
  "Material strength",
  "Fit, clearance and tolerance",
];

describe("design contracts", () => {
  it("gives every designer a capability, mate, allowance and limitations", () => {
    expect(DESIGNS.length).toBeGreaterThan(0);
    for (const design of DESIGNS) {
      const contract = design.contract;
      expect({ id: design.id, capability: contract.capability }).toEqual({
        id: design.id,
        capability: expect.stringMatching(/^(shape|fit|functional|unsafe)$/),
      });
      expect(contract.intendedUse).toBe(design.use);
      expect(contract.standard.length).toBeGreaterThan(10);
      expect(contract.mating.length).toBeGreaterThan(10);
      expect(contract.fitAllowance.length).toBeGreaterThan(10);
      expect(contract.limitations.length).toBeGreaterThanOrEqual(2);
      expect(new Set(contract.limitations).size).toBe(contract.limitations.length);
      for (const limitation of contract.limitations) {
        expect(limitation.trim()).toBe(limitation);
        expect(limitation.length).toBeGreaterThan(20);
      }
      for (const item of REQUIRED_NOT_CHECKED) {
        expect(contract.notChecked.join(" ")).toContain(item);
      }
    }
  });

  it("uses every capability label with an explanatory description", () => {
    for (const meta of Object.values(CAPABILITIES)) {
      expect(meta.label.length).toBeGreaterThan(5);
      expect(meta.description.length).toBeGreaterThan(40);
      expect(meta.tone).toContain("border-");
    }
  });

  it("does not claim functionality without a recorded functional check", () => {
    const functional = DESIGNS.filter(
      (design) => design.contract.capability === "functional",
    );
    expect(functional).toEqual([]);
    for (const check of VALIDATION_CHECKS) expect(check.length).toBeGreaterThan(15);
  });

  it("excludes the named high-risk uses explicitly", () => {
    const unsafe = new Set(
      DESIGNS.filter((design) => design.contract.capability === "unsafe").map(
        (design) => design.id,
      ),
    );
    for (const id of [
      "centrifuge-tube",
      "brake-rotor",
      "saw-blade",
      "open-end-wrench",
      "box-wrench",
      "pipe-cap",
      "bulkhead-fitting",
      "flywheel",
      "piston",
    ]) {
      expect(unsafe.has(id), `${id} should exclude its high-risk use`).toBe(true);
    }
  });

  it("gives unverified claims a safe default for unknown ids", () => {
    const contract = contractFor("not-a-real-designer", "A test part for a fixture.");
    expect(contract.capability).toBe("fit");
    expect(contract.standard).toContain("No standard");
    expect(contract.limitations.length).toBeGreaterThanOrEqual(2);
  });

  it("states the chain, thread and seal limits where those names are used", () => {
    const chain = contractFor("sprocket", "A chain sprocket for a test rig.");
    expect(chain.standard).toContain("ANSI");
    expect(chain.mating).toContain("chain");

    const nut = DESIGNS.find((design) => design.id === "hex-nut")!.contract;
    expect(nut.standard).toContain("No thread");
    expect(nut.limitations.join(" ")).toContain("unthreaded");

    const oring = DESIGNS.find((design) => design.id === "oring-plug")!.contract;
    expect(oring.limitations.join(" ")).toContain("O-ring");
    expect(oring.limitations.join(" ")).toContain("seal");
  });
});
