#!/usr/bin/env node
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";
import handler from "serve-handler";
import pc from "picocolors";
import { runBuild } from "./build.js";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(here, "..", "..", "data");
const DIST_DIR = resolve(here, "..", "..", "dist");
const HTML_DIR = join(DIST_DIR, "html");
const TEMPLATES_DIR = resolve(here, "..", "templates");
const ASSETS_DIR = resolve(here, "..", "assets");
const SCHEMA_PATH = resolve(here, "..", "schema", "pocketcard.schema.json");
const PORT = Number(process.env.PORT) || 3000;

let isBuilding = false;
let pendingRebuild = false;

async function rebuild() {
  if (isBuilding) {
    pendingRebuild = true;
    return;
  }
  isBuilding = true;
  console.log(pc.cyan("↻ rebuilding…"));
  try {
    const report = await runBuild({
      dataDir: DATA_DIR,
      distDir: DIST_DIR,
      includeDrafts: true, // dev mode shows drafts
      verbose: true,
    });
    console.log(pc.green(`✓ ${report.generated} ok · ${report.failed} failed`));
  } catch (e) {
    console.error(pc.red("Build error:"), e.message);
  } finally {
    isBuilding = false;
    if (pendingRebuild) {
      pendingRebuild = false;
      rebuild();
    }
  }
}

// Initial build
await rebuild();

// Watch source files
const watcher = chokidar.watch(
  [DATA_DIR, TEMPLATES_DIR, ASSETS_DIR, SCHEMA_PATH],
  { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 } },
);
watcher.on("all", (event, path) => {
  console.log(pc.dim(`[${event}] ${path}`));
  rebuild();
});

// Preview server
const server = createServer((req, res) => {
  return handler(req, res, { public: HTML_DIR, directoryListing: true });
});
server.listen(PORT, () => {
  console.log(pc.bold(pc.green(`\n→ http://localhost:${PORT}`)));
  console.log(pc.dim(`  watching: data/, templates/, assets/, schema/`));
  console.log(pc.dim(`  press Ctrl+C to stop\n`));
});
