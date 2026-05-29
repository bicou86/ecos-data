#!/usr/bin/env node
// Prioritize draft cards for medical review.
// Score = urgency_weight + marker_severity_weights.
// Outputs top N cards sorted by priority, with marker breakdown per card.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";
import { findMarkers } from "./audit-drafts.js";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");

const URGENCY_WEIGHT = { high: 100, medium: 30, low: 5 };
const SEVERITY_WEIGHT = { high: 20, medium: 8, low: 2 };

export function score(card, markers) {
  const u = URGENCY_WEIGHT[card.urgency] ?? 0;
  const m = markers.reduce((acc, x) => acc + (SEVERITY_WEIGHT[x.sev] ?? 0), 0);
  return u + m;
}

export function prioritize({ dataDir, limit = 10, type = "ssp" } = {}) {
  const dir = dataDir || DEFAULT_DATA_DIR;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );
  const ranked = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    let card;
    try {
      card = yaml.load(raw, { schema: yaml.CORE_SCHEMA });
    } catch {
      continue;
    }
    if (!card || card.status !== "draft") continue;
    if (type && card.type !== type) continue;
    const markers = findMarkers(raw);
    const counts = {
      high: markers.filter((m) => m.sev === "high").length,
      medium: markers.filter((m) => m.sev === "medium").length,
      low: markers.filter((m) => m.sev === "low").length,
      total: markers.length,
    };
    ranked.push({ file, card, markers, counts, score: score(card, markers) });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

function fmt(rank, entry) {
  const c = entry.card;
  const m = entry.counts;
  const urg =
    c.urgency === "high"
      ? pc.red(c.urgency)
      : c.urgency === "medium"
        ? pc.yellow(c.urgency)
        : pc.dim(c.urgency);
  return [
    `${pc.bold(String(rank).padStart(2))}. ${pc.cyan(c.id.padEnd(18))} ${c.title}`,
    `    urgency=${urg} score=${entry.score} markers=${m.total} (H:${m.high} M:${m.medium} L:${m.low}) file=${entry.file}`,
  ].join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice(8)) : 20;

  const ranked = prioritize({ limit });
  console.log(
    pc.bold(`Top ${ranked.length} draft SSP cards by review priority:`),
  );
  console.log("");
  ranked.forEach((entry, i) => console.log(fmt(i + 1, entry)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
