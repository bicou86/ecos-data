#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");

/**
 * Check coherence across all card YAMLs in `dataDir`.
 *
 * Detects:
 * - `duplicate_id`: two YAML files with same `id`
 * - `broken_link`: a `cartes_liees`/`ssps_liees`/`ssps_ou_utiliser` entry
 *   pointing to a non-existent card id
 *
 * @param {{ dataDir?: string, discipline?: string|null }} opts
 * @returns {Array<{ type: string, ... }>}
 */
export function checkCoherence({ dataDir, discipline = null } = {}) {
  const dir = dataDir || DEFAULT_DATA_DIR;
  const issues = [];
  const cards = [];
  for (const file of readdirSync(dir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  )) {
    let card;
    try {
      card = yaml.load(readFileSync(join(dir, file), "utf8"), {
        schema: yaml.CORE_SCHEMA,
      });
    } catch {
      continue;
    }
    if (!card) continue;
    if (discipline && card.discipline !== discipline) continue;
    cards.push({ file, card });
  }

  const seen = new Map();
  for (const { file, card } of cards) {
    if (!card.id) continue;
    if (seen.has(card.id)) {
      issues.push({
        type: "duplicate_id",
        id: card.id,
        files: [seen.get(card.id), file],
      });
    } else {
      seen.set(card.id, file);
    }
  }

  const knownIds = new Set(seen.keys());
  for (const { file, card } of cards) {
    const linked = [
      ...(card.cartes_liees || []),
      ...(card.ssps_liees || []),
      ...(card.ssps_ou_utiliser || []),
    ];
    for (const ref of linked) {
      if (!knownIds.has(ref)) {
        issues.push({ type: "broken_link", from: card.id, to: ref, file });
      }
    }
  }
  return issues;
}

async function main() {
  const argv = process.argv.slice(2);
  const discArg = argv.find((a) => a.startsWith("--discipline="));
  const discipline = discArg ? discArg.slice(13) : null;
  const issues = checkCoherence({ discipline });
  if (issues.length === 0) {
    console.log(pc.green("✓ No coherence issues found."));
    process.exit(0);
  }
  console.log(pc.red(`${issues.length} issue(s) found:`));
  for (const i of issues) {
    if (i.type === "duplicate_id") {
      console.log(pc.yellow(`  Duplicate id ${i.id}: ${i.files.join(", ")}`));
    } else if (i.type === "broken_link") {
      console.log(
        pc.yellow(`  Broken link in ${i.from}: → ${i.to} (file: ${i.file})`),
      );
    } else {
      console.log(pc.dim(`  ${JSON.stringify(i)}`));
    }
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
