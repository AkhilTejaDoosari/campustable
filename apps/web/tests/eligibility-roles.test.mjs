// Eligibility + role/capacity gates + forward-only lifecycle.
// Imports the real helpers from src/lib (read-only). Hermetic: no I/O, no network.
//
// NOTE: capacity races are enforced transactionally in Postgres by
// `accept_collaboration_request` (row lock FOR UPDATE). These unit tests cover
// the app-layer gate (`isRoleAccepting`); the concurrent-capacity procedure is
// documented in supabase/tests/race.md + race-assertions.sql as pending live DB.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isEligibleForLocalProject,
  isRoleAccepting,
  isForwardStage,
} from "../src/lib/operations.ts";

describe("isEligibleForLocalProject (local-only rejection)", () => {
  it("admits verified members of the project university", () => {
    assert.equal(
      isEligibleForLocalProject("univ-a", true, ["univ-a", "univ-b"]),
      true,
    );
  });

  it("rejects cross-university requesters on local-only projects (negative case)", () => {
    assert.equal(isEligibleForLocalProject("univ-a", true, ["univ-b"]), false);
  });

  it("rejects unverified requesters on local-only projects (negative case)", () => {
    assert.equal(isEligibleForLocalProject("univ-a", true, []), false);
  });

  it("non-local projects admit everyone", () => {
    assert.equal(isEligibleForLocalProject("univ-a", false, []), true);
    assert.equal(isEligibleForLocalProject("univ-a", null, []), true);
  });

  it("local-only flag without a university scope admits everyone", () => {
    assert.equal(isEligibleForLocalProject(null, true, []), true);
  });
});

describe("isRoleAccepting (closed-role conflict)", () => {
  it("open roles accept new requests", () => {
    assert.equal(isRoleAccepting("open"), true);
  });

  it("filled roles reject new requests (negative case)", () => {
    assert.equal(isRoleAccepting("filled"), false);
  });

  it("closed roles reject new requests (negative case)", () => {
    assert.equal(isRoleAccepting("closed"), false);
  });
});

describe("isForwardStage (terminal stages reject joins)", () => {
  it("allows forward movement draft -> open -> in_progress", () => {
    assert.equal(isForwardStage("draft", "open"), true);
    assert.equal(isForwardStage("open", "in_progress"), true);
  });

  it("completed and closed are terminal (negative cases)", () => {
    assert.equal(isForwardStage("completed", "open"), false);
    assert.equal(isForwardStage("closed", "open"), false);
    assert.equal(isForwardStage("closed", "in_progress"), false);
  });

  it("same-stage transitions are allowed (idempotent updates)", () => {
    assert.equal(isForwardStage("open", "open"), true);
  });
});
