import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "schema", "pocketcard.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(schema);

export function validateCard(card) {
  const ok = validateFn(card);
  if (ok) return { valid: true, errors: [] };
  const errors = (validateFn.errors || []).map(formatError);
  return { valid: false, errors };
}

export function loadAndValidate(filePath) {
  const raw = readFileSync(filePath, "utf8");
  let card;
  try {
    card = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  } catch (e) {
    return {
      valid: false,
      errors: [`YAML parse error: ${e.message}`],
      card: null,
    };
  }
  const { valid, errors } = validateCard(card);
  return { valid, errors, card };
}

function formatError(err) {
  const path = err.instancePath || "(root)";
  const msg = err.message || "invalid";
  if (err.keyword === "enum") {
    return `${path}: ${msg} — allowed: ${err.params.allowedValues.join(", ")}`;
  }
  if (err.keyword === "pattern") {
    return `${path}: ${msg} (pattern ${err.params.pattern})`;
  }
  if (err.keyword === "required") {
    return `${path}: missing required field "${err.params.missingProperty}"`;
  }
  return `${path}: ${msg}`;
}
