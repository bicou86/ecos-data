import { basename } from "node:path";
import { readWithEncodingFallback } from "./parsers/encoding.js";
import { detectSections } from "./parsers/sections.js";
import { extractBullets, extractGroupedBullets } from "./parsers/bullets.js";
import { parseMarkdownTables } from "./parsers/tables.js";

const REQUIRED_SECTIONS = ["anamnese", "examen", "dd", "pec"];

/**
 * Parse an SSP markdown file into a structured JSON intermediate.
 *
 * Output schema documented in Phase 2 spec section 5.1.
 * Parse quality: "high" if all required sections found, "medium" if one
 * missing, "low" if two or more missing.
 *
 * @param {string} filePath
 * @returns {object} JSON intermediate
 */
export function parseSSP(filePath) {
  const { content } = readWithEncodingFallback(filePath);
  const lines = content.split("\n");
  const sections = detectSections(content);

  const warnings = [];
  const missing = REQUIRED_SECTIONS.filter((s) => !sections.has(s));
  for (const m of missing) warnings.push(`required section "${m}" not found`);

  const parse_quality =
    missing.length === 0 ? "high" : missing.length === 1 ? "medium" : "low";

  // Title: first H1 line
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title_md = titleMatch
    ? titleMatch[1].trim()
    : basename(filePath, ".md");

  // SSP metadata block
  const metaSection = sections.get("ssp_metadata");
  const ssp_meta = parseSspMeta(metaSection?.content || "");

  // Anamnese: grouped by sub-section headings
  const anamneseSection = sections.get("anamnese");
  const anamnese_raw = anamneseSection
    ? extractGroupedBullets(anamneseSection.content)
    : [];

  // Red flags: scan for "DRAPEAUX ROUGES" subsection inside anamnese
  const red_flags_raw = extractRedFlags(anamneseSection?.content || "");

  // Examen: grouped
  const examenSection = sections.get("examen");
  const examen_raw = examenSection
    ? extractGroupedBullets(examenSection.content)
    : [];

  // Examens complémentaires: grouped
  const examensComplSection = sections.get("examens_compl");
  const examens_complementaires_raw = examensComplSection
    ? extractGroupedBullets(examensComplSection.content)
    : [];

  // DD: flatten markdown table rows into a single array
  const ddSection = sections.get("dd");
  const dd_tables = ddSection ? parseMarkdownTables(ddSection.content) : [];
  const dd_table_raw = dd_tables.flatMap((t) => t.rows);

  // PEC: grouped
  const pecSection = sections.get("pec");
  const pec_raw = pecSection ? extractGroupedBullets(pecSection.content) : [];

  // Pièges: scan for sub-section under points_cles
  const pointsClesSection = sections.get("points_cles");
  const pieges_raw = extractPieges(pointsClesSection?.content || "");

  return {
    schema_version: 1,
    source_path: filePath,
    source_total_lines: lines.length,
    title_md,
    ssp_meta,
    anamnese_raw,
    red_flags_raw,
    examen_raw,
    examens_complementaires_raw,
    dd_table_raw,
    pec_raw,
    pieges_raw,
    parse_quality,
    parse_warnings: warnings,
  };
}

function parseSspMeta(text) {
  const desc = text.match(/\*\*Description:\*\*\s*(.+?)$/m);
  const obj = text.match(/\*\*Objectifs d'évaluation:\*\*\s*(.+?)$/m);
  return {
    description: desc ? desc[1].trim() : "",
    objectifs: obj ? obj[1].trim() : "",
  };
}

function extractRedFlags(anamneseContent) {
  const m = anamneseContent.match(/^###\s+.*DRAPEAUX ROUGES.*$/m);
  if (!m) return [];
  const afterStart = anamneseContent.slice(m.index + m[0].length);
  const nextHeadingMatch = afterStart.match(/^###\s+/m);
  const block = nextHeadingMatch
    ? afterStart.slice(0, nextHeadingMatch.index)
    : afterStart;
  return extractGroupedBullets(block);
}

function extractPieges(pointsClesContent) {
  const m = pointsClesContent.match(/^###\s+.*Pièges.*$|^###\s+.*❌.*$/m);
  if (!m) return [];
  const afterStart = pointsClesContent.slice(m.index + m[0].length);
  const nextHeadingMatch = afterStart.match(/^###\s+|^##\s+/m);
  const block = nextHeadingMatch
    ? afterStart.slice(0, nextHeadingMatch.index)
    : afterStart;
  return extractBullets(block);
}
