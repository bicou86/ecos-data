#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");
const DEFAULT_OUT_PATH = resolve(here, "..", "audit-report.md");

const SEVERITY = [
  ["high", /\[VÉRIFIER:\s*poso/i],
  ["high", /\[VÉRIFIER:\s*red.?flag/i],
  ["medium", /\[VÉRIFIER:\s*DD/i],
  ["medium", /\[VÉRIFIER:\s*examen/i],
  ["low", /\[VÉRIFIER:/],
];

export function categorize(text) {
  for (const [sev, pat] of SEVERITY) {
    if (pat.test(text)) return sev;
  }
  return null;
}

export function findMarkers(text) {
  const re = /\[VÉRIFIER:[^\]]+\]/g;
  return [...text.matchAll(re)].map((m) => ({
    marker: m[0],
    sev: categorize(m[0]),
  }));
}

export function auditDrafts({ dataDir, discipline = null } = {}) {
  const dir = dataDir || DEFAULT_DATA_DIR;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );
  const result = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    let card;
    try {
      card = yaml.load(raw, { schema: yaml.CORE_SCHEMA });
    } catch {
      continue;
    }
    if (!card || card.status !== "draft") continue;
    if (discipline && card.discipline !== discipline) continue;
    const markers = findMarkers(raw);
    if (markers.length > 0) result.push({ file, card, markers });
  }
  return result;
}

export function renderReport(byCard) {
  const lines = [
    "# Audit Report — Pocketcards drafts",
    "",
    `Total: ${byCard.length} card(s) flagged.`,
    "",
  ];
  const byDisc = new Map();
  for (const c of byCard) {
    const d = c.card.discipline || "(unknown)";
    if (!byDisc.has(d)) byDisc.set(d, []);
    byDisc.get(d).push(c);
  }
  for (const [disc, cards] of byDisc) {
    lines.push(`## ${disc}`, "");
    for (const c of cards) {
      lines.push(
        `### ${c.card.id} — ${c.card.title}`,
        "",
        `_File: \`${c.file}\`_`,
        "",
      );
      const high = c.markers.filter((m) => m.sev === "high");
      const med = c.markers.filter((m) => m.sev === "medium");
      const low = c.markers.filter((m) => m.sev === "low");
      if (high.length) {
        lines.push("**🔴 High**:");
        high.forEach((m) => lines.push(`- ${m.marker}`));
        lines.push("");
      }
      if (med.length) {
        lines.push("**🟡 Medium**:");
        med.forEach((m) => lines.push(`- ${m.marker}`));
        lines.push("");
      }
      if (low.length) {
        lines.push("**🔵 Low**:");
        low.forEach((m) => lines.push(`- ${m.marker}`));
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const disciplineArg = argv.find((a) => a.startsWith("--discipline="));
  const discipline = disciplineArg ? disciplineArg.slice(13) : null;

  const byCard = auditDrafts({ discipline });
  const report = renderReport(byCard);
  mkdirSync(dirname(DEFAULT_OUT_PATH), { recursive: true });
  writeFileSync(DEFAULT_OUT_PATH, report);
  console.log(pc.green(`Audit report → ${DEFAULT_OUT_PATH}`));
  console.log(pc.dim(`  ${byCard.length} card(s) with flags`));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
