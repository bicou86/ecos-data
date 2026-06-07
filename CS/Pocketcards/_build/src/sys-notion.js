// Render SYS (système) pocketcards to full Notion-flavored Markdown + build a
// creation manifest (with ssps_liees resolved to Notion SSP page ids).
// Deterministic transform — preserves multi-line structure and semantic colors.

import { readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidate } from "./validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(here, "..", "..", "data");
const OUT_DIR = resolve(here, "..", "..", "dist", "notion", "sys");
const MAP_PATH = resolve(
  here,
  "..",
  "..",
  "dist",
  "notion",
  "ssp-id-to-page.json",
);

const COLOR = { p: "red", s: "pink", t: "green", r: "yellow", e: "orange" };
const stripNotes = (t) =>
  String(t ?? "").replace(/\s*\[VÉRIFIER\s*:[^\]]*\]/gi, "");

// inline format: escape medical </>, inject <span color> from {x:..} tags
function fmt(field) {
  let t = stripNotes(field);
  t = t.replace(/</g, "\\<").replace(/>/g, "\\>");
  t = t.replace(
    /\{([sprte]):([^}]+)\}/g,
    (_, k, v) => `<span color="${COLOR[k] || "default"}">${v}</span>`,
  );
  return t.trim();
}

// multi-line item (YAML "|-" block: lead + "• " sub-lines) → nested markdown bullets
function renderItem(raw) {
  const t = stripNotes(raw);
  if (t.includes("\n")) {
    const lines = t
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const lead = lines[0];
    const out = [`- ${fmt(lead)}`];
    for (const sub of lines.slice(1)) {
      out.push(`\t- ${fmt(sub.replace(/^[•\-]\s*/, ""))}`);
    }
    return out.join("\n");
  }
  return `- ${fmt(t)}`;
}

export function markerFor(card) {
  return `🩺 Examen ${card.title} — carte système`;
}

export function buildSysMarkdown(card) {
  const out = [];
  out.push(
    `<callout icon="🩺" color="gray_bg">\n\t**${markerFor(card)}** · *carte \`${card.id}\` · ne pas éditer ici (régénérée depuis le YAML)*\n</callout>`,
  );
  out.push("## 📋 Anamnèse de l'appareil");
  for (const it of card.anamnese_appareil || []) out.push(renderItem(it));

  out.push("## 🔍 Examen clinique");
  for (const [section, items] of Object.entries(card.examen_physique || {})) {
    out.push(`### ${section}`);
    for (const it of items) out.push(renderItem(it));
  }

  if (card.manoeuvres?.length) {
    out.push("## ✋ Manœuvres spécifiques");
    for (const it of card.manoeuvres) out.push(renderItem(it));
  }
  if (card.echelles?.length) {
    out.push("## 📊 Échelles / scores");
    for (const it of card.echelles) out.push(renderItem(it));
  }
  return out.join("\n");
}

function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const sspMap = JSON.parse(readFileSync(MAP_PATH, "utf8"));
  const norm = (s) => String(s).replace(/-/g, "");
  const files = readdirSync(DATA_DIR).filter((f) => /^SYS_.*\.ya?ml$/.test(f));
  const index = [];
  const missing = {};
  for (const file of files) {
    const { card } = loadAndValidate(join(DATA_DIR, file));
    if (!card || card.type !== "sys" || card.id === "SYS-CAR") continue; // SYS-CAR already in Notion (RMS CV)
    const md = buildSysMarkdown(card);
    writeFileSync(join(OUT_DIR, `${card.id}.md`), md);
    const sspPageIds = [];
    for (const sid of card.ssps_liees || []) {
      const pid = sspMap[sid];
      if (pid) sspPageIds.push(norm(pid));
      else (missing[card.id] ||= []).push(sid);
    }
    index.push({
      id: card.id,
      title: card.title,
      discipline: card.discipline,
      file,
      ssp_page_ids: [...new Set(sspPageIds)],
      ssp_local: card.ssps_liees || [],
    });
  }
  index.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(
    resolve(OUT_DIR, "..", "sys-index.json"),
    JSON.stringify({ count: index.length, entries: index }, null, 2),
  );
  console.log(`✓ ${index.length} cartes SYS rendues → ${OUT_DIR}`);
  for (const e of index)
    console.log(`  ${e.id} ${e.title} · ${e.ssp_page_ids.length} SSP liées`);
  if (Object.keys(missing).length)
    console.log("⚠️ ssps non mappées:", JSON.stringify(missing));
}

if (import.meta.url === `file://${process.argv[1]}`) run();
