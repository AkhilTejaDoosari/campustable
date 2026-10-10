// Pair-intro immutability: one introduction per account pair, across ALL states.
//
// Enforcement lives in Postgres (`collaboration_requests_pair_uidx` on
// least/greatest of the pair — see supabase/migrations/0001_init.sql). There
// is no pure src/lib export for this rule, so this file is SIMULATED: it
// mirrors the SQL least()/greatest() ordering in a canonical pair key and
// asserts the migration contract still declares the unique index. Hermetic:
// filesystem reads only, no DB, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(
  here,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
  "0001_init.sql",
);

// SIMULATED mirror of the SQL index expression:
//   (least(from_user, to_user), greatest(from_user, to_user))
function canonicalPairKey(a, b) {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `${lo}|${hi}`;
}

// SIMULATED in-memory model of the unique pair index across statuses.
function makePairStore() {
  const seen = new Map(); // pairKey -> status
  return {
    insert(from, to, status) {
      const key = canonicalPairKey(from, to);
      if (seen.has(key)) {
        const err = new Error(
          `duplicate key value violates unique constraint "collaboration_requests_pair_uidx"`,
        );
        err.code = "23505";
        throw err;
      }
      seen.set(key, status);
      return { from, to, status };
    },
  };
}

describe("pair-intro immutability (SIMULATED index model)", () => {
  it("A->B and B->A map to the same canonical key", () => {
    assert.equal(canonicalPairKey("user-a", "user-b"), canonicalPairKey("user-b", "user-a"));
  });

  it("reversed duplicate raises a unique violation", () => {
    const store = makePairStore();
    store.insert("user-a", "user-b", "pending");
    assert.throws(() => store.insert("user-b", "user-a", "pending"), /pair_uidx/);
  });

  it("withdrawn intros still block a new intro (immutability across states)", () => {
    const store = makePairStore();
    store.insert("user-a", "user-b", "withdrawn");
    assert.throws(
      () => store.insert("user-b", "user-a", "pending"),
      /pair_uidx/,
    );
  });

  it("declined intros still block a new intro", () => {
    const store = makePairStore();
    store.insert("user-a", "user-b", "declined");
    assert.throws(
      () => store.insert("user-a", "user-b", "pending"),
      /pair_uidx/,
    );
  });

  it("distinct pairs do not collide", () => {
    const store = makePairStore();
    store.insert("user-a", "user-b", "pending");
    const row = store.insert("user-a", "user-c", "pending");
    assert.equal(row.status, "pending");
  });
});

describe("migration contract for the pair index", () => {
  it("0001_init.sql declares collaboration_requests_pair_uidx", () => {
    assert.equal(existsSync(migrationPath), true);
    const sql = readFileSync(migrationPath, "utf8");
    assert.match(sql, /collaboration_requests_pair_uidx/);
    assert.match(sql, /least\(from_user, to_user\)/);
    assert.match(sql, /greatest\(from_user, to_user\)/);
  });
});
