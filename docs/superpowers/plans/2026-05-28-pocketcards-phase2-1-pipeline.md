# Pocketcards Phase 2.1 — Pipeline Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Node.js side of the Phase 2 pipeline — MD parser, audit, promote, and coherence checks. The LLM subagent dispatch (Phase 2.3-2.5) reads the JSON intermediate produced by this pipeline.

**Architecture:** Modular parser (encoding → sections → bullets → tables) orchestrated by `import-md.js`. Three CLI scripts add audit, promote, and coherence checks. Everything is additive — does NOT modify Phase 0/1 modules.

**Tech Stack:** Node.js 20+ · ESM · `js-yaml` · Vitest · `picocolors`. No new external deps.

**Spec reference:** [docs/superpowers/specs/2026-05-28-pocketcards-phase2-import.md](../specs/2026-05-28-pocketcards-phase2-import.md)

**Out of scope for this plan (later sub-phases):**

- Building `discipline-map.yaml` (Phase 2.2)
- Dispatching LLM subagents (Phase 2.3 — done by Claude orchestrator, not Node)
- Writing actual card YAML drafts (Phase 2.4)

---

## File Structure

```
CS/Pocketcards/_build/
├── data/
│   └── discipline-map.yaml           # CREATED EMPTY in Task 1 (populated in Phase 2.2)
├── import-cache/                     # gitignored (created at runtime)
├── src/
│   ├── parsers/                      # parser primitives (testable independently)
│   │   ├── encoding.js               # UTF-8/Win1252 fallback
│   │   ├── sections.js               # detect section boundaries via regex
│   │   ├── bullets.js                # extract `- [ ] **label**` items
│   │   └── tables.js                 # parse DD markdown tables
│   ├── import-md.js                  # orchestrator: combines parsers → JSON intermediate
│   ├── parse-cli.js                  # CLI entry for `yarn parse-md`
│   ├── audit-drafts.js               # scan YAMLs for [VÉRIFIER:] markers
│   ├── promote.js                    # draft → ready with guards
│   └── check-coherence.js            # IDs unique + broken links + numbering
└── tests/
    ├── fixtures/import/
    │   ├── SSP_Cephalee.md           # golden case (copy from CS/02_SSP/)
    │   ├── SSP_Diabète_Suivi.md     # variant case
    │   └── SSP_ACR.md                # minimal case
    ├── parsers/
    │   ├── encoding.test.js
    │   ├── sections.test.js
    │   ├── bullets.test.js
    │   └── tables.test.js
    ├── import-md.test.js
    ├── audit-drafts.test.js
    ├── promote.test.js
    └── check-coherence.test.js
```

---

## Task 1: Phase 2 scaffolding

**Files:**

- Create: `CS/Pocketcards/_build/data/discipline-map.yaml`
- Create: `CS/Pocketcards/_build/src/parsers/.gitkeep`
- Modify: `CS/Pocketcards/_build/.gitignore` (add `import-cache/`)
- Modify: `CS/Pocketcards/_build/package.json` (add Phase 2 scripts)

- [ ] **Step 1: Create dirs**

```bash
cd /Users/damienfulliquet/Documents/Damien/Medecine/GitHub/ecos-data
mkdir -p CS/Pocketcards/_build/{data,src/parsers,tests/fixtures/import,tests/parsers}
touch CS/Pocketcards/_build/src/parsers/.gitkeep
```

- [ ] **Step 2: Create empty discipline-map**

Write `CS/Pocketcards/_build/data/discipline-map.yaml`:

```yaml
# Discipline + urgency mapping for SSP files in CS/02_SSP/
# Populated by Phase 2.2 (LLM bootstrap + manual review)
# Key = filename stem (without "SSP_" prefix or extension)
# Value = { discipline: <enum>, urgency: <low|medium|high> }
#
# Example entries (3 Phase 1 cards already in ready):
Cephalee: { discipline: Neuro, urgency: high }
```

- [ ] **Step 3: Update `_build/.gitignore`**

Append:

```
import-cache/
```

- [ ] **Step 4: Update `_build/package.json` with new scripts**

Use Edit tool. Replace the `"scripts"` block:

```json
  "scripts": {
    "validate": "node src/build.js --validate-only",
    "build": "node src/build.js",
    "build:pdf": "node src/build.js --pdf",
    "publish:notion": "node src/build.js --notion",
    "dev": "node src/watch.js",
    "parse-md": "node src/parse-cli.js",
    "audit-drafts": "node src/audit-drafts.js",
    "promote": "node src/promote.js",
    "check-coherence": "node src/check-coherence.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 5: Verify**

```bash
cd CS/Pocketcards/_build
cat data/discipline-map.yaml
cat .gitignore
cat package.json | grep -A 12 '"scripts"'
```

Expected: discipline-map exists with 1 entry, .gitignore includes `import-cache/`, package.json has the 4 new scripts.

- [ ] **Step 6: Commit**

```bash
cd /Users/damienfulliquet/Documents/Damien/Medecine/GitHub/ecos-data
git add CS/Pocketcards/_build/data/ \
        CS/Pocketcards/_build/src/parsers/.gitkeep \
        CS/Pocketcards/_build/tests/fixtures/import/ \
        CS/Pocketcards/_build/tests/parsers/ \
        CS/Pocketcards/_build/.gitignore \
        CS/Pocketcards/_build/package.json
git commit -m "Pocketcards Phase 2.1: scaffold import pipeline directories"
```

---

## Task 2: Copy test fixtures

**Files:**

- Create: `_build/tests/fixtures/import/SSP_Cephalee.md`
- Create: `_build/tests/fixtures/import/SSP_Diabète_Suivi.md`
- Create: `_build/tests/fixtures/import/SSP_ACR.md`

These are copies of real SSPs from `CS/02_SSP/`. We commit them so tests don't depend on the source dir.

- [ ] **Step 1: Copy fixtures**

```bash
cd /Users/damienfulliquet/Documents/Damien/Medecine/GitHub/ecos-data
cp "CS/02_SSP/SSP_Céphalee.md" CS/Pocketcards/_build/tests/fixtures/import/SSP_Cephalee.md
cp "CS/02_SSP/SSP_Diabète_Suivi.md" CS/Pocketcards/_build/tests/fixtures/import/SSP_Diabete_Suivi.md
cp "CS/02_SSP/SSP_ACR.md" CS/Pocketcards/_build/tests/fixtures/import/SSP_ACR.md
```

Note: filenames in `tests/fixtures/import/` are ASCII-clean (no accents) for test stability across platforms.

- [ ] **Step 2: Verify line counts**

```bash
wc -l CS/Pocketcards/_build/tests/fixtures/import/*.md
```

Expected: 3 files, line counts roughly 100-500.

- [ ] **Step 3: Commit**

```bash
git add CS/Pocketcards/_build/tests/fixtures/import/
git commit -m "Pocketcards Phase 2.1: import test fixtures (3 SSPs)"
```

---

## Task 3: encoding.js — read with UTF-8/Win1252 fallback

**Files:**

- Create: `_build/src/parsers/encoding.js`
- Create: `_build/tests/parsers/encoding.test.js`

- [ ] **Step 1: Write the failing test `tests/parsers/encoding.test.js`**

```js
import { describe, it, expect } from "vitest";
import { readWithEncodingFallback } from "../../src/parsers/encoding.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("readWithEncodingFallback", () => {
  it("reads valid UTF-8 file successfully", () => {
    const tmp = mkdtempSync(join(tmpdir(), "enc-"));
    const path = join(tmp, "utf8.md");
    writeFileSync(path, "# Céphalée — épisode\nÉtat fébrile", "utf8");
    const result = readWithEncodingFallback(path);
    expect(result.encoding).toBe("utf8");
    expect(result.content).toContain("Céphalée");
  });

  it("falls back to windows-1252 for non-UTF8 file", () => {
    const tmp = mkdtempSync(join(tmpdir(), "enc-"));
    const path = join(tmp, "win.md");
    // Bytes representing "Céphalée" in windows-1252: C, e+acute=0xE9, p, h, a, l, e+acute=0xE9, e+acute=0xE9
    const buf = Buffer.from([0x43, 0xe9, 0x70, 0x68, 0x61, 0x6c, 0xe9, 0xe9]);
    writeFileSync(path, buf);
    const result = readWithEncodingFallback(path);
    // Should succeed with some encoding without surrogate errors
    expect(result.encoding).toMatch(/utf8|windows-1252|latin1/);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("throws on non-existent file", () => {
    expect(() => readWithEncodingFallback("/nope/missing.md")).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd CS/Pocketcards/_build
npm test -- parsers/encoding.test.js
```

Expected: FAIL with `Cannot find module '../../src/parsers/encoding.js'`.

- [ ] **Step 3: Write `src/parsers/encoding.js`**

```js
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- parsers/encoding.test.js
```

Expected: 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/parsers/encoding.js \
        CS/Pocketcards/_build/tests/parsers/encoding.test.js
git commit -m "Pocketcards Phase 2.1: encoding fallback parser primitive"
```

---

## Task 4: sections.js — detect section boundaries

**Files:**

- Create: `_build/src/parsers/sections.js`
- Create: `_build/tests/parsers/sections.test.js`

The parser identifies which lines belong to which section. It returns a Map of `sectionKey` → `{ startLine, endLine, content }`.

- [ ] **Step 1: Write the failing test `tests/parsers/sections.test.js`**

```js
import { describe, it, expect } from "vitest";
import {
  detectSections,
  SECTION_PATTERNS,
} from "../../src/parsers/sections.js";
import { readWithEncodingFallback } from "../../src/parsers/encoding.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "fixtures", "import");

describe("detectSections", () => {
  it("detects all expected sections in SSP_Cephalee.md", () => {
    const { content } = readWithEncodingFallback(
      join(fixturesDir, "SSP_Cephalee.md"),
    );
    const sections = detectSections(content);
    expect(sections.has("anamnese")).toBe(true);
    expect(sections.has("examen")).toBe(true);
    expect(sections.has("dd")).toBe(true);
    expect(sections.has("pec")).toBe(true);
    expect(sections.has("examens_compl")).toBe(true);
  });

  it("section content excludes the heading line", () => {
    const md = `# Title\n\n## 🎯 Situation à Starting Point\nDescription here\n\n## 📋 ANAMNÈSE SYSTÉMATIQUE\nAnamnese content\n\n## 🩺 EXAMEN CLINIQUE\nExamen content\n`;
    const sections = detectSections(md);
    expect(sections.get("anamnese").content).toContain("Anamnese content");
    expect(sections.get("anamnese").content).not.toContain(
      "🩺 EXAMEN CLINIQUE",
    );
  });

  it('handles variant section heading "ANAMNÈSE (25%)"', () => {
    const md = `## 📋 ANAMNÈSE (25%)\nWith percentage\n\n## 🩺 EXAMEN CLINIQUE\n`;
    const sections = detectSections(md);
    expect(sections.has("anamnese")).toBe(true);
    expect(sections.get("anamnese").content).toContain("With percentage");
  });

  it("returns startLine and endLine for each section", () => {
    const md = `Line 1\nLine 2\n## 📋 ANAMNÈSE\nLine 4\nLine 5\n## 🩺 EXAMEN CLINIQUE\nLine 7\n`;
    const sections = detectSections(md);
    const anamnese = sections.get("anamnese");
    expect(anamnese.startLine).toBe(3);
    expect(anamnese.endLine).toBe(5);
  });

  it("SECTION_PATTERNS exports the regex map", () => {
    expect(SECTION_PATTERNS.anamnese).toBeInstanceOf(RegExp);
    expect(SECTION_PATTERNS.red_flags).toBeInstanceOf(RegExp);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- parsers/sections.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/parsers/sections.js`**

```js
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- parsers/sections.test.js
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/parsers/sections.js \
        CS/Pocketcards/_build/tests/parsers/sections.test.js
git commit -m "Pocketcards Phase 2.1: section boundary parser"
```

---

## Task 5: bullets.js — extract `- [ ]` checklist items

**Files:**

- Create: `_build/src/parsers/bullets.js`
- Create: `_build/tests/parsers/bullets.test.js`

Each `- [ ] **label** rest` becomes `{ label, details: [rest] }`. Nested bullets become entries in `details[]`. Sub-section headers `#### Title` split bullets into categories.

- [ ] **Step 1: Write the failing test `tests/parsers/bullets.test.js`**

```js
import { describe, it, expect } from "vitest";
import {
  extractBullets,
  extractGroupedBullets,
} from "../../src/parsers/bullets.js";

describe("extractBullets", () => {
  it("extracts top-level bullets with labels", () => {
    const text = `- [ ] **Site** localisation\n- [ ] **Onset** brutal ou progressif\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      label: "Site",
      details: ["localisation"],
    });
    expect(result[1]).toMatchObject({
      label: "Onset",
      details: ["brutal ou progressif"],
    });
  });

  it("extracts bullets without labels", () => {
    const text = `- [ ] simple text\n- [ ] another item\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: "", details: ["simple text"] });
  });

  it("attaches indented sub-bullets to parent details", () => {
    const text = `- [ ] **Force MS**:\n  - Droit 4/5\n  - Gauche 5/5\n- [ ] **ROT** symétriques\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0].details).toEqual(
      expect.arrayContaining(["Droit 4/5", "Gauche 5/5"]),
    );
    expect(result[1].label).toBe("ROT");
  });

  it("ignores non-checklist lines", () => {
    const text = `Some prose.\n- [ ] **Item** content\nMore prose.\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(1);
  });
});

describe("extractGroupedBullets", () => {
  it("groups bullets by sub-section heading", () => {
    const text = `#### Type de douleur
- [ ] **Coup de tonnerre**
- [ ] **Pire de ma vie**

#### Contexte à risque
- [ ] **Grossesse**
- [ ] **Cancer connu**
`;
    const result = extractGroupedBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      category: "Type de douleur",
      items: expect.arrayContaining([
        expect.objectContaining({ label: "Coup de tonnerre" }),
      ]),
    });
    expect(result[1].category).toBe("Contexte à risque");
    expect(result[1].items).toHaveLength(2);
  });

  it("returns one group with empty category when no sub-sections present", () => {
    const text = `- [ ] **Item A**\n- [ ] **Item B**\n`;
    const result = extractGroupedBullets(text);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("");
    expect(result[0].items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- parsers/bullets.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/parsers/bullets.js`**

```js
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
      if (indent === 0) {
        if (current) result.push(current);
        current = { label, details: rest ? [rest] : [] };
      } else if (current) {
        const sub = label ? `${label} ${rest}`.trim() : rest;
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- parsers/bullets.test.js
```

Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/parsers/bullets.js \
        CS/Pocketcards/_build/tests/parsers/bullets.test.js
git commit -m "Pocketcards Phase 2.1: bullet extractor (flat + grouped)"
```

---

## Task 6: tables.js — parse markdown DD tables

**Files:**

- Create: `_build/src/parsers/tables.js`
- Create: `_build/tests/parsers/tables.test.js`

The DD differential is usually a markdown table `| Diagnostic | Arguments POUR | Arguments CONTRE |`. We parse each row into an object keyed by header.

- [ ] **Step 1: Write the failing test `tests/parsers/tables.test.js`**

```js
import { describe, it, expect } from "vitest";
import { parseMarkdownTables } from "../../src/parsers/tables.js";

describe("parseMarkdownTables", () => {
  it("parses a single simple table", () => {
    const text = `Some prose.

| Diagnostic | Arguments POUR | Arguments CONTRE |
|---|---|---|
| Migraine | Pulsatile | Pas de fièvre |
| HSA | Coup tonnerre | Pas progressif |

More text.`;
    const tables = parseMarkdownTables(text);
    expect(tables).toHaveLength(1);
    expect(tables[0].headers).toEqual([
      "Diagnostic",
      "Arguments POUR",
      "Arguments CONTRE",
    ]);
    expect(tables[0].rows).toHaveLength(2);
    expect(tables[0].rows[0]).toEqual({
      Diagnostic: "Migraine",
      "Arguments POUR": "Pulsatile",
      "Arguments CONTRE": "Pas de fièvre",
    });
  });

  it("parses multiple tables in same document", () => {
    const text = `| A | B |\n|---|---|\n| 1 | 2 |\n\nText\n\n| C | D |\n|---|---|\n| 3 | 4 |\n`;
    const tables = parseMarkdownTables(text);
    expect(tables).toHaveLength(2);
    expect(tables[0].headers).toEqual(["A", "B"]);
    expect(tables[1].headers).toEqual(["C", "D"]);
  });

  it("skips separator rows", () => {
    const text = `| H1 | H2 |\n|---|---|\n| v1 | v2 |\n`;
    const tables = parseMarkdownTables(text);
    expect(tables[0].rows).toHaveLength(1);
  });

  it("handles cells containing pipes inside backticks (best-effort)", () => {
    // We just check it doesn't crash; full pipe-escaping is out of scope.
    const text = `| H1 | H2 |\n|---|---|\n| simple | data |\n`;
    expect(() => parseMarkdownTables(text)).not.toThrow();
  });

  it("returns empty array when no table present", () => {
    const tables = parseMarkdownTables("Just prose with no table.");
    expect(tables).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- parsers/tables.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/parsers/tables.js`**

```js
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- parsers/tables.test.js
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/parsers/tables.js \
        CS/Pocketcards/_build/tests/parsers/tables.test.js
git commit -m "Pocketcards Phase 2.1: markdown DD table parser"
```

---

## Task 7: import-md.js orchestrator

**Files:**

- Create: `_build/src/import-md.js`
- Create: `_build/tests/import-md.test.js`

This orchestrates encoding → sections → bullets → tables to produce the JSON intermediate.

- [ ] **Step 1: Write the failing test `tests/import-md.test.js`**

```js
import { describe, it, expect } from "vitest";
import { parseSSP } from "../src/import-md.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures", "import");

describe("parseSSP — golden case (SSP_Cephalee.md)", () => {
  it("produces a valid JSON intermediate with expected fields", () => {
    const result = parseSSP(join(fixturesDir, "SSP_Cephalee.md"));
    expect(result.schema_version).toBe(1);
    expect(result.title_md).toMatch(/Céphalée/);
    expect(result.source_path).toContain("SSP_Cephalee.md");
    expect(result.source_total_lines).toBeGreaterThan(100);
    expect(result.parse_quality).toBe("high");
  });

  it("extracts anamnese sub-sections", () => {
    const result = parseSSP(join(fixturesDir, "SSP_Cephalee.md"));
    expect(result.anamnese_raw).toBeDefined();
    // Should have at least one category with bullets
    expect(result.anamnese_raw.length).toBeGreaterThan(0);
  });

  it("extracts red_flags grouped by category", () => {
    const result = parseSSP(join(fixturesDir, "SSP_Cephalee.md"));
    expect(result.red_flags_raw).toBeDefined();
    expect(result.red_flags_raw.length).toBeGreaterThan(0);
    const allItems = result.red_flags_raw.flatMap((g) => g.items);
    expect(allItems.length).toBeGreaterThan(5);
  });

  it("extracts DD table rows", () => {
    const result = parseSSP(join(fixturesDir, "SSP_Cephalee.md"));
    expect(result.dd_table_raw).toBeDefined();
    expect(result.dd_table_raw.length).toBeGreaterThanOrEqual(3);
    expect(result.dd_table_raw[0]).toHaveProperty("Diagnostic");
  });

  it("extracts examen and pec sections", () => {
    const result = parseSSP(join(fixturesDir, "SSP_Cephalee.md"));
    expect(result.examen_raw).toBeDefined();
    expect(result.pec_raw).toBeDefined();
  });
});

describe("parseSSP — variant case (SSP_Diabete_Suivi.md)", () => {
  it('handles "ANAMNÈSE (25%)" variant heading', () => {
    const result = parseSSP(join(fixturesDir, "SSP_Diabete_Suivi.md"));
    expect(result.anamnese_raw).toBeDefined();
    expect(result.anamnese_raw.length).toBeGreaterThan(0);
  });
});

describe("parseSSP — minimal case (SSP_ACR.md)", () => {
  it("does not crash on minimal/incomplete SSP", () => {
    const result = parseSSP(join(fixturesDir, "SSP_ACR.md"));
    expect(result.schema_version).toBe(1);
    expect(result.parse_quality).toMatch(/high|medium|low/);
    expect(Array.isArray(result.parse_warnings)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- import-md.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/import-md.js`**

```js
import { basename, resolve } from "node:path";
import { readWithEncodingFallback } from "./parsers/encoding.js";
import { detectSections } from "./parsers/sections.js";
import { extractBullets, extractGroupedBullets } from "./parsers/bullets.js";
import { parseMarkdownTables } from "./parsers/tables.js";

const REQUIRED_SECTIONS = ["anamnese", "examen", "dd", "pec"];

/**
 * Parse an SSP markdown file into a structured JSON intermediate.
 *
 * The output schema is documented in the Phase 2 spec, section 5.1.
 * Parse quality is "high" if all required sections were found, "medium" if
 * one is missing, "low" if two or more are missing.
 *
 * @param {string} filePath Path to the SSP markdown file.
 * @returns {object} Intermediate JSON ready for the LLM subagent.
 */
export function parseSSP(filePath) {
  const { content } = readWithEncodingFallback(filePath);
  const lines = content.split("\n");
  const sections = detectSections(content);

  const warnings = [];
  const missing = REQUIRED_SECTIONS.filter((s) => !sections.has(s));
  for (const m of missing) warnings.push(`required section "${m}" not found`);

  const parse_quality =
    missing.length === 0 ? "high" : missing.length === 1 ? "medium" : "low";

  // Title: first H1 line
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title_md = titleMatch
    ? titleMatch[1].trim()
    : basename(filePath, ".md");

  // SSP metadata block
  const metaSection = sections.get("ssp_metadata");
  const ssp_meta = parseSspMeta(metaSection?.content || "");

  // Anamnese: grouped by sub-section headings
  const anamneseSection = sections.get("anamnese");
  const anamnese_raw = anamneseSection
    ? extractGroupedBullets(anamneseSection.content)
    : [];

  // Red flags: scan for "DRAPEAUX ROUGES" subsection inside anamnese (typical layout)
  // Returns same shape: grouped bullets.
  const red_flags_raw = extractRedFlags(anamneseSection?.content || "");

  // Examen: grouped
  const examenSection = sections.get("examen");
  const examen_raw = examenSection
    ? extractGroupedBullets(examenSection.content)
    : [];

  // Examens complémentaires: grouped
  const examensComplSection = sections.get("examens_compl");
  const examens_complementaires_raw = examensComplSection
    ? extractGroupedBullets(examensComplSection.content)
    : [];

  // DD: parse markdown tables
  const ddSection = sections.get("dd");
  const dd_table_raw = ddSection ? parseMarkdownTables(ddSection.content) : [];

  // PEC: grouped
  const pecSection = sections.get("pec");
  const pec_raw = pecSection ? extractGroupedBullets(pecSection.content) : [];

  // Pièges: scan for sub-section under points_cles
  const pointsClesSection = sections.get("points_cles");
  const pieges_raw = extractPieges(pointsClesSection?.content || "");

  return {
    schema_version: 1,
    source_path: filePath,
    source_total_lines: lines.length,
    title_md,
    ssp_meta,
    anamnese_raw,
    red_flags_raw,
    examen_raw,
    examens_complementaires_raw,
    dd_table_raw,
    pec_raw,
    pieges_raw,
    parse_quality,
    parse_warnings: warnings,
  };
}

function parseSspMeta(text) {
  const desc = text.match(/\*\*Description:\*\*\s*(.+?)$/m);
  const obj = text.match(/\*\*Objectifs d'évaluation:\*\*\s*(.+?)$/m);
  return {
    description: desc ? desc[1].trim() : "",
    objectifs: obj ? obj[1].trim() : "",
  };
}

function extractRedFlags(anamneseContent) {
  // Find a `### ... DRAPEAUX ROUGES` heading and parse the bullets under it.
  const m = anamneseContent.match(/^###\s+.*DRAPEAUX ROUGES.*$/m);
  if (!m) return [];
  const fromIdx = anamneseContent.indexOf(m[0]);
  if (fromIdx < 0) return [];
  // Find next `###` to bound the section
  const afterStart = anamneseContent.slice(fromIdx + m[0].length);
  const nextHeadingMatch = afterStart.match(/^###\s+/m);
  const block = nextHeadingMatch
    ? afterStart.slice(0, afterStart.indexOf(nextHeadingMatch[0]))
    : afterStart;
  return extractGroupedBullets(block);
}

function extractPieges(pointsClesContent) {
  // Find a `### ❌ Pièges` heading or similar
  const m = pointsClesContent.match(/^###\s+.*Pièges.*$|^###\s+.*❌.*$/m);
  if (!m) return [];
  const fromIdx = pointsClesContent.indexOf(m[0]);
  if (fromIdx < 0) return [];
  const afterStart = pointsClesContent.slice(fromIdx + m[0].length);
  const nextHeadingMatch = afterStart.match(/^###\s+|^##\s+/m);
  const block = nextHeadingMatch
    ? afterStart.slice(0, afterStart.indexOf(nextHeadingMatch[0]))
    : afterStart;
  return extractBullets(block);
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- import-md.test.js
```

Expected: 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/import-md.js \
        CS/Pocketcards/_build/tests/import-md.test.js
git commit -m "Pocketcards Phase 2.1: import-md.js parser orchestrator"
```

---

## Task 8: parse-cli.js — CLI entry

**Files:**

- Create: `_build/src/parse-cli.js`

CLI exposes `yarn parse-md <path>` and `yarn parse-md --discipline=<X>`.

No automated test (CLI smoke test instead).

- [ ] **Step 1: Write `src/parse-cli.js`**

```js
#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";
import { parseSSP } from "./import-md.js";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SSP_DIR = resolve(here, "..", "..", "..", "02_SSP");
const DEFAULT_CACHE_DIR = resolve(here, "..", "import-cache");
const DISCIPLINE_MAP_PATH = resolve(here, "..", "data", "discipline-map.yaml");

function parseArgs(argv) {
  const opts = { paths: [] };
  for (const arg of argv.slice(2)) {
    if (arg === "--verbose") opts.verbose = true;
    else if (arg === "--discipline=" || arg.startsWith("--discipline=")) {
      opts.discipline = arg.slice(13);
    } else if (!arg.startsWith("--")) {
      opts.paths.push(arg);
    }
  }
  return opts;
}

function loadDisciplineMap() {
  if (!existsSync(DISCIPLINE_MAP_PATH)) return {};
  return yaml.load(readFileSync(DISCIPLINE_MAP_PATH, "utf8")) || {};
}

function slugOf(filePath) {
  return basename(filePath, ".md").replace(/^SSP_/, "");
}

async function main() {
  const opts = parseArgs(process.argv);
  mkdirSync(DEFAULT_CACHE_DIR, { recursive: true });

  let paths = opts.paths;
  if (opts.discipline) {
    const map = loadDisciplineMap();
    const slugs = Object.keys(map).filter(
      (s) => map[s]?.discipline === opts.discipline,
    );
    paths = slugs.map((s) => join(DEFAULT_SSP_DIR, `SSP_${s}.md`));
    if (paths.length === 0) {
      console.error(
        pc.yellow(`No SSPs matched discipline=${opts.discipline}.`),
      );
      process.exit(0);
    }
  }

  if (paths.length === 0) {
    console.error(pc.red("No paths provided. Usage:"));
    console.error("  yarn parse-md <path-to-SSP.md>");
    console.error("  yarn parse-md --discipline=Neuro");
    process.exit(1);
  }

  let ok = 0,
    failed = 0;
  for (const p of paths) {
    try {
      if (!existsSync(p)) throw new Error(`File not found: ${p}`);
      const result = parseSSP(p);
      const outPath = join(DEFAULT_CACHE_DIR, `${slugOf(p)}.json`);
      writeFileSync(outPath, JSON.stringify(result, null, 2));
      ok++;
      if (opts.verbose) {
        console.log(
          pc.green(`✓ ${slugOf(p)}`),
          pc.dim(
            `quality=${result.parse_quality}, warnings=${result.parse_warnings.length}`,
          ),
        );
      }
    } catch (e) {
      failed++;
      console.error(pc.red(`✗ ${p}: ${e.message}`));
    }
  }
  console.log(pc.bold(`\n${ok} parsed · ${failed} failed`));
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
```

- [ ] **Step 2: CLI smoke test**

```bash
cd CS/Pocketcards/_build
node src/parse-cli.js tests/fixtures/import/SSP_Cephalee.md --verbose
ls -la import-cache/
cat import-cache/Cephalee.json | head -20
```

Expected:

- `✓ Cephalee quality=high, warnings=0`
- `import-cache/Cephalee.json` exists (~50KB)
- JSON dump shows `schema_version: 1`

Clean up:

```bash
rm -rf import-cache/
```

- [ ] **Step 3: Commit**

```bash
git add CS/Pocketcards/_build/src/parse-cli.js
git commit -m "Pocketcards Phase 2.1: parse-cli for single + batch parsing"
```

---

## Task 9: audit-drafts.js — scan drafts for `[VÉRIFIER:]` markers

**Files:**

- Create: `_build/src/audit-drafts.js`
- Create: `_build/tests/audit-drafts.test.js`

- [ ] **Step 1: Write the failing test `tests/audit-drafts.test.js`**

```js
import { describe, it, expect, beforeEach } from "vitest";
import {
  findMarkers,
  categorize,
  auditDrafts,
  renderReport,
} from "../src/audit-drafts.js";
import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("categorize", () => {
  it("returns high for posologie markers", () => {
    expect(categorize("[VÉRIFIER: posologie inconnue]")).toBe("high");
  });
  it("returns high for red flag markers", () => {
    expect(categorize("[VÉRIFIER: red flag à confirmer]")).toBe("high");
  });
  it("returns medium for DD markers", () => {
    expect(categorize("[VÉRIFIER: DD à reclasser]")).toBe("medium");
  });
  it("returns low for generic markers", () => {
    expect(categorize("[VÉRIFIER: source à vérifier]")).toBe("low");
  });
});

describe("findMarkers", () => {
  it("extracts all [VÉRIFIER:] markers from text", () => {
    const text = "foo [VÉRIFIER: poso] bar [VÉRIFIER: source] baz";
    const result = findMarkers(text);
    expect(result).toHaveLength(2);
    expect(result[0].marker).toContain("poso");
    expect(result[1].marker).toContain("source");
  });
  it("returns empty array when no markers present", () => {
    expect(findMarkers("clean text")).toEqual([]);
  });
});

describe("auditDrafts", () => {
  let tmp;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "audit-"));
  });
  it("finds markers in draft YAML files only", () => {
    writeFileSync(
      join(tmp, "a.yaml"),
      `id: SSP-NEU-01\nstatus: draft\ndiscipline: Neuro\ntitle: A\nfield: "[VÉRIFIER: poso]"\n`,
    );
    writeFileSync(
      join(tmp, "b.yaml"),
      `id: SSP-NEU-02\nstatus: ready\ndiscipline: Neuro\ntitle: B\nfield: "[VÉRIFIER: source]"\n`,
    );
    writeFileSync(
      join(tmp, "c.yaml"),
      `id: SSP-NEU-03\nstatus: draft\ndiscipline: Neuro\ntitle: C\nfield: "clean"\n`,
    );
    const result = auditDrafts({ dataDir: tmp });
    // Only a.yaml has draft + marker
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe("SSP-NEU-01");
    expect(result[0].markers).toHaveLength(1);
  });
  it("filters by discipline when provided", () => {
    writeFileSync(
      join(tmp, "a.yaml"),
      `id: SSP-NEU-01\nstatus: draft\ndiscipline: Neuro\ntitle: A\nfield: "[VÉRIFIER: x]"\n`,
    );
    writeFileSync(
      join(tmp, "b.yaml"),
      `id: SSP-CAR-01\nstatus: draft\ndiscipline: Cardio\ntitle: B\nfield: "[VÉRIFIER: y]"\n`,
    );
    const result = auditDrafts({ dataDir: tmp, discipline: "Neuro" });
    expect(result).toHaveLength(1);
    expect(result[0].card.discipline).toBe("Neuro");
  });
});

describe("renderReport", () => {
  it("groups output by discipline and severity", () => {
    const byCard = [
      {
        file: "a.yaml",
        card: { id: "SSP-NEU-01", title: "Foo", discipline: "Neuro" },
        markers: [{ marker: "[VÉRIFIER: posologie]", sev: "high" }],
      },
    ];
    const report = renderReport(byCard);
    expect(report).toContain("## Neuro");
    expect(report).toContain("SSP-NEU-01");
    expect(report).toMatch(/🔴|High/);
    expect(report).toContain("posologie");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- audit-drafts.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/audit-drafts.js`**

```js
#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");
const DEFAULT_OUT_PATH = resolve(here, "..", "audit-report.md");

const SEVERITY = [
  ["high", /\[VÉRIFIER:\s*poso/i],
  ["high", /\[VÉRIFIER:\s*red.?flag/i],
  ["medium", /\[VÉRIFIER:\s*DD/i],
  ["medium", /\[VÉRIFIER:\s*examen/i],
  ["low", /\[VÉRIFIER:/],
];

export function categorize(text) {
  for (const [sev, pat] of SEVERITY) {
    if (pat.test(text)) return sev;
  }
  return null;
}

export function findMarkers(text) {
  const re = /\[VÉRIFIER:[^\]]+\]/g;
  return [...text.matchAll(re)].map((m) => ({
    marker: m[0],
    sev: categorize(m[0]),
  }));
}

export function auditDrafts({ dataDir, discipline = null } = {}) {
  const dir = dataDir || DEFAULT_DATA_DIR;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );
  const result = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    let card;
    try {
      card = yaml.load(raw);
    } catch {
      continue;
    }
    if (!card || card.status !== "draft") continue;
    if (discipline && card.discipline !== discipline) continue;
    const markers = findMarkers(raw);
    if (markers.length > 0) result.push({ file, card, markers });
  }
  return result;
}

export function renderReport(byCard) {
  const lines = [
    "# Audit Report — Pocketcards drafts",
    "",
    `Total: ${byCard.length} card(s) flagged.`,
    "",
  ];
  const byDisc = new Map();
  for (const c of byCard) {
    const d = c.card.discipline || "(unknown)";
    if (!byDisc.has(d)) byDisc.set(d, []);
    byDisc.get(d).push(c);
  }
  for (const [disc, cards] of byDisc) {
    lines.push(`## ${disc}`, "");
    for (const c of cards) {
      lines.push(
        `### ${c.card.id} — ${c.card.title}`,
        "",
        `_File: \`${c.file}\`_`,
        "",
      );
      const high = c.markers.filter((m) => m.sev === "high");
      const med = c.markers.filter((m) => m.sev === "medium");
      const low = c.markers.filter((m) => m.sev === "low");
      if (high.length) {
        lines.push("**🔴 High**:");
        high.forEach((m) => lines.push(`- ${m.marker}`));
        lines.push("");
      }
      if (med.length) {
        lines.push("**🟡 Medium**:");
        med.forEach((m) => lines.push(`- ${m.marker}`));
        lines.push("");
      }
      if (low.length) {
        lines.push("**🔵 Low**:");
        low.forEach((m) => lines.push(`- ${m.marker}`));
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const disciplineArg = argv.find((a) => a.startsWith("--discipline="));
  const discipline = disciplineArg ? disciplineArg.slice(13) : null;

  const byCard = auditDrafts({ discipline });
  const report = renderReport(byCard);
  mkdirSync(dirname(DEFAULT_OUT_PATH), { recursive: true });
  writeFileSync(DEFAULT_OUT_PATH, report);
  console.log(pc.green(`Audit report → ${DEFAULT_OUT_PATH}`));
  console.log(pc.dim(`  ${byCard.length} card(s) with flags`));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- audit-drafts.test.js
```

Expected: 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/audit-drafts.js \
        CS/Pocketcards/_build/tests/audit-drafts.test.js
git commit -m "Pocketcards Phase 2.1: audit-drafts script + tests"
```

---

## Task 10: promote.js — draft → ready with guards

**Files:**

- Create: `_build/src/promote.js`
- Create: `_build/tests/promote.test.js`

- [ ] **Step 1: Write the failing test `tests/promote.test.js`**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { promoteCard } from "../src/promote.js";
import {
  writeFileSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));

// A minimal valid SSP YAML (passes schema)
function minimalSspYaml({ status = "draft", extras = "" } = {}) {
  return `id: SSP-NEU-99
type: ssp
title: Test
discipline: Neuro
urgency: low
version: 2026-05-28
status: ${status}
sources: [test]
anamnese:
  socrates: [x]
  specifique: [x]
  atcd: [x]
red_flags:
  - {description: x, dx_suspecte: x, action: x}
examen:
  general: [x]
  cible: [x]
dd_top5:
  - {dx: x, indices: x, freq: rare}
pec_initiale:
  immediate: [x]
  orientation: [x]
${extras}`;
}

describe("promoteCard", () => {
  let tmp;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "promote-"));
    // Copy schema so validate.js can load it
    // (validate.js resolves schema relative to its own file location)
  });

  it("promotes a clean draft to ready", () => {
    const p = join(tmp, "card.yaml");
    writeFileSync(p, minimalSspYaml());
    const result = promoteCard({ cardPath: p });
    expect(result.promoted).toBe("SSP-NEU-99");
    const updated = readFileSync(p, "utf8");
    expect(updated).toMatch(/^status:\s*ready$/m);
  });

  it("refuses to promote when [VÉRIFIER:] marker present", () => {
    const p = join(tmp, "card.yaml");
    writeFileSync(
      p,
      minimalSspYaml({ extras: 'pieges: ["[VÉRIFIER: posologie]"]' }),
    );
    expect(() => promoteCard({ cardPath: p })).toThrow(
      /unresolved \[VÉRIFIER:/,
    );
  });

  it("allows promote with --force despite markers", () => {
    const p = join(tmp, "card.yaml");
    writeFileSync(p, minimalSspYaml({ extras: 'pieges: ["[VÉRIFIER: x]"]' }));
    const result = promoteCard({ cardPath: p, force: true });
    expect(result.promoted).toBe("SSP-NEU-99");
  });

  it("refuses when sources empty", () => {
    const p = join(tmp, "card.yaml");
    writeFileSync(
      p,
      minimalSspYaml().replace("sources: [test]", "sources: []"),
    );
    expect(() => promoteCard({ cardPath: p })).toThrow(/sources.*empty/i);
  });

  it("refuses when schema invalid", () => {
    const p = join(tmp, "card.yaml");
    writeFileSync(
      p,
      `id: BAD-FORMAT\ntype: ssp\nstatus: draft\nsources: [x]\n`,
    );
    expect(() => promoteCard({ cardPath: p })).toThrow(/schema|validation/i);
  });

  it("refuses when status is already ready", () => {
    const p = join(tmp, "card.yaml");
    writeFileSync(p, minimalSspYaml({ status: "ready" }));
    expect(() => promoteCard({ cardPath: p })).toThrow(/not draft/i);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- promote.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/promote.js`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { loadAndValidate } from "./validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");

/**
 * Promote a draft YAML card to `status: ready` with guard checks.
 *
 * Refuses to promote if:
 * - The file contains unresolved `[VÉRIFIER:]` markers (unless `--force`)
 * - The schema validation fails
 * - The `sources:` field is empty
 * - The current status is not `draft` or `review-pending`
 *
 * @param {{ cardPath: string, force?: boolean }} opts
 * @returns {{ promoted: string }} the card ID promoted
 */
export function promoteCard({ cardPath, force = false }) {
  const raw = readFileSync(cardPath, "utf8");

  const markers = raw.match(/\[VÉRIFIER:[^\]]+\]/g) || [];
  if (markers.length > 0 && !force) {
    throw new Error(
      `Refused: ${markers.length} unresolved [VÉRIFIER:] markers in ${cardPath}. ` +
        `Resolve them or use --force.`,
    );
  }

  const { valid, errors, card } = loadAndValidate(cardPath);
  if (!valid) {
    throw new Error(`Refused: schema validation failed:\n${errors.join("\n")}`);
  }

  if (!card.sources || card.sources.length === 0) {
    throw new Error(`Refused: 'sources:' is empty (traceability required).`);
  }

  if (card.status !== "draft" && card.status !== "review-pending") {
    throw new Error(
      `Refused: status is "${card.status}", not draft/review-pending.`,
    );
  }

  const updated = raw.replace(/^status:\s*\w+\s*$/m, "status: ready");
  writeFileSync(cardPath, updated);
  return { promoted: card.id };
}

function parseArgs(argv) {
  const opts = { force: false, paths: [] };
  for (const arg of argv.slice(2)) {
    if (arg === "--force") opts.force = true;
    else if (!arg.startsWith("--")) opts.paths.push(arg);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.paths.length === 0) {
    console.error(pc.red("Usage: yarn promote <card-path> [--force]"));
    process.exit(1);
  }
  let ok = 0,
    failed = 0;
  for (const p of opts.paths) {
    try {
      const result = promoteCard({ cardPath: p, force: opts.force });
      console.log(pc.green(`✓ promoted ${result.promoted}`));
      ok++;
    } catch (e) {
      console.error(pc.red(`✗ ${p}: ${e.message}`));
      failed++;
    }
  }
  console.log(pc.bold(`\n${ok} promoted · ${failed} refused`));
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- promote.test.js
```

Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/promote.js \
        CS/Pocketcards/_build/tests/promote.test.js
git commit -m "Pocketcards Phase 2.1: promote script with guard checks"
```

---

## Task 11: check-coherence.js — batch checks

**Files:**

- Create: `_build/src/check-coherence.js`
- Create: `_build/tests/check-coherence.test.js`

- [ ] **Step 1: Write the failing test `tests/check-coherence.test.js`**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { checkCoherence } from "../src/check-coherence.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function card({ id, discipline = "Neuro", linked = [] }) {
  const linkedYaml = linked.length
    ? `cartes_liees: [${linked.join(", ")}]\n`
    : "";
  return `id: ${id}\ntype: ssp\ntitle: ${id}\ndiscipline: ${discipline}\nstatus: ready\nversion: 2026-05-28\nsources: [test]\n${linkedYaml}`;
}

describe("checkCoherence", () => {
  let tmp;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "coh-"));
  });

  it("passes when no issues present", () => {
    writeFileSync(join(tmp, "a.yaml"), card({ id: "SSP-NEU-01" }));
    writeFileSync(
      join(tmp, "b.yaml"),
      card({ id: "SSP-NEU-02", linked: ["SSP-NEU-01"] }),
    );
    const issues = checkCoherence({ dataDir: tmp });
    expect(issues).toEqual([]);
  });

  it("flags duplicate ids", () => {
    writeFileSync(join(tmp, "a.yaml"), card({ id: "SSP-NEU-01" }));
    writeFileSync(join(tmp, "b.yaml"), card({ id: "SSP-NEU-01" }));
    const issues = checkCoherence({ dataDir: tmp });
    expect(issues.some((i) => i.type === "duplicate_id")).toBe(true);
  });

  it("flags broken links", () => {
    writeFileSync(
      join(tmp, "a.yaml"),
      card({ id: "SSP-NEU-01", linked: ["SSP-NEU-99"] }),
    );
    const issues = checkCoherence({ dataDir: tmp });
    expect(
      issues.some((i) => i.type === "broken_link" && i.to === "SSP-NEU-99"),
    ).toBe(true);
  });

  it("filters by discipline", () => {
    writeFileSync(join(tmp, "a.yaml"), card({ id: "SSP-NEU-01" }));
    writeFileSync(
      join(tmp, "b.yaml"),
      card({ id: "SSP-CAR-01", discipline: "Cardio" }),
    );
    const issues = checkCoherence({ dataDir: tmp, discipline: "Cardio" });
    expect(issues).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- check-coherence.test.js
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write `src/check-coherence.js`**

```js
#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");

/**
 * Check coherence across all card YAMLs in `dataDir`.
 *
 * Detects:
 * - `duplicate_id`: two YAML files with same `id`
 * - `broken_link`: a `cartes_liees`/`ssps_liees`/`ssps_ou_utiliser` entry
 *   pointing to a non-existent card id
 *
 * @param {{ dataDir?: string, discipline?: string|null }} opts
 * @returns {Array<{ type: string, ... }>}
 */
export function checkCoherence({ dataDir, discipline = null } = {}) {
  const dir = dataDir || DEFAULT_DATA_DIR;
  const issues = [];
  const cards = [];
  for (const file of readdirSync(dir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  )) {
    let card;
    try {
      card = yaml.load(readFileSync(join(dir, file), "utf8"));
    } catch {
      continue;
    }
    if (!card) continue;
    if (discipline && card.discipline !== discipline) continue;
    cards.push({ file, card });
  }

  const seen = new Map();
  for (const { file, card } of cards) {
    if (!card.id) continue;
    if (seen.has(card.id)) {
      issues.push({
        type: "duplicate_id",
        id: card.id,
        files: [seen.get(card.id), file],
      });
    } else {
      seen.set(card.id, file);
    }
  }

  const knownIds = new Set(seen.keys());
  for (const { file, card } of cards) {
    const linked = [
      ...(card.cartes_liees || []),
      ...(card.ssps_liees || []),
      ...(card.ssps_ou_utiliser || []),
    ];
    for (const ref of linked) {
      if (!knownIds.has(ref)) {
        issues.push({ type: "broken_link", from: card.id, to: ref, file });
      }
    }
  }
  return issues;
}

async function main() {
  const argv = process.argv.slice(2);
  const discArg = argv.find((a) => a.startsWith("--discipline="));
  const discipline = discArg ? discArg.slice(13) : null;
  const issues = checkCoherence({ discipline });
  if (issues.length === 0) {
    console.log(pc.green("✓ No coherence issues found."));
    process.exit(0);
  }
  console.log(pc.red(`${issues.length} issue(s) found:`));
  for (const i of issues) {
    if (i.type === "duplicate_id") {
      console.log(pc.yellow(`  Duplicate id ${i.id}: ${i.files.join(", ")}`));
    } else if (i.type === "broken_link") {
      console.log(
        pc.yellow(`  Broken link in ${i.from}: → ${i.to} (file: ${i.file})`),
      );
    } else {
      console.log(pc.dim(`  ${JSON.stringify(i)}`));
    }
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- check-coherence.test.js
```

Expected: 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CS/Pocketcards/_build/src/check-coherence.js \
        CS/Pocketcards/_build/tests/check-coherence.test.js
git commit -m "Pocketcards Phase 2.1: check-coherence script (duplicate ids + broken links)"
```

---

## Task 12: End-to-end smoke + README

**Files:**

- Modify: `_build/README.md` (document new commands)

- [ ] **Step 1: Run full test suite**

```bash
cd CS/Pocketcards/_build
npm test
```

Expected: all suites green. Total ~45 tests across:

- Phase 0/1 (existing): 18
- encoding, sections, bullets, tables: ~17
- import-md, audit, promote, coherence: ~25

If anything regresses, fix before continuing.

- [ ] **Step 2: Full smoke run of the pipeline**

```bash
# Parse the 3 fixtures
node src/parse-cli.js tests/fixtures/import/SSP_Cephalee.md --verbose
node src/parse-cli.js tests/fixtures/import/SSP_Diabete_Suivi.md --verbose
node src/parse-cli.js tests/fixtures/import/SSP_ACR.md --verbose
ls -la import-cache/
```

Expected: 3 JSON files in `import-cache/`, all with `parse_quality: high` or `medium`.

- [ ] **Step 3: Smoke audit on existing drafts**

Since no drafts exist yet, this should produce an empty report:

```bash
node src/audit-drafts.js
cat audit-report.md
```

Expected: report shows `Total: 0 card(s) flagged.`

- [ ] **Step 4: Smoke coherence check**

```bash
node src/check-coherence.js
```

Expected: `✓ No coherence issues found.` (3 ready cards from Phase 1 are coherent).

- [ ] **Step 5: Update README**

Use Edit to add a new section to `_build/README.md` (after the "Where to edit content" block):

```markdown
## Phase 2 — Import pipeline (Node side)

### Commands

| Command                                         | Purpose                                              |
| ----------------------------------------------- | ---------------------------------------------------- |
| `npm run parse-md <path-to-SSP.md>`             | Parse one SSP MD → JSON intermediate in import-cache |
| `npm run parse-md -- --discipline=Neuro`        | Parse all SSPs for the discipline from the mapping   |
| `npm run audit-drafts`                          | Scan all draft YAMLs for `[VÉRIFIER:]` markers       |
| `npm run audit-drafts -- --discipline=Neuro`    | Audit one discipline                                 |
| `npm run promote <card.yaml>`                   | Promote one card from draft → ready (with guards)    |
| `npm run promote <card.yaml> -- --force`        | Bypass `[VÉRIFIER:]` guard                           |
| `npm run check-coherence`                       | Check IDs unique + linked cards exist                |
| `npm run check-coherence -- --discipline=Neuro` | Restricted to one discipline                         |

### Pipeline flow

1. **Parse** : `npm run parse-md` reads MD source → `import-cache/<slug>.json`
2. **Dispatch subagent** (Claude orchestrator, not Node) : reads the JSON, generates YAML draft in `../data/SSP_<slug>.yaml` with `[VÉRIFIER:]` markers where uncertain.
3. **Audit** : `npm run audit-drafts` produces `audit-report.md` for human review.
4. **Review** : author resolves `[VÉRIFIER:]` markers in the YAML.
5. **Promote** : `npm run promote` moves draft → ready (refuses if markers remain).
6. **Coherence** : `npm run check-coherence` catches broken links / duplicate ids before commit.
```

- [ ] **Step 6: Final commit**

```bash
git add CS/Pocketcards/_build/README.md
git commit -m "Pocketcards Phase 2.1: README — document import pipeline commands"
```

---

## Phase 2.1 — Done criteria

When all of the following hold, Phase 2.1 is shippable:

- [x] `npm test` is green (all parser + audit + promote + coherence tests pass)
- [x] `npm run parse-md` produces valid JSON intermediate from a real SSP MD
- [x] `npm run audit-drafts` produces a report (empty when no drafts exist)
- [x] `npm run promote` refuses unsafe promotions and accepts clean ones
- [x] `npm run check-coherence` catches duplicate ids and broken links
- [x] No Phase 0/1 regression (18 existing tests still pass)
- [x] README documents all new commands

Phase 2.2 (discipline-map bootstrap) can begin once these hold.
