/**
 * Parse all markdown tables found in `text`.
 *
 * Returns an array of `{ headers, rows }`. Each row is an object with the
 * header strings as keys and the cell strings as values.
 *
 * Heuristics:
 * - A line starting and ending with `|` is treated as a row.
 * - The first such row in a contiguous block is the header.
 * - The second row is the separator (`|---|---|`) and is dropped.
 * - Subsequent rows are data.
 *
 * Pipe-escaping inside backticks is NOT supported.
 *
 * @param {string} text
 * @returns {Array<{headers: string[], rows: object[]}>}
 */
export function parseMarkdownTables(text) {
  const lines = text.split("\n");
  const tables = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = splitCells(trimmed);
      if (!current) {
        current = { headers: cells, rows: [] };
      } else if (
        current.rows.length === 0 &&
        cells.every((c) => /^[-:\s]+$/.test(c))
      ) {
        // separator row — drop
      } else {
        const row = {};
        current.headers.forEach((h, i) => {
          row[h] = cells[i] ?? "";
        });
        current.rows.push(row);
      }
    } else if (current) {
      tables.push(current);
      current = null;
    }
  }
  if (current) tables.push(current);
  return tables;
}

function splitCells(line) {
  // Remove leading and trailing `|`, then split by `|`.
  return line
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}
