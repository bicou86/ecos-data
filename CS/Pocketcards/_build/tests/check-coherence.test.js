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
