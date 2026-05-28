import { describe, it, expect, beforeEach } from "vitest";
import {
  findMarkers,
  categorize,
  auditDrafts,
  renderReport,
} from "../src/audit-drafts.js";
import { writeFileSync, mkdtempSync } from "node:fs";
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
