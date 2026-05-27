import { describe, it, expect } from "vitest";
import { loadAndValidate } from "../src/validate.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "fixtures", "golden");
const brokenDir = join(here, "fixtures", "broken");

describe("loadAndValidate — golden fixtures", () => {
  it.each([["SSP_Cephalee.yaml"], ["SYS_Cardio.yaml"], ["TOOL_NIHSS.yaml"]])(
    "accepts %s",
    (file) => {
      const result = loadAndValidate(join(goldenDir, file));
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.card.id).toMatch(/^(SSP|SYS|TOOL)-/);
    },
  );
});

describe("loadAndValidate — broken fixtures", () => {
  it("rejects missing required section (red_flags)", () => {
    const result = loadAndValidate(join(brokenDir, "missing_red_flags.yaml"));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/red_flags/);
  });

  it("rejects bad id format", () => {
    const result = loadAndValidate(join(brokenDir, "bad_id.yaml"));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/id/);
  });

  it("rejects unknown discipline", () => {
    const result = loadAndValidate(join(brokenDir, "bad_discipline.yaml"));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/discipline/);
  });
});
