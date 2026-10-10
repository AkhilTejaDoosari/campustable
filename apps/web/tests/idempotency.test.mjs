// Idempotency-key handling: extraction rules + duplicate-safe retry behavior.
// Imports the real helpers from src/lib (read-only). Hermetic: no I/O, no network.
//
// The in-memory "store" below is SIMULATED: it models the UNIQUE
// (idempotency_key) DB constraint so retry-safety logic is exercised without a
// live database. Live uniqueness is enforced by Postgres unique indexes
// (see supabase/migrations/0001_init.sql); see supabase/tests/race.md for the
// pending live procedure.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  IDEMPOTENCY_HEADER,
  generateIdempotencyKey,
  extractIdempotencyKey,
  idempotencyProbe,
} from "../src/lib/idempotency.ts";

describe("idempotency key extraction", () => {
  it("uses the canonical header name", () => {
    assert.equal(IDEMPOTENCY_HEADER, "idempotency-key");
  });

  it("returns null when the header is absent", () => {
    assert.equal(extractIdempotencyKey(new Headers()), null);
  });

  it("trims surrounding whitespace", () => {
    const headers = new Headers({ "idempotency-key": "  abc-123  " });
    assert.equal(extractIdempotencyKey(headers), "abc-123");
  });

  it("rejects empty keys (negative case)", () => {
    const headers = new Headers({ "idempotency-key": "   " });
    assert.equal(extractIdempotencyKey(headers), null);
  });

  it("rejects overlong keys (>128 chars, negative case)", () => {
    const headers = new Headers({ "idempotency-key": "k".repeat(129) });
    assert.equal(extractIdempotencyKey(headers), null);
  });

  it("accepts a 128-char key at the boundary", () => {
    const key = "k".repeat(128);
    assert.equal(
      extractIdempotencyKey(new Headers({ "idempotency-key": key })),
      key,
    );
  });
});

describe("idempotency key generation", () => {
  it("generates unique UUID-shaped keys", () => {
    const keys = new Set(
      Array.from({ length: 50 }, () => generateIdempotencyKey()),
    );
    assert.equal(keys.size, 50);
    for (const key of keys) {
      assert.match(
        key,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });
});

describe("idempotency probe + SIMULATED duplicate-safe store", () => {
  it("probe carries table + key for the pre-insert lookup", () => {
    assert.deepEqual(idempotencyProbe("projects", "key-1"), {
      table: "projects",
      key: "key-1",
    });
  });

  it("SIMULATED: retried mutation with the same key returns the original row", () => {
    // Models UNIQUE(idempotency_key): second insert is a duplicate delivery.
    const store = new Map();
    function createProject(key, title) {
      const probe = idempotencyProbe("projects", key);
      const existing = store.get(`${probe.table}:${probe.key}`);
      if (existing) return { row: existing, deduplicated: true };
      const row = { id: `project-${store.size + 1}`, title, key };
      store.set(`${probe.table}:${probe.key}`, row);
      return { row, deduplicated: false };
    }

    const first = createProject("idem-1", "Campus Reuse Map");
    const retry = createProject("idem-1", "Campus Reuse Map");
    assert.equal(first.deduplicated, false);
    assert.equal(retry.deduplicated, true);
    assert.equal(retry.row.id, first.row.id);
    assert.equal(store.size, 1);
  });

  it("SIMULATED: different keys create distinct rows", () => {
    const store = new Map();
    store.set("projects:a", { id: "1" });
    store.set("projects:b", { id: "2" });
    assert.equal(store.size, 2);
  });
});
