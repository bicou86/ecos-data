// One-off: produce the markdown encarts for the "extra" actions decided with
// the user (merged fusion pages, Skills pages, new SSP pages). Reuses the
// deterministic buildEncart. Writes files into dist/notion/encarts/.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidate } from "./validate.js";
import { buildEncart, markerFor } from "./encart.js";

const here = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(here, "..", "..", "data");
const OUT = resolve(here, "..", "..", "dist", "notion", "encarts");

const load = (f) => loadAndValidate(join(DATA, f)).card;

// --- Merged encarts for the two fused pages ---
function mergedCard(title, files, maxRf = 7) {
  const cards = files.map(load);
  const rf = cards.flatMap((c) => c.red_flags || []).slice(0, maxRf);
  const ddSeen = new Set();
  const dd = [];
  for (const c of cards)
    for (const d of c.dd_top5 || []) {
      const k = d.dx.toLowerCase();
      if (!ddSeen.has(k)) {
        ddSeen.add(k);
        dd.push(d);
      }
    }
  const pieges = cards.flatMap((c) => c.pieges || []);
  return {
    id: cards.map((c) => c.id).join("+"),
    title,
    status: "draft",
    red_flags: rf,
    dd_top5: dd.slice(0, 6),
    pieges,
  };
}

const ophMerged = mergedCard("Amaurose & baisse d'acuité visuelle", [
  "SSP_Amaurose.yaml",
  "SSP_Baisse_Acuite_Visuelle.yaml",
]);
const orlMerged = mergedCard("Mal de gorge & angine", [
  "SSP_Mal_Gorge.yaml",
  "SSP_Angine.yaml",
]);
writeFileSync(join(OUT, "MERGE-OPH.md"), buildEncart(ophMerged));
writeFileSync(join(OUT, "MERGE-ORL.md"), buildEncart(orlMerged));
console.log("merged OPH marker:", markerFor(ophMerged));
console.log("merged ORL marker:", markerFor(orlMerged));

// --- Single-card encarts needed for Skills pages + new SSP pages ---
const singles = {
  "SSP_BBN.yaml": "SSP-COM-01",
  "SSP_EM.yaml": "SSP-COM-02",
  "SSP_Troubles_Médicamenteux.yaml": "SSP-COM-11",
  "SSP_Presentation_Cas.yaml": "SSP-COM-05",
  "SSP_Perte_Cheveux.yaml": "SSP-DER-02",
  "SSP_ACR.yaml": "SSP-URG-03",
  "SSP_Troubles_Humeur.yaml": "SSP-PSY-06",
};
for (const [file, id] of Object.entries(singles)) {
  const card = load(file);
  if (!card) {
    console.log("⚠️ introuvable:", file);
    continue;
  }
  writeFileSync(join(OUT, `${card.id}.md`), buildEncart(card));
}
console.log(
  "écrit:",
  Object.values(singles).join(", "),
  "+ MERGE-OPH, MERGE-ORL",
);
