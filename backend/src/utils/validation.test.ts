import { describe, expect, it } from "vitest";
import { validateCreate, validateUpdate } from "./validation.js";

describe("validateCreate", () => {
  it("returns no errors for a valid rocket", () => {
    const errors = validateCreate({ name: "Starship", range: "mars", capacity: 9 });

    expect(errors).toEqual([]);
  });

  it("reports an invalid range", () => {
    const errors = validateCreate({ name: "Starship", range: "interstellar", capacity: 9 });

    expect(errors).toContain("range must be one of: suborbital, orbital, moon, mars");
  });

  it("reports a capacity outside the allowed bounds", () => {
    const errors = validateCreate({ name: "Starship", range: "mars", capacity: 42 });

    expect(errors).toContain("capacity must be an integer between 1 and 10");
  });

  it("reports an empty name", () => {
    const errors = validateCreate({ name: "  ", range: "mars", capacity: 9 });

    expect(errors).toContain("name must be a non-empty string");
  });

  it("reports every invalid field at once", () => {
    const errors = validateCreate({ name: "", range: "bad", capacity: 0 });

    expect(errors).toHaveLength(3);
  });
});

describe("validateUpdate", () => {
  it("ignores fields that are absent from the body", () => {
    const errors = validateUpdate({ capacity: 5 });

    expect(errors).toEqual([]);
  });

  it("validates only the provided fields", () => {
    const errors = validateUpdate({ capacity: 99 });

    expect(errors).toEqual(["capacity must be an integer between 1 and 10"]);
  });
});
