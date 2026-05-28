import { readFileSync } from "node:fs";

const ENCODINGS = ["utf8", "windows-1252", "latin1"];

/**
 * Read a file trying multiple encodings, returning the first that produces
 * content without too many Unicode replacement characters (U+FFFD).
 *
 * @param {string} path Absolute or relative file path.
 * @returns {{ content: string, encoding: string }}
 * @throws {Error} when file cannot be read or all encodings produce garbage.
 */
export function readWithEncodingFallback(path) {
  let lastError;
  for (const enc of ENCODINGS) {
    try {
      const content = readFileSync(path, enc);
      const replacementChars = (content.match(/�/g) || []).length;
      if (replacementChars < 5) {
        return { content, encoding: enc };
      }
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  throw new Error(`Could not decode ${path} with any supported encoding`);
}
