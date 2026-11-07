import { describe, it, expect } from "vitest";
import { suggestSize } from "./breedSize";
import { BREED_INTERVALS } from "./breedIntervals";

describe("suggestSize", () => {
  it("guesses from the breed", () => {
    expect(suggestSize("Maltese")).toBe("small");
    expect(suggestSize("Labrador Retriever")).toBe("large");
    expect(suggestSize("Beagle")).toBe("medium");
  });
  it("returns null for unknown breeds", () => {
    expect(suggestSize("Dragon")).toBe(null);
    expect(suggestSize(undefined)).toBe(null);
  });
  it("covers every breed in the breed list", () => {
    for (const breed of Object.keys(BREED_INTERVALS)) expect(suggestSize(breed)).not.toBe(null);
  });
});
