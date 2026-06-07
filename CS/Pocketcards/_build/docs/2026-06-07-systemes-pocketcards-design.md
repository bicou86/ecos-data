# Pocketcards « Système » (×12) — Design

**Date** : 2026-06-07 · **Statut** : approuvé (design) · **Modèle** : `SYS-CAR` (`data/SYS_Cardio.yaml`)

## Objectif

Créer des pocketcards d'examen clinique **par appareil/système**, sur le modèle de la carte cardiovasculaire existante (`SYS-CAR`), pour les 12 autres grands systèmes. Sortie : `data/SYS_*.yaml` + `dist/html/SYS-*.html`.

## Les 12 cartes

| ID      | Système                       | Discipline | Sections d'examen (ordre clinique)                                                                                                                      |
| ------- | ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-PUL | Pulmonaire / Respiratoire     | Pulmo      | Inspection · Palpation · Percussion · Auscultation                                                                                                      |
| SYS-ABD | Abdominal / Digestif          | Gastro     | Inspection · Auscultation · Percussion · Palpation                                                                                                      |
| SYS-NEU | Neurologique                  | Neuro      | Conscience & fonctions supérieures · Nerfs crâniens · Motricité · Sensibilité · Réflexes · Coordination & équilibre · Marche                            |
| SYS-MSQ | Locomoteur (GALS + régional)  | MSQ        | Look (inspection) · Feel (palpation) · Move (mobilité) · Tests spécifiques                                                                              |
| SYS-VAS | Vasculaire périphérique       | Cardio     | Inspection · Pouls périphériques · Auscultation (souffles) · Tests (ABI, Allen, Buerger)                                                                |
| SYS-END | Thyroïde & Cou                | Endocrino  | Inspection · Palpation thyroïdienne · Auscultation · Signes périphériques de dysthyroïdie                                                               |
| SYS-HEM | Ganglionnaire & Hématologique | Hemato     | Aires ganglionnaires · Inspection (pâleur, purpura) · Splénomégalie / Hépatomégalie · Signes associés                                                   |
| SYS-DER | Cutané / Dermatologique       | Dermato    | Lésions élémentaires · Palpation · Topographie / distribution · Phanères & muqueuses · Manœuvres (vitropression, Nikolsky, dermographisme)              |
| SYS-ORL | ORL / Tête & Cou              | ORL        | Otoscopie · Nez & sinus · Cavité buccale & pharynx · Cou & glandes salivaires · Acoumétrie (Weber/Rinne)                                                |
| SYS-URO | Uro-néphrologique & génital   | Nephro     | Palpation rénale · Giordano (ébranlement lombaire) · Globe vésical · Examen génital externe · Toucher rectal / prostate                                 |
| SYS-GYN | Gynécologique & mammaire      | Gyneco     | Examen des seins · Examen abdomino-pelvien · Spéculum · Toucher vaginal                                                                                 |
| SYS-PSY | Examen de l'état mental       | Psy        | Présentation & comportement · Discours · Humeur & affect · Pensée (cours/contenu) · Perceptions · Cognition · Insight & jugement · Évaluation du risque |

## Changement technique — sections d'examen flexibles

Le schéma actuel impose 4 sous-clés obligatoires à `examen_physique` (inspection/palpation/percussion/auscultation) — inadapté au neuro/MSK/psy.

- **`_build/schema/pocketcard.schema.json`** : pour le type `sys`, `examen_physique` devient un objet de **sections nommées libres** (`additionalProperties` = array de strings, `minProperties: 1`), sans clés imposées. SYS-CAR reste valide (ses 4 clés deviennent des sections nommées).
- **`_build/templates/card-sys.eta`** : remplacer les 4 sous-sections en dur par une itération `Object.entries(card.examen_physique)` — la **clé YAML = titre `<h4>`** (ordre d'insertion préservé par js-yaml).
- **`_build/src/notion.js`** (branche `sys`) : itérer pareil (sécurité ; pas de push prévu).
- Garde-fou : re-valider + re-builder `SYS-CAR` après le changement (non-régression).

## Génération

- 1 carte = 1 fichier `data/SYS_<Nom>.yaml`, structure identique à SYS-CAR :
  `id, type: sys, title, discipline, version, status: draft, sources, anamnese_appareil[], examen_physique{sections}, manoeuvres[], echelles[], ssps_liees[]`.
- Balisage sémantique `{s:} {p:} {t:} {r:} {e:}` (signe/patho/test/réflexe-traitement/état).
- **`status: draft`** — contenu non validé médicalement (examen clinique = risque moindre que posologies, mais à relire).
- `ssps_liees` = SSP de la discipline (fournies à l'agent).
- Exécution : **workflow, 1 agent par système**, prompt exemplar = SYS-CAR ; chaque YAML **validé** (`npm run validate`) ; échec → correction ciblée.

## Sorties & vérification

- 12 `data/SYS_*.yaml` + `npm run build` → 12 `dist/html/SYS-*.html` + `dist/html/index.html` régénéré (13 cartes SYS au total).
- Critère de succès : `npm run validate` = 0 erreur sur les 13 SYS ; HTML rendus avec sections correctes ; SYS-CAR inchangé visuellement.

## Hors périmètre

- Pas de push Notion (les examens par système existent déjà en cartes RMS/Skills).
- Pas de validation médicale formelle (statut `draft`).
