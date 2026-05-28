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
