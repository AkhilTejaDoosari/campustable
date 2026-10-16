import { describe, expect, it } from "vitest";
import { paginate, parseIdempotencyKey } from "./index.js";

describe("paginate", () => {
  it("defaults invalid input and clamps the ceiling", () => {
    expect(paginate(0, 0)).toEqual({ limit: 20, offset: 0, page: 1, pageSize: 20 });
    expect(paginate(2, 200).pageSize).toBe(100);
    expect(paginate(3, 10)).toEqual({ limit: 10, offset: 20, page: 3, pageSize: 10 });
  });
});

describe("parseIdempotencyKey", () => {
  it("accepts valid keys and rejects junk", () => {
    expect(parseIdempotencyKey("abc-123_XY")).toBe("abc-123_XY");
    expect(parseIdempotencyKey(null)).toBeNull();
    expect(parseIdempotencyKey("short")).toBeNull();
    expect(parseIdempotencyKey("has spaces!!")).toBeNull();
  });
});
