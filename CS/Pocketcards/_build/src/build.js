#!/usr/bin/env node
import {
  readdirSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { loadAndValidate } from "./validate.js";
import { renderCard, renderIndex } from "./render.js";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "..", "..", "data");
const DEFAULT_DIST_DIR = resolve(here, "..", "..", "dist");
const ASSETS_SRC = resolve(here, "..", "assets");

export async function runBuild(opts = {}) {
  const {
    dataDir = DEFAULT_DATA_DIR,
    distDir = DEFAULT_DIST_DIR,
    includeDrafts = false,
    only = null,
    verbose = false,
    validateOnly = false,
  } = opts;

  const htmlDir = join(distDir, "html");
  mkdirSync(htmlDir, { recursive: true });

  const files = readdirSync(dataDir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );

  const cards = [];
  const failures = [];

  for (const file of files) {
    const { valid, errors, card } = loadAndValidate(join(dataDir, file));
    if (!valid) {
      failures.push({ file, errors });
      if (verbose) console.error(pc.red(`✗ ${file}`), errors.join("\n  "));
      continue;
    }
    if (only && card.id !== only) continue;
    if (!includeDrafts && card.status !== "ready") {
      if (verbose)
        console.log(pc.dim(`- ${file} (status: ${card.status}) — skipped`));
      continue;
    }
    cards.push({ file, card });
  }

  if (validateOnly) {
    return {
      generated: 0,
      failed: failures.length,
      cards: cards.map((c) => c.card.id),
      failures,
    };
  }

  // Copy CSS once
  mkdirSync(join(distDir, "assets"), { recursive: true });
  for (const asset of readdirSync(ASSETS_SRC)) {
    copyFileSync(join(ASSETS_SRC, asset), join(distDir, "assets", asset));
  }
  // Rewrite the relative href in every output to point to ../assets/card.css
  // — already correct since we mirror the structure.

  let generated = 0;
  for (const { file, card } of cards) {
    try {
      const html = await renderCard(card);
      const outPath = join(htmlDir, `${card.id}.html`);
      writeFileSync(outPath, html);
      generated++;
      if (verbose) console.log(pc.green(`✓ ${card.id}`), pc.dim(`(${file})`));
    } catch (e) {
      failures.push({ file, errors: [`Render error: ${e.message}`] });
      if (verbose) console.error(pc.red(`✗ ${card.id}`), e.message);
    }
  }

  // Generate index
  if (cards.length > 0 && !only) {
    const indexHtml = await renderIndex(cards.map((c) => c.card));
    writeFileSync(join(htmlDir, "index.html"), indexHtml);
  }

  return { generated, failed: failures.length, failures };
}

function parseArgs(argv) {
  const opts = {};
  for (const arg of argv.slice(2)) {
    if (arg === "--include-drafts") opts.includeDrafts = true;
    else if (arg === "--verbose") opts.verbose = true;
    else if (arg === "--validate-only") opts.validateOnly = true;
    else if (arg === "--pdf") opts.pdf = true;
    else if (arg === "--notion") opts.notion = true;
    else if (arg === "--diagrams") opts.diagrams = true;
    else if (arg.startsWith("--only=")) opts.only = arg.slice(7);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  console.log(pc.bold(pc.cyan("ECOS Pocketcards builder")));

  const report = await runBuild(opts);

  if (report.failed > 0) {
    console.error(pc.red(`\n${report.failed} card(s) failed:`));
    for (const f of report.failures) {
      console.error(pc.red(`  ✗ ${f.file}`));
      for (const e of f.errors) console.error(`     ${e}`);
    }
  }
  console.log(
    pc.green(
      `\n${report.generated} card(s) generated · ${report.failed} failed`,
    ),
  );

  // PDF and Notion happen after HTML build; those modules are
  // loaded lazily to keep the validate-only path fast.
  if (opts.pdf && !opts.validateOnly) {
    const { runPdf } = await import("./pdf.js");
    await runPdf({ verbose: opts.verbose, only: opts.only });
  }
  if (opts.notion && !opts.validateOnly) {
    const { runNotion } = await import("./notion.js");
    await runNotion({ verbose: opts.verbose });
  }
  if (opts.diagrams && !opts.validateOnly) {
    const { runDiagrams } = await import("./diagram.js");
    await runDiagrams({ verbose: opts.verbose });
  }

  process.exit(report.failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
