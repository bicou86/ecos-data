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
    expect(anamnese.startLine).toBe(4);
    expect(anamnese.endLine).toBe(5);
  });

  it("SECTION_PATTERNS exports the regex map", () => {
    expect(SECTION_PATTERNS.anamnese).toBeInstanceOf(RegExp);
    expect(SECTION_PATTERNS.red_flags).toBeInstanceOf(RegExp);
  });
});
