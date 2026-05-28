import { describe, it, expect, beforeEach } from "vitest";
import { promoteCard } from "../src/promote.js";
import { writeFileSync, readFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
