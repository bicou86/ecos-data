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
  const colored = escaped.replace(
    /\{([sprte]):([^}]+)\}/g,
    (_, type, content) => `<span class="${SEM_CLASS[type]}">${content}</span>`,
  );

  // Detect multi-line with bullet markers: split into lead + nested list
  if (colored.includes("\n")) {
    const lines = colored.split("\n");
    const lead = lines[0];
    const bullets = lines.slice(1).filter((l) => /^[•\-]\s/.test(l));
    if (bullets.length >= 2) {
      const items = bullets
        .map((b) => `<li>${b.replace(/^[•\-]\s/, "")}</li>`)
        .join("");
      return `<strong>${lead}</strong><ul class="nested-bullets">${items}</ul>`;
    }
  }

  // Single-line "Lead: rest" → bold the lead
  // Constraints: lead ≤ 40 chars, no comma in lead (avoid bolding long phrases)
  const leadMatch = colored.match(/^([^:,\n]{1,40}):\s+(.+)$/);
  if (leadMatch) {
    return `<strong>${leadMatch[1]}:</strong> ${leadMatch[2]}`;
  }

  return colored;
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
