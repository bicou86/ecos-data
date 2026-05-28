#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import yaml from "js-yaml";
import { parseSSP } from "./import-md.js";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SSP_DIR = resolve(here, "..", "..", "..", "02_SSP");
const DEFAULT_CACHE_DIR = resolve(here, "..", "import-cache");
const DISCIPLINE_MAP_PATH = resolve(here, "..", "data", "discipline-map.yaml");

function parseArgs(argv) {
  const opts = { paths: [] };
  for (const arg of argv.slice(2)) {
    if (arg === "--verbose") opts.verbose = true;
    else if (arg.startsWith("--discipline=")) {
      opts.discipline = arg.slice(13);
    } else if (!arg.startsWith("--")) {
      opts.paths.push(arg);
    }
  }
  return opts;
}

function loadDisciplineMap() {
  if (!existsSync(DISCIPLINE_MAP_PATH)) return {};
  // yaml.load in js-yaml v4 uses DEFAULT_SCHEMA (safe) by default;
  // passing CORE_SCHEMA makes the intent explicit: no arbitrary type constructors.
  return (
    yaml.load(readFileSync(DISCIPLINE_MAP_PATH, "utf8"), {
      schema: yaml.CORE_SCHEMA,
    }) || {}
  );
}

function slugOf(filePath) {
  return basename(filePath, ".md").replace(/^SSP_/, "");
}

async function main() {
  const opts = parseArgs(process.argv);
  mkdirSync(DEFAULT_CACHE_DIR, { recursive: true });

  let paths = opts.paths;
  if (opts.discipline) {
    const map = loadDisciplineMap();
    const slugs = Object.keys(map).filter(
      (s) => map[s]?.discipline === opts.discipline,
    );
    paths = slugs.map((s) => join(DEFAULT_SSP_DIR, `SSP_${s}.md`));
    if (paths.length === 0) {
      console.error(
        pc.yellow(`No SSPs matched discipline=${opts.discipline}.`),
      );
      process.exit(0);
    }
  }

  if (paths.length === 0) {
    console.error(pc.red("No paths provided. Usage:"));
    console.error("  npm run parse-md <path-to-SSP.md>");
    console.error("  npm run parse-md -- --discipline=Neuro");
    process.exit(1);
  }

  let ok = 0,
    failed = 0;
  for (const p of paths) {
    try {
      if (!existsSync(p)) throw new Error(`File not found: ${p}`);
      const result = parseSSP(p);
      const outPath = join(DEFAULT_CACHE_DIR, `${slugOf(p)}.json`);
      writeFileSync(outPath, JSON.stringify(result, null, 2));
      ok++;
      if (opts.verbose) {
        console.log(
          pc.green(`✓ ${slugOf(p)}`),
          pc.dim(
            `quality=${result.parse_quality}, warnings=${result.parse_warnings.length}`,
          ),
        );
      }
    } catch (e) {
      failed++;
      console.error(pc.red(`✗ ${p}: ${e.message}`));
    }
  }
  console.log(pc.bold(`\n${ok} parsed · ${failed} failed`));
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
