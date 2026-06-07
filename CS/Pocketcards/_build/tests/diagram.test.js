import { describe, it, expect, beforeEach } from "vitest";
import { parseDiagram, runDiagrams, findMmdFiles } from "../src/diagram.js";
import {
  existsSync,
  readFileSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tmpDiagDir = join(here, ".tmp-diagrams");
const tmpDistDir = join(here, ".tmp-dist-diagrams");

const SAMPLE = `%% @id: ANEMIE-DX
%% @page-title: SSP — Pâleur & Anémie
%% @page-id: 31a85631-48fa-815c-9e8a-e3a540f4b53d
%% @caption: 🗺️ Arbre décisionnel
%% @anchor-after: ## 🔄 DIAGNOSTIC DIFFÉRENTIEL — par VGM
%% @status: validé
%% dev note: not pushed to Notion
flowchart TD
  %% ---- a dev-only section comment ----
  A["Anémie — Hb F &lt; 120 / H &lt; 130 g/L"]:::start --> RET{"Réticulocytes"}:::dec
  RET -->|"↑"| HYPER["Hyperrégénérative"]:::hyper
  classDef start fill:#1f2937,color:#fff;
  classDef dec fill:#fde68a;
  classDef hyper fill:#fee2e2;
`;

function resetTmp() {
  for (const d of [tmpDiagDir, tmpDistDir]) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
}

describe("parseDiagram", () => {
  it("extracts front-matter, builds a stable marker and clean mermaid", () => {
    const d = parseDiagram(SAMPLE, "anemie.mmd");
    expect(d.id).toBe("ANEMIE-DX");
    expect(d.pageTitle).toBe("SSP — Pâleur & Anémie");
    expect(d.pageId).toBe("31a85631-48fa-815c-9e8a-e3a540f4b53d");
    expect(d.anchorAfter).toBe("## 🔄 DIAGNOSTIC DIFFÉRENTIEL — par VGM");
    expect(d.status).toBe("validé");
    expect(d.marker).toBe("%% id: ANEMIE-DX");
    expect(d.valid).toBe(true);
    expect(d.problems).toEqual([]);
  });

  it("puts the diagram type first and the id marker as line 2", () => {
    const d = parseDiagram(SAMPLE);
    const lines = d.mermaid.split("\n");
    expect(lines[0]).toBe("flowchart TD");
    expect(lines[1]).toBe("  %% id: ANEMIE-DX");
  });

  it("strips ALL %% comment lines and @meta from the pushed mermaid", () => {
    const d = parseDiagram(SAMPLE);
    expect(d.mermaid).not.toMatch(/@id/);
    expect(d.mermaid).not.toMatch(/@page-title/);
    expect(d.mermaid).not.toMatch(/dev note/);
    expect(d.mermaid).not.toMatch(/dev-only section comment/);
    // but real diagram content survives
    expect(d.mermaid).toMatch(/Réticulocytes/);
    expect(d.mermaid).toMatch(/classDef start/);
  });

  it("flags a file missing @id as invalid", () => {
    const d = parseDiagram("flowchart TD\n  A-->B");
    expect(d.id).toBe("");
    expect(d.valid).toBe(false);
    expect(d.problems.join(" ")).toMatch(/@id/);
  });

  it("detects unbalanced brackets", () => {
    const broken = `%% @id: X\n%% @page-title: P\nflowchart TD\n  A["oops --> B`;
    const d = parseDiagram(broken);
    expect(d.valid).toBe(false);
    expect(d.problems.join(" ")).toMatch(/unbalanced|quote/i);
  });
});

describe("findMmdFiles", () => {
  beforeEach(resetTmp);
  it("recurses into subdirectories", () => {
    mkdirSync(join(tmpDiagDir, "Anémie"), { recursive: true });
    writeFileSync(join(tmpDiagDir, "Anémie", "a.mmd"), SAMPLE);
    writeFileSync(join(tmpDiagDir, "readme.txt"), "not a diagram");
    const found = findMmdFiles(tmpDiagDir);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/a\.mmd$/);
  });
});

describe("runDiagrams", () => {
  beforeEach(resetTmp);
  it("writes dist/notion/diagrams-plan.json with one entry per @id diagram", async () => {
    writeFileSync(join(tmpDiagDir, "anemie.mmd"), SAMPLE);
    writeFileSync(join(tmpDiagDir, "scratch.mmd"), "flowchart TD\n  A-->B"); // no @id → ignored
    const report = await runDiagrams({
      diagramsDir: tmpDiagDir,
      distDir: tmpDistDir,
    });
    expect(report.planned).toBe(1);
    expect(report.invalid).toBe(0);
    const planPath = join(tmpDistDir, "notion", "diagrams-plan.json");
    expect(existsSync(planPath)).toBe(true);
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0].id).toBe("ANEMIE-DX");
    expect(plan.entries[0].marker).toBe("%% id: ANEMIE-DX");
  });
});
