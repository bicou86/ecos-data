import { describe, it, expect } from "vitest";
import {
  extractBullets,
  extractGroupedBullets,
} from "../../src/parsers/bullets.js";

describe("extractBullets", () => {
  it("extracts top-level bullets with labels", () => {
    const text = `- [ ] **Site** localisation\n- [ ] **Onset** brutal ou progressif\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      label: "Site",
      details: ["localisation"],
    });
    expect(result[1]).toMatchObject({
      label: "Onset",
      details: ["brutal ou progressif"],
    });
  });

  it("extracts bullets without labels", () => {
    const text = `- [ ] simple text\n- [ ] another item\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: "", details: ["simple text"] });
  });

  it("attaches indented sub-bullets to parent details", () => {
    const text = `- [ ] **Force MS**:\n  - Droit 4/5\n  - Gauche 5/5\n- [ ] **ROT** symétriques\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0].details).toEqual(
      expect.arrayContaining(["Droit 4/5", "Gauche 5/5"]),
    );
    expect(result[1].label).toBe("ROT");
  });

  it("ignores non-checklist lines", () => {
    const text = `Some prose.\n- [ ] **Item** content\nMore prose.\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(1);
  });

  it("does not include a lone colon as a detail item", () => {
    const text = `- [ ] **Force MS**:\n  - Droit 4/5\n  - Gauche 5/5\n`;
    const result = extractBullets(text);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Force MS");
    expect(result[0].details).not.toContain(":");
    expect(result[0].details).toEqual(["Droit 4/5", "Gauche 5/5"]);
  });
});

describe("extractGroupedBullets", () => {
  it("groups bullets by sub-section heading", () => {
    const text = `#### Type de douleur
- [ ] **Coup de tonnerre**
- [ ] **Pire de ma vie**

#### Contexte à risque
- [ ] **Grossesse**
- [ ] **Cancer connu**
`;
    const result = extractGroupedBullets(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      category: "Type de douleur",
      items: expect.arrayContaining([
        expect.objectContaining({ label: "Coup de tonnerre" }),
      ]),
    });
    expect(result[1].category).toBe("Contexte à risque");
    expect(result[1].items).toHaveLength(2);
  });

  it("returns one group with empty category when no sub-sections present", () => {
    const text = `- [ ] **Item A**\n- [ ] **Item B**\n`;
    const result = extractGroupedBullets(text);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("");
    expect(result[0].items).toHaveLength(2);
  });
});
