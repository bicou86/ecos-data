import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { loadAndValidate } from "./validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");
const DEFAULT_DIST_DIR = resolve(here, "..", "..", "dist");

function stripMarkup(text) {
  if (text == null) return "";
  return String(text).replace(/\{[sprte]:([^}]+)\}/g, "$1");
}

function text(content) {
  return [{ type: "text", text: { content: stripMarkup(content) } }];
}
function heading(content) {
  return { type: "heading_2", heading_2: { rich_text: text(content) } };
}
function bullet(content) {
  return {
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: text(content) },
  };
}
function callout(content, emoji = "🚨", color = "red_background") {
  return {
    type: "callout",
    callout: {
      rich_text: text(content),
      icon: { type: "emoji", emoji },
      color,
    },
  };
}
function paragraph(content) {
  return { type: "paragraph", paragraph: { rich_text: text(content) } };
}

function pushItemBlocks(blocks, item) {
  const rawText = stripMarkup(item);
  if (rawText.includes("\n")) {
    const lines = rawText.split("\n");
    const lead = lines[0];
    const bulletLines = lines.slice(1).filter((l) => /^[•\-]\s/.test(l));
    if (bulletLines.length >= 2) {
      blocks.push(paragraph(lead));
      bulletLines.forEach((b) =>
        blocks.push(bullet(b.replace(/^[•\-]\s/, ""))),
      );
      return;
    }
  }
  blocks.push(bullet(rawText));
}

export function buildPushPlan(card) {
  const blocks = [];

  if (card.type === "ssp") {
    blocks.push(heading("📋 Anamnèse"));
    blocks.push(paragraph("SOCRATES"));
    card.anamnese.socrates.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(paragraph("Spécifique"));
    card.anamnese.specifique.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(paragraph("ATCD"));
    card.anamnese.atcd.forEach((x) => pushItemBlocks(blocks, x));

    blocks.push(heading("🚨 Red flags"));
    card.red_flags.forEach((rf) => {
      blocks.push(
        callout(`${rf.description} → ${rf.dx_suspecte} · ${rf.action}`),
      );
    });

    blocks.push(heading("🔍 Examen"));
    blocks.push(paragraph("Général"));
    card.examen.general.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(paragraph("Ciblé"));
    card.examen.cible.forEach((x) => pushItemBlocks(blocks, x));

    blocks.push(heading("🎯 DD Top 5"));
    card.dd_top5.forEach((d) =>
      blocks.push(bullet(`${d.dx} — ${d.indices} (${d.freq})`)),
    );

    blocks.push(heading("💊 Prise en charge initiale"));
    blocks.push(paragraph("Immédiat"));
    card.pec_initiale.immediate.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(paragraph("Orientation"));
    card.pec_initiale.orientation.forEach((x) => pushItemBlocks(blocks, x));

    if (card.examens_complementaires?.length) {
      blocks.push(heading("🧪 Examens complémentaires"));
      card.examens_complementaires.forEach((x) => pushItemBlocks(blocks, x));
    }
    if (card.criteres_hospitalisation?.length) {
      blocks.push(heading("🏥 Critères d'hospitalisation"));
      card.criteres_hospitalisation.forEach((x) => pushItemBlocks(blocks, x));
    }
    if (card.pieges?.length) {
      blocks.push(heading("💡 Pièges"));
      card.pieges.forEach((x) => pushItemBlocks(blocks, x));
    }
  } else if (card.type === "sys") {
    blocks.push(heading("📋 Anamnèse"));
    card.anamnese_appareil.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(heading("🔍 Examen clinique"));
    for (const [sub, items] of Object.entries(card.examen_physique)) {
      blocks.push(paragraph(sub.charAt(0).toUpperCase() + sub.slice(1)));
      items.forEach((x) => pushItemBlocks(blocks, x));
    }
    blocks.push(heading("✋ Manœuvres"));
    card.manoeuvres.forEach((x) => pushItemBlocks(blocks, x));
    if (card.echelles?.length) {
      blocks.push(heading("📊 Échelles"));
      card.echelles.forEach((x) => pushItemBlocks(blocks, x));
    }
  } else if (card.type === "tool") {
    blocks.push(heading("❓ Quand l'utiliser"));
    card.quand_utiliser.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(heading("📝 Items"));
    card.items.forEach((x) => pushItemBlocks(blocks, x));
    blocks.push(heading("🧮 Score / Interprétation"));
    card.score_interpretation.forEach((row) => {
      blocks.push(bullet(`${row.score} : ${row.interpretation}`));
    });
    if (card.limites?.length) {
      blocks.push(heading("⚠️ Limites"));
      card.limites.forEach((x) => pushItemBlocks(blocks, x));
    }
  }

  return {
    card_id: card.id,
    title: card.title,
    properties: {
      type: card.type,
      discipline: card.discipline,
      urgency: card.urgency ?? null,
      version: card.version,
      sources: card.sources ?? [],
    },
    blocks,
  };
}

export async function runNotion(opts = {}) {
  const {
    dataDir = DEFAULT_DATA_DIR,
    distDir = DEFAULT_DIST_DIR,
    verbose = false,
  } = opts;

  const outDir = join(distDir, "notion");
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(dataDir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );
  const entries = [];
  let skipped = 0;

  for (const file of files) {
    const { valid, card } = loadAndValidate(join(dataDir, file));
    if (!valid || card.status !== "ready") {
      skipped++;
      if (verbose) console.log(pc.dim(`- ${file} skipped`));
      continue;
    }
    entries.push(buildPushPlan(card));
  }

  const plan = { generated_at: new Date().toISOString(), entries };
  const outPath = join(outDir, "push-plan.json");
  writeFileSync(outPath, JSON.stringify(plan, null, 2));

  console.log(pc.green(`✓ Notion push-plan written: ${outPath}`));
  console.log(pc.dim(`  ${entries.length} cards planned · ${skipped} skipped`));
  console.log(
    pc.cyan(
      `  Next step: review the manifest, then ask Claude to execute it via MCP.`,
    ),
  );

  return { planned: entries.length, skipped, path: outPath };
}
