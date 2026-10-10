// OTP lifecycle: expiry + attempt-limit + hash verification.
// Imports the real helpers from src/lib (read-only). Hermetic: no I/O, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OTP_LENGTH,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  otpExpiresAt,
  isOtpExpired,
  canAttemptOtp,
} from "../src/lib/verification.ts";
import { checkOtpRateLimit } from "../src/lib/rate-limit.ts";

describe("OTP code generation and verification", () => {
  it(`generates ${OTP_LENGTH}-digit numeric codes`, () => {
    for (let i = 0; i < 25; i += 1) {
      const code = generateOtpCode();
      assert.match(code, /^\d{6}$/);
    }
  });

  it("verifies the correct code against its stored hash", () => {
    const code = generateOtpCode();
    assert.equal(verifyOtpCode(code, hashOtpCode(code)), true);
  });

  it("rejects a wrong code (negative case)", () => {
    const stored = hashOtpCode("123456");
    assert.equal(verifyOtpCode("654321", stored), false);
  });

  it("hash is deterministic sha256 hex (64 chars), never the plaintext", () => {
    const hash = hashOtpCode("123456");
    assert.equal(hash.length, 64);
    assert.equal(hash, hashOtpCode("123456"));
    assert.ok(!hash.includes("123456"));
  });
});

describe("OTP expiry", () => {
  it("TTL is 15 minutes", () => {
    assert.equal(OTP_TTL_MS, 15 * 60_000);
  });

  it("fresh challenge is not expired; past expiry is expired", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const fresh = otpExpiresAt(now);
    assert.equal(isOtpExpired(fresh, now), false);
    assert.equal(
      isOtpExpired(fresh, new Date(now.getTime() + OTP_TTL_MS + 1)),
      true,
    );
  });

  it("expiry boundary is inclusive (expiresAt == now counts as expired)", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    assert.equal(isOtpExpired(t, t), true);
  });

  it("expired/wrong codes must not verify at the workflow level", () => {
    // Workflow rule (see docs/API.md): expired challenge => no affiliation.
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    const expiresAt = otpExpiresAt(issuedAt);
    const late = new Date(issuedAt.getTime() + OTP_TTL_MS + 1000);
    assert.equal(isOtpExpired(expiresAt, late), true);
  });
});

describe("OTP attempt limit", () => {
  it(`allows attempts below ${OTP_MAX_ATTEMPTS}, blocks at the cap`, () => {
    assert.equal(canAttemptOtp(0), true);
    assert.equal(canAttemptOtp(OTP_MAX_ATTEMPTS - 1), true);
    assert.equal(canAttemptOtp(OTP_MAX_ATTEMPTS), false);
    assert.equal(canAttemptOtp(OTP_MAX_ATTEMPTS + 10), false);
  });

  it("OTP rate guard is hermetic and eventually blocks a hot identity", () => {
    const identity = `otp-test-${Date.now()}-${Math.random()}`;
    let blocked = false;
    for (let i = 0; i < 20; i += 1) {
      const result = checkOtpRateLimit(identity);
      if (!result.allowed) {
        blocked = true;
        assert.ok(result.retryAfterMs >= 0);
        break;
      }
    }
    assert.equal(blocked, true);
  });
});
