// Email normalization: trim + lowercase, no dot rewriting.
// Imports the real helpers from src/lib (read-only). Hermetic: no I/O, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, domainOf } from "../src/lib/operations.ts";
import { affiliationStartSchema } from "../src/lib/validation.ts";

describe("normalizeEmail (canonical school-email identity)", () => {
  it("trims surrounding whitespace and lowercases", () => {
    assert.equal(normalizeEmail("  Foo.Bar@Univ.EDU  "), "foo.bar@univ.edu");
  });

  it("leaves already-canonical addresses untouched", () => {
    assert.equal(normalizeEmail("a@b.edu"), "a@b.edu");
  });

  it("does NOT rewrite dots (no Gmail-style canonicalization)", () => {
    // first.last and firstlast must stay distinct identities.
    assert.equal(normalizeEmail("First.Last@Univ.edu"), "first.last@univ.edu");
    assert.notEqual(normalizeEmail("First.Last@Univ.edu"), "firstlast@univ.edu");
  });

  it("does NOT rewrite plus-addressing", () => {
    assert.equal(normalizeEmail("Foo+Tag@Univ.edu"), "foo+tag@univ.edu");
  });
});

describe("domainOf", () => {
  it("returns the lowercase domain after @", () => {
    assert.equal(domainOf("  Foo@CS.Univ.EDU "), "cs.univ.edu");
  });

  it("returns empty string when there is no @", () => {
    assert.equal(domainOf("not-an-email"), "");
  });
});

describe("affiliationStartSchema email coercion", () => {
  it("accepts mixed-case input and coerces to normalized form", () => {
    const parsed = affiliationStartSchema.parse({ email: "  Foo@Univ.edu " });
    assert.equal(parsed.email, "foo@univ.edu");
  });

  it("rejects non-email input", () => {
    assert.throws(() => affiliationStartSchema.parse({ email: "not-an-email" }));
  });
});
