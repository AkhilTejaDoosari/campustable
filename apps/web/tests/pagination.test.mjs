// Cursor pagination bounds: limits, malformed cursors, next-cursor rules.
// Imports the real helpers from src/lib (read-only). Hermetic: no I/O, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  encodeCursor,
  decodeCursor,
  parsePagination,
  nextCursor,
} from "../src/lib/operations.ts";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  paginationQuerySchema,
} from "../src/lib/validation.ts";

describe("pagination limits", () => {
  it(`defaults to ${DEFAULT_PAGE_LIMIT} with no params`, () => {
    const parsed = parsePagination(new URL("https://x.test/projects"));
    assert.deepEqual(parsed, { limit: 20, cursor: null, cursorError: false });
    assert.equal(DEFAULT_PAGE_LIMIT, 20);
  });

  it(`caps at ${MAX_PAGE_LIMIT} via schema and parser`, () => {
    assert.equal(MAX_PAGE_LIMIT, 50);
    const over = parsePagination(new URL("https://x.test/p?limit=51"));
    assert.equal(over.cursorError, true);
    assert.throws(() => paginationQuerySchema.parse({ limit: 51 }));
  });

  it("rejects zero, negative, fractional, and non-numeric limits (negative cases)", () => {
    for (const limit of ["0", "-3", "2.5", "abc", ""]) {
      const parsed = parsePagination(
        new URL(`https://x.test/p?limit=${encodeURIComponent(limit)}`),
      );
      assert.equal(parsed.cursorError, true, `limit=${JSON.stringify(limit)}`);
    }
  });

  it("accepts boundary limits 1 and 50", () => {
    assert.equal(parsePagination(new URL("https://x.test/p?limit=1")).limit, 1);
    assert.equal(
      parsePagination(new URL("https://x.test/p?limit=50")).limit,
      50,
    );
  });
});

describe("cursor encode/decode", () => {
  it("round-trips created_at + id", () => {
    const payload = { created_at: "2026-01-01T00:00:00Z", id: "abc-123" };
    assert.deepEqual(decodeCursor(encodeCursor(payload)), payload);
  });

  it("returns null for garbage, truncated, or wrong-shaped cursors (negative cases)", () => {
    assert.equal(decodeCursor("!!!not-base64!!!"), null);
    assert.equal(
      decodeCursor(Buffer.from("123", "utf8").toString("base64url")),
      null,
    );
    const missingId = Buffer.from(
      JSON.stringify({ created_at: "2026-01-01T00:00:00Z" }),
      "utf8",
    ).toString("base64url");
    assert.equal(decodeCursor(missingId), null);
  });

  it("parsePagination flags malformed cursors without throwing", () => {
    const parsed = parsePagination(
      new URL("https://x.test/p?cursor=!!!not-base64!!!"),
    );
    assert.equal(parsed.cursorError, true);
    assert.equal(parsed.cursor, null);
  });

  it("parsePagination returns a decoded cursor for valid input", () => {
    const cursor = encodeCursor({ created_at: "2026-01-01T00:00:00Z", id: "r1" });
    const parsed = parsePagination(
      new URL(`https://x.test/p?cursor=${encodeURIComponent(cursor)}`),
    );
    assert.equal(parsed.cursorError, false);
    assert.deepEqual(parsed.cursor, {
      created_at: "2026-01-01T00:00:00Z",
      id: "r1",
    });
  });
});

describe("nextCursor", () => {
  const rows = [
    { created_at: "2026-01-01T00:00:00Z", id: "r1" },
    { created_at: "2026-01-02T00:00:00Z", id: "r2" },
  ];

  it("returns null on a short (last) page", () => {
    assert.equal(nextCursor(rows, 20), null);
  });

  it("returns an opaque cursor pointing at the last row on a full page", () => {
    const cursor = nextCursor(rows, 2);
    assert.ok(typeof cursor === "string" && cursor.length > 0);
    assert.deepEqual(decodeCursor(cursor), {
      created_at: "2026-01-02T00:00:00Z",
      id: "r2",
    });
  });

  it("returns null for an empty page", () => {
    assert.equal(nextCursor([], 20), null);
  });
});
