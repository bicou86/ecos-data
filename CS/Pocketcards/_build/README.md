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
