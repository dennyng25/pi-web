/**
 * The slash token being typed at the caret: `/` plus command characters,
 * open only at the draft's start or after whitespace (a newline included).
 * `hi/`, `src/file` and `https://example.com` are not commands.
 */
export type SlashToken = {
  start: number;
  end: number;
  query: string;
};

export function activeSlashToken(text: string, caret: number | null): SlashToken | null {
  const at = caret ?? text.length;
  if (at < 0 || at > text.length) return null;
  let start = at;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  let end = at;
  while (end < text.length && !/\s/.test(text[end])) end += 1;
  const token = text.slice(start, end);
  if (!token.startsWith("/") || token.includes("/", 1)) return null;
  if (start > 0 && !/\s/.test(text[start - 1])) return null;
  return { start, end, query: text.slice(start + 1, at).toLowerCase() };
}

export function replaceSlashToken(
  text: string,
  token: SlashToken,
  name: string,
): { text: string; caret: number } {
  // A space already after the token is the one the completion wants.
  const hasSuffixSpace = /^\s/.test(text.slice(token.end));
  const inserted = hasSuffixSpace ? `/${name}` : `/${name} `;
  return {
    text: `${text.slice(0, token.start)}${inserted}${text.slice(token.end)}`,
    caret: token.start + inserted.length + (hasSuffixSpace ? 1 : 0),
  };
}
