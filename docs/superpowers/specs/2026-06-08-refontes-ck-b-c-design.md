# Refontes de fond du hub Clinical Knowledge — (b) single-source-of-truth + (c) dédup archive

_Spec du 2026-06-08. Hub Notion « 🧠 CLINICAL KNOWLEDGE — Hub Principal » (`3608563148fa817ba078cc08621f943f`). Fait suite à l'audit du 2026-06-07 et aux Vagues A/B/C + intégration B3._

## Contexte & objectif

L'audit a identifié deux dettes structurelles :

- **Double maintenance accueil ↔ disciplines** : le Top 21 / Top 50 de l'accueil recopie des faits présents dans les pages disciplines → cause-racine des divergences corrigées (EP, START aspirine, vaccins).
- **Couche archive multi-sources redondante** : sur les pages les plus lourdes, un même thème est recopié 3-9× (Compas + Docteur J'ai + QCM HUG + Fiches PBless + Résumés), gonflant le volume sans valeur ajoutée.

Objectif : supprimer ces deux sources de dette **sans perdre aucune information unique**.

## Décisions (validées avec l'utilisateur)

- **(b)** : approche **hybride « résumé + lien »**.
- **(c)** : approche **coupe directe + rapport** (filet = historique de page Notion ~30 j).
- **(c) périmètre** : les **4 pages les plus lourdes** — Cardiologie, Pédiatrie, Urgences & ABCDE, Chirurgie & Traumatologie.
- **Ordre** : (b) d'abord (réversible) puis (c) (destructif), page par page.

## (b) Accueil hybride « résumé + lien »

**Cible :** toggles `🔥 Top 21 Réflexes` et `🎯 Top 50 patterns fédéraux` de l'accueil.

**Transformation :**

- **Top 50** (`signal → Dx → CAT/doses`, groupé par système) : conserver `signal → diagnostic` (spans rose → rouge) ; **retirer la partie `→ CAT/doses/algorithme`** (span jaune) ; ajouter en tête de chaque bloc-système un lien **« → détails : [Discipline] »** vers la page correspondante.
- **Top 21** (liste mixte, déjà concise) : conservé ; retirer les rares doses spécifiques redondantes ; ajouter un renvoi global « détail & CAT : voir la discipline ».
- **Gouvernance** : une ligne en tête de chaque toggle — _« Aperçu transversal — la page discipline fait foi pour le détail et les doses. »_

**Risque :** faible / réversible. Seule la couche `CAT` redondante de l'accueil est retirée ; le détail existe déjà dans les disciplines.

## (c) Dédup archive — 4 pages

**Cible :** uniquement la couche archive multi-sources redondante.

**Épargné explicitement :** le bloc `🆕 Enrichissements B3 [À VALIDER]`, les sections du gabarit (Carte d'identité, Top Réflexes Dx/Tx, Mini-vignettes, Pearls fédéraux), les images / blocs Atlas ECG.

**Transformation par thème répété (≥2 copies) :**

1. Identifier les N copies du thème.
2. Fusionner en **une synthèse canonique** (version la plus complète et correcte).
3. **Reporter toutes les nuances uniques** des autres copies avant suppression (règle « zéro perte d'info »).
4. Supprimer les copies redondantes ; conserver un toggle « source » uniquement si une source apporte une vraie nuance.

**Process :** coupe directe + rapport par page (thèmes fusionnés, contenu supprimé cité, volume avant/après).

**Risque :** élevé / destructif → mitigations : fusion préservant toutes les nuances ; rapport détaillé ; vérification indépendante post-hoc.

## Garde-fous techniques (constants sur ce hub)

- **Bug de cache du connecteur Notion** : vérifier l'identité (titre) de chaque page avant édition ; re-fetch en cas de mismatch.
- **`update_content` fail-safe** : search-replace exact ; échoue proprement si l'ancre manque.
- **Astuce de vérif post-écriture** : ré-émettre le même `update_content` → « No matches found » prouve le remplacement (contourne le snapshot de lecture figé).
- Travail séquentiel pour la vérification (mono-agent = pas de charge parallèle = pas de collision de cache).

## Critères de succès

- **(b)** : sur l'accueil, le Top 50 ne contient plus de CAT/doses (seulement `signal → Dx` + liens disciplines) ; le Top 21 conserve l'essentiel ; aucune divergence réintroduite ; liens disciplines valides.
- **(c)** : sur les 4 pages, chaque thème répété n'apparaît plus qu'une fois (synthèse canonique) ; **zéro information unique perdue** (vérifié) ; sections gabarit + bloc B3 intacts ; réduction de volume mesurée et rapportée ; balises équilibrées.
- Vérification indépendante (lecture seule, séquentielle) confirmant les deux points ci-dessus.

## Hors périmètre

- Pas de dédup sur les 19 autres disciplines (extension possible ultérieurement).
- Pas de modification du contenu médical des disciplines (la dédup ne fait que fusionner des copies existantes).
- Pas de refonte des relations DB (déjà créées ; peuplement = tâche UI).
