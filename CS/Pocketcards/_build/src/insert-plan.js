// Join the Notion resolution (page_id + confidence) with the rendered encarts,
// dedupe many-to-one collisions, and split into: insertable / collision-secondary
// / low / none. Emits dist/notion/insert-plan.json + dist/notion/review.json.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(here, "..", "..", "dist", "notion");

const RESOLUTION_PATH = process.argv[2];
if (!RESOLUTION_PATH) {
  console.error("usage: node src/insert-plan.js <resolution.output.json>");
  process.exit(1);
}

const resolution = JSON.parse(readFileSync(RESOLUTION_PATH, "utf8"));
const matches = resolution.result.matches;
const encarts = JSON.parse(readFileSync(resolve(DIST, "encarts.json"), "utf8"));
const mdById = new Map(encarts.entries.map((e) => [e.id, e]));

const none = [];
const low = [];
const candidates = []; // high/medium with a page_id

for (const m of matches) {
  if (!m.page_id || m.confidence === "none") {
    none.push(m);
  } else if (m.confidence === "low") {
    low.push(m);
  } else {
    candidates.push(m);
  }
}

// Group candidates by target page to resolve many-to-one collisions.
const byPage = new Map();
for (const c of candidates) {
  if (!byPage.has(c.page_id)) byPage.set(c.page_id, []);
  byPage.get(c.page_id).push(c);
}

const rank = { high: 2, medium: 1 };
const insertable = [];
const collisionSecondary = [];

for (const [pageId, group] of byPage) {
  group.sort(
    (a, b) =>
      rank[b.confidence] - rank[a.confidence] || a.id.localeCompare(b.id),
  );
  const [primary, ...rest] = group;
  const enc = mdById.get(primary.id);
  insertable.push({
    id: primary.id,
    local_title: primary.local_title,
    page_id: pageId,
    page_title: primary.page_title,
    confidence: primary.confidence,
    marker: enc?.marker,
    markdown: enc?.markdown,
  });
  for (const r of rest) {
    collisionSecondary.push({
      id: r.id,
      local_title: r.local_title,
      page_id: pageId,
      page_title: r.page_title,
      kept_instead: primary.id,
    });
  }
}

insertable.sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(
  resolve(DIST, "insert-plan.json"),
  JSON.stringify({ count: insertable.length, entries: insertable }, null, 2),
);
writeFileSync(
  resolve(DIST, "review.json"),
  JSON.stringify({ none, low, collisionSecondary }, null, 2),
);

console.log(`insertable (uniques high/medium) : ${insertable.length}`);
console.log(
  `  · high   : ${insertable.filter((x) => x.confidence === "high").length}`,
);
console.log(
  `  · medium : ${insertable.filter((x) => x.confidence === "medium").length}`,
);
console.log(
  `collision-secondary (même page, non inséré) : ${collisionSecondary.length}`,
);
for (const c of collisionSecondary)
  console.log(
    `    ${c.id} «${c.local_title}» → page de ${c.kept_instead} (${c.page_title})`,
  );
console.log(
  `low (décision) : ${low.length} — ${low.map((x) => x.id).join(", ")}`,
);
console.log(
  `none (décision) : ${none.length} — ${none.map((x) => x.id).join(", ")}`,
);
const missingMd = insertable.filter((x) => !x.markdown);
if (missingMd.length)
  console.log(`⚠️ sans markdown : ${missingMd.map((x) => x.id).join(", ")}`);
