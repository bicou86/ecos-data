const BULLET_RE = /^(\s*)- \[ \](?:\s+\*\*([^*]+)\*\*)?\s*(.*)$/;
const NESTED_RE = /^\s+- (.+)$/;
const SUBSECTION_RE = /^####\s+(.+)$/;

/**
 * Extract `- [ ] **label** rest` items from a block of text.
 *
 * Top-level bullets become objects `{ label, details: [...] }`.
 * Indented continuation lines (`  - foo`) are appended to the current
 * item's details. Non-checklist lines are ignored.
 *
 * @param {string} text
 * @returns {Array<{label: string, details: string[]}>}
 */
export function extractBullets(text) {
  const result = [];
  let current = null;
  for (const line of text.split("\n")) {
    const m = line.match(BULLET_RE);
    if (m) {
      const indent = m[1].length;
      const label = (m[2] || "").trim();
      const rest = (m[3] || "").trim();
      // Strip a lone trailing colon — `- [ ] **Label**:` shouldn't produce ":" as a detail item.
      const cleanRest = rest === ":" ? "" : rest.replace(/\s*:$/, "");
      if (indent === 0) {
        if (current) result.push(current);
        current = { label, details: cleanRest ? [cleanRest] : [] };
      } else if (current) {
        const sub = label ? `${label} ${cleanRest}`.trim() : cleanRest;
        if (sub) current.details.push(sub);
      }
      continue;
    }
    const nested = line.match(NESTED_RE);
    if (nested && current) {
      current.details.push(nested[1].trim());
    }
  }
  if (current) result.push(current);
  return result;
}

/**
 * Extract bullets grouped by `#### Sub-section` headings.
 *
 * Returns an array of `{ category, items }` where `items` is the result of
 * calling `extractBullets` on the lines between this heading and the next.
 * If no sub-headings are present, returns a single group with empty category.
 *
 * @param {string} text
 * @returns {Array<{category: string, items: Array<{label: string, details: string[]}>}>}
 */
export function extractGroupedBullets(text) {
  const lines = text.split("\n");
  const indices = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SUBSECTION_RE);
    if (m) indices.push({ heading: m[1].trim(), idx: i });
  }

  if (indices.length === 0) {
    return [{ category: "", items: extractBullets(text) }];
  }

  const groups = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].idx + 1;
    const end = i + 1 < indices.length ? indices[i + 1].idx : lines.length;
    const chunk = lines.slice(start, end).join("\n");
    groups.push({
      category: indices[i].heading,
      items: extractBullets(chunk),
    });
  }
  return groups;
}
