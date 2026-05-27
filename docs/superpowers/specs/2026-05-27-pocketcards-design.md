# Pocketcards ECOS — Design Spec

**Date** : 2026-05-27
**Auteur** : Damien Fulliquet (avec assistance Claude)
**Statut** : Approved (brainstorming validé)

---

## 1. Contexte et objectifs

### Problème

L'utilisateur prépare l'examen ECOS (Examen Clinique Objectif Structuré, format suisse) et dispose de ressources fragmentées :

- 155 SSPs Markdown très détaillés dans `CS/02_SSP/`
- ~70 Pocketcards préexistantes (textes extraits + PDFs scannés) éclatées entre `CS/05_Communication/Pocketcards/` et `CS/Pocketcards/`
- Un workspace Notion ECOS avec 92 SSPs et 30+ pocketcards déjà importées
- Un repo séparé `ecos-skills-summary` avec un `template_ssp.html` stylé

Le contenu existe mais il manque :

- Un **format visuel cohérent** pour toutes les fiches
- Une **liste exhaustive structurée** des points ECOS (anamnèse, drapeaux rouges, examen, DD, PEC) par plainte/système/outil
- Un **pipeline reproductible** qui maintient HTML, PDF, et Notion synchrones

### Objectif

Construire une **bibliothèque de pocketcards ECOS** générée depuis une **source YAML unique**, alimentant **trois cibles synchrones** : HTML (browse mobile + écran), PDF (print), Notion (mobile cloud). Format visuel uniforme avec **codage couleur sémantique par section**.

### Phasing

- **Phase 1 (MVP)** : 50 SSPs prioritaires + 12 Systèmes + 15 Outils ≈ 77 cartes
- **Phase 2 (Coverage complet)** : extension à 155 SSPs ≈ 200-250 cartes au total

---

## 2. Décisions de cadrage (validées avec l'utilisateur)

| Décision                   | Choix                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Format de sortie**       | Hybride : 1 source YAML → HTML + PDF + Notion                                                           |
| **Priorité utilisateur**   | Mobile en révision · Source unique versionnée                                                           |
| **Niveaux de cartes**      | SYSTÈME (12) + SSP (155 ⭐) + OUTIL (~15) — pas de DIAGNOSTIC séparé                                    |
| **Scope phase 1**          | Top 50 SSP prioritaires                                                                                 |
| **Scope phase 2**          | Coverage complet (200-250)                                                                              |
| **Layout visuel**          | Print-dense 2 colonnes A5, responsive mobile (1 col < 768px)                                            |
| **Codage couleur**         | Par section sémantique : bleu (anamnèse) · rouge (red flag) · vert (examen) · ambre (DD) · violet (PEC) |
| **Contrainte print**       | Aucune (génère mais sans dépendance taille fixe)                                                        |
| **Pondération ECOS**       | **Retirée** du schéma (pas affichée sur la carte)                                                       |
| **Approche de génération** | Hybride 4 phases (P0 setup · P1 golden · P2 drafts auto · P3 revue · P4 bulk publish)                   |
| **Stack technique**        | Node.js (cohérent avec template HTML existant)                                                          |
| **Templates**              | Eta (JS natif dans template, simple, 10× plus rapide qu'Handlebars)                                     |
| **PDF**                    | Puppeteer (headless Chromium)                                                                           |
| **Push Notion**            | MCP `notion-create-pages` / `notion-update-page`                                                        |

---

## 3. Architecture

```
Source              Validation         Builder Node.js       Outputs
─────────────────── ────────────────── ──────────────────── ──────────────────
YAML files          JSON Schema (ajv)  build.js              → HTML (dist/html/)
Eta templates                          pdf.js (Puppeteer)    → PDF (dist/pdf/)
CSS partagé                            notion.js (MCP)       → Notion ECOS
```

### Localisation dans le repo

```
ecos-data/
└── CS/Pocketcards/
    ├── data/           # Source YAML (1 fichier par carte)
    │   ├── SSP_*.yaml
    │   ├── SYS_*.yaml
    │   └── TOOL_*.yaml
    ├── _build/         # Builder code
    │   ├── build.js
    │   ├── pdf.js
    │   ├── notion.js
    │   ├── schema/pocketcard.schema.json
    │   ├── templates/  # Eta templates
    │   └── assets/card.css
    ├── dist/           # Outputs (gitignored)
    │   ├── html/
    │   └── pdf/
    └── package.json
```

### Commandes principales

```bash
yarn validate                  # AJV check sur tous les YAML
yarn build                     # HTML uniquement (rapide)
yarn build --pdf               # HTML + PDF (plus lent, Puppeteer)
yarn publish                   # Push Notion (explicite, jamais auto)
yarn dev                       # Watch mode + preview localhost:3000
yarn build --only=SSP-NEU-04   # Rebuild une seule carte
yarn publish --dry-run         # Simule push Notion sans appel API
```

**Principe** : `build` est inoffensif (fichiers locaux). `publish` est destructif (peut écraser des modifs Notion) → toujours invocation explicite, jamais en watch.

---

## 4. Composants

### 4.1 Source data

**YAML files** (`CS/Pocketcards/data/`)

- Naming : `{TYPE}_{Slug}.yaml` (ex : `SSP_Cephalee.yaml`, `SYS_Cardio.yaml`, `TOOL_NIHSS.yaml`)
- Front-matter strict : `id`, `type`, `discipline`, `version`, `status` (`draft`/`review-pending`/`ready`), `urgency`
- Corps : sections selon le type (validées par schéma)

### 4.2 Validation

**JSON Schema** (`_build/schema/pocketcard.schema.json`)

- 3 sous-schémas conditionnels selon `type` (SSP / SYS / TOOL)
- `discipline` = enum fermé : `Cardio` `Neuro` `MSQ` `Gastro` `Pulmo` `Endocrino` `Dermato` `Gyneco` `Pediatric` `Psy` `ORL` `Ophtalmo` `Urgences` `Comm`
- `id` = regex `^(SSP|SYS|TOOL)-[A-Z]{3,4}-\d{2}$`
- Validation via `ajv` avant tout build

### 4.3 Builder Node.js

**`build.js`** — Orchestrateur

- Charge tous les YAML (glob `data/*.yaml`)
- Valide via `ajv` (rapport d'erreurs ligne par ligne)
- Filtre `status === 'ready'` (drafts skip en prod)
- Rend chaque YAML via Eta → fichier HTML
- Génère `index.html` avec filtres JS (discipline, urgence, type)

**`pdf.js`** — Puppeteer wrapper

- Lance Chromium headless
- Charge HTML local → screenshot PDF A5 portrait
- Génère aussi PDFs combinés (1 par discipline) pour print de masse

**`notion.js`** — Push MCP

- Lit YAML, mappe vers blocks Notion (heading_2, callout, bulleted_list)
- Si `card_id` existe dans la DB ECOS-Pocketcards → `notion-update-page`
- Sinon → `notion-create-pages` sous la page parent
- Détection drift via comparaison timestamps (voir 6.4)

### 4.4 Présentation

**Templates Eta** (`_build/templates/`)

- `card-ssp.eta`, `card-sys.eta`, `card-tool.eta`, `index.eta`
- Eta supporte JavaScript natif dans les templates (`<% if (card.urgency === 'high') { %>`)
- 10× plus rapide qu'Handlebars, zéro-dépendance

**CSS partagé** (`_build/assets/card.css`)

- Variables sémantiques : `--c-anam`, `--c-rf`, `--c-exam`, `--c-dd`, `--c-pec`
- Layout 2 colonnes : `grid-template-columns: 1fr 1fr`
- Media query `@media (max-width: 768px)` → 1 colonne (mobile)
- Media query `@media print` → A5 portrait, marges 8mm

### 4.5 Codage couleur sémantique

| Section          | Couleur                | Variable CSS |
| ---------------- | ---------------------- | ------------ |
| 📋 Anamnèse      | Bleu (#3b82f6)         | `--c-anam`   |
| 🚨 Red flags     | Rouge (#dc2626)        | `--c-rf`     |
| 🔍 Examen        | Vert (#10b981)         | `--c-exam`   |
| 🎯 DD Top 5      | Ambre (#f59e0b)        | `--c-dd`     |
| 💊 PEC           | Violet (#8b5cf6)       | `--c-pec`    |
| 📌 Header / méta | Gris ardoise (#475569) | `--c-meta`   |

---

## 5. Data flow & schéma YAML

### 5.1 Schéma d'un fichier YAML SSP

```yaml
# CS/Pocketcards/data/SSP_Cephalee.yaml
id: SSP-NEU-04
type: ssp
title: Céphalée
discipline: Neuro
urgency: high # low | medium | high
version: 2026-05-27
status: ready # draft | review-pending | ready
sources:
  - CS/02_SSP/SSP_Céphalee.md
  - Neurocard - Examen clinique 2023.pdf

# === REQUIRED ===
anamnese:
  socrates:
    [Site, Onset, Character, Radiation, Time, Exacerbating, Relieving, Severity]
  specifique: [Aura, Photo/phonophobie, Nausées]
  atcd: [Migraine familiale, HTA]

red_flags:
  - description: Coup de tonnerre (<1min)
    dx_suspecte: HSA
    action: CT cérébral immédiat
  - description: "« Pire de ma vie »"
    dx_suspecte: HSA, dissection
    action: Imagerie urgente

examen:
  general: [TA/FC/T°, Glasgow]
  cible: [Status neuro complet, FO, Artères temporales]

dd_top5:
  - { dx: Migraine, indices: "Pulsatile, photo/phono", freq: "très fréquent" }
  - { dx: HSA, indices: "Thunderclap, méningisme", freq: "rare/urgent" }

pec_initiale:
  immediate: [Antalgie AINS, Triptan si migraine]
  orientation: [Domicile si bénin, URG si red flag]

# === OPTIONAL ===
examens_complementaires: [CT, IRM, CRP/VS, PL]
criteres_hospitalisation: [Imagerie anormale, Altération conscience]
pieges: [Confondre Horton avec névralgie Arnold]
cartes_liees: [SSP-NEU-12, SYS-NEU, TOOL-NIHSS]
```

### 5.2 Schéma YAML SYS (Système)

```yaml
id: SYS-CAR
type: sys
title: Cardio
discipline: Cardio
version: 2026-05-27
status: ready

# REQUIRED
anamnese_appareil: [Douleur thoracique, Dyspnée, Palpitations, Syncope, Œdèmes]
status: [Inspection, Palpation, Percussion, Auscultation]
manoeuvres: [Reflux hépatojugulaire, Manœuvre de Valsalva, Test orthostatique]

# OPTIONAL
echelles: [NYHA, CHA2DS2-VASc, HAS-BLED]
ssps_liees: [SSP-CAR-01, SSP-CAR-04]
```

### 5.3 Schéma YAML TOOL (Outil/Skill)

```yaml
id: TOOL-NIHSS
type: tool
title: NIHSS
discipline: Neuro
version: 2026-05-27
status: ready

# REQUIRED
quand_utiliser: [AVC suspect, Suivi post-thrombolyse]
items: [Niveau de conscience, Champ visuel, Paralysie faciale, Force MS/MI, ...]
score_interpretation:
  - { score: "0", interpretation: "Pas de déficit" }
  - { score: "1-4", interpretation: "AVC mineur" }
  - { score: "5-15", interpretation: "AVC modéré" }
  - { score: ">15", interpretation: "AVC sévère" }

# OPTIONAL
limites: [Sous-estime AVC postérieur, Pas d'évaluation aphasie fine]
ssps_ou_utiliser: [SSP-NEU-AVC, SSP-NEU-Vertige]
```

### 5.4 Lifecycle d'une carte

```
1. Auteur crée/édite     CS/Pocketcards/data/SSP_Foo.yaml
                          (status: draft → ready quand validé médicalement)
                          ↓
2. yarn validate          → AJV check : sections required ? ID format ? discipline valide ?
                          ↓ (échec = build aborté, rapport ligne par ligne)
3. yarn build             → Charge tous .yaml status:ready
                          → Rend via Eta → dist/html/SSP_Foo.html
                          → Régénère dist/html/index.html
                          ↓
4. yarn build --pdf       → Puppeteer ouvre chaque HTML → dist/pdf/SSP_Foo.pdf
                          ↓
5. yarn publish           → Cherche card_id dans Notion DB ECOS-Pocketcards
                            - Si existe : notion-update-page (après check drift)
                            - Sinon    : notion-create-pages
```

---

## 6. Error handling

### 6.1 Validation YAML

| Failure                    | Action                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| Section required manquante | Build aborté, message : `SSP_Foo.yaml:42 — section "red_flags" manquante` |
| Discipline non-enum        | Build aborté, message avec valeurs autorisées                             |
| ID format invalide         | Build aborté, regex attendue affichée                                     |

### 6.2 Rendu HTML (Eta)

- `try/catch` autour de chaque `eta.render()`
- Skip la carte fautive, continue les autres
- Récap final : `« 157/158 cartes générées, 1 échec : SSP-FOO »`

### 6.3 Génération PDF (Puppeteer)

- Skip + log si Chrome ne se lance pas / timeout
- PDF est "best effort" — le HTML reste source de vérité
- Pas de blocage du build HTML

### 6.4 Push Notion (drift detection)

**Problème** : tu modifies une carte dans Notion (sur mobile en révision), puis tu rebuild → risque d'écraser ta modif.

**Solution (optimistic concurrency control)** :

1. À chaque push réussi, le builder écrit `notion_last_synced: <timestamp>` dans le YAML (commenté)
2. Avant écrasement, compare `notion_page.last_edited_time` vs `notion_last_synced`
3. Si Notion plus récent → **stop + rapport** :
   ```
   ⚠ SSP_Foo édité dans Notion à 14:23, dernier sync à 10:00.
     Résolution : `yarn pull SSP_Foo` ou `yarn push --force SSP_Foo`
   ```
4. Rate limit 429 → exponential backoff (max 3 retries)

### 6.5 Logs et debug

```bash
yarn validate                 # rapport coloré, exit 0/1
yarn build --verbose          # logs détaillés par carte
yarn build --only=SSP-NEU-04  # rebuild une seule carte
yarn publish --dry-run        # simule push Notion sans appel API
```

---

## 7. Testing

### 7.1 Tests de schéma (auto)

```bash
yarn test:schema
```

- `tests/fixtures/golden/*.yaml` — YAML valides → doivent passer
- `tests/fixtures/broken/*.yaml` — YAML cassés → doivent échouer avec message clair
- Couvre SSP / SYS / TOOL

### 7.2 Tests de rendu (snapshot)

```bash
yarn test:render
```

- Pour la golden card de chaque type, build → HTML
- Compare au snapshot stocké
- Détecte régressions visuelles dans le template Eta
- Update : `yarn test:render -u`

### 7.3 Smoke test PDF

```bash
yarn test:pdf
```

- Build PDF de la golden SSP
- Vérifie : fichier généré, taille > 5 KB, > 0 page

### 7.4 Tests Notion (mock)

```bash
yarn test:notion
```

- Mock du client MCP
- Vérifie payload, gestion 429/conflict, idempotence
- **Pas** de tests live (rate limits, side effects)

### 7.5 Tests d'intégration

```bash
yarn test:e2e
```

- Build complet sur 5 cartes représentatives
- Vérifie index, filtres, liens internes

### 7.6 Qualité médicale (human-only)

Tests auto ne valident pas la **justesse médicale** du contenu. Workflow :

```
draft  →  auto-review (LLM check basique : posologies cohérentes,
                       red flags présents, sources citées)
       →  status: review-pending
       →  validation manuelle (auteur médical)
       →  status: ready
       →  publish
```

Le builder ne push **jamais** `draft` ou `review-pending` en Notion.

### 7.7 CI (Phase 2)

Optionnel pour Phase 2 :

- GitHub Actions sur push : `yarn validate && yarn test:schema && yarn test:render`
- Pas de push Notion en CI (action manuelle)

---

## 8. Phasing & milestones

### Phase 0 — Setup pipeline (1-2 jours)

- [ ] Créer arborescence `CS/Pocketcards/{data,_build,dist}`
- [ ] `package.json` + dépendances : `eta`, `ajv`, `js-yaml`, `puppeteer`, `chokidar`
- [ ] Écrire `pocketcard.schema.json` (3 sous-schémas conditionnels)
- [ ] Écrire 3 templates Eta + CSS partagé
- [ ] Écrire `build.js` + `pdf.js` + `notion.js`
- [ ] Tests schéma + snapshot rendu

### Phase 1 — Golden card (1 jour)

- [ ] Rédiger manuellement `SSP_Cephalee.yaml` (golden master SSP)
- [ ] Rédiger `SYS_Cardio.yaml` (golden master SYS)
- [ ] Rédiger `TOOL_NIHSS.yaml` (golden master TOOL)
- [ ] Build local : vérifier rendu HTML + PDF
- [ ] Push Notion : vérifier création + mise à jour

### Phase 2 — Drafts automatiques (2-3 jours)

- [ ] Script `_build/import-md.js` : parse les 155 SSPs Markdown existants
- [ ] Extrait via regex + LLM les sections (anamnèse, red flags, examen, DD, PEC)
- [ ] Produit 155 YAML en `status: draft`
- [ ] Aussi : 12 SYS depuis `04_Skills_Examen/` PDFs + 15 TOOL depuis `Pocketcards/`

### Phase 3 — Revue humaine (étalée)

- [ ] Prioriser les 50 SSPs les plus fréquentes à l'ECOS
- [ ] Pour chaque draft : valider sections, corriger erreurs, passer en `status: ready`
- [ ] Cible MVP : 77 cartes prêtes (50 SSP + 12 SYS + 15 TOOL)

### Phase 4 — Bulk publish (1 jour)

- [ ] `yarn publish --all` push toutes les `status: ready` en Notion
- [ ] Vérifier dans Notion : navigation, filtres, mobile
- [ ] Print test : générer PDFs et imprimer 5 cartes A5

### Phase 5 (post-MVP) — Extension

- [ ] Revue + activation des 105 SSPs restantes
- [ ] CI automatisée
- [ ] Refinements UX selon retours d'utilisation

---

## 9. Out of scope

- **Génération de diagnostics** (Dx individuels) : les `03_Dx/` existants ne sont pas portés en pocketcards séparées. Le "DD Top 5" dans chaque SSP suffit pour l'ECOS.
- **App mobile native** : le HTML responsive + l'app Notion couvrent l'usage mobile.
- **Versions multilingues** : tout en français suisse (ECOS = examen suisse).
- **Quiz interactifs / spaced repetition** : autre projet, hors scope.
- **Intégration avec [grilles-ecos](../../../grilles-ecos)** : potentiellement Phase 5 (croisé), pas maintenant.

---

## 10. Open questions (à valider pendant l'implémentation)

1. **Quelle DB Notion utiliser ?** : créer une nouvelle DB `ECOS-Pocketcards` ou étendre la DB SSPs existante avec un champ `card_format` ? → à décider à P1.
2. **Quels SSPs en Top 50 ?** : la liste des 50 prioritaires sera dérivée de la fréquence ECOS HUG (à confirmer avec une source officielle).
3. **Sources visuelles** : si une SSP fait référence à une image (ECG, derma, dermato), où stocker ? Probablement dans `assets/images/` + référence YAML.

---

## 11. Références techniques

- **Eta** : <https://eta.js.org/>
- **AJV** : <https://ajv.js.org/>
- **Puppeteer print options** : <https://pptr.dev/api/puppeteer.pdfoptions>
- **Notion MCP** : tools `notion-create-pages`, `notion-update-page`, `notion-fetch`
- **Template HTML existant** (à adapter) : `ecos-skills-summary/template_ssp.html`
