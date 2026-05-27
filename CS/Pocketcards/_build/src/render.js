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

export async function renderCard(card) {
  const template = TEMPLATE_FOR_TYPE[card.type];
  if (!template)
    throw new Error(`No template registered for type "${card.type}"`);
  return eta.render(template, { card });
}

export async function renderIndex(cards) {
  return eta.render("index.eta", { cards });
}
