import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesQuery } from "./search.ts";

const olive = { name: "Maison Olive", city: "La Marsa" };
const cafe = { name: "Café Sidi", city: null };

describe("matchesQuery", () => {
  it("matches everything when the query is empty or blank", () => {
    assert.equal(matchesQuery(olive, undefined), true);
    assert.equal(matchesQuery(olive, ""), true);
    assert.equal(matchesQuery(olive, "   "), true);
  });

  it("matches on name, ignoring case", () => {
    assert.equal(matchesQuery(olive, "OLIVE"), true);
    assert.equal(matchesQuery(olive, "maison o"), true);
  });

  it("matches on city", () => {
    assert.equal(matchesQuery(olive, "marsa"), true);
  });

  it("ignores accents in both directions", () => {
    assert.equal(matchesQuery(cafe, "cafe"), true);
    assert.equal(matchesQuery({ name: "Cafe Sidi", city: null }, "café"), true);
  });

  it("does not match unrelated text, and tolerates a missing city", () => {
    assert.equal(matchesQuery(olive, "pizza"), false);
    assert.equal(matchesQuery(cafe, "tunis"), false);
  });
});
