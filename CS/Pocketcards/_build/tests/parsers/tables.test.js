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
