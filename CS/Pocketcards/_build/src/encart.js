// Build compact "📇 Pocketcard express" Notion callouts from pocketcard YAML.
//
// DESIGN: pure deterministic transform of the YAML — NO content invention.
// It only (a) maps semantic tags {p/s/t/r/e:…} to Notion <span color> tags,
// (b) strips internal [VÉRIFIER:…] review notes, (c) escapes medical </> so
// they don't collide with Notion markdown, and (d) compacts each section.
// This is intentionally not an LLM rewrite: the cards are mostly unvalidated
// drafts, so faithfulness > prettiness.

import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidate } from "./validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(here, "..", "..", "data");
const OUT_DIR = resolve(here, "..", "..", "dist", "notion");

// Semantic tag → Notion color (mirrors card.css .sem-* and the existing SSP pages)
const COLOR = { p: "red", s: "pink", t: "green", r: "yellow", e: "orange" };

const stripNotes = (t) =>
  String(t ?? "").replace(/\s*\[VÉRIFIER\s*:[^\]]*\]/gi, "");

// Escape medical </> FIRST, then inject real <span> tags, then collapse whitespace.
function fmt(field) {
  let t = stripNotes(field);
  t = t.replace(/</g, "\\<").replace(/>/g, "\\>");
  t = t.replace(
    /\{([sprte]):([^}]+)\}/g,
    (_, k, v) => `<span color="${COLOR[k] || "default"}">${v}</span>`,
  );
  // collapse the YAML multi-line "lead + • bullets" shape into one inline string
  t = t
    .replace(/\s*\n\s*/g, " ")
    .replace(/[•]\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t;
}

// Keep only the first clause of a long red-flag action (before the first ";").
function firstClause(raw, max = 140) {
  let r = stripNotes(raw);
  const i = r.indexOf(";");
  if (i > 0 && i < max) r = r.slice(0, i);
  return fmt(r);
}

// Keep the punchy headline of a pitfall (before the first ":" explanation).
function headline(raw, max = 95) {
  let r = stripNotes(raw);
  const i = r.indexOf(":");
  if (i > 0 && i < max) r = r.slice(0, i);
  return fmt(r);
}

export function markerFor(card) {
  return `📇 Pocketcard express — ${card.title}`;
}

export function buildEncart(card) {
  const lines = [];
  const draftTag =
    card.status === "ready" ? "" : " · 🚧 brouillon (non relu médicalement)";
  lines.push(
    `**${markerFor(card)}** · *résumé réflexe · carte \`${card.id}\`${draftTag} · ne pas éditer ici (régénérée depuis le YAML)*`,
  );

  if (Array.isArray(card.red_flags) && card.red_flags.length) {
    lines.push("**🚩 Red flags — si X → pense Y → fais Z**");
    for (const rf of card.red_flags) {
      const desc = fmt(rf.description);
      const dx = fmt(rf.dx_suspecte);
      const act = firstClause(rf.action);
      lines.push(`- ${desc} → ${dx}${act ? ` · ${act}` : ""}`);
    }
  }

  if (Array.isArray(card.dd_top5) && card.dd_top5.length) {
    const dd = card.dd_top5.map((d) => fmt(d.dx)).join(" · ");
    lines.push(`**🎯 DD Top 5** — ${dd}`);
  }

  // Cards without red flags (e.g. communication / screening) — surface a few
  // anamnesis/PEC anchors so the encart isn't empty.
  if (
    !(card.red_flags && card.red_flags.length) &&
    card.pec_initiale?.immediate?.length
  ) {
    const pec = card.pec_initiale.immediate
      .slice(0, 3)
      .map((x) => firstClause(x))
      .join(" · ");
    if (pec) lines.push(`**💊 Réflexes** — ${pec}`);
  }

  if (Array.isArray(card.pieges) && card.pieges.length) {
    const pg = card.pieges.slice(0, 3).map(headline).join(" · ");
    lines.push(`**💡 Pièges** — ${pg}`);
  }

  const body = lines.map((l) => `\t${l}`).join("\n");
  return `<callout icon="📇" color="gray_bg">\n${body}\n</callout>`;
}

function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".yaml"));
  const entries = [];
  const problems = [];
  for (const file of files) {
    const { card } = loadAndValidate(join(DATA_DIR, file));
    if (!card?.id) {
      problems.push(file);
      continue;
    }
    entries.push({
      id: card.id,
      type: card.type,
      title: card.title,
      discipline: card.discipline,
      status: card.status,
      file,
      expected_page_title: `SSP — ${card.title}`,
      marker: markerFor(card),
      markdown: card.type === "ssp" ? buildEncart(card) : null,
    });
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const out = join(OUT_DIR, "encarts.json");
  writeFileSync(
    out,
    JSON.stringify(
      { generated_at: null, count: entries.length, entries },
      null,
      2,
    ),
  );
  const ssp = entries.filter((e) => e.type === "ssp").length;
  console.log(`✓ ${out}`);
  console.log(
    `  ${entries.length} cartes · ${ssp} SSP (encart) · ${entries.length - ssp} TOOL/SYS (audit)`,
  );
  if (problems.length)
    console.log(
      `  ⚠️ ${problems.length} fichiers sans id: ${problems.join(", ")}`,
    );
}

if (import.meta.url === `file://${process.argv[1]}`) run();
