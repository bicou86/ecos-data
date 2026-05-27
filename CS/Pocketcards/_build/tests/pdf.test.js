import { describe, it, expect, beforeAll } from "vitest";
import { runPdf } from "../src/pdf.js";
import { runBuild } from "../src/build.js";
import {
  existsSync,
  statSync,
  rmSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "fixtures", "golden");
const tmpDataDir = join(here, ".tmp-data-pdf");
const tmpDistDir = join(here, ".tmp-dist-pdf");

describe("runPdf (smoke test)", () => {
  beforeAll(async () => {
    if (existsSync(tmpDistDir))
      rmSync(tmpDistDir, { recursive: true, force: true });
    if (existsSync(tmpDataDir))
      rmSync(tmpDataDir, { recursive: true, force: true });
    mkdirSync(tmpDataDir, { recursive: true });
    for (const f of readdirSync(goldenDir)) {
      copyFileSync(join(goldenDir, f), join(tmpDataDir, f));
    }
    await runBuild({ dataDir: tmpDataDir, distDir: tmpDistDir });
  }, 30_000);

  it("produces a non-trivial PDF for the SSP golden card", async () => {
    const report = await runPdf({ distDir: tmpDistDir, only: "SSP-NEU-04" });
    const pdfPath = join(tmpDistDir, "pdf", "SSP-NEU-04.pdf");
    expect(existsSync(pdfPath)).toBe(true);
    expect(statSync(pdfPath).size).toBeGreaterThan(5_000);
    expect(report.generated).toBeGreaterThanOrEqual(1);
  }, 60_000);
});
