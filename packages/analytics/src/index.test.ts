import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, sanitizeProps } from "./index.js";

describe("analytics contract", () => {
  it("contains the funnel events", () => {
    expect(Object.keys(ANALYTICS_EVENTS)).toContain("university_verified");
    expect(Object.keys(ANALYTICS_EVENTS)).toContain("resume_uploaded");
  });
  it("strips sensitive props", () => {
    expect(sanitizeProps({ university: "X", email: "a@b.c", count: 3 })).toEqual({
      university: "X",
      count: 3,
    });
  });
});
