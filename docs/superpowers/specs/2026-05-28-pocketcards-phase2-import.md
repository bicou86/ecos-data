# Pocketcards Phase 2 — Auto-import 134 SSPs Markdown — Design Spec

**Date** : 2026-05-28
**Auteur** : Damien Fulliquet (avec assistance Claude)
**Statut** : Approved (brainstorming validé)
**Successor du** : Phase 0 ([2026-05-27-pocketcards-design.md](./2026-05-27-pocketcards-design.md))

---

## 1. Contexte et objectifs

### Problème

Après Phase 0 (pipeline) et Phase 1 (3 golden cards en ready), il faut populer la bibliothèque avec les 200+ pocketcards cibles. Le projet dispose déjà de **134 fichiers `SSP_*.md`** dans `CS/02_SSP/` (~768 lignes en moyenne) très structurés mais **trop détaillés** pour servir directement de pocketcards. Le but de Phase 2 : automatiser la transformation MD → YAML pocketcard avec garde-fous médicaux.

Le rapport entre source et cible n'est pas linéaire :

- Source : 407 lignes / SSP, ~30 red flags, 8 entrées DD en tables, PEC long sur 4 sous-sections
- Cible : 198 lignes / SSP, 7 red flags essentiels, top 5 DD, PEC condensée en `immediate` + `orientation` + `criteres_hospitalisation`, semantic markup `{s:} {p:} {t:} {r:} {e:}` appliqué

C'est une transformation de **synthèse médicale** (jugement clinique), pas de compression de texte.

### Objectif

Construire un **pipeline hybride d'auto-import** :

- **Phase A** : parseur regex Node.js extrait la structure du MD → JSON intermédiaire
- **Phase B** : subagent LLM (Sonnet conservateur) condense + ajoute markup couleur → YAML draft

Compléter la bibliothèque **par discipline**, en commençant par **Neuro** (extension de l'existant SSP_Cephalee + TOOL_NIHSS). Workflow de revue **assisté par batch** (rapport d'audit + HTML preview, puis l'auteur valide la discipline complète avant promote en `ready`).

### Phasing dans Phase 2

| Sub-phase | Livrable                                                            |
| --------- | ------------------------------------------------------------------- |
| P2.1      | Pipeline `import-md.js` + audit script                              |
| P2.2      | Discipline classifier (mapping 134 SSPs)                            |
| P2.3      | Smoke test : 3 SSPs Neuro générés                                   |
| P2.4      | Batch Neuro complet (~15 SSPs draft → ready)                        |
| P2.5      | Itération sur disciplines suivantes : Cardio → MSQ → Urgences → ... |

---

## 2. Décisions de cadrage (validées avec l'utilisateur)

| Décision                 | Choix                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **Stratégie extraction** | Hybride pragmatique : regex parser (structure) + LLM subagent (condensation + markup)  |
| **Source MD**            | 134 `.md` dans `CS/02_SSP/`                                                            |
| **HTML/Autres formats**  | Hors scope Phase 2 (les 19 `.html` traités en post-MVP)                                |
| **Priorisation**         | Par discipline, **Neuro en premier** (15-20 SSPs) puis Cardio, MSQ, etc.               |
| **Sécurité contenu**     | LLM conservateur + audit auto avec markers `[VÉRIFIER:reason]`                         |
| **Traçabilité**          | Subagent doit citer les lignes MD source (commentaires YAML `# source: line N-M`)      |
| **Workflow revue**       | Assisté par discipline : rapport `[VÉRIFIER:]` + HTML preview + author valide en batch |
| **Stack**                | Node.js (cohérent Phase 0) + subagent dispatch côté Claude orchestrateur               |
| **Batching**             | Max 3 subagents en parallèle                                                           |
| **Format intermediate**  | JSON committé en cache local gitignored                                                |

---

## 3. Architecture

```
SSP MD (CS/02_SSP/)
   ↓ Step 1: import-md.js (regex parser)
Intermediate JSON (_build/import-cache/, gitignored)
   ↓ Step 2: discipline classifier (static mapping)
Discipline tag attached
   ↓ Step 3: subagent dispatch (Sonnet, conservative prompt)
YAML draft (CS/Pocketcards/data/SSP_*.yaml, status: draft)
   ↓ Step 4: audit-drafts.js (grep [VÉRIFIER:] markers)
Audit report (uncertainties + medical risk flagged)
   ↓ Step 5: build (HTML preview, draft mode)
   ↓ Step 6: author review (assisted batch)
status: draft → ready
   ↓ Step 7: git commit batch
```

### Localisation dans le repo

```
ecos-data/
├── CS/02_SSP/                         # Source MD (existant, intouché)
│   └── SSP_*.md  (134 files)
└── CS/Pocketcards/
    ├── data/                          # Output : YAML drafts puis ready
    │   └── SSP_*.yaml  (134 nouveaux)
    └── _build/
        ├── src/
        │   ├── import-md.js           # Parser regex MD → JSON
        │   ├── audit-drafts.js        # Audit auto des [VÉRIFIER:]
        │   ├── promote.js             # Promote draft → ready (avec garde)
        │   └── check-coherence.js     # IDs uniques, liens internes
        ├── data/
        │   └── discipline-map.yaml    # Mapping SSP → discipline (committé)
        ├── import-cache/              # JSON intermediate (gitignored)
        │   └── SSP_*.json
        └── tests/
            └── fixtures/import/
                ├── SSP_Cephalee.md    # golden case
                ├── SSP_Diabète_Suivi.md  # variant case
                └── SSP_ACR.md         # minimal case
```

### Séparation des responsabilités

**Important** : le pipeline est volontairement séparé en 2 niveaux pour découpler le code Node du dispatch LLM :

- **Niveau Node.js** (scripts dans `_build/src/`) : parsing regex, classification, audit, build, promote, check-coherence. Tout est testable hors-ligne, sans LLM, sans tokens.
- **Niveau Orchestrateur Claude** (ce session ou subagent racine) : dispatche les subagents Sonnet en lisant les JSON intermediates, lit les YAMLs produits par les subagents, applique les fixes review. Utilise le tool `Agent` (Claude Code) pas une lib Node.

Concrètement :

```bash
yarn parse-md CS/02_SSP/SSP_AVC.md            # Niveau Node : parse → _build/import-cache/SSP_AVC.json
yarn parse-batch --discipline=Neuro            # Niveau Node : parse tous les Neuro selon mapping
```

Puis l'orchestrateur Claude :

1. Lit `_build/import-cache/SSP_AVC.json`
2. Lit `discipline-map.yaml` pour la discipline + urgency
3. Lit le golden master de la discipline (`SSP_Cephalee.yaml` pour Neuro)
4. Dispatche un subagent avec ces 3 inputs + le prompt template
5. Sauvegarde le YAML produit dans `CS/Pocketcards/data/SSP_AVC.yaml`

### Commandes Node principales

```bash
yarn parse-md CS/02_SSP/SSP_AVC.md            # 1 SSP : parse → JSON intermediate
yarn parse-batch --discipline=Neuro            # Tous les SSPs d'une discipline (parse seul)
yarn audit-drafts                              # Génère audit-report.md
yarn audit-drafts --discipline=Neuro          # Audit limité
yarn check-coherence --discipline=Neuro       # IDs uniques + liens internes
yarn promote SSP-NEU-XX                       # Promote single (refus si [VÉRIFIER:] reste)
yarn promote --discipline=Neuro --all         # Bulk promote après revue
```

---

## 4. Composants

### 4.1 Regex parser (`_build/src/import-md.js`)

Transforme MD source → JSON structuré.

Patterns de détection (avec tolérance) :

```js
const SECTION_PATTERNS = {
  ssp_metadata: /^## 🎯 Situation à Starting Point/m,
  anamnese: /^## .*ANAMNÈSE/m,
  red_flags: /^### .*DRAPEAUX ROUGES|^### .*🚨/m,
  examen: /^## .*EXAMEN CLINIQUE/m,
  examens_compl: /^## .*EXAMENS COMPLÉMENTAIRES/m,
  dd: /^## .*DIAGNOSTIC DIFFÉRENTIEL/m,
  pec: /^## .*PRISE EN CHARGE/m,
  pieges: /^### .*Pièges|^### .*❌/m,
};
```

Extraction par section :

- Bullets `- [ ] **(label)**` → array of strings
- Sub-sections `#### Title` → nested objects with `category` + `items`
- Tables DD `| Diagnostic | Arguments | … |` → `[{dx, arguments, examens}]`
- Texte libre → champ `narrative` (fallback)

### 4.2 Intermediate JSON contract

Voir section 5.1.

### 4.3 Discipline classifier (`_build/data/discipline-map.yaml`)

Mapping statique committé :

```yaml
SSP_ACR: { discipline: Cardio, urgency: high }
SSP_AVC: { discipline: Neuro, urgency: high }
SSP_AVP: { discipline: Urgences, urgency: high }
SSP_Acouphènes: { discipline: ORL, urgency: low }
SSP_Adénopathie: { discipline: Hemato, urgency: medium }
# ...134 entries...
```

**Bootstrap initial** : un subagent LLM classifie les 134 titres en une passe (input : liste de noms de fichiers ; output : YAML mapping). Puis l'auteur revoit en 10 min et corrige les cas ambigus.

### 4.4 Subagent dispatcher (orchestration Claude, hors Node.js)

Cette étape n'est PAS un script Node.js — elle vit dans l'orchestrateur Claude (session interactive). Le script Node.js `parse-md` s'arrête après production du JSON intermediate. L'orchestrateur Claude :

1. Charge l'intermediate JSON
2. Charge le golden master de la même discipline (ex: `SSP_Cephalee.yaml` pour les autres Neuro)
3. Compose le prompt subagent avec :
   - JSON intermediate
   - Discipline + urgency
   - Golden master comme exemple
   - Markup convention
   - Instructions conservatives
4. Dispatch subagent Sonnet
5. Reçoit YAML, valide via AJV, commit

Batch parallèle : **max 3 subagents simultanés** (lisibilité log + token budget parent).

### 4.5 Subagent prompt template (extrait)

```
Tu génères un YAML pocketcard ECOS pour le SSP "{title}" (discipline: {disc}, urgency: {urg}).

INPUT : JSON intermediate extrait du MD source (voir ci-dessous)
RÉFÉRENCE : voici un exemple validé de pocketcard Neuro (SSP_Cephalee.yaml)
SCHEMA CIBLE : voir _build/schema/pocketcard.schema.json

RÈGLES STRICTES :
1. Status: draft
2. Sources: inclure le path MD original
3. Commentaires `# source: line N-M` à chaque section (pour traçabilité)
4. Si tu n'es pas certain d'une posologie/dose → `[VÉRIFIER: poso non confirmée]`
5. Si tu inverses un DD → `[VÉRIFIER: DD à confirmer]`
6. Si une section MD source manque ou est incomplète → `[VÉRIFIER: section originale partielle]`
7. Max 7 red_flags · Max 5 DD · Max 6 critères hospitalisation
8. Applique markup couleur `{s:} {p:} {t:} {r:} {e:}` selon les conventions
9. Utilise nested bullets `|- + •` pour les items "Lead: a; b; c"

OUTPUT : YAML committable à CS/Pocketcards/data/SSP_{slug}.yaml
```

### 4.6 Audit script (`_build/src/audit-drafts.js`)

```js
const SEVERITY_PATTERNS = [
  ["high", /\[VÉRIFIER:\s*posologie/i],
  ["high", /\[VÉRIFIER:\s*red.?flag/i],
  ["medium", /\[VÉRIFIER:\s*DD/i],
  ["medium", /\[VÉRIFIER:\s*examen/i],
  ["low", /\[VÉRIFIER:/],
];
```

Output : `_build/audit-report.md` groupé par discipline puis par sévérité.

### 4.7 Promote script (`_build/src/promote.js`)

```bash
yarn promote SSP-NEU-XX
```

Garde-fou :

- Refuse si reste `[VÉRIFIER:]` non résolu (sauf `--force`)
- Refuse si schema invalide
- Refuse si `sources:` vide

### 4.8 Check coherence (`_build/src/check-coherence.js`)

Après batch :

- IDs uniques (pas de doublons `SSP-NEU-XX`)
- `cartes_liees:` pointent vers cards existantes
- Numérotation IDs cohérente dans la discipline

---

## 5. Data flow & contrats d'interface

### 5.1 Intermediate JSON schema

```json
{
  "schema_version": 1,
  "source_path": "CS/02_SSP/SSP_AVC.md",
  "source_total_lines": 523,
  "title_md": "AVC - Accident Vasculaire Cérébral",
  "ssp_meta": {
    "description": "Patient présentant un déficit neurologique aigu...",
    "objectifs": "Reconnaissance, time-window thrombolyse..."
  },
  "anamnese_raw": {
    "socrates": [
      {"label": "Site", "details": ["unilatéral?", "..."]},
      {"label": "Onset", "details": ["heure exacte ⚠️", "..."]}
    ],
    "specifique": [...],
    "atcd": [...],
    "habitudes": [...]
  },
  "red_flags_raw": [
    {"category": "Type de douleur", "items": [...]},
    {"category": "Contexte à risque", "items": [...]}
  ],
  "examen_raw": {
    "signes_vitaux": [...],
    "neurologique": [...],
    "cible": [...]
  },
  "examens_complementaires_raw": [...],
  "dd_table_raw": [
    {"dx": "AIT", "pour": "...", "contre": "..."}
  ],
  "pec_raw": {
    "urgences": [...],
    "traitement": [...],
    "surveillance": [...]
  },
  "pieges_raw": [...],
  "parse_quality": "high|medium|low",
  "parse_warnings": ["section X not found", "..."]
}
```

### 5.2 Subagent contract

**Input** : JSON intermediate + discipline + golden master + prompt instructions
**Output** : YAML committable validé contre le schema existant

Inviolables :

- Status `draft`
- Champ `sources:` non vide
- `[VÉRIFIER:]` partout où confiance basse
- Commentaires `# source: line N-M`

### 5.3 Lifecycle complet d'une carte Phase 2

```
1. SSP MD existe dans CS/02_SSP/
   ↓
2. yarn import-ssp CS/02_SSP/SSP_AVC.md
   - Step 1: regex parser → _build/import-cache/SSP_AVC.json
   - Step 2: lookup discipline-map.yaml → "Neuro, high"
   - Step 3: dispatch subagent → CS/Pocketcards/data/SSP_AVC.yaml (draft)
   ↓
3. yarn audit-drafts → audit-report.md (N [VÉRIFIER:] flags)
   ↓
4. yarn build --include-drafts → dist/html/SSP-NEU-XX.html
   ↓
5. Author review (assistée par Claude orchestrateur) :
   - Présentation du rapport audit
   - Présentation des HTML rendus
   - Author dit "corrige X, garde Y, supprime Z"
   - Claude applique les fixes (Edit tool)
   ↓
6. yarn promote SSP-NEU-XX → status: draft → ready
   ↓
7. git commit batch
```

### 5.4 Batch flow pour 15 cards Neuro

```
discipline-map.yaml → filter discipline=Neuro → 15 SSP files
   ↓
Boucle (max 3 en parallèle) :
  for each SSP:
    yarn import-ssp SSP_XXX.md
   ↓
yarn audit-drafts --discipline=Neuro → rapport Neuro complet
   ↓
yarn build --include-drafts → 15 HTML previews
   ↓
Author review en batch (orchestrateur présente le rapport)
   ↓
yarn promote --discipline=Neuro --all → tous status: ready
   ↓
git commit unique : "Phase 2: Neuro batch (15 SSPs ready)"
```

---

## 6. Error handling

### 6.1 Parsing regex

| Failure                        | Action                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Section "Anamnèse" introuvable | Fallback `parse_quality: low`, best-effort, `parse_warnings: [...]`. Subagent verra le warning. |
| Table DD malformée             | Skip table, extrait paragraphes en `narrative`. Warning logué.                                  |
| Caractères non-UTF8            | Tente `iso-8859-1` puis `windows-1252`. Sinon skip + log.                                       |
| MD < 50 lignes                 | Skip + log `_build/import-cache/skipped.log`                                                    |

### 6.2 Subagent dispatch

| Failure                     | Action                                                      |
| --------------------------- | ----------------------------------------------------------- |
| Timeout (>3 min)            | Retry 1× avec prompt minimal (sections critiques seulement) |
| YAML invalide (schema fail) | Re-dispatch avec erreur AJV explicite                       |
| Tous sections `[VÉRIFIER:]` | Ne commit pas. Log `_build/import-cache/failed.log`         |
| Rate limit / overload       | Backoff exponential (60s → 300s → 900s), max 3 retries      |

### 6.3 Build du draft

Le `build.js` existant gère déjà schema + render errors. Ajout :

- Si carte draft a >10 `[VÉRIFIER:]` → warning visible mais ne bloque pas

### 6.4 Promote (draft → ready)

Action humaine assistée, mais garde-fou côté script :

- Refuse si `[VÉRIFIER:]` reste (sauf `--force`)
- Refuse si schema invalide
- Refuse si `sources:` vide

### 6.5 Cohérence batch

`yarn check-coherence --discipline=Neuro` vérifie :

- IDs uniques
- `cartes_liees:` pointant vers cards existantes
- Numérotation cohérente

### 6.6 Recovery & rollback

- Drafts commités par batch → `git revert` possible
- Intermediate JSON gitignored mais persistant → relance subagent sans re-parser
- Si subagent corrompt un YAML `status: ready`, le check refuse l'écrasement

---

## 7. Testing

### 7.1 Tests parser regex

```bash
yarn test:parser
```

Fixtures dans `_build/tests/fixtures/import/` :

- `SSP_Cephalee.md` — golden case (structure parfaite)
- `SSP_Diabète_Suivi.md` — variante "ANAMNÈSE (25%)"
- `SSP_ACR.md` — minimal/incomplet

Assertions :

- `parse_quality` correct
- Counts de sections (SOCRATES 8 items, etc.)
- `parse_warnings` populé correctement

### 7.2 Tests discipline classifier

Snapshot test : mapping d'un sample de 10 titres doit rester stable.

### 7.3 Tests subagent (smoke + contract)

```bash
yarn test:subagent-smoke  # slow, exclu de yarn test par défaut
yarn test:subagent-contract  # mocked, rapide
```

### 7.4 Tests audit

Fixtures : 3 YAMLs artificiels avec `[VÉRIFIER:]` divers. Vérifie categorisation par sévérité.

### 7.5 Tests E2E pipeline

```bash
yarn test:e2e-import
```

1 SSP fixture, pipeline complet (parse → classify → subagent mocké → audit → build).

### 7.6 Qualité médicale (human-only)

Workflow :

```
draft → audit → HTML preview → Author review → [VÉRIFIER:] résolus → promote ready → commit
```

### 7.7 Tests régression Phase 0/1

Les 18 tests existants doivent continuer à passer. Le parser et l'audit sont **additifs**.

### 7.8 CI activée

GitHub Actions :

- `yarn test` (sans subagent smoke) à chaque push
- Subagent smoke en local uniquement (coût tokens)

---

## 8. Phasing & milestones

### Phase 2.1 — Pipeline core (1-2 jours)

- [ ] `import-md.js` parser regex avec fixtures + tests
- [ ] `audit-drafts.js` script
- [ ] `promote.js` script avec garde-fou
- [ ] `check-coherence.js` script
- [ ] Intermediate JSON schema validé

### Phase 2.2 — Discipline mapping (0.5 jour)

- [ ] Bootstrap mapping LLM (134 titres → discipline + urgency)
- [ ] Revue manuelle rapide
- [ ] Commit `discipline-map.yaml`

### Phase 2.3 — Smoke test Neuro (1 jour)

- [ ] Dispatch subagent sur 3 SSPs Neuro pilotes
- [ ] Review manuel détaillé pour valider le prompt
- [ ] Itération sur le prompt subagent si nécessaire

### Phase 2.4 — Batch Neuro complet (1-2 jours)

- [ ] Génération automatique des ~15 SSPs Neuro
- [ ] Audit auto
- [ ] Review assistée par l'auteur
- [ ] Promote en `ready`
- [ ] Commit batch

### Phase 2.5 — Disciplines suivantes (post-MVP)

- [ ] Cardio, MSQ, Urgences, etc.
- [ ] Itération à mesure que l'auteur valide

---

## 9. Out of scope

- **Les 19 SSPs HTML** : traités en post-MVP (parseur HTML différent)
- **Les Systèmes (SYS)** au-delà de SYS-CAR existant : Phase 3 séparée
- **Les Outils (TOOL)** au-delà de TOOL-NIHSS : Phase 3 séparée
- **Le push Notion** des nouveaux drafts : Phase 4 (notion.js existant)
- **Auto-promote** de draft à ready : interdit, toujours humain

---

## 10. Open questions

1. **Coût tokens** : pour 134 SSPs avec input ~10k tokens (MD source) + 3k tokens (golden + prompt) = ~1.7M tokens input total avec Sonnet. À monitorer batch par batch.
2. **Discipline boundaries** : certains SSPs sont à cheval (ex: "Hématémèse" = Gastro ou Urgences ?). Le mapping accepte un seul tag — choix éditorial par l'auteur.
3. **Maintenance MD source** : si l'auteur modifie un MD source après Phase 2, faut-il auto-regen le YAML ? Décision : non, le YAML devient la source de vérité une fois promote. Le MD reste référence historique.

---

## 11. Références techniques

- Phase 0 spec : [2026-05-27-pocketcards-design.md](./2026-05-27-pocketcards-design.md)
- Existing pipeline : `CS/Pocketcards/_build/`
- Golden master Neuro : `CS/Pocketcards/data/SSP_Cephalee.yaml`
- Source MD : `CS/02_SSP/SSP_*.md`
- Anthropic SDK : <https://docs.anthropic.com/en/api/messages>
