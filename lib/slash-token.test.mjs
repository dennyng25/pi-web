import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const { activeSlashToken, replaceSlashToken } = await jiti.import("./slash-token.ts");

test("finds a slash token at the caret", () => {
  assert.deepEqual(activeSlashToken("hi /bra", null), { start: 3, end: 7, query: "bra" });
  assert.deepEqual(activeSlashToken("line1\n/", null), { start: 6, end: 7, query: "" });
  assert.deepEqual(activeSlashToken("/help now /br", 13), { start: 10, end: 13, query: "br" });
});

test("ignores slashes inside words, paths and urls", () => {
  assert.equal(activeSlashToken("https://example.com", null), null);
  assert.equal(activeSlashToken("src/file", null), null);
  assert.equal(activeSlashToken("hi/", null), null);
  assert.equal(activeSlashToken("a/b/", null), null);
});

test("a caret inside a token still owns the whole token", () => {
  // Replacing only what the caret has passed left the tail behind: "hi /skill:x in".
  assert.deepEqual(activeSlashToken("hi /brain", 7), { start: 3, end: 9, query: "bra" });
  assert.deepEqual(
    replaceSlashToken("hi /brain there", { start: 3, end: 9, query: "bra" }, "skill:brainstorming"),
    { text: "hi /skill:brainstorming there", caret: 24 },
  );
});

test("replaces only the active token and keeps the caret context", () => {
  assert.deepEqual(
    replaceSlashToken("hi /br there", { start: 3, end: 6, query: "br" }, "skill:brainstorming"),
    { text: "hi /skill:brainstorming there", caret: 24 },
  );
});
