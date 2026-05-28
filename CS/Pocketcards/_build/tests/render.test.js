import { describe, it, expect } from "vitest";
import { renderCard, renderIndex } from "../src/render.js";
import { loadAndValidate } from "../src/validate.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "fixtures", "golden");

describe("renderCard", () => {
  it("renders the golden SSP card to HTML", async () => {
    const { card } = loadAndValidate(join(goldenDir, "SSP_Cephalee.yaml"));
    const html = await renderCard(card);
    expect(html).toContain("<title>Céphalée");
    expect(html).toContain("SSP-NEU-04");
    expect(html).toContain("Coup de tonnerre");
    expect(html).toContain("Migraine");
    expect(html).toContain("section anam");
    expect(html).toContain("section rf");
    expect(html).toContain("section exam");
    expect(html).toContain("section dd");
    expect(html).toContain("section pec");
    expect(html).toMatchSnapshot();
  });

  it("renders the golden SYS card to HTML", async () => {
    const { card } = loadAndValidate(join(goldenDir, "SYS_Cardio.yaml"));
    const html = await renderCard(card);
    expect(html).toContain("<title>Cardio");
    expect(html).toContain("SYS-CAR");
    expect(html).toContain("Inspection");
    expect(html).toContain("NYHA");
    expect(html).toMatchSnapshot();
  });

  it("renders the golden TOOL card to HTML", async () => {
    const { card } = loadAndValidate(join(goldenDir, "TOOL_NIHSS.yaml"));
    const html = await renderCard(card);
    expect(html).toContain("<title>NIHSS");
    expect(html).toContain("TOOL-NIHSS");
    expect(html).toContain("suspect");
    expect(html).toContain("Pas de déficit");
    expect(html).toMatchSnapshot();
  });
});

describe("renderIndex", () => {
  it("renders the index with all card links", async () => {
    const cards = [
      loadAndValidate(join(goldenDir, "SSP_Cephalee.yaml")).card,
      loadAndValidate(join(goldenDir, "SYS_Cardio.yaml")).card,
      loadAndValidate(join(goldenDir, "TOOL_NIHSS.yaml")).card,
    ];
    const html = await renderIndex(cards);
    expect(html).toContain("SSP-NEU-04");
    expect(html).toContain("SYS-CAR");
    expect(html).toContain("TOOL-NIHSS");
    expect(html).toContain("data-filter");
    expect(html).toContain("Céphalée");
    expect(html).toMatchSnapshot();
  });
});
