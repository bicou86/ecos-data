# SSP Subagent Prompt Template (v3 — derived from Phase 2.3 smoke test)

This is the canonical prompt template for dispatching LLM subagents in Phase 2.4+ (batch SSP generation per discipline). It encodes the lessons learned from the v1 → v2 iteration during the Phase 2.3 smoke test on `Etat_Confusionnel`, `Vertiges`, and `Tremblement`.

## Iteration history

- **v1** (initial): no density hard limit, weak red flag definition, weak pieges limit
  - Result : densities 194 / 237 / 293 (Tremblement way over), Tremblement red_flags included FXTAS/PSP (not actionable), pieges count 8 (over)
- **v2** (P2.3 fix): added 220-line hard limit + stricter red flag criteria + pieges ≤ 5
  - Result : densities 150 / 190 / 155 (all in target), all red_flags actionable
  - **Regression** : `[VÉRIFIER:]` markers dropped to 4/1/2 (Vertiges had only 1)
- **v3** (P2.4 use): adds explicit minimum marker count to restore conservatism

## The template

Substitute `{SLUG}`, `{TITLE}`, `{DISCIPLINE}`, `{URGENCY}`, and `{NEU-XX}` per card.

````text
You are generating a YAML pocketcard draft for the ECOS SSP `{SLUG}` (discipline: {DISCIPLINE}, urgency: {URGENCY}).

## Inputs (read these files yourself)

1. JSON intermediate: `CS/Pocketcards/_build/import-cache/{SLUG}.json`
2. Original MD: `CS/02_SSP/SSP_{SLUG}.md`
3. Golden master (same discipline if available): see "Golden master selection" below
4. Schema: `CS/Pocketcards/_build/schema/pocketcard.schema.json`

## Output target

`CS/Pocketcards/data/SSP_{SLUG}.yaml`

## Required metadata block

```yaml
id: SSP-{DISC_PREFIX}-{NN}
type: ssp
title: {TITLE}
discipline: {DISCIPLINE}
urgency: {URGENCY}
version: 2026-05-28
status: draft
sources:
  - CS/02_SSP/SSP_{SLUG}.md
````

## DENSITY HARD LIMIT — 220 lines maximum

If you exceed 220 lines:

1. Cut `pieges` ≤ 5
2. Cut `criteres_hospitalisation` ≤ 5
3. Cut `examens_complementaires` ≤ 6
4. Condense nested bullets
5. Last resort: trim DD characterization

Target: 180-210 lines.

## Red flag STRICTER definition

Each red flag MUST:

1. Be a **recognizable observable sign/symptom/context**
2. Suggest a **specific named pathology** in `dx_suspecte`
3. Trigger an **IMMEDIATE clinical action** (urgent investigation, drug, referral) in `action`

Do NOT include:

- Atypical syndromes without immediate action (→ put in `pieges`)
- Educational distinctions like "penser à X chez Y" (→ put in `pieges`)
- Counterintuitive teaching (→ put in `pieges`)

Limit: 5-7 red flags. Quality over quantity.

## [VÉRIFIER:] markers — MINIMUM 3 REQUIRED (added in v3)

You MUST add at least 3 `[VÉRIFIER:reason]` markers per card. Target 3-7. Even if you feel confident, identify 3 zones where a secondary source should confirm:

- Exact posologies / doses adjusted for weight or age
- Order of DD ranking (when not explicit in source)
- Numeric thresholds for triggering imaging or hospitalisation
- Local protocols (CHUV / HUG specifics)
- Section partial in MD source

If you add fewer than 3 markers, re-read your draft and find 3 places where uncertainty is legitimate — there are always some.

## Semantic color markup (sparingly)

- `{s:...}` symptom/sign/mechanism (pink)
- `{p:...}` pathology/dx/vital emergency (red)
- `{t:...}` test/score/imaging (green)
- `{r:...}` treatment/drug/dose/number/procedure (yellow)
- `{e:...}` physiological state (brown)

## Nested bullets for multi-clause items

```yaml
- |-
  Lead phrase:
  • sub-item A
  • sub-item B
  • sub-item C
```

Use `•` (U+2022). Limit ~10 nested groups.

## Source line comments

Above each major section:

```yaml
# source: line 12-45
anamnese: ...
```

## Max counts (HARD LIMITS)

- `red_flags`: 5-7
- `dd_top5`: exactly 5
- `examens_complementaires`: ≤ 6
- `criteres_hospitalisation`: ≤ 5
- `pieges`: ≤ 5
- `cartes_liees`: 2-4
- `[VÉRIFIER:]` markers: ≥ 3, ≤ 7

## Workflow

1. Read all 4 input files
2. Self-audit BEFORE final write:
   - Lines ≤ 220?
   - Each red flag has actionable `action`?
   - Pieges ≤ 5?
   - At least 3 `[VÉRIFIER:]` markers?
   - DD exactly 5?
3. Write to target path
4. Validate: `cd CS/Pocketcards/_build && npm run validate` → `0 failed`
5. **DO NOT COMMIT**

## Report

- Status
- Final line count
- Red flag count (confirm each has actionable `action`)
- `[VÉRIFIER:]` count (must be ≥ 3)
- Pieges count
- Validation result
- 2 most uncertain sections

```

## Golden master selection per discipline

When dispatching a subagent for a discipline that already has a `ready` card, use that as the golden master. Otherwise, fall back to the closest discipline:

| Discipline | Golden master (path) |
|---|---|
| Neuro | `CS/Pocketcards/data/SSP_Cephalee.yaml` |
| Other (no ready card yet) | `CS/Pocketcards/data/SSP_Cephalee.yaml` (as stylistic reference) |

Once Phase 2.4 produces the first ready Cardio card (probably `Douleur_Thoracique`), update this table to reference it for subsequent Cardio dispatches.

## Discipline ID prefix mapping

| Discipline | ID prefix |
|---|---|
| Cardio | CAR |
| Neuro | NEU |
| MSQ | MSQ |
| Gastro | GAS |
| Pulmo | PUL |
| Endocrino | END |
| Dermato | DER |
| Gyneco | GYN |
| Pediatric | PED |
| Psy | PSY |
| ORL | ORL |
| Ophtalmo | OPH |
| Urgences | URG |
| Comm | COM |
| Nephro | NEP |
| Infectio | INF |
| Hemato | HEM |
| Geriatrie | GER |
| Uro | URO |

## Numbering convention

Within a discipline, number SSPs sequentially `SSP-XXX-01`, `SSP-XXX-02`, etc. Reserved IDs already used:

- `SSP-NEU-04` Céphalée (Phase 1)
- `SSP-NEU-05` Etat_Confusionnel (Phase 2.3 smoke)
- `SSP-NEU-06` Vertiges (Phase 2.3 smoke)
- `SSP-NEU-07` Tremblement (Phase 2.3 smoke)

Future Phase 2.4 Neuro cards start at `SSP-NEU-08`.
```
