// Silent-decline mapping: senders never observe `declined`.
// Imports the real helper from src/lib (read-only). Hermetic: no I/O, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { visibleRequestStatus } from "../src/lib/operations.ts";

function makeRequest(overrides = {}) {
  return {
    id: "req-1",
    project_id: "proj-1",
    role_id: "role-1",
    from_user_id: "sender",
    to_user_id: "owner",
    status: "pending",
    message: "Hello",
    idempotency_key: "key-1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("visibleRequestStatus (silent decline)", () => {
  it("sender still sees pending after a decline", () => {
    const row = makeRequest({ status: "declined" });
    assert.equal(visibleRequestStatus(row, "sender"), "pending");
  });

  it("owner (recipient) sees the true declined state", () => {
    const row = makeRequest({ status: "declined" });
    assert.equal(visibleRequestStatus(row, "owner"), "declined");
  });

  it("unrelated viewers also see pending, never declined", () => {
    const row = makeRequest({ status: "declined" });
    assert.equal(visibleRequestStatus(row, "stranger"), "pending");
  });

  it("accepted stays accepted for everyone", () => {
    const row = makeRequest({ status: "accepted" });
    assert.equal(visibleRequestStatus(row, "sender"), "accepted");
    assert.equal(visibleRequestStatus(row, "owner"), "accepted");
  });

  it("withdrawn stays withdrawn for everyone", () => {
    const row = makeRequest({ status: "withdrawn" });
    assert.equal(visibleRequestStatus(row, "sender"), "withdrawn");
    assert.equal(visibleRequestStatus(row, "owner"), "withdrawn");
  });

  it("pending stays pending for everyone", () => {
    const row = makeRequest({ status: "pending" });
    assert.equal(visibleRequestStatus(row, "sender"), "pending");
    assert.equal(visibleRequestStatus(row, "owner"), "pending");
  });
});
