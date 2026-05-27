import { describe, it, expect, beforeEach } from "vitest";
import { runBuild } from "../src/build.js";
import {
  existsSync,
  readFileSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "fixtures", "golden");
const tmpDataDir = join(here, ".tmp-data");
const tmpDistDir = join(here, ".tmp-dist");

function resetTmp() {
  for (const d of [tmpDataDir, tmpDistDir]) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
  for (const f of readdirSync(goldenDir)) {
    copyFileSync(join(goldenDir, f), join(tmpDataDir, f));
  }
}

describe("runBuild", () => {
  beforeEach(resetTmp);

  it("generates one HTML per ready card + an index", async () => {
    const report = await runBuild({ dataDir: tmpDataDir, distDir: tmpDistDir });
    expect(report.generated).toBe(3);
    expect(report.failed).toBe(0);
    expect(existsSync(join(tmpDistDir, "html", "SSP-NEU-04.html"))).toBe(true);
    expect(existsSync(join(tmpDistDir, "html", "SYS-CAR.html"))).toBe(true);
    expect(existsSync(join(tmpDistDir, "html", "TOOL-NIHSS.html"))).toBe(true);
    expect(existsSync(join(tmpDistDir, "html", "index.html"))).toBe(true);
    const html = readFileSync(
      join(tmpDistDir, "html", "SSP-NEU-04.html"),
      "utf8",
    );
    expect(html).toContain("Céphalée");
  });

  it("skips cards with status=draft unless --include-drafts", async () => {
    const draftPath = join(tmpDataDir, "SSP_Draft.yaml");
    const golden = readFileSync(join(goldenDir, "SSP_Cephalee.yaml"), "utf8");
    writeFileSync(
      draftPath,
      golden
        .replace("id: SSP-NEU-04", "id: SSP-NEU-99")
        .replace("status: ready", "status: draft"),
    );
    const r1 = await runBuild({ dataDir: tmpDataDir, distDir: tmpDistDir });
    expect(existsSync(join(tmpDistDir, "html", "SSP-NEU-99.html"))).toBe(false);
    const r2 = await runBuild({
      dataDir: tmpDataDir,
      distDir: tmpDistDir,
      includeDrafts: true,
    });
    expect(existsSync(join(tmpDistDir, "html", "SSP-NEU-99.html"))).toBe(true);
  });

  it("filters by --only", async () => {
    const report = await runBuild({
      dataDir: tmpDataDir,
      distDir: tmpDistDir,
      only: "SYS-CAR",
    });
    expect(report.generated).toBe(1);
    expect(existsSync(join(tmpDistDir, "html", "SYS-CAR.html"))).toBe(true);
    expect(existsSync(join(tmpDistDir, "html", "SSP-NEU-04.html"))).toBe(false);
  });

  it("reports validation errors and continues other cards", async () => {
    writeFileSync(
      join(tmpDataDir, "bad.yaml"),
      "id: BAD\nthis: is: not: valid\n",
    );
    const report = await runBuild({ dataDir: tmpDataDir, distDir: tmpDistDir });
    expect(report.failed).toBeGreaterThanOrEqual(1);
    expect(report.generated).toBe(3);
  });
});
