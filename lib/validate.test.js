import { describe, it, expect } from "vitest";
import { validateDogInput } from "./validate";

const ok = { dogName: "Nova", ownerName: "Sam", phone: "+1 555 010 2030", breed: "Poodle", lastGroomDate: "2026-09-01", ownerEmail: "sam@x.com" };

describe("validateDogInput", () => {
  it("accepts a good record", () => {
    const r = validateDogInput(ok);
    expect(r.error).toBeUndefined();
    expect(r.values.dogName).toBe("Nova");
  });
  it("requires fields on create", () => {
    expect(validateDogInput({ ...ok, ownerEmail: "" }).error).toMatch(/required/);
  });
  it("rejects bad email, phone, date, weeks", () => {
    expect(validateDogInput({ ...ok, ownerEmail: "nope" }).error).toMatch(/email/i);
    expect(validateDogInput({ ...ok, phone: "abc" }).error).toMatch(/phone/i);
    expect(validateDogInput({ ...ok, lastGroomDate: "2026-02-31" }).error).toMatch(/date/i);
    expect(validateDogInput({ ...ok, lastGroomDate: "2099-01-01" }).error).toMatch(/future/i);
    expect(validateDogInput({ ...ok, customWeeks: 0 }).error).toMatch(/1 to 52/);
    expect(validateDogInput({ ...ok, customWeeks: 500 }).error).toMatch(/1 to 52/);
  });
  it("rejects oversized text", () => {
    expect(validateDogInput({ ...ok, dogName: "x".repeat(81) }).error).toMatch(/80/);
    expect(validateDogInput({ ...ok, notes: "x".repeat(1001) }).error).toMatch(/1000/);
  });
  it("partial update only checks what is sent", () => {
    expect(validateDogInput({ notes: "hi" }, { partial: true }).values).toEqual({ notes: "hi" });
    expect(validateDogInput({ ownerEmail: "" }, { partial: true }).values).toEqual({ ownerEmail: null });
    expect(validateDogInput({ intervalWeeks: 6 }, { partial: true }).values).toEqual({ intervalWeeks: 6 });
  });
});
