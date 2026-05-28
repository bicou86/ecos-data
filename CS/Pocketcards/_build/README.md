# ECOS Pocketcards — Build Pipeline

Generates ECOS pocketcards as HTML, PDF and a Notion push-manifest from
YAML source files in `../data/`.

## Setup

```bash
cd CS/Pocketcards/_build
npm install      # or: yarn install
```

## Commands

| Command                  | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `npm run validate`       | AJV check on every YAML in `../data/`                  |
| `npm run build`          | HTML only (fast — Eta render)                          |
| `npm run build:pdf`      | HTML + PDF (slow — Puppeteer)                          |
| `npm run publish:notion` | Build the Notion push-manifest (`dist/notion/`)        |
| `npm run dev`            | Watch mode + preview server on `http://localhost:3000` |
| `npm test`               | Vitest suite                                           |
| `npm run test:watch`     | Vitest in watch mode                                   |

## CLI flags

```
node src/build.js [--pdf] [--notion] [--include-drafts] [--only=<id>] [--verbose] [--validate-only]
```

## Where to edit content

- Card YAML: `../data/SSP_*.yaml`, `../data/SYS_*.yaml`, `../data/TOOL_*.yaml`
- Templates: `templates/*.eta`
- Styles: `assets/card.css`
- Validation schema: `schema/pocketcard.schema.json`

See `docs/superpowers/specs/2026-05-27-pocketcards-design.md` for the full design.

## Phase 2 — Import pipeline (Node side)

### Commands

| Command                                         | Purpose                                              |
| ----------------------------------------------- | ---------------------------------------------------- |
| `npm run parse-md <path-to-SSP.md>`             | Parse one SSP MD → JSON intermediate in import-cache |
| `npm run parse-md -- --discipline=Neuro`        | Parse all SSPs for the discipline from the mapping   |
| `npm run audit-drafts`                          | Scan all draft YAMLs for `[VÉRIFIER:]` markers       |
| `npm run audit-drafts -- --discipline=Neuro`    | Audit one discipline                                 |
| `npm run promote <card.yaml>`                   | Promote one card from draft → ready (with guards)    |
| `npm run promote <card.yaml> -- --force`        | Bypass `[VÉRIFIER:]` guard                           |
| `npm run check-coherence`                       | Check IDs unique + linked cards exist                |
| `npm run check-coherence -- --discipline=Neuro` | Restricted to one discipline                         |

### Pipeline flow

1. **Parse** : `npm run parse-md` reads MD source → `import-cache/<slug>.json`
2. **Dispatch subagent** (Claude orchestrator, not Node) : reads the JSON, generates YAML draft in `../data/SSP_<slug>.yaml` with `[VÉRIFIER:]` markers where uncertain.
3. **Audit** : `npm run audit-drafts` produces `audit-report.md` for human review.
4. **Review** : author resolves `[VÉRIFIER:]` markers in the YAML.
5. **Promote** : `npm run promote` moves draft → ready (refuses if markers remain).
6. **Coherence** : `npm run check-coherence` catches broken links / duplicate ids before commit.

## Semantic color coding markup

Inside YAML content, wrap words/phrases with the following markers to color them:

| Marker    | Use for                                 | Color  |
| --------- | --------------------------------------- | ------ |
| `{s:...}` | symptom / sign / mechanism              | pink   |
| `{p:...}` | pathology / diagnosis / vital emergency | red    |
| `{t:...}` | test / score / imaging                  | green  |
| `{r:...}` | treatment / drug / procedure / number   | yellow |
| `{e:...}` | physiological state                     | brown  |

Example: `"{s:Coup de tonnerre} → {p:HSA} → {t:CT cérébral}"`

The markup is rendered as `<span>` in HTML and stripped from Notion exports.

## Troubleshooting

**AJV draft-2020-12 import**
AJV v8 ships multiple entry points. JSON Schema draft-2020-12 requires the dedicated export:

```js
import Ajv from "ajv/dist/2020.js";
```

Using the default `import Ajv from "ajv"` silently loads the draft-07 validator, which ignores `$schema` and produces false positives on allOf/if-then patterns.

**js-yaml date auto-coercion**
By default js-yaml converts bare YAML date strings (e.g. `version: 2026-05-27`) into JavaScript `Date` objects. This breaks the schema string-pattern check. Always load YAML with the JSON schema to keep dates as strings:

```js
yaml.load(raw, { schema: yaml.JSON_SCHEMA });
```

**Eta template spread syntax**
Eta templates do not support the ES2015+ spread operator inside template expressions. Use `Array.from()` instead of `[...new Set(...)]`:

```html
<!-- fails in Eta -->
<% [...new Set(it.cards.map(c => c.discipline))].forEach(...) %>

<!-- works -->
<% Array.from(new Set(it.cards.map(function(c){ return c.discipline;
}))).forEach(...) %>
```

**Puppeteer first-run Chromium download**
`npm install` triggers a one-time Chromium download (~150 MB, ~30 s on a fast connection). Subsequent installs use the local cache. If you are behind a corporate proxy and the download fails, set `PUPPETEER_SKIP_DOWNLOAD=1` before `npm install`, then point Puppeteer at a local Chromium via the `executablePath` option in `src/pdf.js`.
