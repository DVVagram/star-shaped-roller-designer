import { describe, expect, it } from "vitest";

import { decodeDesignConfig, encodeDesignConfig } from "./design-link";

describe("design links", () => {
  it("round-trips the design id and exact state", () => {
    const encoded = encodeDesignConfig("centering-cone", {
      values: { large: "36", small: "10.08" },
      units: "mm",
    });
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeDesignConfig(encoded)).toEqual({
      version: 1,
      id: "centering-cone",
      data: { values: { large: "36", small: "10.08" }, units: "mm" },
    });
  });

  it("rejects malformed and wrong-version payloads", () => {
    expect(decodeDesignConfig("not-base64")).toBeNull();
    expect(decodeDesignConfig(btoa(JSON.stringify({ version: 9, id: "cup", data: {} })))).toBeNull();
    expect(decodeDesignConfig(btoa(JSON.stringify({ version: 1, id: "", data: {} })))).toBeNull();
  });
});
