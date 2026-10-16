import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@campustable/shared";

describe("api error contract", () => {
  it("exposes stable codes used by handlers", () => {
    for (const code of ["E.UNAUTHENTICATED", "E.INVALID_CODE", "E.RESEND_THROTTLED"]) {
      expect(ERROR_CODES).toContain(code);
    }
  });
});
