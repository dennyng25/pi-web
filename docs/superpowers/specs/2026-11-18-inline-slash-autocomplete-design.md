# Inline Slash Autocomplete

## Intent

Let web-only users open the existing slash autocomplete menu after text, at the current caret, without installing Zigai extensions.

## Approved behavior

- Open the existing menu for a slash token at the start of the draft or after whitespace, including newlines: `/`, `hi /`, `hi /brain`.
- Resolve the active token at the caret, not only at the end of the draft. Preserve surrounding text when completing it.
- Preserve existing command groups, filtering, loading, streaming restrictions, and extension-dialog suppression.
- Tab, Enter, and clicking a suggestion complete the active token. Inline selection must not submit the message or execute a command.
- Preserve current leading-command submit behavior where the whole draft is an exact executable command.
- Escape dismisses the menu. Editing the active token or moving to another slash token can reopen it.
- Do not open inside URL/path tokens such as `https://example.com`, `src/file`, or `hi/`.
- Preserve IME handling, mobile behavior, undo, focus, and existing file/history completion behavior.

## Approaches

1. Add `$` skill mentions directly: rejected because the user wants the existing `/` menu everywhere in the draft.
2. Bridge extension autocomplete to the web: rejected as unnecessary for this web-only request.
3. Extend native slash completion to caret-local tokens: selected by the user. Reuse the existing palette and command list.

## Non-goals

No inline command execution, inline skill expansion, `$` trigger, new dependencies, SDK upgrade, Zigai installation, or TUI compatibility layer. An inserted inline `/skill:name` remains text under current submission semantics.

## Scope and constraints

Keep the change in `components/ChatInput.tsx` and its tests unless existing caret/focus tests need updates. Document the changed composer behavior in `docs/agents/sessions.md`. Do not change API routes or `lib/rpc-manager.ts`. Preserve Safari 16.2 support: no regex lookbehind.

## Verification and review

Run targeted tests, TypeScript checking, and lint. Run the dev server on port 30141 and verify the interaction with browsermcp before independent `reviewer-lite` review. Never run `next build` during development.
