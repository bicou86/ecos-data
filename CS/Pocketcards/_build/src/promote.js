#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { loadAndValidate } from "./validate.js";

const _here = dirname(fileURLToPath(import.meta.url));

/**
 * Promote a draft YAML card to `status: ready` with guard checks.
 *
 * Refuses to promote if:
 * - The file contains unresolved `[VÉRIFIER:]` markers (unless `--force`)
 * - The schema validation fails
 * - The `sources:` field is empty
 * - The current status is not `draft` or `review-pending`
 *
 * @param {{ cardPath: string, force?: boolean }} opts
 * @returns {{ promoted: string }} the card ID promoted
 */
export function promoteCard({ cardPath, force = false }) {
  const raw = readFileSync(cardPath, "utf8");

  const markers = raw.match(/\[VÉRIFIER:[^\]]+\]/g) || [];
  if (markers.length > 0 && !force) {
    throw new Error(
      `Refused: ${markers.length} unresolved [VÉRIFIER:] markers in ${cardPath}. ` +
        `Resolve them or use --force.`,
    );
  }

  const { valid, errors, card } = loadAndValidate(cardPath);
  if (!valid) {
    throw new Error(`Refused: schema validation failed:\n${errors.join("\n")}`);
  }

  if (!card.sources || card.sources.length === 0) {
    throw new Error(`Refused: 'sources:' is empty (traceability required).`);
  }

  if (card.status !== "draft" && card.status !== "review-pending") {
    throw new Error(
      `Refused: status is "${card.status}", not draft/review-pending.`,
    );
  }

  const updated = raw.replace(/^status:\s*[\w-]+\s*$/m, "status: ready");
  writeFileSync(cardPath, updated);
  return { promoted: card.id };
}

function parseArgs(argv) {
  const opts = { force: false, paths: [] };
  for (const arg of argv.slice(2)) {
    if (arg === "--force") opts.force = true;
    else if (!arg.startsWith("--")) opts.paths.push(arg);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.paths.length === 0) {
    console.error(pc.red("Usage: npm run promote <card-path> [--force]"));
    process.exit(1);
  }
  let ok = 0,
    failed = 0;
  for (const p of opts.paths) {
    try {
      const result = promoteCard({ cardPath: p, force: opts.force });
      console.log(pc.green(`✓ promoted ${result.promoted}`));
      ok++;
    } catch (e) {
      console.error(pc.red(`✗ ${p}: ${e.message}`));
      failed++;
    }
  }
  console.log(pc.bold(`\n${ok} promoted · ${failed} refused`));
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
