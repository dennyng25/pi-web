# Inline Slash Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the existing slash-command palette for a `/token` at the caret anywhere in the composer, and complete only that token.

**Architecture:** Add one pure helper module for slash-token detection and replacement, then make `ChatInput.tsx` derive the active token from the caret instead of `value.startsWith("/")`, and make `applySlashCommand` replace the token range. The palette, groups, filtering, and loading paths stay unchanged.

**Tech Stack:** TypeScript, React 19, Next 16 dev server, `node --test` with jiti, browsermcp for UI verification.

**Spec:** `docs/superpowers/specs/2026-11-18-inline-slash-autocomplete-design.md`

## Global Constraints

- Web-only change; no Zigai extensions, no `$` trigger, no SDK upgrade, no new dependency.
- Keep the existing slash palette UI, groups, filtering, streaming restrictions, and extension-dialog suppression.
- No regex lookbehind (Safari 16.2), per `AGENTS.md`.
- Never run `next build` during development.
- Inline completion must never submit the message.
- Independent review: `reviewer-lite` (`9router/combo-reasoning-lite`), after all tasks and UI verification pass.

## Review Focus

1. `hi /` and `https://example.com` both contain `/`: the first opens the menu, the second must not.
2. A caret before a later slash token loses the menu: completion must target the token at the caret, not the last one in the draft.
3. Enter on an inline suggestion submits "hi /skill:name": inline completion must never send.
4. Completing mid-draft drops text after the caret: replacement must keep the suffix and place the caret after the inserted token.
5. Command typed after a first line (`line1\n/`) leaves the menu closed: a line-start slash must count as a command position.

---

### Task 1: Slash-token helpers

**Files:**
- Create: `lib/slash-token.ts`
- Test: `lib/slash-token.test.mjs`

**Interfaces:**
- Produces:
  - `type SlashToken = { start: number; end: number; query: string }`
  - `activeSlashToken(text: string, caret: number | null): SlashToken | null`
  - `replaceSlashToken(text: string, token: SlashToken, name: string): { text: string; caret: number }`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const { activeSlashToken, replaceSlashToken } = await jiti.import("./slash-token.ts");

test("finds a slash token at the caret", () => {
  assert.deepEqual(activeSlashToken("hi /bra", null), { start: 3, end: 7, query: "bra" });
  assert.deepEqual(activeSlashToken("line1
/", null), { start: 6, end: 7, query: "" });
  assert.deepEqual(activeSlashToken("/help now /br", 12), { start: 10, end: 13, query: "br" });
});

test("ignores slashes inside words, paths and urls", () => {
  assert.equal(activeSlashToken("https://example.com", null), null);
  assert.equal(activeSlashToken("src/file", null), null);
  assert.equal(activeSlashToken("hi/", null), null);
  assert.equal(activeSlashToken("a/b/", null), null);
});

test("replaces only the active token and keeps the caret context", () => {
  assert.deepEqual(
    replaceSlashToken("hi /br there", { start: 3, end: 6, query: "br" }, "skill:brainstorming"),
    { text: "hi /skill:brainstorming there", caret: 24 },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/slash-token.test.mjs`
Expected: FAIL, module `./slash-token.ts` not found.

- [ ] **Step 3: Implement `lib/slash-token.ts`**

Export `SlashToken`, `activeSlashToken`, and `replaceSlashToken`. Rules: scan back from the caret to a whitespace or the draft start; accept a token of the form `/` plus non-whitespace characters with no further `/`; the character before the token (when any) must be whitespace; stop the menu once the token has a space after the query. Insert `` `/${name} ` `` in place of the token and return the caret after it.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/slash-token.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/slash-token.ts lib/slash-token.test.mjs
git commit -m "feat(composer): detect the slash token at the caret"
```

---

### Task 2: Caret-local slash menu in the composer

**Files:**
- Modify: `components/ChatInput.tsx:1219` (`slashQuery`), `components/ChatInput.tsx:1407` (`applySlashCommand`), the caret/selection handlers near `updateAtQuery`, and the `key down` guard at `ChatInput.tsx:1555`
- Test: `components/ChatInput.test.mjs`

**Interfaces:**
- Consumes: `activeSlashToken`, `replaceSlashToken` from Task 1.
- Produces: internal `slashToken` state/derivation and `applySlashCommand(command)` that replaces the active token.

- [ ] **Step 1: Write the failing test**

Add to `components/ChatInput.test.mjs`, importing `activeSlashToken`-driven helpers only through `ChatInput.tsx`'s existing exports if needed. Prefer a static-render assertion that a draft of `hi /` with a passed-in caret opens the palette markup, plus a helper-level assertion that `hi /` yields a query. Reuse the existing render helpers in that file (`renderToStaticMarkup` with `I18nProvider`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test components/ChatInput.test.mjs`
Expected: FAIL on the new inline-palette case while the file's existing tests pass.

- [ ] **Step 3: Derive the active token from the caret**

Replace the `value.startsWith("/")` derivation with `activeSlashToken(value, caret)`. Keep the `!compact`, streaming filter, filtering, layout, count label, and loading effect unchanged. Track the token start/end so the menu stays open while the caret is inside it, and closes when the caret leaves.

- [ ] **Step 4: Replace only the active token**

Change `applySlashCommand` to use `replaceSlashToken`, set the textarea value to the returned text, place the caret at the returned offset, close the menu, and stop sending: when the token does not start at 0, only complete (never `handleSend`). Keep leading-command submit behavior when the whole draft is that exact command.

- [ ] **Step 5: Run tests**

Run: `node --experimental-strip-types --test components/ChatInput.test.mjs`
Expected: PASS, including the existing completion/focus tests.

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add components/ChatInput.tsx components/ChatInput.test.mjs
git commit -m "feat(composer): complete slash commands at the caret"
```

---

### Task 3: Document, verify in the browser, and review

**Files:**
- Modify: `docs/agents/sessions.md` (composer autocomplete note)

- [ ] **Step 1: Document the behavior**

Add a line to the composer/autocomplete note: the palette opens for a slash token at the caret anywhere in the draft, only after whitespace or a newline, and completing it never sends the message.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean for the touched files.

- [ ] **Step 3: Verify in the dev server with browsermcp**

Run `npm run dev` (reuse an existing dev server on port 30141 if healthy). Open `http://localhost:30141`, then check:
- `/` opens the palette.
- `hi /` opens the palette.
- `hi /brain` filters to `skill:brainstorming`.
- Selecting inline completes only that token, keeps `hi `, and sends nothing.
- `https://example.com` and `src/file` do not open the palette.

- [ ] **Step 4: Independent review (reviewer-lite)**

```bash
pi -p --no-session --model 9router/combo-reasoning-lite --append-system-prompt C:\Users\DennyHome\.pi\agent\reviewers\reviewer-lite.md "Read the plan at docs/superpowers/plans/2026-11-18-inline-slash-autocomplete.md, run git status and git diff in the current worktree, then review the whole change."
```

Handle `VERDICT`: PASS proceeds; REJECT means fix the named `file:line` and rerun, at most twice; ESCALATE stops and reports.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/sessions.md docs/superpowers
git commit -m "docs(composer): note inline slash completion"
```
