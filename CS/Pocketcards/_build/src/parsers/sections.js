/**
 * Section patterns — first match wins. Each key becomes a section identifier.
 * Patterns are intentionally tolerant: ANAMNÈSE matches "ANAMNÈSE", "ANAMNÈSE (25%)",
 * "ANAMNÈSE SYSTÉMATIQUE", etc.
 */
export const SECTION_PATTERNS = {
  ssp_metadata: /^##\s+🎯\s*Situation à Starting Point/,
  ponderation: /^##\s+📊\s*Pondération ECOS/,
  anamnese: /^##\s+.*ANAMNÈSE/,
  examen: /^##\s+.*EXAMEN CLINIQUE/,
  examens_compl: /^##\s+.*EXAMENS COMPLÉMENTAIRES/,
  dd: /^##\s+.*DIAGNOSTIC DIFFÉRENTIEL/,
  pec: /^##\s+.*PRISE EN CHARGE/,
  points_cles: /^##\s+.*POINTS CLÉS/,
  mnemo: /^##\s+.*MNÉMOTECHNIQUES/,
  communication: /^##\s+.*COMMUNICATION/,
  presentation: /^##\s+.*PRÉSENTATION SBAR/,
  red_flags: /^##\s+.*RED FLAGS/,
  references: /^##\s+.*Références/,
};

/**
 * Detect sections in a markdown string.
 *
 * Returns a Map keyed by section name (from SECTION_PATTERNS). Each entry has
 * `startLine` (1-indexed, the line AFTER the heading), `endLine` (1-indexed,
 * inclusive — the last line before the next heading), and `content` (the
 * joined lines between).
 *
 * Sections that appear multiple times keep only the first occurrence.
 *
 * @param {string} markdown Raw markdown content.
 * @returns {Map<string, { startLine: number, endLine: number, content: string }>}
 */
export function detectSections(markdown) {
  const lines = markdown.split("\n");
  const found = []; // [{ key, headingLine }]
  for (let i = 0; i < lines.length; i++) {
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(lines[i])) {
        if (!found.some((f) => f.key === key)) {
          found.push({ key, headingLine: i + 1 });
        }
        break; // first matching pattern wins for this line
      }
    }
  }
  const sections = new Map();
  for (let i = 0; i < found.length; i++) {
    const { key, headingLine } = found[i];
    const startLine = headingLine + 1;
    const endLine =
      i + 1 < found.length ? found[i + 1].headingLine - 1 : lines.length;
    const content = lines.slice(startLine - 1, endLine).join("\n");
    sections.set(key, { startLine, endLine, content });
  }
  return sections;
}
