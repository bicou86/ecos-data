# Refonte Clinical Knowledge en base de données + maillage de cross-références

_Spec du 2026-06-08. Hub Notion « 🧠 CLINICAL KNOWLEDGE — Hub Principal » (`3608563148fa817ba078cc08621f943f`). Fait suite à l'audit du 2026-06-07 et aux Vagues A/B/C. Voir aussi [`2026-06-08-refontes-ck-b-c-design.md`](2026-06-08-refontes-ck-b-c-design.md)._

## Contexte & objectif

Le hub CK pilote ses 23 disciplines + 3 ressources transversales via une **table de métadonnées** parallèle (« 📶 Disciplines — Clinical Knowledge ») : ce n'est pas une vraie base de contenu, juste des lignes-stubs pointant (colonne `Page` = URL) vers les vraies pages. Les hubs **SSP / Skills / Pocketcards** sont, eux, de vraies bases où chaque ligne **est** la page de contenu.

**Objectif :** aligner CK sur ce modèle (chaque discipline = une ligne-page d'une base), supprimer la table de métadonnées redondante, convertir **Flashcards** (page simple à 22 sous-pages) en base, puis tisser un **maillage de relations** entre les 5 bases (CK, SSP, Skills, Pocketcards, Flashcards).

## Décisions (validées avec l'utilisateur)

1. **Base CK — réaffectation** (pas suppression brute) : la base de gouvernance `25480105…` est **renommée** « 🧠 Clinical Knowledge — Base Centrale », ses lignes-stubs remplacées par les vraies pages, puis les stubs supprimés. → Même état final visible (l'ancienne table disparaît) **tout en préservant** les relations `Disciplines CK` déjà câblées sur SSP et Pocketcards.
2. **Flashcards** : 1 ligne = 1 page thématique (les 22 pages actuelles → 22 lignes). Pas d'extraction des Q&A individuelles.
3. **Transversales** : SOKO, Atlas Compas, Pearls inclus comme lignes (Famille = « Transversal & Outils »). → 26 lignes CK au total.

## Inventaire des entités (IDs canoniques)

### Bases (data sources / collections)

| Base                                    | Page (database_id)                 | Data source (collection)               |
| --------------------------------------- | ---------------------------------- | -------------------------------------- |
| 🥼 SSP — Base Centrale                  | `3678563148fa80738601e99d48f2f3eb` | `36785631-48fa-8039-a3b2-000bb69f7a44` |
| Skills — Base Centrale                  | `36e8563148fa8075abb6e1e6076722c9` | `36e85631-48fa-8090-a6d3-000b721715d5` |
| Pocketcards — Base Centrale             | `796b238f2ed142938d3ac80deeb2d329` | `75ef2716-395d-4246-86ff-5e063db0f9b4` |
| 📶 Disciplines → 🧠 CK — Base Centrale  | `db8a8279113a4917a35d085048282528` | `25480105-8551-489a-9dec-24d6bbdfcc76` |
| 🎴 Flashcards — Base Centrale (à créer) | —                                  | —                                      |
| Page « Flashcards » (wrapper actuel)    | `3228563148fa817daba0fa3e03bf4814` | — (page simple)                        |

### Schéma actuel de la base de gouvernance (`25480105…`)

`Discipline`(title) · `Famille`(select, 8) · `Statut révision`(select : Corrigé & vérifié / À enrichir B3 / Index hors gabarit) · `Priorité B3`(select : Haute/Moyenne/Basse) · `Dernière relecture`(date) · `Erreurs corrigées`(number) · `Lacunes principales (B3)`(text) · `Page`(url) · `SSP liées`(relation→SSP) · `Pocketcards liées`(relation→Pocketcards).

### Relations existantes (réciproques)

- SSP `Disciplines CK` ↔ gouvernance `SSP liées` _(vide)_
- Pocketcards `Disciplines CK` ↔ gouvernance `Pocketcards liées` _(vide)_
- SSP `Skills liés` ↔ Skills `SSP liées`
- SSP `Pocketcards liées` ↔ Pocketcards `SSP liées`
- Skills `Pocketcards liées` ↔ Pocketcards `Skills liés`
- **Skills n'a AUCUNE relation CK** (à créer).

### Taxonomie `Spécialité` (SSP/Skills/Pocketcards)

16 valeurs (Pocketcards +1 « Transversal ») : Fondamentaux & Communication, Médecine Interne, Cardiologie & Vasculaire, Pneumologie, Gastro-Hépatologie, Musculo-Squelettique, Neurologie, Pédiatrie, Néphro-Urologie, Endocrinologie, Gynéco-Obstétrique, ORL, Ophtalmologie, Dermatologie, Psychiatrie, Urgences Vitales [, Transversal].

## Table de correspondance CK → Spécialité (pour le peuplement)

### 23 disciplines

| Discipline CK                    | page_id                            | Spécialité(s) cibles                      |
| -------------------------------- | ---------------------------------- | ----------------------------------------- |
| Cardiologie                      | `3608563148fa811e8b3fd427514878c6` | Cardiologie & Vasculaire                  |
| Pneumologie                      | `3608563148fa81f1bc0dd8604ffdc022` | Pneumologie                               |
| Gastro & Hépatologie             | `3608563148fa8106a337fcccd3e345f8` | Gastro-Hépatologie                        |
| Néphrologie & Urologie           | `3608563148fa81459b96c532e8b22e31` | Néphro-Urologie                           |
| Endocrinologie                   | `3608563148fa81ca9cc6e6aa3efb9dc1` | Endocrinologie                            |
| Hématologie & Oncologie          | `3608563148fa81a7973ef79846041f2f` | Médecine Interne _(pas de spé dédiée)_    |
| Infectiologie                    | `3608563148fa81298d78e907eafdbdcc` | Médecine Interne (+ Urgences Vitales)     |
| Immunologie & Rhumatologie       | `3608563148fa817fb7e7cb6220103d1c` | Musculo-Squelettique (+ Médecine Interne) |
| Neurologie                       | `3608563148fa817499a8fc6138c2cdbc` | Neurologie                                |
| Psychiatrie                      | `3608563148fa81afa461f3eaae21ff8a` | Psychiatrie                               |
| Dermatologie                     | `3608563148fa81e4b476e81d3ea120ab` | Dermatologie                              |
| ORL                              | `3608563148fa81108bf4ebd17110a36e` | ORL                                       |
| Ophtalmologie                    | `3608563148fa81d699decb8d8fc5b4c0` | Ophtalmologie                             |
| Chirurgie & Traumatologie        | `3608563148fa8124bcf7d71c3404c60f` | Musculo-Squelettique (+ Urgences Vitales) |
| Musculo-Squelettique             | `36b8563148fa8193b82ff08e64d62d14` | Musculo-Squelettique                      |
| Urgences & ABCDE                 | `3608563148fa81da8b24e62205a22b97` | Urgences Vitales                          |
| Pharmacologie & Toxicologie      | `3608563148fa81b88729e898662896e4` | Urgences Vitales (+ Médecine Interne)     |
| Médecine légale & Santé publique | `3608563148fa81629e23f36b9ce361dd` | Fondamentaux & Communication              |
| Gériatrie & Soins palliatifs     | `3608563148fa81d0a8e0fe9883af9daf` | Médecine Interne                          |
| Pédiatrie                        | `3608563148fa81a7a30fe3718454843e` | Pédiatrie                                 |
| Gynécologie & Obstétrique        | `3608563148fa81d9b649c8925b8a332a` | Gynéco-Obstétrique                        |
| Radiologie & Médecine nucléaire  | `3608563148fa814dadb6ea694d5de566` | Médecine Interne / Transversal            |
| Anesthésiologie & Antalgie       | `3608563148fa81fd83f1cb4cddbadc5a` | Urgences Vitales                          |

### 3 transversales (Famille = Transversal & Outils)

| Ressource              | page_id                            |
| ---------------------- | ---------------------------------- |
| Anamnèse allemand SOKO | `3618563148fa81ff89c9d4aa6bb92d12` |
| Atlas Visuel Compas    | `36b8563148fa81a1abc9dcfcbdfdc342` |
| Récapitulatif Pearls   | `3618563148fa81f29ea6e71475116df0` |

### 22 pages Flashcards → Spécialité

**Ancrage** : Traumatologie&Chir `3158563148fa81328c04f3909b7970ce` (Musculo-Squelettique) · Pharmaco&Toxico `3158563148fa81789899eb755ada0dbf` (Urgences Vitales) · Pédiatrie `3158563148fa815db15ef2bfe490355f` · Cardio&Vasc `3158563148fa81da8675e521af77fe56` · Neuro `3158563148fa8193bfd5f7e83ad9e745` · Digestif&MI `3158563148fa81aca420ca4a7e1ef863` (Gastro-Hépatologie/Médecine Interne) · Gynéco-Obs&Uro `3158563148fa81bba350c4f6a85a51a0` (Gynéco-Obstétrique) · Psy/Éthique/Droit `3158563148fa81bf9ab8f916c6e35c4e` (Psychiatrie) · Stats&SantéPub `3158563148fa81018394f73fa5884532` (Fondamentaux & Communication) · Onco&Infectio `3158563148fa8109b77ecc41abc9aa3b` (Médecine Interne).
**Pathologies** : Pneumo `31b8563148fa81fea908f49170e7d599` · Ortho `31b8563148fa81339bb0eada94fa60b7` (Musculo-Squelettique) · Neuro `31b8563148fa81fea1f4f15fc7478276` · Psy `31c8563148fa81499830f80993605ca5` · Dermato `31c8563148fa81f7adb2e11d74a26e8e` · Cardio `31b8563148fa81bf98eccdab99b7af9c` · Endocrino `31c8563148fa81bbb925c2236e147e4d` · Gynéco-Obs `31c8563148fa81c59148c6e81ee90956` · ORL&Ophtalmo `31c8563148fa812983c6df6f72bc501d` (ORL + Ophtalmologie) · Uro&Néphro `31c8563148fa81308167d49baaa07625` (Néphro-Urologie) · Infectio `31c8563148fa81a1baacd51caec3f40c` (Médecine Interne) · Gastro-Hépato `31b8563148fa81c8b3daedcf13e441f6` (Gastro-Hépatologie).

## Matrice cible des relations

| Relation (DUAL)            | État         | Action                                             |
| -------------------------- | ------------ | -------------------------------------------------- |
| CK ↔ SSP                   | câblée, vide | peupler                                            |
| CK ↔ Pocketcards           | câblée, vide | peupler                                            |
| CK ↔ Skills                | absente      | créer (`Skills liés` ↔ `Disciplines CK`) + peupler |
| CK ↔ Flashcards            | absente      | créer + peupler                                    |
| Flashcards ↔ SSP           | absente      | créer + peupler                                    |
| Flashcards ↔ Skills        | absente      | créer + peupler                                    |
| Flashcards ↔ Pocketcards   | absente      | créer + peupler                                    |
| SSP ↔ Skills ↔ Pocketcards | existantes   | vérifier & compléter                               |

## Plan d'exécution (6 phases)

### Phase 0 — Inventaire (lecture seule)

- Énumérer **toutes** les lignes SSP/Skills/Pocketcards via `query-database-view` (capturer URL + `Spécialité` + relations existantes).
- Lire les 26 lignes-stubs de la base de gouvernance (valeurs de propriétés + URL `Page`).
- Lire les 22 pages Flashcards (titre, section Ancrage/Pathologies).
- Construire l'index `Spécialité → [lignes]` pour chaque base, + l'appariement stub→page.
- Sauvegarder l'inventaire dans `/tmp/ck-refonte-inventaire.json`.

### Phase 1 — Réaffectation de la base CK

1. (Phase 0 fournit) métadonnées des 26 stubs en mémoire, appariées par URL `Page`.
2. `move-pages` : déplacer les 26 pages de contenu (23 disciplines + 3 transversales) dans la collection `25480105…` (parent = data_source). Le page_id est préservé → tous les liens entrants survivent.
3. Pour chaque ligne-contenu, `update_properties` : Famille, Statut révision, Priorité B3, Dernière relecture, Erreurs corrigées, Lacunes (B3) depuis le stub apparié.
4. Supprimer les 26 lignes-stubs (`update_page` in_trash, ou move to trash).
5. `update_data_source` : `DROP COLUMN "Page"` ; renommer titre + icône → « 🧠 Clinical Knowledge — Base Centrale ».
6. `ADD COLUMN "Skills liés" RELATION('36e85631-48fa-8090-a6d3-000b721715d5', DUAL 'Disciplines CK')`.
7. (Nettoyage titres optionnel) retirer le suffixe « — Clinical Knowledge » des titres de lignes.

### Phase 2 — Flashcards en base

1. `create_database` « 🎴 Flashcards — Base Centrale » sous la page Flashcards (`3228…4814`). Schéma : `Nom`(title), `Spécialité`(select, mêmes 16-17 options), `Type`(select : 🧠 Ancrage / 🩹 Pathologies), `Nb Q&A`(number), `Source`(text), + relations DUAL `SSP liées`, `Skills liés`, `Pocketcards liées`, `Disciplines CK`.
2. `move-pages` : déplacer les 22 sous-pages dans la nouvelle collection.
3. `update_properties` sur chaque ligne : Spécialité + Type (Ancrage/Pathologies) selon la table.
4. Remplacer le corps de la page « Flashcards » par une vue liée (ou conserver la base inline) ; préserver les 2 intitulés de section en en-tête.

### Phase 3 — Peuplement des cross-références

- Pour chaque discipline CK : relier (via l'index Spécialité de Phase 0) toutes les lignes SSP/Skills/Pocketcards/Flashcards de la/les spécialité(s) cible(s) → `update_properties` côté CK (les DUAL remplissent le réciproque).
- Pour chaque page Flashcards : relier SSP/Skills/Pocketcards de même spécialité (en plus de CK déjà fait).
- Vérifier/compléter SSP↔Skills↔Pocketcards (gaps éventuels).
- **Parallélisable par discipline** → orchestration Workflow (1 agent par discipline, écritures idempotentes, vérif post-hoc).

### Phase 4 — Hub CK

- Le déplacement (Phase 1) vide les blocs child-page inline du Hub → ajouter une **vue de base liée** « 🧠 Clinical Knowledge — Base Centrale » groupée par `Famille` (remplace les rubriques inline).
- Mettre à jour le callout de tête (référence l'ancienne base) → pointer la base réaffectée.
- Préserver l'éditorial : Top 21, Top 50, Pièges, Mnémoniques, Spé CH, callout transversales.

### Phase 5 — Vérification indépendante

- 26 lignes CK présentes, contenu + métadonnées intacts, 0 stub résiduel.
- Relations réciproques peuplées (échantillon contrôlé des deux côtés).
- 22 lignes Flashcards, Spécialité/Type renseignés.
- Hub : vue liée rendue, callout à jour, éditorial intact, 0 lien mort.
- Astuce « ré-émettre le même `update_content` → No matches found » pour confirmer les écritures malgré le snapshot de lecture figé.

## Garde-fous techniques

- **Bug de cache du connecteur** : vérifier l'identité (titre) de chaque page avant édition ; re-fetch si mismatch ; vérification **séquentielle** (mono-agent en lecture) pour éviter les collisions de cache.
- **Destructif après filet** : suppression des stubs + édition du Hub uniquement après migration **et** vérification des métadonnées (filet : historique de page Notion ~30 j).
- **DUAL** : n'écrire qu'un seul côté de chaque relation.
- **Idempotence** : les `update_properties` de relations sont des ensembles d'URLs → ré-exécutables sans doublon.
- Avant tout lot destructif lancé en workflow : vérifier les transcripts (`tool_use` → écriture) pour confirmer 0 écriture en cas d'échec infra, avant relance.

## Critères de succès

- L'entité « 📶 Disciplines — Clinical Knowledge » n'existe plus (réaffectée en base de contenu) ; aucune perte de métadonnées.
- Les 5 bases (CK, SSP, Skills, Pocketcards, Flashcards) sont de vraies bases ; chaque ligne CK/Flashcards **est** sa page de contenu.
- Maillage complet : chaque discipline CK est reliée à ses SSP/Skills/Pocketcards/Flashcards correspondants (et réciproquement) ; relations SSP↔Skills↔Pocketcards vérifiées.
- Hub CK fonctionnel (vue liée + éditorial), 0 lien mort, vérification indépendante OK.

## Hors périmètre

- Pas de réécriture du contenu médical des disciplines.
- Pas de refonte des Top 21/50 (déjà traités en Vague C).
- Pas d'extraction des Q&A individuelles des Flashcards (granularité page).
