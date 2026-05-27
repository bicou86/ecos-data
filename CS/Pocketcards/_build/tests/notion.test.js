import { describe, it, expect, beforeEach } from "vitest";
import { buildPushPlan, runNotion } from "../src/notion.js";
import { loadAndValidate } from "../src/validate.js";
import {
  existsSync,
  readFileSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "fixtures", "golden");
const tmpDataDir = join(here, ".tmp-data-notion");
const tmpDistDir = join(here, ".tmp-dist-notion");

function resetTmp() {
  for (const d of [tmpDataDir, tmpDistDir]) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
  for (const f of readdirSync(goldenDir)) {
    copyFileSync(join(goldenDir, f), join(tmpDataDir, f));
  }
}

describe("buildPushPlan", () => {
  it("maps SSP yaml to a Notion-shaped block list", () => {
    const { card } = loadAndValidate(join(goldenDir, "SSP_Cephalee.yaml"));
    const plan = buildPushPlan(card);
    expect(plan.card_id).toBe("SSP-NEU-04");
    expect(plan.title).toBe("Céphalée");
    expect(plan.properties.discipline).toBe("Neuro");
    expect(plan.properties.urgency).toBe("high");
    const types = plan.blocks.map((b) => b.type);
    expect(types).toContain("heading_2");
    expect(types).toContain("bulleted_list_item");
    expect(types).toContain("callout"); // red flags as callouts
    const callout = plan.blocks.find((b) => b.type === "callout");
    expect(callout.callout.rich_text[0].text.content).toMatch(
      /Coup de tonnerre/,
    );
  });

  it("maps SYS yaml without red_flags", () => {
    const { card } = loadAndValidate(join(goldenDir, "SYS_Cardio.yaml"));
    const plan = buildPushPlan(card);
    expect(plan.card_id).toBe("SYS-CAR");
    expect(plan.properties.urgency).toBeNull();
    expect(plan.blocks.some((b) => b.type === "callout")).toBe(false);
  });
});

describe("runNotion", () => {
  beforeEach(resetTmp);

  it("writes dist/notion/push-plan.json with one entry per ready card", async () => {
    const report = await runNotion({
      dataDir: tmpDataDir,
      distDir: tmpDistDir,
    });
    expect(report.planned).toBe(3);
    const planPath = join(tmpDistDir, "notion", "push-plan.json");
    expect(existsSync(planPath)).toBe(true);
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    expect(plan.entries).toHaveLength(3);
    expect(plan.entries.map((e) => e.card_id).sort()).toEqual([
      "SSP-NEU-04",
      "SYS-CAR",
      "TOOL-NIHSS",
    ]);
  });
});
