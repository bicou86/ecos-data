// Build a plan-first, idempotent Notion sync for grounded Mermaid diagrams.
//
// DESIGN (mirrors encart.js): pure deterministic transform of .mmd source files
// — NO content invention, NO LLM. It (a) parses the `%% @key: value` front-matter,
// (b) strips ALL `%%` comment lines from the diagram body (dev-only notes are not
// pushed), (c) injects a stable anchor marker `%% id: <ID>` as the 2nd line so the
// diagram type stays first (Notion always detects it) and re-runs UPDATE the right
// block instead of duplicating it, and (d) emits dist/notion/diagrams-plan.json.
//
// This module NEVER calls the Notion API. Like notion.js/encart.js it writes a
// manifest; an agent executes it via the Notion MCP:
//   for each entry → validate the mermaid with validate_and_render_mermaid_diagram,
//   then find the ```mermaid block whose code contains `entry.marker` and
//   update_content it; if absent, insert after `entry.anchor_after` (else append).

import { readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { readWithEncodingFallback } from "./parsers/encoding.js";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

const here = dirname(fileURLToPath(import.meta.url));
// Diagram sources live in the repo-level Mindmaps/ tree (4 levels up from src/).
const DEFAULT_DIAGRAMS_DIR = resolve(here, "..", "..", "..", "..", "Mindmaps");
const DEFAULT_DIST_DIR = resolve(here, "..", "..", "dist");

const DIAGRAM_TYPE_RE =
  /^(flowchart|graph|sequenceDiagram|stateDiagram(-v2)?|mindmap|erDiagram|classDiagram|journey|gantt|pie|gitGraph|timeline|quadrantChart)\b/;

const META_RE = /^%%\s*@([a-zA-Z][\w-]*)\s*:\s*(.*)$/;
const COMMENT_RE = /^\s*%%/;

const META_KEYS = {
  id: "id",
  "page-title": "pageTitle",
  "page-id": "pageId",
  caption: "caption",
  "anchor-after": "anchorAfter",
  source: "source",
  audit: "audit",
  status: "status",
};

/** Recursively collect *.mmd file paths under a root directory. */
export function findMmdFiles(root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const full = join(root, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...findMmdFiles(full));
    else if (name.endsWith(".mmd")) out.push(full);
  }
  return out.sort();
}

/** Simple balance check for the medical-critical bracket/quote pairs. */
function bracketProblems(code) {
  const problems = [];
  const pairs = [
    ["[", "]"],
    ["{", "}"],
    ["(", ")"],
  ];
  for (const [open, close] of pairs) {
    const o = (code.match(new RegExp(`\\${open}`, "g")) || []).length;
    const c = (code.match(new RegExp(`\\${close}`, "g")) || []).length;
    if (o !== c) problems.push(`unbalanced "${open}${close}" (${o} vs ${c})`);
  }
  const quotes = (code.match(/"/g) || []).length;
  if (quotes % 2 !== 0)
    problems.push(`odd number of double-quotes (${quotes})`);
  return problems;
}

/**
 * Parse one .mmd source into a plan entry.
 * Returns { id, pageTitle, pageId, caption, anchorAfter, source, audit, status,
 *           marker, mermaid, valid, problems, sourceFile }.
 */
export function parseDiagram(content, sourceFile = "") {
  const lines = content.split("\n");
  const meta = {};
  for (const line of lines) {
    const m = line.match(META_RE);
    if (m && META_KEYS[m[1]]) meta[META_KEYS[m[1]]] = m[2].trim();
  }

  const problems = [];
  const id = meta.id || "";
  if (!id) problems.push("missing %% @id");
  if (!meta.pageTitle && !meta.pageId)
    problems.push("missing %% @page-title or %% @page-id");

  // Body = from the first diagram-type line onward, minus all %% comment lines.
  const typeIdx = lines.findIndex((l) => DIAGRAM_TYPE_RE.test(l.trim()));
  let mermaid = "";
  if (typeIdx === -1) {
    problems.push("no recognized Mermaid diagram type line");
  } else {
    const typeLine = lines[typeIdx].trim();
    const rest = lines
      .slice(typeIdx + 1)
      .filter((l) => !COMMENT_RE.test(l))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+$/, "");
    // Anchor marker as 2nd line: diagram type stays first (Notion detects it).
    const markerLine = id ? `  %% id: ${id}` : "";
    mermaid = [typeLine, markerLine, rest].filter(Boolean).join("\n");
    problems.push(...bracketProblems(mermaid));
  }

  return {
    id,
    pageTitle: meta.pageTitle || null,
    pageId: meta.pageId || null,
    caption: meta.caption || null,
    anchorAfter: meta.anchorAfter || null,
    source: meta.source || null,
    audit: meta.audit || null,
    status: meta.status || null,
    marker: id ? `%% id: ${id}` : null,
    mermaid,
    valid: problems.length === 0,
    problems,
    sourceFile,
  };
}

export async function runDiagrams(opts = {}) {
  const {
    diagramsDir = DEFAULT_DIAGRAMS_DIR,
    distDir = DEFAULT_DIST_DIR,
    verbose = false,
  } = opts;

  const outDir = join(distDir, "notion");
  mkdirSync(outDir, { recursive: true });

  const files = findMmdFiles(diagramsDir);
  const entries = [];
  const invalid = [];

  for (const file of files) {
    const { content } = readWithEncodingFallback(file);
    const entry = parseDiagram(content, file);
    if (!entry.id) {
      // Not a pipeline diagram (no @id front-matter) — silently ignore.
      if (verbose) console.log(pc.dim(`- ${file} (no @id) — ignored`));
      continue;
    }
    if (!entry.valid) {
      invalid.push(entry);
      if (verbose)
        console.log(pc.yellow(`⚠ ${entry.id}: ${entry.problems.join("; ")}`));
    }
    entries.push(entry);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  const plan = { generated_at: null, count: entries.length, entries };
  const outPath = join(outDir, "diagrams-plan.json");
  writeFileSync(outPath, JSON.stringify(plan, null, 2));

  console.log(pc.green(`✓ Notion diagrams-plan written: ${outPath}`));
  console.log(
    pc.dim(
      `  ${entries.length} diagram(s) · ${invalid.length} with problems (still planned)`,
    ),
  );
  console.log(
    pc.cyan(
      "  Next step: agent validates each mermaid (validate_and_render_mermaid_diagram),",
    ),
  );
  console.log(
    pc.cyan(
      "  then updates the ```mermaid block matching entry.marker (else inserts after entry.anchor_after).",
    ),
  );

  return { planned: entries.length, invalid: invalid.length, path: outPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDiagrams({ verbose: process.argv.includes("--verbose") }).catch((e) => {
    console.error(pc.red(e.stack));
    process.exit(1);
  });
}
