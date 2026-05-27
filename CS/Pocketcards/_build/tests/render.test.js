import { describe, it, expect } from "vitest";
import { renderCard } from "../src/render.js";
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
});
