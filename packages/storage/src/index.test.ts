import { describe, expect, it } from "vitest";
import { buildObjectKey, validateUpload } from "./index.js";

describe("validateUpload", () => {
  it("accepts a small pdf resume", () => {
    expect(validateUpload({ kind: "resume", mime: "application/pdf", bytes: 1000 }).ok).toBe(true);
  });
  it("rejects wrong mime and oversize", () => {
    expect(validateUpload({ kind: "resume", mime: "image/png", bytes: 100 }).ok).toBe(false);
    expect(validateUpload({ kind: "resume", mime: "application/pdf", bytes: 99_999_999 }).ok).toBe(
      false,
    );
  });
});

describe("buildObjectKey", () => {
  it("scopes to owner and sanitizes", () => {
    const key = buildObjectKey("user-1", "My Résumé 2024.PDF");
    expect(key.startsWith("user-1/")).toBe(true);
    expect(key).not.toContain(" ");
  });
});
