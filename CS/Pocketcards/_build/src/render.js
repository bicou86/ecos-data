import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Eta } from "eta";

const here = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(here, "..", "templates");
const eta = new Eta({ views: templatesDir, autoEscape: true, useWith: false });

const TEMPLATE_FOR_TYPE = {
  ssp: "card-ssp.eta",
  sys: "card-sys.eta",
  tool: "card-tool.eta",
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const SEM_CLASS = {
  s: "sem-symptom",
  p: "sem-pathology",
  t: "sem-test",
  r: "sem-treatment",
  e: "sem-state",
};

export function formatItem(text) {
  if (text == null) return "";
  const escaped = escapeHtml(text);
  return escaped.replace(
    /\{([sprte]):([^}]+)\}/g,
    (_, type, content) => `<span class="${SEM_CLASS[type]}">${content}</span>`,
  );
}

export async function renderCard(card) {
  const template = TEMPLATE_FOR_TYPE[card.type];
  if (!template)
    throw new Error(`No template registered for type "${card.type}"`);
  return eta.render(template, { card, fmt: formatItem });
}

export async function renderIndex(cards) {
  return eta.render("index.eta", { cards, fmt: formatItem });
}
